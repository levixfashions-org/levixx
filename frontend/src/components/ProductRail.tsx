import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ChevronIcon } from './Icons';

interface Props {
  title: string;
  products: Product[];
  href?: string;
  /** "panel" = inside a white rounded panel (like category rails); "plain" = straight on the page background. */
  variant?: 'panel' | 'plain';
  ctaLabel?: string;
}

/** Horizontal product carousel: 4 cards per view on desktop, 2 on mobile, swipeable. */
export const ProductRail: React.FC<Props> = ({ title, products, href, variant = 'panel', ctaLabel = 'Discover more' }) => {
  const ref = useRef<HTMLDivElement>(null);
  if (!products.length) return null;
  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className={variant === 'panel' ? 'lx-panel mx-2 md:mx-[10px] pt-4 md:pt-5 pb-5 md:pb-6' : 'pt-4 pb-2'}>
      <div className="flex items-center justify-between px-4 md:px-[22px] mb-3 md:mb-4">
        <h2 className="lx-title">{title}</h2>
        <div className="flex items-center gap-2">
          {products.length > 4 && (
            <div className="hidden md:flex gap-1.5">
              <button onClick={() => scroll(-1)} aria-label="Scroll left" className="w-7 h-7 rounded-full border border-black/10 bg-white flex items-center justify-center hover:border-black">
                <ChevronIcon dir="left" className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => scroll(1)} aria-label="Scroll right" className="w-7 h-7 rounded-full border border-black/10 bg-white flex items-center justify-center hover:border-black">
                <ChevronIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {href && (
            <Link
              to={href}
              className={`px-4 py-[5px] rounded-full text-[10px] font-medium transition-colors ${
                variant === 'panel' ? 'bg-black text-white hover:bg-neutral-800' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-[6px] overflow-x-auto no-scrollbar snap-x-mandatory px-2 md:px-[22px] scroll-px-2 md:scroll-px-[22px]">
        {products.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[calc((100%-6px)/2)] md:w-[calc((100%-18px)/4)]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};
