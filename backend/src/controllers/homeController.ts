import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { getSettings } from '../services/store.js';
import { productListInclude, serializeProduct } from '../utils/serialize.js';

let cache: { body: any; expires: number } | null = null;
export function invalidateHomeCache() {
  cache = null;
}

/**
 * Everything the homepage + menus need in one request:
 * settings, latest drop, homepage collection sections, banner slideshow, menu (collections, grouped categories, colours).
 */
export async function getHome(_req: Request, res: Response) {
  if (cache && cache.expires > Date.now()) {
    res.set('Cache-Control', 'no-cache');
    res.json(cache.body);
    return;
  }

  const [settings, latest, collections, categories, colors, genderRows] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      include: productListInclude
    }),
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          take: 16,
          where: { product: { isActive: true } },
          include: { product: { include: productListInclude } }
        }
      }
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } }
    }),
    prisma.product.findMany({
      where: { isActive: true, colorGroup: { not: null } },
      distinct: ['colorGroup'],
      select: { colorGroup: true }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        gender: true,
        categoryId: true,
        collections: { select: { collectionId: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } }
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 2000
    })
  ]);

  // Men / Women departments: which categories & collections have products for each.
  const departments = (['men', 'women'] as const).map((key) => {
    const want = key === 'men' ? 'MEN' : 'WOMEN';
    const rows = genderRows.filter((r) => r.gender === want || r.gender === 'UNISEX');
    const catCount = new Map<string, number>();
    const colIds = new Set<string>();
    rows.forEach((r) => {
      if (r.categoryId) catCount.set(r.categoryId, (catCount.get(r.categoryId) || 0) + 1);
      r.collections.forEach((c) => colIds.add(c.collectionId));
    });
    return {
      key,
      name: key === 'men' ? 'Men' : 'Women',
      count: rows.length,
      coverImage: rows.find((r) => r.gender === want && r.images[0])?.images[0]?.url || rows.find((r) => r.images[0])?.images[0]?.url || null,
      categories: categories
        .filter((c) => catCount.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, group: c.group || 'TOP', count: catCount.get(c.id) || 0 })),
      collections: collections
        .filter((c) => c.showInMenu && colIds.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    };
  });

  const toSection = (c: (typeof collections)[number]) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    bannerImageUrl: c.bannerImageUrl,
    mobileBannerUrl: c.mobileBannerUrl,
    layout: c.homeLayout,
    products: c.products.map((cp) => serializeProduct(cp.product))
  });

  const body = {
    settings,
    latestDrop: latest.map(serializeProduct),
    sections: collections
      .filter((c) => (c.homeLayout === 'CAROUSEL' || c.homeLayout === 'GRID') && c.products.length > 0)
      .map(toSection),
    gallery: collections
      .filter((c) => c.showInGallery && c.bannerImageUrl)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, bannerImageUrl: c.bannerImageUrl, mobileBannerUrl: c.mobileBannerUrl })),
    menu: {
      collections: collections
        .filter((c) => c.showInMenu && c.products.length > 0)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, bannerImageUrl: c.bannerImageUrl })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        group: c.group || 'TOP',
        imageUrl: c.imageUrl,
        count: c._count.products
      })),
      colors: colors.map((c) => c.colorGroup).filter(Boolean),
      departments
    }
  };

  cache = { body, expires: Date.now() + 20 * 1000 };
  res.set('Cache-Control', 'no-cache');
  res.json(body);
}
