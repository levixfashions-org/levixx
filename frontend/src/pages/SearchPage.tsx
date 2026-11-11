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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-10">
      
      <div className="border-b border-black/10 pb-6 space-y-4">
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black">
          Search Atelier
        </h1>
        
        <form onSubmit={handleSearchSubmit} className="max-w-xl flex items-center border-2 border-black bg-white">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search overlength tees, waffle full sleeves, acid wash drops..."
            className="flex-1 p-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-12">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-[3/4] bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : q ? (
          <div>
            <p className="text-xs text-neutral-600 mb-6 uppercase tracking-wider">
              Displaying {products.length} results for <span className="font-bold text-black">"{q}"</span>
            </p>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-12">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-neutral-500 uppercase tracking-widest">
                No matching garments found in our archive.
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-neutral-500 uppercase tracking-widest">
            Enter a search keyword above to inspect products.
          </div>
        )}
      </div>

    </div>
  );
};
