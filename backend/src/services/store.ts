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
  heroDesktopImage: string;
  heroMobileImage: string;
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
    'FREE DOMESTIC SHIPPING ON ORDERS ABOVE RS. 1,999 • NEW LEVIX DROPS LIVE • EASY EXCHANGES • ',
  heroHeadline: 'STREETWEAR ARCHITECTURE',
  heroSubtitle: 'Heavyweight Custom-Milled Silhouettes & Limited Private Drops.',
  supportEmail: 'levixfashions@gmail.com',
  supportPhone: '',
  instagramHandle: 'thelevix.shop',
  freeShippingThreshold: 1999,
  shippingFee: 150,
  announcementEnabled: false,
  heroDesktopImage: '',
  heroMobileImage: '',
  heroLink: '/collections/all-products',
  heroCtaText: 'Shop now',
  latestDropTitle: 'Latest drop',
  seoTitle: 'Feel the Luxury of Premium Streetwear with LEVIX',
  seoText:
    'LEVIX is an independent streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops. Every piece is designed to drape well, last long and look better with every wear.',
  shippingInfo: 'Dispatched within 1–3 business days.\nFree delivery pan-India above the free-shipping threshold.\nTracking shared as soon as your order ships.',
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
export async function ensureStoreDefaults(): Promise<void> {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  await getSettings();
}
