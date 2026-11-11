import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useWishlistStore } from '../store/wishlistStore';
import { Product } from '../types';
import { ProductRail } from '../components/ProductRail';
import { BookmarkIcon } from '../components/Icons';
import { formatRs } from '../components/ProductCard';

type Tab = 'details' | 'care' | 'shipping';

const Lines: React.FC<{ text?: string | null }> = ({ text }) =>
  text ? (
    <div className="space-y-1">
      {text.split('\n').filter((l) => l.trim()).map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  ) : null;

export const ProductDetailPage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const { addToCart, openSizeGuide } = useCartStore();
  const saved = useWishlistStore((s) => s.ids);
  const toggleSave = useWishlistStore((s) => s.toggle);

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('details');
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [slide, setSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      setMessage(null);
      setSlide(0);
      try {
        const res = await apiClient.get(`/products/${handle}`);
        if (cancelled) return;
        const p: Product | null = res.data.product;
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct(p);
        setRelated(res.data.relatedProducts || []);
        const first = p.variants.find((v) => v.stockQuantity > 0) || p.variants[0];
        setColor(first?.color || null);
        setVariantId(first && first.stockQuantity > 0 ? first.id : null);
        document.title = `${p.name} | LEVIX`;
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!loading && (notFound || !product)) {
    return (
      <div className="pt-20 pb-24 px-4 text-center space-y-3">
        <h1 className="text-xl font-black uppercase">Product not found</h1>
        <p className="text-[12px] text-neutral-600">This piece is no longer available or the link is incorrect.</p>
        <Link to="/collections/all-products" className="inline-block px-6 py-2.5 rounded-full bg-black text-white text-[11px] font-semibold">Shop all products</Link>
      </div>
    );
  }

  if (loading || !product) {
    return (
      <div className="pt-2 px-2 md:px-[10px] grid md:grid-cols-3 gap-[6px] animate-pulse">
        <div className="aspect-[4/5] rounded-[12px] bg-[#E0E0E0]" />
        <div className="hidden md:block aspect-[4/5] rounded-[12px] bg-[#E0E0E0]" />
        <div className="hidden md:block" />
      </div>
    );
  }

  const isSaved = saved.includes(product.id);
  const selected = product.variants.find((v) => v.id === variantId) || null;

  // Colours (in the order the owner added them) and the sizes/photos for the chosen colour.
  const colours = product.variants
    .filter((v, i, arr) => v.color && arr.findIndex((x) => x.color === v.color) === i)
    .map((v) => ({ name: v.color as string, hex: v.colorHex || '#cccccc', inStock: product.variants.some((x) => x.color === v.color && x.stockQuantity > 0) }));
  const activeColour = colours.length ? color || colours[0].name : null;
  const sizeVariants = activeColour ? product.variants.filter((v) => v.color === activeColour) : product.variants;
  const allSoldOut = sizeVariants.every((v) => v.stockQuantity <= 0);
  const colourImages = activeColour ? product.images.filter((im) => im.color === activeColour) : [];
  const sharedImages = product.images.filter((im) => !im.color);
  const images = activeColour && colourImages.length ? [...colourImages, ...sharedImages] : product.images.length ? product.images : [];
  const [mainImage, ...otherImages] = images;

  const chooseColour = (name: string) => {
    setColor(name);
    setMessage(null);
    const first = product.variants.find((v) => v.color === name && v.stockQuantity > 0);
    const keepSize = selected && product.variants.find((v) => v.color === name && v.size === selected.size && v.stockQuantity > 0);
    setVariantId((keepSize || first)?.id || null);
    setSlide(0);
    sliderRef.current?.scrollTo({ left: 0 });
  };

  const add = async (mode: 'add' | 'buy') => {
    setMessage(null);
    if (!selected || (activeColour && selected.color !== activeColour)) {
      setMessage({ type: 'err', text: 'Please select a size' });
      return;
    }
    setBusy(mode);
    try {
      await addToCart(selected.id, 1);
      if (mode === 'buy') {
        useCartStore.getState().closeCart();
        navigate('/checkout');
      } else {
        setMessage({ type: 'ok', text: 'Added to your bag' });
      }
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message || 'Could not add to bag' });
    } finally {
      setBusy(null);
    }
  };

  const onSlide = () => {
    const el = sliderRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const infoPanel = (
    <div className="space-y-2">
      <div className="lx-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[13px] font-bold leading-tight">{product.name}</h1>
          <button onClick={() => toggleSave(product.id)} aria-label={isSaved ? 'Remove from saved' : 'Save'} className={isSaved ? 'text-black' : 'text-black/30 hover:text-black'}>
            <BookmarkIcon className="w-[14px] h-[17px]" filled />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-neutral-600">
            {formatRs(product.basePrice + (selected?.priceDelta || 0))}
            {product.comparePrice && product.comparePrice > product.basePrice && (
              <span className="ml-2 line-through text-neutral-400">{formatRs(product.comparePrice)}</span>
            )}
          </p>
          <button onClick={openSizeGuide} className="px-2.5 py-1 rounded bg-[#E9E9E9] text-[9.5px] hover:bg-[#ddd]">Size Guide</button>
        </div>

        {colours.length > 0 && (
          <div className="mt-3">
            <p className="text-[10.5px] text-neutral-600 mb-1.5">
              Colour: <span className="font-semibold text-black">{activeColour}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {colours.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => chooseColour(c.name)}
                  title={c.name + (c.inStock ? '' : ' (sold out)')}
                  aria-label={`Colour ${c.name}`}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all ${activeColour === c.name ? 'border-black scale-105' : 'border-transparent hover:border-black/30'}`}
                >
                  <span className="absolute inset-[3px] rounded-full border border-black/10" style={{ background: c.hex }} />
                  {!c.inStock && <span className="absolute inset-0 flex items-center justify-center"><span className="w-full h-[1.5px] bg-black/60 rotate-45" /></span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {sizeVariants.map((v) => {
            const out = v.stockQuantity <= 0;
            return (
              <button
                key={v.id}
                disabled={out}
                onClick={() => {
                  setVariantId(v.id);
                  setMessage(null);
                }}
                className={`py-2 rounded-full text-[10px] border transition-colors ${
                  v.id === variantId ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black'
                } ${out ? 'opacity-35 line-through cursor-not-allowed hover:border-black/15' : ''}`}
                aria-label={`Size ${v.size}${out ? ' sold out' : ''}`}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        {selected && selected.stockQuantity > 0 && selected.stockQuantity <= 5 && (
          <p className="text-[10px] text-[#c2410c] mt-2">Only {selected.stockQuantity} left in {selected.color ? `${selected.color} / ` : ''}size {selected.size}</p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => add('add')}
            disabled={allSoldOut || busy !== null}
            className="py-3 rounded-full bg-white border border-black/15 text-[10px] font-semibold uppercase hover:border-black disabled:opacity-40"
          >
            {allSoldOut ? 'Sold out' : busy === 'add' ? 'Adding…' : 'Add to bag'}
          </button>
          <button
            onClick={() => add('buy')}
            disabled={allSoldOut || busy !== null}
            className="py-3 rounded-full bg-black text-white text-[10px] font-semibold uppercase hover:bg-neutral-800 disabled:opacity-40"
          >
            {busy === 'buy' ? 'Please wait…' : 'Buy now'}
          </button>
        </div>
        {message && (
          <p className={`text-[11px] mt-2 ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {message.text}
            {message.type === 'ok' && (
              <button onClick={() => useCartStore.getState().openCart()} className="underline ml-2 text-black">View bag</button>
            )}
          </p>
        )}
      </div>

      <div className="lx-panel p-4">
        <div className="grid grid-cols-3 text-[10.5px] text-center border-b border-black/10">
          {(
            [
              ['details', 'Details & Description'],
              ['care', 'Washcare'],
              ['shipping', 'Shipping']
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`pb-2 -mb-px border-b-2 ${tab === key ? 'border-black text-black' : 'border-transparent text-neutral-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="pt-3 text-[11px] leading-relaxed text-neutral-600 min-h-[64px]">
          {tab === 'details' && (
            <div className="space-y-2">
              <Lines text={product.description} />
              <Lines text={product.details} />
              {product.fitGuide && (
                <p>
                  <span className="font-semibold text-black">Fit: </span>
                  {product.fitGuide}
                </p>
              )}
            </div>
          )}
          {tab === 'care' && <Lines text={product.fabricCare || settings.careInfo} />}
          {tab === 'shipping' && (
            <div className="space-y-1">
              <Lines text={settings.shippingInfo} />
              <p className="pt-1">Returns are accepted only for damaged, defective or wrong items reported within 48 hours of delivery. No size exchanges — please check the size guide.</p>
              <Link to="/policies/refund-policy" className="underline text-black inline-block">Returns & refund policy</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-1 pb-10">
      {/* Mobile: swipeable images */}
      <div className="md:hidden relative">
        <div ref={sliderRef} onScroll={onSlide} className="flex overflow-x-auto no-scrollbar snap-x-mandatory">
          {images.map((img) => (
            <div key={img.id} className="snap-start-always shrink-0 w-full aspect-[4/5] bg-[#E3E3E3]">
              <img src={img.url} alt={img.altText || product.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <span key={img.id} className={`h-[5px] rounded-full transition-all ${i === slide ? 'w-3 bg-white' : 'w-[5px] bg-white/60'}`} />
            ))}
          </div>
        )}
        <div className="px-2 pt-2">{infoPanel}</div>
      </div>

      {/* Desktop: sticky main image | scrolling gallery | sticky info */}
      <div className="hidden md:grid grid-cols-3 gap-[6px] px-[10px] pt-1">
        <div className="sticky top-[68px] self-start">
          {mainImage && (
            <div className="aspect-[4/5] max-h-[calc(100vh-80px)] w-full rounded-[12px] overflow-hidden bg-[#E3E3E3]">
              <img src={mainImage.url} alt={mainImage.altText || product.name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="space-y-[6px]">
          {(otherImages.length ? otherImages : images).map((img) => (
            <div key={img.id} className="aspect-[4/5] rounded-[12px] overflow-hidden bg-[#E3E3E3]">
              <img src={img.url} alt={img.altText || product.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
        <div className="sticky top-[68px] self-start min-h-[calc(100vh-80px)] flex flex-col justify-end">{infoPanel}</div>
      </div>

      {related.length > 0 && (
        <div className="mt-6">
          <ProductRail title="You may also like" products={related} href="/collections/all-products" />
        </div>
      )}
    </div>
  );
};
