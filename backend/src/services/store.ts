import { prisma } from '../config/db.js';

export interface PublicStoreSettings {
  announcementText: string;
  heroHeadline: string;
  heroSubtitle: string;
  supportEmail: string;
  supportPhone: string;
  instagramHandle: string;
  freeShippingThreshold: number; // rupees
  shippingFee: number; // rupees
  announcementEnabled: boolean;
  menCoverImage: string;
  googleSiteVerification: string;
  introTagline: string;
  introSubline: string;
  womenCoverImage: string;
  heroDesktopImage: string;
  heroMobileImage: string;
  heroDesktopVideo: string;
  heroMobileVideo: string;
  legalName: string;
  businessAddress: string;
  grievanceOfficer: string;
  gstin: string;
  jurisdictionCity: string;
  codEnabled: boolean;
  codFee: number; // rupees
  codMaxOrder: number; // rupees, 0 = no limit
  heroLink: string;
  heroCtaText: string;
  latestDropTitle: string;
  seoTitle: string;
  seoText: string;
  shippingInfo: string;
  careInfo: string;
}

export const DEFAULT_SETTINGS: PublicStoreSettings = {
  announcementText:
    'FREE DELIVERY ON ALL ORDERS • THE 1ST DROP IS LIVE • SECURE CHECKOUT • ',
  heroHeadline: 'STREETWEAR ARCHITECTURE',
  heroSubtitle: 'Heavyweight Custom-Milled Silhouettes & Limited Private Drops.',
  supportEmail: 'levixfashions@gmail.com',
  supportPhone: '',
  instagramHandle: 'thelevix.shop',
  freeShippingThreshold: 0,
  shippingFee: 150,
  announcementEnabled: false,
  menCoverImage: '',
  googleSiteVerification: '',
  introTagline: 'Level up your style',
  introSubline: 'The 1st Drop is live',
  womenCoverImage: '',
  heroDesktopImage: '',
  heroMobileImage: '',
  heroDesktopVideo: '',
  heroMobileVideo: '',
  legalName: 'LEVIX',
  businessAddress: '',
  grievanceOfficer: '',
  gstin: '',
  jurisdictionCity: '',
  codEnabled: false,
  codFee: 0,
  codMaxOrder: 0,
  heroLink: '/collections/all-products',
  heroCtaText: 'Shop now',
  latestDropTitle: 'Latest drop',
  seoTitle: 'Feel the Luxury of Premium Streetwear with LEVIX',
  seoText:
    'LEVIX is an independent streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops. Every piece is designed to drape well, last long and look better with every wear.',
  shippingInfo: 'Free delivery pan-India on every order, no minimum.\nDispatched within 2–5 business days.\nTracking shared as soon as your order ships.',
  careInfo: 'Wash cold, inside out.\nDo not bleach.\nDo not tumble dry.\nIron on reverse, avoiding prints.'
};

export const DEFAULT_CATEGORIES = [
  {
    name: 'Overlength T-Shirts',
    slug: 'overlength-t-shirts',
    description: 'Elongated drape and dropped-shoulder streetwear silhouettes cut from heavyweight combed cotton.',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1400&q=80',
    sortOrder: 0,
    group: 'TOP'
  },
  {
    name: 'Waffle Boxy Fit Full Sleeves',
    slug: 'waffle-boxy-fit-full-sleeves',
    description: 'Heavyweight thermal waffle-knit long sleeves with an exaggerated boxy fit.',
    imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1400&q=80',
    sortOrder: 1,
    group: 'TOP'
  },
  {
    name: 'Acid Wash T-Shirts',
    slug: 'acid-wash-t-shirts',
    description: 'Vintage hand-treated mineral and acid wash tees with a lived-in finish.',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1400&q=80',
    sortOrder: 2,
    group: 'TOP'
  }
];

let cache: { value: PublicStoreSettings; expires: number } | null = null;
const CACHE_MS = 30 * 1000;

function toPublic(row: any): PublicStoreSettings {
  const out: any = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof PublicStoreSettings)[]) {
    const v = row?.[key];
    out[key] = v === null || v === undefined ? DEFAULT_SETTINGS[key] : v;
  }
  return out as PublicStoreSettings;
}

