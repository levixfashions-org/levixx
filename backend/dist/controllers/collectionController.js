import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { productListInclude, serializeProduct } from '../utils/serialize.js';
function orderByFor(sort) {
    switch (sort) {
        case 'price-asc':
            return { basePrice: 'asc' };
        case 'price-desc':
            return { basePrice: 'desc' };
        case 'newest':
            return { createdAt: 'desc' };
        default:
            return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    }
}
/** Curated collections (managed in Admin → Collections) followed by product categories. */
export async function getCollections(_req, res) {
    const [collections, categories] = await Promise.all([
        prisma.collection.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            include: { _count: { select: { products: true } } }
        }),
        prisma.category.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { products: { where: { isActive: true } } } } }
        })
    ]);
    const curated = collections.map((c) => ({
        id: c.id,
        type: 'collection',
        name: c.name,
        slug: c.slug,
        description: c.description,
        bannerImageUrl: c.bannerImageUrl,
        mobileBannerUrl: c.mobileBannerUrl,
        _count: { products: c._count.products }
    }));
    const seen = new Set(curated.map((c) => c.slug));
    const cats = categories
        .filter((c) => !seen.has(c.slug))
        .map((c) => ({
        id: c.id,
        type: 'category',
        name: c.name,
        slug: c.slug,
        description: c.description,
        bannerImageUrl: c.imageUrl,
        group: c.group,
        _count: { products: c._count.products }
    }));
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ collections: [...curated, ...cats] });
}
export async function getCollectionBySlug(req, res) {
    const { slug } = req.params;
    const sort = String(req.query.sort || 'featured');
    const collection = await prisma.collection.findUnique({
        where: { slug },
        include: {
            products: {
                orderBy: { sortOrder: 'asc' },
                include: { product: { include: productListInclude } }
            }
        }
    });
    if (collection && collection.isActive) {
        let products = collection.products.map((cp) => cp.product).filter((p) => p.isActive);
        if (sort === 'price-asc')
            products = products.sort((a, b) => a.basePrice - b.basePrice);
        else if (sort === 'price-desc')
            products = products.sort((a, b) => b.basePrice - a.basePrice);
        else if (sort === 'newest')
            products = products.sort((a, b) => +b.createdAt - +a.createdAt);
        res.json({
            collection: {
                id: collection.id,
                type: 'collection',
                name: collection.name,
                slug: collection.slug,
                description: collection.description,
                bannerImageUrl: collection.bannerImageUrl,
                mobileBannerUrl: collection.mobileBannerUrl
            },
            products: products.map(serializeProduct)
        });
        return;
    }
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category)
        throw new AppError('Collection not found', 404);
    const products = await prisma.product.findMany({
        where: { isActive: true, categoryId: category.id },
        orderBy: orderByFor(sort),
        take: 200,
        include: productListInclude
    });
    res.json({
        collection: {
            id: category.id,
            type: 'category',
            name: category.name,
            slug: category.slug,
            description: category.description,
            bannerImageUrl: category.imageUrl,
            group: category.group
        },
        products: products.map(serializeProduct)
    });
}
