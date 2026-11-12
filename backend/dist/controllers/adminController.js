import { patchSchema } from '../utils/zodPatch.js';
import { z } from 'zod';
import { DiscountType, OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { productFullInclude, serializeProduct, slugify } from '../utils/serialize.js';
import { getSettings, saveSettings } from '../services/store.js';
import { formatAddress } from '../services/orders.js';
/* ----------------------------------------------------------------------------------------------
 * Dashboard
 * --------------------------------------------------------------------------------------------*/
export async function getDashboardMetrics(_req, res) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [paidAgg, todayAgg, paidOrders, toFulfil, totalCustomers, totalProducts, lowStockVariants, recentOrders, subscribers] = await Promise.all([
        prisma.order.aggregate({ where: { paymentStatus: PaymentStatus.PAID }, _sum: { totalPaise: true } }),
        prisma.order.aggregate({
            where: { paymentStatus: PaymentStatus.PAID, paidAt: { gte: startOfToday } },
            _sum: { totalPaise: true },
            _count: true
        }),
        prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID } }),
        prisma.order.count({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] } } }),
        prisma.user.count({ where: { role: Role.CUSTOMER } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.productVariant.findMany({
            where: { stockQuantity: { lte: 5 }, product: { isActive: true } },
            orderBy: { stockQuantity: 'asc' },
            include: { product: { select: { name: true, slug: true } } },
            take: 20
        }),
        prisma.order.findMany({
            where: { paymentStatus: PaymentStatus.PAID },
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: { items: true }
        }),
        prisma.subscriber.count()
    ]);
    const totalRevenuePaise = paidAgg._sum.totalPaise || 0;
    res.set('Cache-Control', 'no-store');
    res.json({
        metrics: {
            totalOrders: paidOrders,
            ordersToFulfil: toFulfil,
            totalRevenuePaise,
            totalRevenueINR: Math.round(totalRevenuePaise / 100),
            todayRevenueINR: Math.round((todayAgg._sum.totalPaise || 0) / 100),
            todayOrders: todayAgg._count,
            totalCustomers,
            totalProducts,
            lowStockAlertsCount: lowStockVariants.length,
            subscribers
        },
        lowStockVariants,
        recentOrders
    });
}
/* ----------------------------------------------------------------------------------------------
 * Orders
 * --------------------------------------------------------------------------------------------*/
