import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

export const ProductGrid: React.FC<{ products: Product[]; className?: string }> = ({ products, className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-x-[6px] gap-y-5 ${className}`}>
    {products.map((p) => (
      <ProductCard key={p.id} product={p} />
    ))}
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-[6px] gap-y-5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="aspect-[4/5] rounded-[10px] bg-[#E0E0E0]" />
        <div className="h-2.5 w-2/3 bg-[#E0E0E0] rounded mt-2.5" />
        <div className="h-2.5 w-1/3 bg-[#E0E0E0] rounded mt-1.5" />
      </div>
    ))}
  </div>
);