export function invalidateSettingsCache() {
  cache = null;
}

export async function getSettings(): Promise<PublicStoreSettings> {
  if (cache && cache.expires > Date.now()) return cache.value;
  const row = await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', ...DEFAULT_SETTINGS }
  });
  const value = toPublic(row);
  cache = { value, expires: Date.now() + CACHE_MS };
  return value;
}

export async function saveSettings(data: Partial<PublicStoreSettings>): Promise<PublicStoreSettings> {
  const row = await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...DEFAULT_SETTINGS, ...data }
  });
  const value = toPublic(row);
  cache = { value, expires: Date.now() + CACHE_MS };
  return value;
}

/** Shipping in paise for a given subtotal in paise. */
export function calculateShippingPaise(subtotalPaise: number, settings: PublicStoreSettings): number {
  if (subtotalPaise <= 0) return 0;
  const threshold = Math.max(0, settings.freeShippingThreshold) * 100;
  if (threshold === 0 || subtotalPaise >= threshold) return 0;
  return Math.max(0, settings.shippingFee) * 100;
}

/** Creates the default categories and settings row if they don't exist yet. Safe to run on every boot. */
export const DEFAULT_DROPS = [
  { slug: 'first-drop', name: '1st Drop', sortOrder: 0 },
  { slug: 'second-drop', name: '2nd Drop', sortOrder: 1 },
  { slug: 'third-drop', name: '3rd Drop', sortOrder: 2 }
];

