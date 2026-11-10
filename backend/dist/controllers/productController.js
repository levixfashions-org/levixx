import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { productListInclude, productFullInclude, serializeProduct } from '../utils/serialize.js';
function buildOrderBy(sort) {
    switch (sort) {
        case 'price-asc':
            return { basePrice: 'asc' };
        case 'price-desc':
            return { basePrice: 'desc' };
        case 'name-asc':
            return { name: 'asc' };
        case 'newest':
            return { createdAt: 'desc' };
        case 'featured':
        default:
            return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    }
}
export async function getProducts(req, res) {
    const { category, collection, search, sort, featured } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '24'), 10) || 24));
    const skip = (page - 1) * take;
    const where = { isActive: true };
    const catSlug = category || collection;
    if (catSlug && !['all', 'all-products', 'new-in'].includes(catSlug)) {
        where.OR = [
            { category: { slug: catSlug } },
            { collections: { some: { collection: { slug: catSlug, isActive: true } } } }
        ];
    }
    if (featured === 'true')
        where.isFeatured = true;
    // Advanced filters
    const and = [];
    const sizes = String(req.query.sizes || '').split(',').map((v) => v.trim().toUpperCase()).filter(Boolean).slice(0, 20);
    const inStock = req.query.inStock === 'true';
    if (sizes.length || inStock) {
        and.push({
            variants: {
                some: {
                    ...(sizes.length ? { size: { in: sizes } } : {}),
                    ...(inStock ? { stockQuantity: { gt: 0 } } : {})
                }
            }
        });
    }
    const colors = String(req.query.colors || '').split(',').map((v) => v.trim().toUpperCase()).filter(Boolean).slice(0, 20);
    if (colors.length)
        and.push({ colorGroup: { in: colors } });
    const minPrice = parseInt(String(req.query.minPrice || ''), 10);
    const maxPrice = parseInt(String(req.query.maxPrice || ''), 10);
    if (Number.isFinite(minPrice) && minPrice > 0)
        and.push({ basePrice: { gte: minPrice } });
    if (Number.isFinite(maxPrice) && maxPrice > 0)
        and.push({ basePrice: { lte: maxPrice } });
    if (and.length)
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...and];
    if (search && search.trim()) {
        // MySQL's default collation is case-insensitive, so `contains` is enough.
        const q = search.trim().slice(0, 100);
        const searchOr = [
            { name: { contains: q } },
            { description: { contains: q } },
            { slug: { contains: q } },
            { category: { name: { contains: q } } }
        ];
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: searchOr }];
    }
    const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({ where, orderBy: buildOrderBy(sort), skip, take, include: productListInclude })
    ]);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({
        products: products.map(serializeProduct),
        pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) }
    });
}
export async function getProductBySlug(req, res) {
    const { slug } = req.params;
    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            ...productFullInclude,
            reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 10 }
        }
    });
    if (!product || !product.isActive) {
        throw new AppError('This product is no longer available', 404);
    }
    const relatedProducts = await prisma.product.findMany({
        where: {
            id: { not: product.id },
            isActive: true,
            ...(product.categoryId ? { categoryId: product.categoryId } : {})
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 4,
        include: productListInclude
    });
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ product: serializeProduct(product), relatedProducts: relatedProducts.map(serializeProduct) });
}
export async function getCategories(_req, res) {
    const categories = await prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: { where: { isActive: true } } } } }
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ categories });
}
/** Distinct sizes / colours / price range for the filter drawer. */
export async function getFilterOptions(_req, res) {
    const [variants, colors, agg] = await Promise.all([
        prisma.productVariant.findMany({ where: { product: { isActive: true } }, distinct: ['size'], select: { size: true } }),
        prisma.product.findMany({ where: { isActive: true, colorGroup: { not: null } }, distinct: ['colorGroup'], select: { colorGroup: true } }),
        prisma.product.aggregate({ where: { isActive: true }, _min: { basePrice: true }, _max: { basePrice: true } })
    ]);
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
        sizes: variants.map((v) => v.size).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)),
        colors: colors.map((c) => c.colorGroup).filter(Boolean),
        minPrice: agg._min.basePrice || 0,
        maxPrice: agg._max.basePrice || 0
    });
}
