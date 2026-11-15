import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useWishlistStore } from '../store/wishlistStore';
import { Product } from '../types';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';

export const WishlistPage: React.FC = () => {
  const ids = useWishlistStore((s) => s.ids);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Saved items | LEVIX';
  }, []);

  const live = useLiveRefresh();
  useEffect(() => {
    let cancelled = false;
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    apiClient
      .get('/wishlist/products', { ids: ids.join(',') })
      .then((res) => !cancelled && setProducts(res.data.products || []))
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ids.join(','), live]);

  return (
    <div className="pt-6 sm:pt-10 pb-12 px-2 md:px-[10px] min-h-[70vh]">
      <div className="px-3 md:px-4 mb-5 sm:mb-7">
        <p className="lx-eyebrow">Your wishlist</p>
        <h1 className="lx-h1 mt-1">Saved {ids.length ? <span className="text-[#8e8e93] font-medium">({ids.length})</span> : null}</h1>
      </div>
      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : products.length === 0 ? (
        <div className="lx-acct-card max-w-[460px] mx-auto px-6 py-12 text-center">
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">Nothing saved yet</p>
          <p className="mt-1.5 lx-sub">Tap the bookmark on any product to save it here.</p>
          <Link to="/collections/all-products" className="lx-btn-primary inline-flex mt-6 h-11 px-6 items-center text-[14px] font-semibold">Explore products</Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
};
