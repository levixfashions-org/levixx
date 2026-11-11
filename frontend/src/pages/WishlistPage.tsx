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
    <div className="pt-4 pb-12 px-2 md:px-[10px] min-h-[70vh]">
      <div className="px-2 md:px-3 mb-4">
        <h1 className="text-[12px] font-semibold">Saved items {ids.length ? `(${ids.length})` : ''}</h1>
      </div>
      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : products.length === 0 ? (
        <div className="lx-panel py-20 text-center space-y-3">
          <p className="text-[14px] font-semibold">Nothing saved yet</p>
          <p className="text-[11px] text-neutral-600">Tap the bookmark on any product to save it here.</p>
          <Link to="/collections/all-products" className="inline-block px-6 py-2.5 rounded-full bg-black text-white text-[11px] font-semibold">Explore products</Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
};
