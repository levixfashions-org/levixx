import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useHomeStore } from '../store/homeStore';
import { apiClient } from '../services/api';
import { Product } from '../types';
import { CloseIcon, SearchIcon } from './Icons';
import { formatRs } from './ProductCard';

export const SearchDrawer: React.FC = () => {
  const { isSearchOpen, closeSearch } = useCartStore();
  const { data: home, fetchHome } = useHomeStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isSearchOpen) {
      fetchHome();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen, fetchHome]);
  useEffect(() => closeSearch(), [location.pathname, closeSearch]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get('/products', { search: q, limit: 8 });
        setResults(res.data.products || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (!isSearchOpen) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };
  const chips = [...(home?.menu.collections || []), ...(home?.menu.categories || [])].slice(0, 10);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={closeSearch} />
      <div className="relative bg-white rounded-b-[22px] lx-drop-in max-h-[85vh] overflow-y-auto">
        <form onSubmit={submit} className="flex items-center gap-3 px-4 md:px-[22px] h-16 border-b border-black/5">
          <SearchIcon className="w-[18px] h-[18px] text-neutral-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search LEVIX"
            className="flex-1 text-[15px] md:text-[13px] focus:outline-none bg-transparent"
            aria-label="Search products"
          />
          <button type="button" onClick={closeSearch} aria-label="Close search" className="w-[42px] h-[26px] rounded-full bg-[#E8E8E8] flex items-center justify-center">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="px-4 md:px-[22px] py-5">
          {query.trim().length < 2 ? (
            <>
              <p className="text-[11px] font-semibold mb-2.5">Popular</p>
              <div className="flex flex-wrap gap-1.5">
                <Link to="/collections/new-in" className="px-3.5 py-1.5 rounded-full bg-[#EFEFEF] text-[11px] hover:bg-black hover:text-white">New Arrivals</Link>
                {chips.map((c) => (
                  <Link key={c.id} to={`/collections/${c.slug}`} className="px-3.5 py-1.5 rounded-full bg-[#EFEFEF] text-[11px] hover:bg-black hover:text-white">{c.name}</Link>
                ))}
              </div>
            </>
          ) : searching && !results.length ? (
            <p className="text-[12px] text-neutral-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-neutral-600">No results for “{query.trim()}”.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {results.map((p) => (
                  <Link key={p.id} to={`/products/${p.slug}`} className="group">
                    <div className="aspect-[4/5] rounded-[8px] overflow-hidden bg-[#E3E3E3]">
                      {p.images[0] && <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />}
                    </div>
                    <p className="text-[10.5px] mt-1.5 truncate">{p.name}</p>
                    <p className="text-[10.5px] text-neutral-600">{formatRs(p.basePrice)}</p>
                  </Link>
                ))}
              </div>
              <button onClick={submit} className="mt-4 text-[11px] font-semibold underline">See all results</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