export async function getAllOrders(req, res) {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const includeUnpaid = req.query.includeUnpaid === 'true';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10) || 100));
    const where = {};
    if (status && status !== 'ALL' && Object.values(OrderStatus).includes(status)) {
        where.status = status;
    }
    else if (!includeUnpaid) {
        // Hide abandoned checkouts (payment never completed) unless asked for.
        where.NOT = { status: OrderStatus.PENDING, paymentStatus: { not: PaymentStatus.PAID } };
    }
    if (search) {
        where.OR = [
            { orderNumber: { contains: search } },
            { customerName: { contains: search } },
            { customerEmail: { contains: search } },
            { customerPhone: { contains: search } }
        ];
    }
    const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * take,
            take,
            include: { items: true, payment: { select: { razorpayPaymentId: true, status: true } } }
        })
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
        orders: orders.map(({ accessKey, ...o }) => ({ ...o, shippingAddress: formatAddress(o.shippingAddressSnapshot) })),
        pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) }
    });
}
const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    courier: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    adminNotes: z.string().max(5000).optional(),
    markCodPaid: z.boolean().optional()
});
export async function updateOrder(req, res) {
    const data = updateOrderSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order)
        throw new AppError('Order not found', 404);
    if (data.status && data.status !== OrderStatus.CANCELLED && data.status !== OrderStatus.PENDING) {
        if (order.paymentStatus !== PaymentStatus.PAID && order.paymentMethod !== 'COD') {
            throw new AppError('This order has not been paid yet, so it cannot be moved to fulfilment', 400);
        }
    }
    if (data.markCodPaid) {
        if (order.paymentMethod !== 'COD')
            throw new AppError('Only Cash on Delivery orders can be marked as paid here', 400);
        if (order.status === OrderStatus.CANCELLED)
            throw new AppError('This order is cancelled', 400);
    }
    const updated = await prisma.$transaction(async (tx) => {
        // Return stock to inventory if a paid order is cancelled.
        if (data.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED && order.stockDeducted) {
            for (const item of order.items) {
                if (item.variantId) {
                    await tx.productVariant.updateMany({
                        where: { id: item.variantId },
                        data: { stockQuantity: { increment: item.quantity } }
                    });
                }
            }
        }
        return tx.order.update({
            where: { id: order.id },
            data: {
                ...(data.status ? { status: data.status } : {}),
                ...(data.status === OrderStatus.CANCELLED && order.stockDeducted ? { stockDeducted: false } : {}),
                ...(data.courier !== undefined ? { courier: data.courier || null } : {}),
                ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber || null } : {}),
                ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes || null } : {}),
                ...(data.markCodPaid && order.paymentStatus !== PaymentStatus.PAID ? { paymentStatus: PaymentStatus.PAID, paidAt: new Date() } : {})
            },
            include: { items: true }
        });
    });
    const { accessKey, ...o } = updated;
    res.json({ order: { ...o, shippingAddress: formatAddress(o.shippingAddressSnapshot) } });
}
export async function deleteOrder(req, res) {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order)
        throw new AppError('Order not found', 404);
    if (order.paymentStatus === PaymentStatus.PAID) {
        throw new AppError('Paid orders are kept for your records. Mark it as CANCELLED instead.', 400);
    }
    await prisma.order.delete({ where: { id: order.id } });
    res.json({ success: true });
}
/* ----------------------------------------------------------------------------------------------
 * Products
 * --------------------------------------------------------------------------------------------*/
