import type { Product, ProductImage } from '../types';

export type Dept = 'men' | 'women';

/** 'men' / 'women' from a URL value (collection handle or ?g=), otherwise undefined. */
export function asDept(v?: string | null): Dept | undefined {
  const s = (v || '').toLowerCase();
  return s === 'men' || s === 'women' ? s : undefined;
}

/**
 * Photos to show for a department. For tees sold to both (photos tagged Men / Women in admin),
 * the Men pages only show men's photos and the Women pages only women's photos.
 * Untagged products keep all their photos, so nothing ever ends up without a picture.
 */
export function imagesForDept(product: Pick<Product, 'images'>, dept?: Dept): ProductImage[] {
  const all = product.images || [];
  if (!dept) return all;
  const want = dept === 'men' ? 'MEN' : 'WOMEN';
  const tagged = all.filter((i) => i.gender === want || i.gender === 'BOTH');
  if (tagged.length) return tagged;
  // Nothing tagged for this department: hide photos clearly tagged for the other one, keep the rest.
  const other = all.filter((i) => !i.gender);
  return other.length ? other : all;
}

/** Product page link that remembers which department the customer came from. */
export const productHref = (slug: string, dept?: Dept) => `/products/${slug}${dept ? `?g=${dept}` : ''}`;

/** False when every photo of the product is tagged for the other department (e.g. only men's photos on the Women page). */
export function showsInDept(product: Pick<Product, 'images'>, dept?: Dept): boolean {
  if (!dept) return true;
  const want = dept === 'men' ? 'MEN' : 'WOMEN';
  const all = product.images || [];
  return !(all.length && all.every((i) => i.gender && i.gender !== want && i.gender !== 'BOTH'));
}
