import { prisma } from '../config/db.js';
export const DEFAULT_SETTINGS = {
    announcementText: 'FREE DELIVERY ON ALL ORDERS • THE 1ST DROP IS LIVE • SECURE CHECKOUT • ',
    heroHeadline: 'STREETWEAR ARCHITECTURE',
    heroSubtitle: 'Heavyweight Custom-Milled Silhouettes & Limited Private Drops.',
    supportEmail: 'levixfashions@gmail.com',
    supportPhone: '',
    instagramHandle: 'thelevix.shop',
    freeShippingThreshold: 0,
    shippingFee: 150,
    announcementEnabled: false,
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
    seoText: 'LEVIX is an independent streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops. Every piece is designed to drape well, last long and look better with every wear.',
    shippingInfo: 'Free delivery pan-India on every order, no minimum.\nDispatched within 1–3 business days.\nTracking shared as soon as your order ships.',
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
export function invalidateSettingsCache() {
    cache = null;
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
                    description: 'Carry the calm before the arrow. A hand-inked back print of Shri Ram standing tall with his bow against a rising sun, with "श्री राम" in Devanagari — and a smaller archer print on the front chest. Printed in deep brown on a soft beige base, cut in our signature overlength, drop-shoulder fit. Unisex.',
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
                heroDesktopVideo: `${SITE}/videos/hero-offer-desktop.mp4`,
                heroMobileVideo: `${SITE}/videos/hero-offer-mobile.mp4`,
                defaultsVersion: 5
            }
        });
        cache = null;
        console.log('✓ Homepage videos switched to the offer-price versions.');
    }
}