/** An image is either an uploaded file (/media/…) or a full https:// link (e.g. Hostinger). */
const imageUrl = z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https?:\/\//i.test(v) || /^\/media\/[0-9a-f-]{36}\.[a-z]+(#lx=[\d.,]+)?$/i.test(v), 'Each image must be uploaded or be a full https:// link');
const imageSchema = z.object({
    url: imageUrl,
    altText: z.string().max(200).optional().nullable(),
    color: z.string().trim().max(40).optional().nullable(),
    isCover: z.boolean().optional(),
    sortOrder: z.number().int().optional()
});
const variantSchema = z.object({
    size: z.string().trim().min(1).max(10),
    color: z.string().trim().max(40).optional().nullable(),
    colorHex: z
        .string()
        .trim()
        .regex(/^#[0-9a-f]{6}$/i, 'Colour code must look like #1A2B3C')
        .optional()
        .nullable()
        .or(z.literal('')),
    stockQuantity: z.number().int().min(0).max(100000),
    priceDelta: z.number().int().default(0)
});
const productSchema = z.object({
    name: z.string().trim().min(2).max(190),
    slug: z.string().trim().max(120).optional(),
    description: z.string().trim().min(5, 'Description must be at least 5 characters').max(20000),
    details: z.string().max(20000).optional().nullable(),
    fabricCare: z.string().max(20000).optional().nullable(),
    fitGuide: z.string().max(20000).optional().nullable(),
    basePrice: z.number().int().positive('Price must be more than 0'),
    comparePrice: z.number().int().positive().optional().nullable(),
    categoryId: z.string().max(120).optional().nullable(),
    categoryName: z.string().max(120).optional().nullable(),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    colorGroup: z.string().trim().max(30).optional().nullable().transform((v) => (v ? v.toUpperCase() : null)),
    gender: z.enum(['MEN', 'WOMEN', 'UNISEX']).default('UNISEX'),
    collectionIds: z.array(z.string().max(64)).max(50).optional(),
    images: z.array(imageSchema).min(1, 'Add at least one product image').max(60),
    variants: z.array(variantSchema).min(1, 'Add at least one size').max(200)
});
async function resolveCategoryId(categoryId, categoryName) {
    if (categoryId) {
        const found = await prisma.category.findFirst({ where: { OR: [{ id: categoryId }, { slug: categoryId }] } });
        if (found)
            return found.id;
    }
    if (categoryName && categoryName.trim()) {
        const slug = slugify(categoryName);
        const cat = await prisma.category.upsert({
            where: { slug },
            update: {},
            create: { name: categoryName.trim(), slug }
        });
        return cat.id;
    }
    return null;
}
function normaliseImages(images) {
    return images.map((img, idx) => ({
        url: img.url,
        altText: img.altText || null,
        color: img.color?.trim() || null,
        sortOrder: idx,
        isCover: idx === 0
    }));
}
const variantKey = (color, size) => `${(color || '').trim().toLowerCase()}|${size.trim().toUpperCase()}`;
function buildSku(slug, size, color) {
    const c = color ? `-${color.toUpperCase().replace(/[^A-Z0-9]+/g, '')}` : '';
    return `${slug.toUpperCase()}${c}-${size.toUpperCase()}`.slice(0, 180);
}
function dedupeVariants(variants) {
    const map = new Map();
    for (const v of variants) {
        const color = v.color?.trim() || null;
        map.set(variantKey(color, v.size), {
            size: v.size.trim().toUpperCase(),
            color,
            colorHex: color && v.colorHex ? v.colorHex.toUpperCase() : null,
            stockQuantity: v.stockQuantity,
            priceDelta: v.priceDelta ?? 0
        });
    }
    return [...map.values()];
}
async function loadAdminProduct(id) {
    const p = await prisma.product.findUnique({
        where: { id },
        include: { ...productFullInclude, collections: { select: { collectionId: true } } }
    });
    return p ? { ...p, collectionIds: p.collections.map((c) => c.collectionId) } : p;
}
/** Puts a product into exactly these collections (keeps its position in collections it was already in). */
async function setProductCollections(productId, collectionIds) {
    const unique = [...new Set(collectionIds)];
    const valid = await prisma.collection.findMany({ where: { id: { in: unique } }, select: { id: true } });
    const validIds = valid.map((v) => v.id);
    await prisma.collectionProduct.deleteMany({ where: { productId, collectionId: { notIn: validIds } } });
    for (const collectionId of validIds) {
        const exists = await prisma.collectionProduct.findUnique({ where: { collectionId_productId: { collectionId, productId } } });
        if (!exists) {
            const max = await prisma.collectionProduct.aggregate({ where: { collectionId }, _max: { sortOrder: true } });
            await prisma.collectionProduct.create({ data: { collectionId, productId, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
        }
    }
}
/** PUT /admin/products/reorder — body { ids: [...] } in the order they should appear on the shop. */
export async function reorderProducts(req, res) {
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(2000) }).parse(req.body);
    const unique = [...new Set(ids)];
    await prisma.$transaction(unique.map((id, i) => prisma.product.updateMany({ where: { id }, data: { position: i + 1 } })));
    res.json({ success: true, count: unique.length });
}
/** PUT /admin/categories/reorder — body { ids } in display order (menu, slideshow, stories). */
export async function reorderCategories(req, res) {
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500) }).parse(req.body);
    await prisma.$transaction([...new Set(ids)].map((id, i) => prisma.category.updateMany({ where: { id }, data: { sortOrder: i } })));
    res.json({ success: true });
}
export async function getAdminProducts(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const products = await prisma.product.findMany({
        where: search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {},
        orderBy: [{ position: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 500,
        include: { ...productFullInclude, collections: { select: { collectionId: true } } }
    });
    res.set('Cache-Control', 'no-store');
    res.json({
        products: products.map((p) => ({ ...serializeProduct(p), collectionIds: p.collections.map((c) => c.collectionId) }))
    });
}
export async function createProduct(req, res) {
    const data = productSchema.parse(req.body);
    const slug = slugify(data.slug || data.name);
    if (!slug)
        throw new AppError('Please enter a valid product name', 400);
    if (data.comparePrice && data.comparePrice <= data.basePrice)
        data.comparePrice = null;
    const categoryId = await resolveCategoryId(data.categoryId, data.categoryName);
    const variants = dedupeVariants(data.variants);
    const product = await prisma.product.create({
        data: {
            name: data.name,
            slug,
            description: data.description,
            details: data.details || null,
            fabricCare: data.fabricCare || null,
            fitGuide: data.fitGuide || null,
            basePrice: data.basePrice,
            comparePrice: data.comparePrice || null,
            isFeatured: data.isFeatured,
            isActive: data.isActive,
            colorGroup: data.colorGroup || null,
            gender: data.gender,
            categoryId,
            images: { create: normaliseImages(data.images) },
            variants: {
                create: variants.map((v) => ({
                    size: v.size,
                    color: v.color,
                    colorHex: v.colorHex,
                    sku: buildSku(slug, v.size, v.color),
                    stockQuantity: v.stockQuantity,
                    priceDelta: v.priceDelta
                }))
            }
        },
        include: productFullInclude
    });
    if (data.collectionIds?.length)
        await setProductCollections(product.id, data.collectionIds);
    res.status(201).json({ product: serializeProduct(await loadAdminProduct(product.id)) });
}
export async function updateProduct(req, res) {
    const { id } = req.params;
    const data = patchSchema(productSchema).parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing)
        throw new AppError('Product not found', 404);
    const slug = data.slug !== undefined || data.name !== undefined ? slugify(data.slug || data.name || existing.slug) : existing.slug;
    const basePrice = data.basePrice ?? existing.basePrice;
    let comparePrice = data.comparePrice !== undefined ? data.comparePrice : existing.comparePrice;
    if (comparePrice && comparePrice <= basePrice)
        comparePrice = null;
    const categoryId = data.categoryId !== undefined || data.categoryName !== undefined
        ? await resolveCategoryId(data.categoryId, data.categoryName)
        : existing.categoryId;
    await prisma.$transaction(async (tx) => {
        await tx.product.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                slug,
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.details !== undefined ? { details: data.details || null } : {}),
                ...(data.fabricCare !== undefined ? { fabricCare: data.fabricCare || null } : {}),
                ...(data.fitGuide !== undefined ? { fitGuide: data.fitGuide || null } : {}),
                basePrice,
                comparePrice: comparePrice || null,
                categoryId,
                ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                ...(data.colorGroup !== undefined ? { colorGroup: data.colorGroup || null } : {}),
                ...(req.body.gender !== undefined && data.gender ? { gender: data.gender } : {})
            }
        });
        if (data.images) {
            await tx.productImage.deleteMany({ where: { productId: id } });
            await tx.productImage.createMany({ data: normaliseImages(data.images).map((img) => ({ ...img, productId: id })) });
        }
        if (data.variants) {
            const incoming = dedupeVariants(data.variants);
            const keys = new Set(incoming.map((v) => variantKey(v.color, v.size)));
            // Remove colour/size combinations that were deleted (cart lines go with them; past orders keep a snapshot).
            const removed = existing.variants.filter((v) => !keys.has(variantKey(v.color, v.size)));
            if (removed.length) {
                await tx.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
            }
            // Temporary SKUs first so renamed colours never clash with the unique SKU index.
            const kept = existing.variants.filter((v) => keys.has(variantKey(v.color, v.size)));
            for (const v of kept) {
                await tx.productVariant.update({ where: { id: v.id }, data: { sku: `TMP-${v.id}` } });
            }
            for (const v of incoming) {
                const match = kept.find((ev) => variantKey(ev.color, ev.size) === variantKey(v.color, v.size));
                const data = {
                    size: v.size,
                    color: v.color,
                    colorHex: v.colorHex,
                    sku: buildSku(slug, v.size, v.color),
                    stockQuantity: v.stockQuantity,
                    priceDelta: v.priceDelta
                };
                if (match)
                    await tx.productVariant.update({ where: { id: match.id }, data });
                else
                    await tx.productVariant.create({ data: { ...data, productId: id } });
            }
        }
        else if (slug !== existing.slug) {
            for (const v of existing.variants) {
                await tx.productVariant.update({ where: { id: v.id }, data: { sku: buildSku(slug, v.size, v.color) } });
            }
        }
    }, { timeout: 20000 });
    if (data.collectionIds)
        await setProductCollections(id, data.collectionIds);
    res.json({ product: serializeProduct(await loadAdminProduct(id)) });
}
export async function deleteProduct(req, res) {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
    if (!product)
        throw new AppError('Product not found', 404);
    if (product._count.orderItems > 0) {
        // Keep it for order history, just hide it from the store.
        await prisma.product.update({ where: { id }, data: { isActive: false } });
        res.json({ success: true, archived: true, message: 'Product has past orders, so it was hidden from the store instead of deleted.' });
        return;
    }
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, archived: false });
}
/* ----------------------------------------------------------------------------------------------
 * Categories
 * --------------------------------------------------------------------------------------------*/
