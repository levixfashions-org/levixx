import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { BookmarkIcon, CloseIcon, PlusIcon } from './Icons';
import { imagesForDept, productHref, type Dept } from '../utils/dept';
import { FramedImg } from './FramedImg';

export const formatRs = (paise: number) => `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;

interface Props {
  product: Product;
  /** Men / Women page: show only that department's photos. */
  dept?: Dept;
  /** Bigger text for wide grids. */
  size?: 'normal' | 'large';
}

/**
 * Product card: swipeable image gallery with dots, save (bookmark) button, "Sold out" badge,
 * name + price, and a "+" quick-add that opens a size picker over the image.
 */
export const ProductCard: React.FC<Props> = ({ product, dept }) => {
  const deptImages = imagesForDept(product, dept);
  const images = deptImages.length ? deptImages.slice(0, 6) : [{ id: 'none', url: '', sortOrder: 0, isCover: true }];
  const [active, setActive] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { addToCart } = useCartStore();
  const saved = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleSave = useWishlistStore((s) => s.toggle);

  const soldOut = product.variants.length > 0 && product.variants.every((v) => v.stockQuantity <= 0);
  const href = productHref(product.slug, dept);
  const colours = product.variants
    .filter((v, i, arr) => v.color && arr.findIndex((x) => x.color === v.color) === i)
    .map((v) => ({ name: v.color as string, hex: v.colorHex || '#cccccc' }));
  const [qColour, setQColour] = useState<string | null>(null);
  const pickColour = qColour || colours.find((c) => product.variants.some((v) => v.color === c.name && v.stockQuantity > 0))?.name || colours[0]?.name || null;
  const quickVariants = pickColour ? product.variants.filter((v) => v.color === pickColour) : product.variants;

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
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] bg-[#E6E7EB] ring-1 ring-black/[0.04] shadow-[0_14px_30px_-22px_rgba(17,17,26,0.45)]">
        <div ref={scroller} onScroll={onScroll} className="absolute inset-0 flex overflow-x-auto no-scrollbar snap-x-mandatory">
          {images.map((img, i) => (
            <Link key={img.id + i} to={href} className="relative overflow-hidden shrink-0 w-full h-full snap-start-always" tabIndex={i === 0 ? 0 : -1} aria-label={product.name}>
              {img.url ? (
                <FramedImg
                  src={img.url}
                  alt={i === 0 ? product.name : ''}
                  className={soldOut ? 'opacity-50' : ''}
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
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/80 text-[10.5px] font-medium text-[#3a3a3f]">Sold out</span>
        )}

        <button
          onClick={() => toggleSave(product.id)}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/70 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.3)] transition-colors ${saved ? 'text-black' : 'text-black/40 hover:text-black'}`}
        >
          <BookmarkIcon className="w-[14px] h-[17px]" filled />
        </button>

        {/* Quick add size picker */}
        {quickOpen && (
          <div className="absolute inset-x-2 bottom-2 rounded-[16px] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] p-3 lx-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] font-semibold">{colours.length > 1 ? `Select size · ${pickColour}` : 'Select size'}</span>
              <button onClick={() => setQuickOpen(false)} aria-label="Close sizes"><CloseIcon className="w-3 h-3" /></button>
            </div>
            {colours.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {colours.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setQColour(c.name)}
                    aria-label={c.name}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border ${pickColour === c.name ? 'ring-2 ring-black ring-offset-1 border-black/20' : 'border-black/20'}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {quickVariants.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stockQuantity <= 0 || Boolean(adding)}
                  onClick={() => quickAdd(v.id)}
                  className="min-w-[40px] px-2 py-1.5 rounded-full border border-black/15 bg-white/70 text-[11.5px] font-medium hover:bg-black hover:text-white disabled:opacity-30 disabled:line-through disabled:hover:bg-transparent disabled:hover:text-black transition-colors"
                >
                  {adding === v.id ? '…' : v.size}
                </button>
              ))}
            </div>
            {msg && <p className="text-[10px] text-red-600 mt-1.5">{msg}</p>}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 pt-2.5 px-1">
        <Link to={href} className="min-w-0 flex-1">
          <h3 className={`text-[12.5px] font-medium leading-snug truncate ${soldOut ? 'text-neutral-400' : 'text-[#0b0b0f]'}`}>{product.name}</h3>
          <p className={`mt-0.5 text-[12.5px] leading-snug ${soldOut ? 'text-neutral-400' : 'text-[#0b0b0f] font-semibold'}`}>
            {formatRs(product.basePrice)}
            {product.comparePrice && product.comparePrice > product.basePrice && (
              <>
                {!soldOut && (
                  <span className="ml-1.5 font-semibold text-[11.5px] text-[#FF5400]">{Math.round((1 - product.basePrice / product.comparePrice) * 100)}% OFF</span>
                )}
                <span className="ml-1.5 line-through font-normal text-[11.5px] text-neutral-400">{formatRs(product.comparePrice)}</span>
              </>
            )}
          </p>
          {colours.length > 1 && (
            <div className="flex items-center gap-1 mt-1">
              {colours.slice(0, 6).map((c) => (
                <span key={c.name} title={c.name} className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: c.hex }} />
              ))}
              {colours.length > 6 && <span className="text-[9.5px] text-neutral-500">+{colours.length - 6}</span>}
            </div>
          )}
        </Link>
        {!soldOut && product.variants.length > 0 && (
          <button onClick={() => setQuickOpen((v) => !v)} aria-label="Quick add" className="w-8 h-8 -mt-0.5 rounded-full flex items-center justify-center text-[#3a3a3f] bg-white/60 border border-black/[0.06] hover:bg-white hover:text-black transition-colors">
            <PlusIcon />
          </button>
        )}
      </div>
    </div>
  );
};
