import { prisma } from '../config/db.js';
export const DEFAULT_SETTINGS = {
    announcementText: 'FREE DOMESTIC SHIPPING ON ORDERS ABOVE RS. 1,999 • NEW LEVIX DROPS LIVE • EASY EXCHANGES • ',
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
    seoText: 'LEVIX is an independent streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops. Every piece is designed to drape well, last long and look better with every wear.',
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
let cache = null;
const CACHE_MS = 30 * 1000;
function toPublic(row) {
    const out = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const v = row?.[key];
        out[key] = v === null || v === undefined ? DEFAULT_SETTINGS[key] : v;
    }
    return out;
}
export async function getSettings() {
    if (cache && cache.expires > Date.now())
        return cache.value;
    const row = await prisma.storeSetting.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default', ...DEFAULT_SETTINGS }
    });
    const value = toPublic(row);
    cache = { value, expires: Date.now() + CACHE_MS };
    return value;
}
export async function saveSettings(data) {
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
export function calculateShippingPaise(subtotalPaise, settings) {
    if (subtotalPaise <= 0)
        return 0;
    const threshold = Math.max(0, settings.freeShippingThreshold) * 100;
    if (threshold === 0 || subtotalPaise >= threshold)
        return 0;
    return Math.max(0, settings.shippingFee) * 100;
}
/** Creates the default categories and settings row if they don't exist yet. Safe to run on every boot. */
export const DEFAULT_DROPS = [
    { slug: 'first-drop', name: '1st Drop', sortOrder: 0 },
    { slug: 'second-drop', name: '2nd Drop', sortOrder: 1 },
    { slug: 'third-drop', name: '3rd Drop', sortOrder: 2 }
];
export async function ensureStoreDefaults() {
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
}