const categorySchema = z.object({
    name: z.string().trim().min(2).max(120),
    group: z.enum(['TOP', 'BOTTOM', 'ACCESSORIES']).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    imageUrl: imageUrl.optional().nullable().or(z.literal('')),
    sortOrder: z.number().int().optional()
});
export async function createCategory(req, res) {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({
        data: {
            name: data.name,
            slug: slugify(data.name),
            description: data.description || null,
            imageUrl: data.imageUrl || null,
            sortOrder: data.sortOrder ?? 0,
            group: data.group || 'TOP'
        }
    });
    res.status(201).json({ category });
}
export async function updateCategory(req, res) {
    const data = patchSchema(categorySchema).parse(req.body);
    const category = await prisma.category.update({
        where: { id: req.params.id },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.description !== undefined ? { description: data.description || null } : {}),
            ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
            ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            ...(data.group !== undefined ? { group: data.group || 'TOP' } : {})
        }
    });
    res.json({ category });
}
export async function deleteCategory(req, res) {
    // Products in this category stay, they just become uncategorised.
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
}
/* ----------------------------------------------------------------------------------------------
 * Store settings
 * --------------------------------------------------------------------------------------------*/
const settingsSchema = patchSchema(z.object({
    announcementText: z.string().max(1000),
    heroHeadline: z.string().max(190),
    heroSubtitle: z.string().max(1000),
    supportEmail: z.string().trim().email().or(z.literal('')),
    supportPhone: z.string().trim().max(30),
    instagramHandle: z.string().trim().max(100).transform((v) => v.replace(/^@/, '')),
    freeShippingThreshold: z.coerce.number().int().min(0).max(1000000),
    shippingFee: z.coerce.number().int().min(0).max(100000),
    announcementEnabled: z.boolean(),
    menCoverImage: z.string().trim().max(2000).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith('/'), 'Cover image must be uploaded or a full URL'),
    womenCoverImage: z.string().trim().max(2000).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith('/'), 'Cover image must be uploaded or a full URL'),
    heroDesktopImage: z.string().trim().max(2000).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith('/'), 'Hero image must be a full URL'),
    heroMobileImage: z.string().trim().max(2000).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith('/'), 'Hero image must be a full URL'),
    heroDesktopVideo: z.string().trim().max(2000).refine((v) => !v || /^\/media\/[0-9a-f-]{36}\.(mp4|webm|mov)$/i.test(v) || /^https:\/\//.test(v), 'Hero video must be an uploaded video'),
    heroMobileVideo: z.string().trim().max(2000).refine((v) => !v || /^\/media\/[0-9a-f-]{36}\.(mp4|webm|mov)$/i.test(v) || /^https:\/\//.test(v), 'Hero video must be an uploaded video'),
    heroLink: z.string().trim().max(500),
    legalName: z.string().trim().max(190),
    businessAddress: z.string().trim().max(1000),
    grievanceOfficer: z.string().trim().max(190),
    gstin: z.string().trim().toUpperCase().max(15).refine((v) => !v || /^[0-9A-Z]{15}$/.test(v), 'GSTIN must be 15 letters/numbers'),
    jurisdictionCity: z.string().trim().max(100),
    codEnabled: z.boolean(),
    codFee: z.coerce.number().int().min(0).max(1000),
    codMaxOrder: z.coerce.number().int().min(0).max(1000000),
    heroCtaText: z.string().trim().max(60),
    latestDropTitle: z.string().trim().max(100),
    seoTitle: z.string().max(300),
    seoText: z.string().max(20000),
    shippingInfo: z.string().max(5000),
    careInfo: z.string().max(5000)
}));
export async function getAdminStoreSettings(_req, res) {
    res.json({ settings: await getSettings() });
}
export async function updateAdminStoreSettings(req, res) {
    const data = settingsSchema.parse(req.body);
    const settings = await saveSettings(data);
    res.json({ success: true, settings });
}
/* ----------------------------------------------------------------------------------------------
 * Discount codes (stored in the Coupon table and applied at checkout)
 * --------------------------------------------------------------------------------------------*/
