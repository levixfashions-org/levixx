import React, { useState, useEffect, useRef } from 'react';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';
import { Search } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const live = useLiveRefresh();
  const lastLive = useRef(live);
  useEffect(() => {
    const silent = lastLive.current !== live;
    lastLive.current = live;
    async function executeSearch() {
      if (!q.trim()) {
        setProducts([]);
        return;
      }
      try {
        if (!silent) setLoading(true);
        const res = await apiClient.get('/products', { search: q, limit: 30 });
        setProducts(res.data.products || []);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setLoading(false);
      }
    }
    executeSearch();
  }, [q, live]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div className="space-y-4 px-1">
        <div>
          <p className="lx-eyebrow">Find your fit</p>
          <h1 className="lx-h1 mt-1">Search</h1>
        </div>
        <form onSubmit={handleSearchSubmit} role="search" className="max-w-xl flex items-center gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search overlength tees, waffle, acid wash…"
            aria-label="Search products"
            className="lx-field flex-1 min-w-0 h-12 px-4 text-[15px]"
          />
          <button type="submit" className="lx-btn-primary h-12 px-6 text-[14.5px] font-semibold">
            Search
          </button>
        </form>
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-12">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-[3/4] rounded-[18px] bg-black/[0.06] animate-pulse" />
            ))}
          </div>
        ) : q ? (
          <div>
            <p className="lx-sub mb-5 px-1">
              {products.length} result{products.length === 1 ? '' : 's'} for <span className="font-semibold text-[#0b0b0f]">“{q}”</span>
            </p>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-12">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="lx-acct-card max-w-[460px] mx-auto px-6 py-10 text-center">
                <p className="text-[17px] font-semibold text-[#0b0b0f]">No matches</p>
                <p className="mt-1 lx-sub">Try a different word, like “oversized”, “waffle” or a colour.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="lx-acct-card max-w-[460px] mx-auto px-6 py-10 text-center">
            <p className="text-[17px] font-semibold text-[#0b0b0f]">What are you looking for?</p>
            <p className="mt-1 lx-sub">Type a product name, style or colour above.</p>
          </div>
        )}
      </div>

    </div>
  );
};
