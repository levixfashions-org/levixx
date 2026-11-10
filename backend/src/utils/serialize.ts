const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'];

export function sizeRank(size: string): number {
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  if (idx !== -1) return idx;
  const n = Number(size);
  return Number.isFinite(n) ? 100 + n : 1000;
}

export function sortVariants<T extends { size: string; color?: string | null; createdAt?: Date }>(variants: T[] = []): T[] {
  // Keep colours in the order they were created, sizes in S→XXL order within each colour.
  const colorOrder = new Map<string, number>();
  [...variants]
    .sort((a, b) => (a.createdAt && b.createdAt ? +a.createdAt - +b.createdAt : 0))
    .forEach((v) => {
      const k = (v.color || '').toLowerCase();
      if (!colorOrder.has(k)) colorOrder.set(k, colorOrder.size);
    });
  return [...variants].sort(
    (a, b) =>
      (colorOrder.get((a.color || '').toLowerCase()) ?? 0) - (colorOrder.get((b.color || '').toLowerCase()) ?? 0) ||
      sizeRank(a.size) - sizeRank(b.size)
  );
}

/** 'men' -> MEN + UNISEX products, 'women' -> WOMEN + UNISEX. Anything else -> no filter. */
export function genderFilter(value?: unknown): { gender: { in: string[] } } | null {
  const v = String(value || '').toLowerCase();
  if (v === 'men') return { gender: { in: ['MEN', 'UNISEX'] } };
  if (v === 'women') return { gender: { in: ['WOMEN', 'UNISEX'] } };
  return null;
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
  images: { orderBy: { sortOrder: 'asc' as const }, take: 8 },
  variants: {
    select: { id: true, productId: true, size: true, color: true, colorHex: true, sku: true, stockQuantity: true, priceDelta: true, createdAt: true }
  }
};

export const productFullInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true
};