function toDiscountDto(c) {
    return {
        id: c.id,
        code: c.code,
        type: c.discountType,
        // percentage → percent; fixed → rupees
        value: c.discountType === DiscountType.FIXED ? c.discountValue / 100 : c.discountValue,
        minOrderPaise: c.minOrderPaise,
        isActive: c.isActive,
        expiresAt: c.validUntil ? c.validUntil.toISOString().slice(0, 10) : '',
        maxUses: c.maxUses,
        usedCount: c.usedCount
    };
}
const discountSchema = z.object({
    code: z
        .string()
        .trim()
        .min(3)
        .max(30)
        .transform((v) => v.toUpperCase())
        .refine((v) => /^[A-Z0-9_-]+$/.test(v), 'Use only letters, numbers, - and _'),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.coerce.number().positive(),
    minOrderINR: z.coerce.number().min(0).default(0),
    expiresAt: z.string().optional().or(z.literal('')),
    isActive: z.boolean().default(true),
    maxUses: z.coerce.number().int().positive().optional().nullable()
});
export async function getAdminDiscounts(_req, res) {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ discounts: coupons.map(toDiscountDto) });
}
export async function createAdminDiscount(req, res) {
    const data = discountSchema.parse(req.body);
    if (data.type === 'PERCENTAGE' && data.value > 90)
        throw new AppError('Percentage discount cannot be more than 90%', 400);
    let validUntil = null;
    if (data.expiresAt) {
        validUntil = new Date(`${data.expiresAt}T23:59:59+05:30`);
        if (isNaN(validUntil.getTime()))
            throw new AppError('Invalid expiry date', 400);
    }
    const coupon = await prisma.coupon.create({
        data: {
            code: data.code,
            discountType: data.type === 'FIXED' ? DiscountType.FIXED : DiscountType.PERCENTAGE,
            discountValue: data.type === 'FIXED' ? Math.round(data.value * 100) : Math.round(data.value),
            minOrderPaise: Math.round(data.minOrderINR * 100),
            isActive: data.isActive,
            validUntil,
            maxUses: data.maxUses ?? null
        }
    });
    res.status(201).json({ success: true, discount: toDiscountDto(coupon) });
}
export async function toggleAdminDiscount(req, res) {
    const coupon = await prisma.coupon.findFirst({ where: { OR: [{ id: req.params.id }, { code: req.params.id }] } });
    if (!coupon)
        throw new AppError('Discount code not found', 404);
    const updated = await prisma.coupon.update({ where: { id: coupon.id }, data: { isActive: !coupon.isActive } });
    res.json({ success: true, discount: toDiscountDto(updated) });
}
export async function deleteAdminDiscount(req, res) {
    await prisma.coupon.deleteMany({ where: { OR: [{ id: req.params.id }, { code: req.params.id }] } });
    res.json({ success: true });
}
/* ----------------------------------------------------------------------------------------------
 * Newsletter subscribers
 * --------------------------------------------------------------------------------------------*/
