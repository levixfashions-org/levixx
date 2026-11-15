import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useHomeStore } from '../store/homeStore';
import { ArrowUpRight, CloseIcon } from './Icons';
import { formatRs } from './ProductCard';
import { FramedImg } from './FramedImg';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, closeCart, fetchCart, updateQuantity, removeItem } = useCartStore();
  const { data: home, fetchHome } = useHomeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
  useEffect(() => {
    if (isCartOpen) {
      fetchHome();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen, fetchHome]);
  useEffect(() => closeCart(), [location.pathname, closeCart]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  if (!isCartOpen) return null;

  const items = cart?.items || [];
  const change = async (id: string, qty: number) => {
    setError(null);
    setBusyId(id);
    try {
      if (qty <= 0) await removeItem(id);
      else await updateQuantity(id, qty);
    } catch (err: any) {
      setError(err.message || 'Could not update your bag');
    } finally {
      setBusyId(null);
    }
  };

  const threshold = cart?.freeShippingThresholdPaise || 0;
  const progress = threshold > 0 ? Math.min(100, Math.round(((cart?.subtotalPaise || 0) / threshold) * 100)) : 100;
  const suggestions = (home?.latestDrop || []).slice(0, 8);
  const collections = [
    ...(home?.menu.collections || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, img: c.bannerImageUrl })),
    ...(home?.menu.categories || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, img: c.imageUrl }))
  ].slice(0, 5);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" onClick={closeCart} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#E9E9E9] lx-glass-sheet sm:rounded-l-[28px] shadow-[-20px_0_60px_-30px_rgba(0,0,0,0.5)] lx-drawer-in flex flex-col" role="dialog" aria-label="Your bag">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{items.length ? `Your bag (${cart?.itemCount})` : ''}</h2>
          <button onClick={closeCart} aria-label="Close bag" className="lx-btn-soft w-9 h-9 flex items-center justify-center"><CloseIcon className="w-4 h-4" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <h3 className="text-[22px] font-semibold tracking-[-0.02em]">Your bag is empty</h3>
            <p className="text-[13px] text-[#6e6e73]">Let's get started</p>
            <Link to="/collections/all-products" className="inline-flex items-center gap-1 mt-16 text-[11px] font-medium hover:opacity-60">
              Shop now <ArrowUpRight />
            </Link>

            {suggestions.length > 0 && (
              <div className="mt-16">
                <p className="text-[11px] font-semibold mb-2">Products you may like</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {suggestions.map((p) => (
                    <Link key={p.id} to={`/products/${p.slug}`} className="shrink-0 w-[72px] aspect-[4/5] rounded-[12px] overflow-hidden bg-black/5 ring-1 ring-black/5">
                      {p.images[0] && <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {collections.length > 0 && (
              <div className="mt-14">
                <p className="text-[11px] font-semibold mb-2">Collections</p>
                <div className="divide-y divide-black/10 border-b border-black/10">
                  {collections.map((c) => (
                    <Link key={c.id} to={`/collections/${c.slug}`} className="flex items-center gap-4 py-2 hover:opacity-70">
                      <span className="w-[54px] h-[38px] rounded-[4px] overflow-hidden bg-[#ccc] shrink-0">
                        {c.img && <FramedImg src={c.img} alt="" loading="lazy" />}
                      </span>
                      <span className="text-[11px] font-medium">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {threshold <= 0 && cart!.shippingPaise === 0 && (
              <div className="px-5 pb-3">
                <p className="text-[10.5px] text-neutral-700">
                  <b>Free delivery</b> on this order
                </p>
              </div>
            )}
            {threshold > 0 && (
              <div className="px-5 pb-3">
                <p className="text-[10.5px] text-neutral-700 mb-1.5">
                  {cart!.remainingForFreeShippingPaise > 0 ? (
                    <>Add <b>{formatRs(cart!.remainingForFreeShippingPaise)}</b> more for free shipping</>
                  ) : (
                    <>You've unlocked <b>free shipping</b></>
                  )}
                </p>
                <div className="h-[3px] rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 space-y-2.5 pb-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              {items.map((it) => (
                <div key={it.id} className={`flex gap-3 bg-white/75 border border-white/80 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.4)] rounded-[18px] p-2.5 ${busyId === it.id ? 'opacity-60' : ''}`}>
                  <Link to={`/products/${it.productSlug}`} className="w-[76px] aspect-[4/5] rounded-[12px] overflow-hidden bg-[#E6E7EB] shrink-0">
                    {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <Link to={`/products/${it.productSlug}`} className="text-[13px] font-medium leading-snug line-clamp-2">{it.productName}</Link>
                      <button onClick={() => change(it.id, 0)} aria-label="Remove" className="text-neutral-400 hover:text-black shrink-0"><CloseIcon className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="text-[12px] text-[#8e8e93] mt-0.5">Size {it.size}{it.color ? ` · ${it.color}` : ''}</p>
                    {it.quantity > it.stockQuantity && (
                      <p className="text-[10px] text-red-600">Only {it.stockQuantity} left — please reduce</p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-[10px] bg-white/80 ring-1 ring-black/10">
                        <button onClick={() => change(it.id, it.quantity - 1)} disabled={busyId === it.id} className="w-8 h-8 text-[15px]" aria-label="Decrease">−</button>
                        <span className="w-6 text-center text-[12.5px] font-semibold">{it.quantity}</span>
                        <button onClick={() => change(it.id, it.quantity + 1)} disabled={busyId === it.id || it.quantity >= it.stockQuantity} className="w-8 h-8 text-[15px] disabled:opacity-30" aria-label="Increase">+</button>
                      </div>
                      <span className="text-[14px] font-semibold">{formatRs(it.totalPaise)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] bg-white/55 backdrop-blur-xl border-t border-black/[0.06] space-y-2">
              <div className="flex justify-between text-[13.5px]"><span>Subtotal</span><span className="font-semibold">{formatRs(cart!.subtotalPaise)}</span></div>
              <div className="flex justify-between text-[13px] text-[#6e6e73]"><span>Shipping</span><span className={cart!.shippingPaise ? '' : 'text-green-700 font-medium'}>{cart!.shippingPaise ? formatRs(cart!.shippingPaise) : 'Free'}</span></div>
              <button
                onClick={() => {
                  closeCart();
                  navigate('/checkout');
                }}
                className="lx-btn-primary w-full mt-2 h-[52px] text-[15px] font-semibold"
              >
                Checkout • {formatRs(cart!.totalPaise)}
              </button>
              <p className="text-[11px] text-[#8e8e93] text-center">Taxes included. Discount codes are applied at checkout.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
