import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateShippingPaise, getSettings } from '../services/store.js';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } } }
        }
      }
    }
  }
};

const ANON_TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;

export function getAnonymousToken(req: Request): string | undefined {
  const raw =
    (req.headers['x-anonymous-token'] as string | undefined) ||
    (req.body && typeof req.body.anonymousToken === 'string' ? req.body.anonymousToken : undefined) ||
    (typeof req.query.anonymousToken === 'string' ? req.query.anonymousToken : undefined);
  if (!raw) return undefined;
  const token = String(raw).trim();
  return ANON_TOKEN_RE.test(token) ? token : undefined;
}

/**
 * Finds the cart for the signed-in user or guest token (creating it if needed).
 * When a guest signs in, their guest cart is merged into their account cart.
 */
export async function resolveCart(userId?: string, anonymousToken?: string) {
  if (userId) {
    let cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: cartInclude });
    }

    if (anonymousToken) {
      const guestCart = await prisma.cart.findUnique({ where: { anonymousToken }, include: { items: true } });
      if (guestCart && guestCart.id !== cart.id) {
        if (guestCart.items.length > 0) {
          for (const item of guestCart.items) {
            const existing = cart.items.find((i) => i.variantId === item.variantId);
            if (existing) {
              await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: Math.max(existing.quantity, item.quantity) }
              });
            } else {
              await prisma.cartItem.create({ data: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity } });
            }
          }
        }
        await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);
        cart = await prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
      }
    }
    return cart;
  }

  if (anonymousToken) {
    let cart = await prisma.cart.findUnique({ where: { anonymousToken }, include: cartInclude });
    if (!cart) {
      cart = await prisma.cart.create({ data: { anonymousToken }, include: cartInclude });
    }
    return cart;
  }

  throw new AppError('Cart session missing. Please refresh the page.', 400);
}

export async function formatCart(cart: Awaited<ReturnType<typeof resolveCart>>) {
  const settings = await getSettings();
  let subtotalPaise = 0;

  const items = cart.items
    .filter((item) => item.variant && item.variant.product && item.variant.product.isActive)
    .map((item) => {
      const unitPrice = item.variant.product.basePrice + item.variant.priceDelta;
      const total = unitPrice * item.quantity;
      subtotalPaise += total;
      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        size: item.variant.size,
        stockQuantity: item.variant.stockQuantity,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        unitPricePaise: unitPrice,
        totalPaise: total,
        imageUrl: item.variant.product.images[0]?.url || null
      };
    });

  const shippingPaise = calculateShippingPaise(subtotalPaise, settings);
  const threshold = settings.freeShippingThreshold * 100;
  return {
    cartId: cart.id,
    items,
    itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    freeShippingThresholdPaise: threshold,
    remainingForFreeShippingPaise: Math.max(0, threshold - subtotalPaise)
  };
}

async function sendCart(req: Request, res: Response) {
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  res.set('Cache-Control', 'no-store');
  res.json(await formatCart(cart));
}

export async function getCart(req: Request, res: Response) {
  await sendCart(req, res);
}

const addToCartSchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(20).default(1)
});

export async function addToCart(req: Request, res: Response) {
  const { variantId, quantity } = addToCartSchema.parse(req.body);
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.product.isActive) {
    throw new AppError('This size is no longer available', 404);
  }

  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const existing = cart.items.find((i) => i.variantId === variantId);
  const newQuantity = (existing?.quantity || 0) + quantity;

  if (variant.stockQuantity <= 0) {
    throw new AppError(`Size ${variant.size} is sold out`, 400);
  }
  if (newQuantity > variant.stockQuantity) {
    throw new AppError(`Only ${variant.stockQuantity} left in size ${variant.size}`, 400);
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }
  await sendCart(req, res);
}

async function findOwnedItem(req: Request, itemId: string) {
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
  if (!item) throw new AppError('Item not found in your bag', 404);
  return item;
}

export async function updateCartItem(req: Request, res: Response) {
  const { quantity } = z.object({ quantity: z.number().int().min(0).max(20) }).parse(req.body);
  const item = await findOwnedItem(req, req.params.id);

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.variant.stockQuantity) {
      throw new AppError(`Only ${item.variant.stockQuantity} left in size ${item.variant.size}`, 400);
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }
  await sendCart(req, res);
}

export async function removeCartItem(req: Request, res: Response) {
  const item = await findOwnedItem(req, req.params.id);
  await prisma.cartItem.delete({ where: { id: item.id } });
  await sendCart(req, res);
}