export async function exportSubscribers(req, res) {
    const subs = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    if (req.query.format === 'json') {
        res.json({ total: subs.length, subscribers: subs });
        return;
    }
    const csv = ['email,subscribed_at', ...subs.map((s) => `${s.email},${s.createdAt.toISOString()}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="levix-subscribers.csv"');
    res.send(csv);
}
/* ----------------------------------------------------------------------------------------------
 * Curated collections (homepage sections, banner slideshow, menu)
 * --------------------------------------------------------------------------------------------*/
const collectionSchema = z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(120).optional(),
    description: z.string().max(5000).optional().nullable(),
    bannerImageUrl: imageUrl.optional().nullable().or(z.literal('')),
    mobileBannerUrl: imageUrl.optional().nullable().or(z.literal('')),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().default(0),
    homeLayout: z.enum(['NONE', 'CAROUSEL', 'GRID']).default('NONE'),
    showInGallery: z.boolean().default(false),
    showInMenu: z.boolean().default(true),
    productIds: z.array(z.string().max(64)).max(500).optional()
});
export async function getAdminCollections(_req, res) {
    const collections = await prisma.collection.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: { products: { orderBy: { sortOrder: 'asc' }, select: { productId: true } } }
    });
    res.set('Cache-Control', 'no-store');
    res.json({
        collections: collections.map(({ products, ...c }) => ({ ...c, productIds: products.map((p) => p.productId) }))
    });
}
async function setCollectionProducts(collectionId, productIds) {
    const unique = [...new Set(productIds)];
    const valid = new Set((await prisma.product.findMany({ where: { id: { in: unique } }, select: { id: true } })).map((p) => p.id));
    const ordered = unique.filter((id) => valid.has(id));
    await prisma.$transaction([
        prisma.collectionProduct.deleteMany({ where: { collectionId } }),
        prisma.collectionProduct.createMany({ data: ordered.map((productId, idx) => ({ collectionId, productId, sortOrder: idx })) })
    ]);
}
export async function createCollection(req, res) {
    const data = collectionSchema.parse(req.body);
    const slug = slugify(data.slug || data.name);
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (clash)
        throw new AppError(`"${slug}" is already used by a category. Choose a different name or handle.`, 409);
    const collection = await prisma.collection.create({
        data: {
            name: data.name,
            slug,
            description: data.description || null,
            bannerImageUrl: data.bannerImageUrl || null,
            mobileBannerUrl: data.mobileBannerUrl || null,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
            homeLayout: data.homeLayout,
            showInGallery: data.showInGallery,
            showInMenu: data.showInMenu
        }
    });
    if (data.productIds)
        await setCollectionProducts(collection.id, data.productIds);
    res.status(201).json({ collection });
}
export async function updateCollection(req, res) {
    const data = patchSchema(collectionSchema).parse(req.body);
    const existing = await prisma.collection.findUnique({ where: { id: req.params.id } });
    if (!existing)
        throw new AppError('Collection not found', 404);
    const slug = data.slug !== undefined ? slugify(data.slug || data.name || existing.name) : existing.slug;
    if (slug !== existing.slug && (await prisma.category.findUnique({ where: { slug } }))) {
        throw new AppError(`"${slug}" is already used by a category.`, 409);
    }
    const collection = await prisma.collection.update({
        where: { id: existing.id },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            slug,
            ...(data.description !== undefined ? { description: data.description || null } : {}),
            ...(data.bannerImageUrl !== undefined ? { bannerImageUrl: data.bannerImageUrl || null } : {}),
            ...(data.mobileBannerUrl !== undefined ? { mobileBannerUrl: data.mobileBannerUrl || null } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            ...(data.homeLayout !== undefined ? { homeLayout: data.homeLayout } : {}),
            ...(data.showInGallery !== undefined ? { showInGallery: data.showInGallery } : {}),
            ...(data.showInMenu !== undefined ? { showInMenu: data.showInMenu } : {})
        }
    });
    if (data.productIds)
        await setCollectionProducts(collection.id, data.productIds);
    res.json({ collection });
}
export async function deleteCollection(req, res) {
    await prisma.collection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
}
