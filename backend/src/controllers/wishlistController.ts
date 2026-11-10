import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { productListInclude, serializeProduct } from '../utils/serialize.js';

async function getOrCreateWishlist(userId: string) {
  return prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
}

async function send(res: Response, userId: string) {
  const wl = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        include: { product: { include: productListInclude } }
      }
    }
  });
  const products = (wl?.items || []).map((i) => i.product).filter((p) => p.isActive).map(serializeProduct);
  res.set('Cache-Control', 'no-store');
  res.json({ productIds: products.map((p) => p.id), products });
}

export async function getWishlist(req: Request, res: Response) {
  if (!req.user) throw new AppError('Please sign in', 401);
  await send(res, req.user.id);
}

export async function toggleWishlist(req: Request, res: Response) {
  if (!req.user) throw new AppError('Please sign in', 401);
  const productId = req.params.productId;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AppError('Product not found', 404);
  const wl = await getOrCreateWishlist(req.user.id);
  const existing = await prisma.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { wishlistId: wl.id, productId } });
  await send(res, req.user.id);
}

/** Merges a guest's saved items (kept in the browser) into the account after sign-in. */
export async function mergeWishlist(req: Request, res: Response) {
  if (!req.user) throw new AppError('Please sign in', 401);
  const { productIds } = z.object({ productIds: z.array(z.string().max(64)).max(200) }).parse(req.body);
  const wl = await getOrCreateWishlist(req.user.id);
  if (productIds.length) {
    const valid = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    for (const p of valid) {
      await prisma.wishlistItem
        .upsert({
          where: { wishlistId_productId: { wishlistId: wl.id, productId: p.id } },
          update: {},
          create: { wishlistId: wl.id, productId: p.id }
        })
        .catch(() => undefined);
    }
  }
  await send(res, req.user.id);
}

/** Public: product cards for a list of ids (used for guests' saved items). */
export async function getProductsByIds(req: Request, res: Response) {
  const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);
  if (!ids.length) {
    res.json({ products: [] });
    return;
  }
  const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, include: productListInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  res.json({ products: ids.map((id) => byId.get(id)).filter(Boolean).map(serializeProduct) });
}
