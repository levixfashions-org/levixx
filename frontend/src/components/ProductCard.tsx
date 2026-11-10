import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { BookmarkIcon, CloseIcon, PlusIcon } from './Icons';

export const formatRs = (paise: number) => `RS. ${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;

interface Props {
  product: Product;
  /** Bigger text for wide grids. */
  size?: 'normal' | 'large';
}

/**
 * Product card: swipeable image gallery with dots, save (bookmark) button, "Sold out" badge,
 * name + price, and a "+" quick-add that opens a size picker over the image.
 */
export const ProductCard: React.FC<Props> = ({ product }) => {
  const images = product.images.length ? product.images.slice(0, 6) : [{ id: 'none', url: '', sortOrder: 0, isCover: true }];
  const [active, setActive] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { addToCart } = useCartStore();
  const saved = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleSave = useWishlistStore((s) => s.toggle);

  const soldOut = product.variants.length > 0 && product.variants.every((v) => v.stockQuantity <= 0);
  const href = `/products/${product.slug}`;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  };
  const goTo = (idx: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const quickAdd = async (variantId: string) => {
    setAdding(variantId);
    setMsg(null);
    try {
      await addToCart(variantId, 1);
      setQuickOpen(false);
    } catch (err: any) {
      setMsg(err.message || 'Could not add to bag');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="group/card relative flex flex-col min-w-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[10px] bg-[#E3E3E3]">
        <div ref={scroller} onScroll={onScroll} className="absolute inset-0 flex overflow-x-auto no-scrollbar snap-x-mandatory">
          {images.map((img, i) => (
            <Link key={img.id + i} to={href} className="relative shrink-0 w-full h-full snap-start-always" tabIndex={i === 0 ? 0 : -1} aria-label={product.name}>
              {img.url ? (
                <img
                  src={img.url}
                  alt={i === 0 ? product.name : ''}
                  className={`w-full h-full object-cover ${soldOut ? 'opacity-50' : ''}`}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-logo text-2xl text-black/10">LEVIX</div>
              )}
            </Link>
          ))}
        </div>

        {/* Desktop arrows on hover */}
        {images.length > 1 && (
          <>
            {active > 0 && (
              <button onClick={() => goTo(active - 1)} aria-label="Previous image" className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity text-[13px]">‹</button>
            )}
            {active < images.length - 1 && (
              <button onClick={() => goTo(active + 1)} aria-label="Next image" className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity text-[13px]">›</button>
            )}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
              {images.map((_, i) => (
                <span key={i} className={`h-[4px] rounded-full transition-all ${i === active ? 'w-[10px] bg-white' : 'w-[4px] bg-white/60'}`} />
              ))}
            </div>
          </>
        )}

        {soldOut && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 text-[9.5px] text-neutral-500">Sold Out</span>
        )}
        {!soldOut && product.comparePrice && product.comparePrice > product.basePrice && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black text-white text-[9.5px]">Sale</span>
        )}

        <button
          onClick={() => toggleSave(product.id)}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          className={`absolute top-2.5 right-2.5 p-1 transition-colors ${saved ? 'text-black' : 'text-black/35 hover:text-black'}`}
        >
          <BookmarkIcon className="w-[14px] h-[17px]" filled />
        </button>

        {/* Quick add size picker */}
        {quickOpen && (
          <div className="absolute inset-x-2 bottom-2 rounded-[10px] bg-white/95 backdrop-blur p-2.5 lx-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-semibold">Select size</span>
              <button onClick={() => setQuickOpen(false)} aria-label="Close sizes"><CloseIcon className="w-3 h-3" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stockQuantity <= 0 || Boolean(adding)}
                  onClick={() => quickAdd(v.id)}
                  className="min-w-[38px] px-2 py-1.5 rounded-full border border-black/15 text-[10.5px] hover:bg-black hover:text-white disabled:opacity-30 disabled:line-through disabled:hover:bg-transparent disabled:hover:text-black transition-colors"
                >
                  {adding === v.id ? '…' : v.size}
                </button>
              ))}
            </div>
            {msg && <p className="text-[10px] text-red-600 mt-1.5">{msg}</p>}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 pt-2 px-1">
        <Link to={href} className="min-w-0 flex-1">
          <h3 className={`text-[11px] leading-snug truncate ${soldOut ? 'text-neutral-400' : 'text-black'}`}>{product.name}</h3>
          <p className={`text-[11px] leading-snug ${soldOut ? 'text-neutral-400' : 'text-neutral-700'}`}>
            {formatRs(product.basePrice)}
            {product.comparePrice && product.comparePrice > product.basePrice && (
              <span className="ml-1.5 line-through text-neutral-400">{formatRs(product.comparePrice)}</span>
            )}
          </p>
        </Link>
        {!soldOut && product.variants.length > 0 && (
          <button onClick={() => setQuickOpen((v) => !v)} aria-label="Quick add" className="p-1 text-neutral-500 hover:text-black">
            <PlusIcon />
          </button>
        )}
      </div>
    </div>
  );
};
