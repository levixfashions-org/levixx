import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { LevixCartIcon } from '../components/LevixCartIcon';

export const CartPage: React.FC = () => {
  const { cart, fetchCart, updateQuantity, removeItem, loading } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="px-4 py-14 sm:py-20">
        <div className="lx-acct-card max-w-[460px] mx-auto px-6 py-12 text-center">
          <LevixCartIcon className="w-14 h-[70px] text-black/25 mx-auto" />
          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[#0b0b0f]">Your bag is empty</h1>
          <p className="mt-1.5 lx-sub max-w-xs mx-auto">Explore the latest drops — heavyweight oversized tees, waffle knits and acid washes.</p>
          <Link to="/collections/all-products" className="lx-btn-primary inline-flex mt-6 h-12 px-7 items-center gap-2 text-[14.5px] font-semibold">
            Start shopping <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const inr = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-[1180px] mx-auto">
        <div className="mb-5 sm:mb-7 px-1">
          <p className="lx-eyebrow">Your bag</p>
          <h1 className="lx-h1 mt-1">Bag <span className="text-[#8e8e93] font-medium">({cart.itemCount})</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Items */}
          <div className="lg:col-span-8 lx-acct-card p-3 sm:p-5">
            <ul className="divide-y divide-black/[0.06]">
              {cart.items.map((item) => (
                <li key={item.id} className="p-2 sm:p-3 flex gap-3 sm:gap-4">
                  <Link to={`/products/${item.productSlug}`} className="w-[84px] h-[104px] sm:w-24 sm:h-[120px] rounded-[16px] bg-black/5 ring-1 ring-black/5 overflow-hidden flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/products/${item.productSlug}`} className="text-[14.5px] font-medium text-[#0b0b0f] leading-snug line-clamp-2 hover:underline">
                        {item.productName}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.productName}`}
                        className="w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[#8e8e93]">
                      Size {item.size}
                      {item.color ? ` · ${item.color}` : ''} · {inr(item.unitPricePaise)}
                    </p>

                    <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-[12px] bg-white/80 ring-1 ring-black/10 overflow-hidden">
                        <button
                          type="button"
                          disabled={loading || item.quantity <= 1}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.productName}`}
                          className="w-9 h-9 flex items-center justify-center hover:bg-black/[0.04] disabled:opacity-30"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-[13.5px] font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={loading || item.quantity >= item.stockQuantity}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.productName}`}
                          className="w-9 h-9 flex items-center justify-center hover:bg-black/[0.04] disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[15.5px] font-semibold text-[#0b0b0f]">{inr(item.totalPaise)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <div className="lg:col-span-4 lx-acct-card p-5 sm:p-6 space-y-4 self-start lg:sticky lg:top-24">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">Summary</h2>
            <div className="space-y-2.5 text-[13.5px]">
              <div className="flex justify-between text-[#6e6e73]">
                <span>Subtotal</span>
                <span className="text-[#0b0b0f] font-medium">{inr(cart.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-[#6e6e73]">
                <span>Delivery</span>
                <span className="font-medium">{cart.shippingPaise === 0 ? <span className="text-green-700">Free</span> : <span className="text-[#0b0b0f]">{inr(cart.shippingPaise)}</span>}</span>
              </div>
              {cart.remainingForFreeShippingPaise > 0 && (
                <p className="text-[12px] text-[#c24100] bg-orange-50 rounded-[10px] px-3 py-2">Add {inr(cart.remainingForFreeShippingPaise)} more for free delivery.</p>
              )}
              <div className="flex justify-between items-baseline border-t border-black/[0.07] pt-3 text-[#0b0b0f]">
                <span className="text-[15px] font-semibold">Total</span>
                <span className="text-[24px] font-semibold tracking-[-0.03em]">{inr(cart.totalPaise)}</span>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/checkout')} className="lx-btn-primary w-full h-14 text-[15.5px] font-semibold flex items-center justify-center gap-2">
              Checkout <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/collections/all-products" className="block text-center text-[13px] font-medium text-[#6e6e73] hover:text-[#0b0b0f]">Continue shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
