/**
 * LOCAL PREVIEW ONLY — adds sample "DEMO" products so you can see every part of the design.
 *   Load:   npx tsx prisma/demo-products.ts
 *   Remove: npx tsx prisma/demo-products.ts remove
 * Everything it creates has a slug starting with "demo-", so removing it never touches your real products.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`;
const B = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=80`;

const CATS = [
  { slug: 'overlength-t-shirts', name: 'Overlength T-Shirts', group: 'TOP' },
  { slug: 'waffle-boxy-fit-full-sleeves', name: 'Waffle Boxy Fit Full Sleeves', group: 'TOP' },
  { slug: 'acid-wash-t-shirts', name: 'Acid Wash T-Shirts', group: 'TOP' },
  { slug: 'demo-hoodies', name: 'Hoodies', group: 'TOP' },
  { slug: 'demo-cargos', name: 'Cargos', group: 'BOTTOM' },
  { slug: 'demo-caps', name: 'Caps', group: 'ACCESSORIES' }
];

const P: [string, string, number, number | null, string, string, string[], boolean?][] = [
  ['Demo Overlength Tee — Black', 'overlength-t-shirts', 2990, 3490, 'BLACKS', '', ['1521572267360-ee0c2909d518', '1583743814966-8936f5b7be1a', '1576566588028-4147f3842f27']],
  ['Demo Overlength Tee — White', 'overlength-t-shirts', 2990, null, 'WHITES', '', ['1583743814966-8936f5b7be1a', '1521572267360-ee0c2909d518']],
  ['Demo Graphic Overlength Tee', 'overlength-t-shirts', 3290, null, 'GREYS', '', ['1576566588028-4147f3842f27', '1562157873-818bc0726f68']],
  ['Demo Waffle Full Sleeve — Olive', 'waffle-boxy-fit-full-sleeves', 3590, 3990, 'GREENS', '', ['1618354691373-d851c5c3a990', '1509967419530-da38b4704bc6']],
  ['Demo Waffle Full Sleeve — Stone', 'waffle-boxy-fit-full-sleeves', 3590, null, 'NEUTRALS', '', ['1509967419530-da38b4704bc6', '1618354691373-d851c5c3a990']],
  ['Demo Acid Wash Tee — Charcoal', 'acid-wash-t-shirts', 3190, null, 'BLACKS', '', ['1503342217505-b0a15ec3261c', '1529374255404-311a2a4f1fd9']],
  ['Demo Acid Wash Tee — Blue', 'acid-wash-t-shirts', 3190, null, 'BLUES', '', ['1529374255404-311a2a4f1fd9', '1503342217505-b0a15ec3261c'], true],
  ['Demo Heavyweight Hoodie — Grey', 'demo-hoodies', 4990, 5490, 'GREYS', '', ['1556821840-3a63f95609a7', '1620799140408-edc6dcb6d633']],
  ['Demo Heavyweight Hoodie — Brown', 'demo-hoodies', 4990, null, 'BROWNS', '', ['1620799140408-edc6dcb6d633', '1556821840-3a63f95609a7']],
  ['Demo Zip Hoodie — Red', 'demo-hoodies', 5290, null, 'REDS', '', ['1578587018452-892bacefd3f2', '1591047139829-d91aecb6caea']],
  ['Demo Utility Cargo — Black', 'demo-cargos', 4290, null, 'BLACKS', '', ['1624378439575-d8705ad7ae80', '1594633312681-425c7b97ccd1']],
  ['Demo Utility Cargo — Khaki', 'demo-cargos', 4290, 4790, 'NEUTRALS', '', ['1594633312681-425c7b97ccd1', '1624378439575-d8705ad7ae80']],
  ['Demo Crest Cap — Black', 'demo-caps', 1490, null, 'BLACKS', '', ['1588850561407-ed78c282e89b', '1622445275463-afa2ab738c34']],
  ['Demo Crest Cap — Purple', 'demo-caps', 1490, null, 'PURPLES', '', ['1622445275463-afa2ab738c34', '1588850561407-ed78c282e89b']]
];

const COLLECTIONS = [
  { slug: 'demo-winter-drop', name: 'Winter Drop (Demo)', layout: 'CAROUSEL', banner: B('1516826957135-700dedea698c'), pick: [7, 8, 9, 3, 4, 10, 11] },
  { slug: 'demo-essentials', name: 'Essentials (Demo)', layout: 'GRID', banner: B('1523381210434-271e8be1f52b'), pick: [0, 1, 2, 5, 6, 3, 4, 12] },
  { slug: 'demo-accessories', name: 'Caps & Accessories (Demo)', layout: 'CAROUSEL', banner: B('1552374196-1ab2a1c593e8'), pick: [12, 13, 0, 7, 10] }
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function remove() {
  const prods = await prisma.product.findMany({ where: { slug: { startsWith: 'demo-' } }, include: { _count: { select: { orderItems: true } } } });
  for (const p of prods) {
    if (p._count.orderItems > 0) await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
    else await prisma.product.delete({ where: { id: p.id } });
  }
  await prisma.collection.deleteMany({ where: { slug: { startsWith: 'demo-' } } });
  for (const c of CATS.filter((c) => c.slug.startsWith('demo-'))) {
    const cat = await prisma.category.findUnique({ where: { slug: c.slug }, include: { _count: { select: { products: true } } } });
    if (cat && cat._count.products === 0) await prisma.category.delete({ where: { id: cat.id } });
  }
  console.log(`✓ Removed ${prods.length} demo products and demo collections.`);
}

async function load() {
  await remove();
  const catIds: Record<string, string> = {};
  for (const [i, c] of CATS.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { group: c.group },
      create: { slug: c.slug, name: c.name, group: c.group, sortOrder: i }
    });
    catIds[c.slug] = cat.id;
  }
  const ids: string[] = [];
  for (const [i, [name, cat, price, compare, color, , imgs, soldOut]] of P.entries()) {
    const slug = `demo-${slugify(name.replace(/^Demo /, ''))}`;
    const sizes = cat === 'demo-caps' ? ['OS'] : ['S', 'M', 'L', 'XL', 'XXL'];
    const p = await prisma.product.create({
      data: {
        name,
        slug,
        description: 'DEMO PRODUCT for previewing the store design. Heavyweight 280 GSM cotton with a relaxed, dropped-shoulder fit.',
        details: '280 GSM combed cotton\nRibbed neck\nTwin-needle finish',
        fitGuide: 'Oversized. Take your usual size for a relaxed fit.',
        basePrice: price * 100,
        comparePrice: compare ? compare * 100 : null,
        isFeatured: i < 4,
        colorGroup: color,
        categoryId: catIds[cat],
        images: { create: imgs.map((id, k) => ({ url: U(id), sortOrder: k, isCover: k === 0 })) },
        variants: {
          create: sizes.map((s, k) => ({
            size: s,
            sku: `${slug.toUpperCase()}-${s}`,
            stockQuantity: soldOut ? 0 : k === 0 ? 3 : 10 + k * 5
          }))
        }
      }
    });
    ids.push(p.id);
  }
  for (const [i, c] of COLLECTIONS.entries()) {
    await prisma.collection.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: 'Demo collection for previewing the homepage.',
        bannerImageUrl: c.banner,
        homeLayout: c.layout,
        showInGallery: true,
        showInMenu: true,
        sortOrder: i,
        products: { create: c.pick.map((idx, k) => ({ productId: ids[idx], sortOrder: k })) }
      }
    });
  }
  console.log(`✓ Loaded ${ids.length} demo products and ${COLLECTIONS.length} demo collections.`);
}

(process.argv[2] === 'remove' ? remove() : load())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
