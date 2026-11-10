const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'];

export function sizeRank(size: string): number {
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  if (idx !== -1) return idx;
  const n = Number(size);
  return Number.isFinite(n) ? 100 + n : 1000;
}

export function sortVariants<T extends { size: string }>(variants: T[] = []): T[] {
  return [...variants].sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
}

export function serializeProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    images: [...(p.images || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    variants: sortVariants(p.variants || [])
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export const productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 2 },
  variants: { select: { id: true, productId: true, size: true, sku: true, stockQuantity: true, priceDelta: true } }
};

export const productFullInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true
};
