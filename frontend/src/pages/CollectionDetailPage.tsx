import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { apiClient, COLOR_SWATCHES } from '../services/api';
import { useHomeStore } from '../store/homeStore';
import { Product } from '../types';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { asDept } from '../utils/dept';
import { CloseIcon, FilterIcon } from '../components/Icons';
import { setSeo } from '../utils/seo';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' }
];
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const CollectionDetailPage: React.FC = () => {
  const { handle = 'all-products' } = useParams<{ handle: string }>();
  const [params, setParams] = useSearchParams();
  const { data: home, fetchHome } = useHomeStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sort = params.get('sort') || (handle === 'new-in' ? 'newest' : 'featured');
  const sizes = (params.get('size') || '').split(',').filter(Boolean);
  const colors = (params.get('color') || '').split(',').filter(Boolean);
  const inStock = params.get('instock') === '1';
  const minPrice = Number(params.get('min') || 0);
  const maxPrice = Number(params.get('max') || 0);
  const isDept = handle === 'men' || handle === 'women';
  const genderParam = params.get('gender');
  const gender = isDept ? handle : genderParam === 'men' || genderParam === 'women' ? genderParam : null;
  const deptName = gender === 'men' ? 'Men' : gender === 'women' ? 'Women' : '';
  const withGender = (path: string) => (gender && !isDept ? `${path}?gender=${gender}` : path);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const live = useLiveRefresh();
  const lastLive = useRef(live);
  useEffect(() => {
    let cancelled = false;
    const silent = lastLive.current !== live; // admin changed something → refresh in place
    lastLive.current = live;
    async function load() {
      if (!silent) {
        setLoading(true);
        setNotFound(false);
      }
      try {
        if (handle === 'all-products' || handle === 'new-in') {
          const res = await apiClient.get('/products', { sort, limit: 100, ...(gender ? { gender } : {}) });
          if (cancelled) return;
          setTitle(`${deptName ? `${deptName} · ` : ''}${handle === 'new-in' ? 'New Arrivals' : 'All Products'}`);
          setDescription(null);
          setProducts(res.data.products || []);
        } else {
          const res = await apiClient.get(`/collections/${handle}`, { sort, ...(gender && !isDept ? { gender } : {}) });
          if (cancelled) return;
          const name = res.data.collection?.name || '';
          setTitle(gender && !isDept ? `${deptName} · ${name}` : name);
          setDescription(res.data.collection?.description || null);
          setProducts(res.data.products || []);
        }
      } catch {
        if (!cancelled && !silent) {
          setNotFound(true);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [handle, sort, gender, live]);

  useEffect(() => {
    if (title) setSeo({ title: `${title} | LEVIX`, description: description || `Shop ${title} at LEVIX — premium heavyweight streetwear with free delivery across India.` });
  }, [title, description]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.variants.forEach((v) => set.add(v.size.toUpperCase())));
    return [...set].sort((a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99));
  }, [products]);
  const availableColors = useMemo(() => [...new Set(products.map((p) => p.colorGroup).filter(Boolean) as string[])], [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (sizes.length && !p.variants.some((v) => sizes.includes(v.size.toUpperCase()) && (!inStock || v.stockQuantity > 0))) return false;
        if (inStock && !p.variants.some((v) => v.stockQuantity > 0)) return false;
        if (colors.length && !(p.colorGroup && colors.includes(p.colorGroup))) return false;
        if (minPrice && p.basePrice < minPrice * 100) return false;
        if (maxPrice && p.basePrice > maxPrice * 100) return false;
        return true;
      }),
    [products, sizes.join(), colors.join(), inStock, minPrice, maxPrice]
  );

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggleList = (key: string, list: string[], value: string) =>
    update(key, (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]).join(',') || null);
  const activeCount = sizes.length + colors.length + (inStock ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  const dept = gender ? (home?.menu.departments || []).find((d) => d.key === gender) : null;
  const chips = dept ? dept.categories : home?.menu.categories || [];
  const setGender = (g: 'men' | 'women' | null) => {
    const next = new URLSearchParams(params);
    if (g) next.set('gender', g);
    else next.delete('gender');
    setParams(next, { replace: true });
  };

  return (
    <div className="pb-10">
      <div className="min-h-[70vh]">
        <div className="px-3 md:px-[22px] pt-6 sm:pt-8">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <Breadcrumbs
                className="mb-2"
                items={[
                  { label: 'Home', to: '/' },
                  ...(!isDept && handle !== 'all-products' ? [deptName ? { label: deptName, to: `/collections/${gender}` } : { label: 'Shop', to: '/collections/all-products' }] : []),
                  { label: title || 'Collection' }
                ]}
              />
              <h1 className="lx-h1">{title || (loading ? '\u00a0' : 'Collection')}</h1>
              {description && <p className="lx-sub mt-1.5 max-w-xl">{description}</p>}
            </div>
          </div>

          {/* Men / Women switch */}
          <div className="lx-segment inline-flex gap-0.5 p-[3px] mt-4">
            {isDept ? (
              (['men', 'women'] as const).map((k) => (
                <Link key={k} to={`/collections/${k}`} className={`lx-seg-item px-5 h-8 inline-flex items-center rounded-[10px] text-[13px] font-medium ${handle === k ? 'is-active' : ''}`}>
                  {k === 'men' ? 'Men' : 'Women'}
                </Link>
              ))
            ) : (
              ([null, 'men', 'women'] as const).map((k) => (
                <button key={k || 'all'} onClick={() => setGender(k)} className={`lx-seg-item px-4 h-8 inline-flex items-center rounded-[10px] text-[13px] font-medium ${gender === k ? 'is-active' : ''}`}>
                  {k === 'men' ? 'Men' : k === 'women' ? 'Women' : 'Everyone'}
                </button>
              ))
            )}
          </div>

          {/* Category chips + filters (sticky) */}
          <div className="sticky top-[60px] md:top-16 z-30 -mx-3 md:-mx-[22px] px-3 md:px-[22px] py-3 bg-[#EFEFEF]/95 backdrop-blur lx-head-solid flex items-center gap-3">
            <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
              <Link
                to={isDept ? `/collections/${handle}` : withGender('/collections/all-products')}
                className={`shrink-0 px-4 h-9 inline-flex items-center rounded-full text-[12.5px] font-medium border transition-colors ${handle === 'all-products' || isDept ? 'bg-[#0b0b0f] text-white border-[#0b0b0f]' : 'bg-white/70 border-white/80 hover:bg-white'}`}
              >
                View all
              </Link>
              {chips.map((c) => (
                <Link
                  key={c.id}
                  to={gender ? `/collections/${c.slug}?gender=${gender}` : `/collections/${c.slug}`}
                  className={`shrink-0 px-4 h-9 inline-flex items-center rounded-full text-[12.5px] font-medium border transition-colors ${handle === c.slug ? 'bg-[#0b0b0f] text-white border-[#0b0b0f]' : 'bg-white/70 border-white/80 hover:bg-white'}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="shrink-0 flex items-center gap-2 pl-3 pr-4 h-9 rounded-full bg-white/80 border border-white/80 shadow-[0_4px_14px_-10px_rgba(0,0,0,0.35)] text-[12.5px] font-medium hover:bg-white"
            >
              <FilterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center">{activeCount}</span>}
            </button>
          </div>
        </div>

        <div className="px-2 md:px-[10px] pt-1">
          {loading ? (
            <ProductGridSkeleton />
          ) : notFound ? (
            <div className="lx-acct-card max-w-[460px] mx-auto my-10 px-6 py-10 text-center space-y-4">
              <p className="text-[17px] font-semibold text-[#0b0b0f]">This collection doesn't exist</p>
              <Link to="/collections/all-products" className="lx-btn-primary inline-flex h-11 px-6 items-center text-[14px] font-semibold">Shop all products</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="lx-acct-card max-w-[460px] mx-auto my-10 px-6 py-10 text-center space-y-4">
              <p className="text-[17px] font-semibold text-[#0b0b0f]">{products.length ? 'No products match these filters.' : 'No products here yet.'}</p>
              {activeCount > 0 && (
                <button onClick={() => setParams(sort !== 'featured' ? { sort } : {}, { replace: true })} className="lx-btn-primary inline-flex h-11 px-6 items-center text-[14px] font-semibold">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ProductGrid products={filtered} dept={asDept(gender)} />
          )}
        </div>
      </div>

      {/* Filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={() => setFiltersOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[380px] bg-[#EFEFEF] lx-glass-sheet lx-drawer-in flex flex-col">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="lx-btn-soft w-9 h-9 flex items-center justify-center"><CloseIcon className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 space-y-6 pb-6">
              <div>
                <p className="text-[13px] font-semibold text-[#3a3a3f] mb-2">Sort by</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORTS.map((s) => (
                    <button key={s.value} onClick={() => update('sort', s.value === 'featured' ? null : s.value)} className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border ${sort === s.value ? 'bg-[#0b0b0f] text-white border-[#0b0b0f]' : 'bg-white/75 border-white/80'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {availableSizes.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-[#3a3a3f] mb-2">Size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSizes.map((s) => (
                      <button key={s} onClick={() => toggleList('size', sizes, s)} className={`min-w-[44px] px-3 py-1.5 rounded-full text-[12.5px] font-medium border ${sizes.includes(s) ? 'bg-[#0b0b0f] text-white border-[#0b0b0f]' : 'bg-white/75 border-white/80'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {availableColors.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-[#3a3a3f] mb-2">Colour</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColors.map((c) => (
                      <button key={c} onClick={() => toggleList('color', colors, c)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium border ${colors.includes(c) ? 'border-[#0b0b0f] bg-white' : 'bg-white/75 border-white/80'}`}>
                        {c}
                        <span className="w-6 h-2 rounded-full" style={{ background: COLOR_SWATCHES[c] || '#ccc' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold text-[#3a3a3f] mb-2">Price (₹)</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" inputMode="numeric" placeholder="Min" defaultValue={minPrice || ''} onBlur={(e) => update('min', e.target.value || null)} className="lx-field w-full h-11 px-4 text-[14px]" />
                  <span className="text-neutral-400">–</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Max" defaultValue={maxPrice || ''} onBlur={(e) => update('max', e.target.value || null)} className="lx-field w-full h-11 px-4 text-[14px]" />
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-[13.5px] cursor-pointer">
                <input type="checkbox" checked={inStock} onChange={(e) => update('instock', e.target.checked ? '1' : null)} className="accent-[#FF5400] w-[18px] h-[18px]" />
                In stock only
              </label>
            </div>
            <div className="p-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex gap-2 border-t border-black/[0.06]">
              <button onClick={() => setParams(sort !== 'featured' && sort !== 'newest' ? { sort } : {}, { replace: true })} className="lx-btn-soft flex-1 h-12 text-[14px] font-semibold">
                Clear all
              </button>
              <button onClick={() => setFiltersOpen(false)} className="lx-btn-primary flex-1 h-12 text-[14px] font-semibold">
                Show {filtered.length} products
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