export async function ensureStoreDefaults(): Promise<void> {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  await getSettings();

  // One-time setup (version 1): the 1st / 2nd / 3rd Drop collections.
  // Runs only once, so if the owner later renames or deletes a drop it is never re-created.
  const row = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { defaultsVersion: true } });
  if ((row?.defaultsVersion ?? 0) < 1) {
    for (const d of DEFAULT_DROPS) {
      const exists = await prisma.collection.findUnique({ where: { slug: d.slug } });
      if (!exists) {
        await prisma.collection.create({
          data: { ...d, homeLayout: 'CAROUSEL', showInMenu: true, showInGallery: false, isActive: true }
        });
      }
    }
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 1 } });
    console.log('✓ Created default drop collections (1st, 2nd, 3rd Drop).');
  }
  // Version 2: returns are damage-only now — drop the old "easy exchanges" promise from the announcement bar.
  if ((row?.defaultsVersion ?? 0) < 2) {
    const current = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { announcementText: true } });
    const text = current?.announcementText || '';
    if (/EXCHANGE/i.test(text)) {
      const cleaned = text
        .split('•')
        .map((part) => part.trim())
        .filter((part) => part && !/EXCHANGE/i.test(part))
        .join(' • ');
      await prisma.storeSetting.update({ where: { id: 'default' }, data: { announcementText: cleaned ? `${cleaned} • ` : '' } });
    }
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 2 } });
  }
  // Version 3: free delivery on every order (admin can bring a minimum/fee back any time in Store Settings).
  if ((row?.defaultsVersion ?? 0) < 3) {
    const cur = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { announcementText: true, shippingInfo: true } });
    const ann = (cur?.announcementText || '')
      .split('•')
      .map((part) => part.trim())
      .filter((part) => part && !/(SHIPPING|DELIVERY)/i.test(part));
    const info = (cur?.shippingInfo || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/free[- ](delivery|shipping)/i.test(l));
    await prisma.storeSetting.update({
      where: { id: 'default' },
      data: {
        freeShippingThreshold: 0,
        announcementText: ['FREE DELIVERY ON ALL ORDERS', ...ann].join(' • ') + ' • ',
        shippingInfo: ['Free delivery pan-India on every order, no minimum.', ...info].join('\n'),
        defaultsVersion: 3
      }
    });
    cache = null;
    console.log('✓ Free delivery on all orders switched on.');
  }
  // Version 4: show every product as "MRP ₹799, now at its current price" (strike-through + % off).
  // Selling prices are not changed. Admin can edit "Compare at price" per product afterwards.
  if ((row?.defaultsVersion ?? 0) < 4) {
    const MRP = 79900; // ₹799 in paise
    const updated = await prisma.product.updateMany({
      where: { basePrice: { lt: MRP }, OR: [{ comparePrice: null }, { comparePrice: { lte: MRP } }] },
      data: { comparePrice: MRP }
    });
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 4 } });
    console.log(`✓ Set MRP ₹799 on ${updated.count} products (selling prices unchanged).`);
  }
  // Version 5: add the Shri Ram overlength tee and switch the homepage videos to the offer-price versions.
  if ((row?.defaultsVersion ?? 0) < 5) {
    const SITE = (process.env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
    const slug = 'shri-ram-overlength-tee-beige';
    if (!(await prisma.product.findUnique({ where: { slug } }))) {
      const category = await prisma.category.findUnique({ where: { slug: 'overlength-t-shirts' } });
      // Copy fabric / care / fit text from an existing overlength tee so every product matches.
      const ref = category
        ? await prisma.product.findFirst({ where: { categoryId: category.id, NOT: { details: null } }, orderBy: { createdAt: 'asc' } })
        : null;
      const drop = await prisma.collection.findUnique({ where: { slug: 'first-drop' } });
      const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
      await prisma.product.create({
        data: {
          name: 'Shri Ram Overlength Tee – Beige',
          slug,
          description:
            'Carry the calm before the arrow. A hand-inked back print of Shri Ram standing tall with his bow against a rising sun, with "श्री राम" in Devanagari — and a smaller archer print on the front chest. Printed in deep brown on a soft beige base, cut in our signature overlength, drop-shoulder fit. Unisex.',
          details: ref?.details ?? null,
          fabricCare: ref?.fabricCare ?? null,
          fitGuide: ref?.fitGuide ?? null,
          basePrice: 54900,
          comparePrice: 79900,
          categoryId: category?.id ?? null,
          gender: 'UNISEX',
          colorGroup: 'NEUTRALS',
          isActive: true,
          images: {
            create: [1, 2, 3, 4].map((n, i) => ({
              url: `${SITE}/catalog/shri-ram-overlength-${n}.jpg`,
              altText: ['Front on him', 'Back on him', 'Front on her', 'Back on her'][i],
              sortOrder: i,
              isCover: i === 0
            }))
          },
          variants: {
            create: sizes.map((size) => ({
              size,
              color: 'Beige',
              colorHex: '#E6D7BD',
              sku: `${slug.toUpperCase()}-BEIGE-${size}`,
              stockQuantity: 10
            }))
          },
          ...(drop ? { collections: { create: [{ collectionId: drop.id, sortOrder: 0 }] } } : {})
        }
      });
      console.log('✓ Added Shri Ram Overlength Tee – Beige.');
    }
    await prisma.storeSetting.update({
      where: { id: 'default' },
      data: {
        heroDesktopVideo: `${SITE}/videos/hero-offer-desktop-sound.mp4`,
        heroMobileVideo: `${SITE}/videos/hero-offer-mobile-sound.mp4`,
        defaultsVersion: 5
      }
    });
    cache = null;
    console.log('✓ Homepage videos switched to the offer-price versions.');
  }
  // Version 6: same offer videos, now with the beat soundtrack (the "Sound on" button plays it).
  if ((row?.defaultsVersion ?? 0) < 6) {
    const SITE = (process.env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
    const cur = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { heroDesktopVideo: true, heroMobileVideo: true } });
    // Only replace our own offer videos — never a video the admin uploaded later.
    const swap = (v: string | null | undefined, kind: 'desktop' | 'mobile') =>
      !v || /\/videos\/hero-offer-(desktop|mobile)\.mp4$/.test(v) ? `${SITE}/videos/hero-offer-${kind}-sound.mp4` : v;
    await prisma.storeSetting.update({
      where: { id: 'default' },
      data: {
        heroDesktopVideo: swap(cur?.heroDesktopVideo, 'desktop'),
        heroMobileVideo: swap(cur?.heroMobileVideo, 'mobile'),
        defaultsVersion: 6
      }
    });
    cache = null;
    console.log('✓ Homepage videos now include sound.');
  }
  // Version 7: real LEVIX photos as the category cover images (were stock photos).
  if ((row?.defaultsVersion ?? 0) < 7) {
    const SITE = (process.env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
    const covers: Record<string, string> = {
      'overlength-t-shirts': '/media/00824b88-6976-4cc6-b171-4ae02c086404.jpg', // Hare Krishna – blue Krishna back print
      'waffle-boxy-fit-full-sleeves': '/media/d00265fc-31ed-4a0b-bc96-7515bccbcd52.jpg', // Sacred Vine – off white
      'acid-wash-t-shirts': '/media/d91fcd40-184c-43b1-a7b1-6645545e3e15.jpg' // Lone Wolf – acid red
    };
    for (const [slug, path] of Object.entries(covers)) {
      // Only if the photo still exists and the admin hasn't already chosen their own cover.
      const [cat, file] = await Promise.all([
        prisma.category.findUnique({ where: { slug }, select: { id: true, imageUrl: true } }),
        prisma.mediaFile.findUnique({ where: { id: path.slice(7, 43) }, select: { id: true } }).catch(() => null)
      ]);
      if (cat && file && (!cat.imageUrl || cat.imageUrl.includes('images.unsplash.com'))) {
        await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: `${SITE}${path}` } });
      }
    }
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 7 } });
    console.log('✓ Category covers set to LEVIX product photos.');
  }
  // Version 8: wide 2:1 category banners (3 full-length looks side by side) so nothing gets cut off.
  if ((row?.defaultsVersion ?? 0) < 8) {
    const SITE = (process.env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
    const banners: Record<string, string> = {
      'overlength-t-shirts': 'cat-overlength.jpg',
      'waffle-boxy-fit-full-sleeves': 'cat-waffle.jpg',
      'acid-wash-t-shirts': 'cat-acid.jpg'
    };
    const v7 = ['00824b88-6976-4cc6-b171-4ae02c086404', 'd00265fc-31ed-4a0b-bc96-7515bccbcd52', 'd91fcd40-184c-43b1-a7b1-6645545e3e15'];
    for (const [slug, file] of Object.entries(banners)) {
      const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true, imageUrl: true } });
      const cur = cat?.imageUrl || '';
      // Replace only the old stock photo or the version-7 photo — never a banner the admin uploaded since.
      if (cat && (!cur || cur.includes('images.unsplash.com') || v7.some((id) => cur.includes(id)))) {
        await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: `${SITE}/catalog/${file}` } });
      }
    }
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 8 } });
    console.log('✓ Category banners updated (full-length, no cropping).');
  }
  // Version 9: sharper, edge-to-edge category banners (2400×1200). Only replaces the version-8 files.
  if ((row?.defaultsVersion ?? 0) < 9) {
    const cats = await prisma.category.findMany({ where: { imageUrl: { contains: '/catalog/cat-' } }, select: { id: true, imageUrl: true } });
    for (const c of cats) {
      const next = (c.imageUrl || '').replace(/\/catalog\/cat-(overlength|waffle|acid)\.jpg(#lx=[\d.,]+)?$/, '/catalog/cat-$1-v2.jpg$2');
      if (next !== c.imageUrl) await prisma.category.update({ where: { id: c.id }, data: { imageUrl: next } });
    }
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 9 } });
    cache = null;
    console.log('✓ Category banners sharpened.');
  }
  // Version 10: dispatch time is now 2–5 business days (product page "Shipping" tab text).
  if ((row?.defaultsVersion ?? 0) < 10) {
    const cur = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { shippingInfo: true } });
    const info = (cur?.shippingInfo || '').replace(/1\s*[–-]\s*3 business days/g, '2–5 business days');
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { shippingInfo: info || undefined, defaultsVersion: 10 } });
    cache = null;
    console.log('✓ Dispatch time updated to 2–5 business days.');
  }
  // Version 11: every collection shows on the homepage automatically (as a swipe row) — owner can still hide one.
  if ((row?.defaultsVersion ?? 0) < 11) {
    await prisma.collection.updateMany({ where: { homeLayout: 'NONE' }, data: { homeLayout: 'CAROUSEL' } });
    await prisma.storeSetting.update({ where: { id: 'default' }, data: { defaultsVersion: 11 } });
    cache = null;
    console.log('✓ All collections now appear on the homepage.');
  }
}
