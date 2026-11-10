import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useHomeStore } from '../store/homeStore';
import { ArrowUpRight, CloseIcon } from './Icons';
import { formatRs } from './ProductCard';

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
      <div className="absolute inset-0 bg-black/45" onClick={closeCart} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#E9E9E9] lx-drawer-in flex flex-col" role="dialog" aria-label="Your bag">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[15px] font-bold">{items.length ? `Your bag (${cart?.itemCount})` : ''}</h2>
          <button onClick={closeCart} aria-label="Close bag" className="p-1"><CloseIcon className="w-5 h-5" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <h3 className="text-[19px] font-bold">Your bag is empty!</h3>
            <p className="text-[11px] text-neutral-600">Let's get started</p>
            <Link to="/collections/all-products" className="inline-flex items-center gap-1 mt-16 text-[11px] font-medium hover:opacity-60">
              Shop now <ArrowUpRight />
            </Link>

            {suggestions.length > 0 && (
              <div className="mt-16">
                <p className="text-[11px] font-semibold mb-2">Products you may like</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {suggestions.map((p) => (
                    <Link key={p.id} to={`/products/${p.slug}`} className="shrink-0 w-[72px] aspect-[4/5] rounded-[6px] overflow-hidden bg-[#ddd]">
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
                        {c.img && <img src={c.img} alt="" className="w-full h-full object-cover" loading="lazy" />}
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
                <div key={it.id} className={`flex gap-3 bg-white rounded-[12px] p-2.5 ${busyId === it.id ? 'opacity-60' : ''}`}>
                  <Link to={`/products/${it.productSlug}`} className="w-[76px] aspect-[4/5] rounded-[8px] overflow-hidden bg-[#E3E3E3] shrink-0">
                    {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <Link to={`/products/${it.productSlug}`} className="text-[11.5px] font-semibold leading-snug line-clamp-2">{it.productName}</Link>
                      <button onClick={() => change(it.id, 0)} aria-label="Remove" className="text-neutral-400 hover:text-black shrink-0"><CloseIcon className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="text-[10.5px] text-neutral-500 mt-0.5">Size: {it.size}</p>
                    {it.quantity > it.stockQuantity && (
                      <p className="text-[10px] text-red-600">Only {it.stockQuantity} left — please reduce</p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-black/15">
                        <button onClick={() => change(it.id, it.quantity - 1)} disabled={busyId === it.id} className="w-7 h-7 text-[13px]" aria-label="Decrease">−</button>
                        <span className="w-5 text-center text-[11px]">{it.quantity}</span>
                        <button onClick={() => change(it.id, it.quantity + 1)} disabled={busyId === it.id || it.quantity >= it.stockQuantity} className="w-7 h-7 text-[13px] disabled:opacity-30" aria-label="Increase">+</button>
                      </div>
                      <span className="text-[11.5px] font-semibold">{formatRs(it.totalPaise)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pt-3 pb-5 bg-[#E9E9E9] border-t border-black/10 space-y-1.5">
              <div className="flex justify-between text-[11.5px]"><span>Subtotal</span><span className="font-semibold">{formatRs(cart!.subtotalPaise)}</span></div>
              <div className="flex justify-between text-[11px] text-neutral-600"><span>Shipping</span><span>{cart!.shippingPaise ? formatRs(cart!.shippingPaise) : 'FREE'}</span></div>
              <button
                onClick={() => {
                  closeCart();
                  navigate('/checkout');
                }}
                className="w-full mt-2 py-3.5 rounded-full bg-black text-white text-[11px] font-semibold uppercase tracking-wide hover:bg-neutral-800"
              >
                Checkout • {formatRs(cart!.totalPaise)}
              </button>
              <p className="text-[9.5px] text-neutral-500 text-center">Taxes included. Discount codes are applied at checkout.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
