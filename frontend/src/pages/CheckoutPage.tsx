import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Tag, X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
    script.addEventListener('error', () => resolve(false));
    if (!existing) {
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
    setTimeout(() => resolve(Boolean(window.Razorpay)), 8000);
  });
}

export const CheckoutPage: React.FC = () => {
  const { cart, fetchCart } = useCartStore();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [prefilled, setPrefilled] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number; description: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
    loadRazorpay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from the signed-in account / default address.
  useEffect(() => {
    if (prefilled) return;
    if (user) {
      setEmail((v) => v || user.email || '');
      setFullName((v) => v || user.displayName || '');
    }
    if (profile) {
      const addr = profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];
      if (addr) {
        setFullName(addr.fullName);
        setPhone(addr.phone);
        setLine1(addr.line1);
        setLine2(addr.line2 || '');
        setCity(addr.city);
        setState(addr.state);
        setPostalCode(addr.postalCode);
      } else if (profile.phone) {
        setPhone(profile.phone);
      }
      setPrefilled(true);
    }
  }, [user, profile, prefilled]);

  // Re-validate the coupon when the bag changes.
  useEffect(() => {
    if (!appliedCoupon || !cart) return;
    apiClient
      .post('/orders/validate-coupon', { code: appliedCoupon.code })
      .then((res) => setAppliedCoupon(res.data))
      .catch((err) => {
        setAppliedCoupon(null);
        setCouponError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.subtotalPaise]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <h2 className="font-display font-black text-2xl uppercase text-black">Your bag is empty</h2>
        <p className="text-xs text-neutral-600">Please add items to your bag before proceeding to checkout.</p>
        <Link to="/collections/all-products" className="inline-block px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest">
          Explore Drops
        </Link>
      </div>
    );
  }

  const discountPaise = appliedCoupon?.discountPaise || 0;
  const totalPaise = Math.max(0, cart.subtotalPaise - discountPaise) + cart.shippingPaise;
  const inr = (p: number) => Math.round(p / 100).toLocaleString('en-IN');
  const stockProblem = cart.items.find((i) => i.quantity > i.stockQuantity);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    setCouponLoading(true);
    try {
      const res = await apiClient.post('/orders/validate-coupon', { code });
      setAppliedCoupon(res.data);
      setCouponCode('');
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) return setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
    if (!/^\d{6}$/.test(postalCode.trim())) return setErrorMsg('Please enter a valid 6-digit PIN code.');
    if (!state) return setErrorMsg('Please select your state.');
    if (!agreed) return setErrorMsg('Please accept the Terms & Conditions and the Returns policy to continue.');

    setLoading(true);
    try {
      const ready = await loadRazorpay();
      if (!ready) throw new Error('Could not load the Razorpay payment window. Please check your connection and try again.');

      const orderRes = await apiClient.post('/orders', {
        customerEmail: email.trim(),
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        shippingAddress: {
          fullName: fullName.trim(),
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state,
          postalCode: postalCode.trim(),
          country: 'India',
          phone: cleanPhone
        },
        couponCode: appliedCoupon?.code || undefined,
        saveAddress: Boolean(user) && saveAddress
      });

      const { order, accessKey, razorpayOrderId, amountPaise, keyId } = orderRes.data;
      try {
        sessionStorage.setItem(`levix_order_${order.orderNumber}`, accessKey);
      } catch {
        /* ignore */
      }
      const successUrl = `/order-success/${order.orderNumber}?key=${encodeURIComponent(accessKey)}`;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: 'LEVIX',
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrderId,
        prefill: { name: fullName, email, contact: cleanPhone },
        notes: { orderNumber: order.orderNumber },
        theme: { color: '#000000' },
        retry: { enabled: true, max_count: 3 },
        handler: async (response: any) => {
          try {
            await apiClient.post('/payments/verify', {
              orderNumber: order.orderNumber,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            await fetchCart();
            navigate(successUrl, { replace: true });
          } catch (vErr: any) {
            setErrorMsg(
              (vErr?.message || 'We could not confirm your payment.') +
                ` If money was deducted, please email us with order number ${order.orderNumber}.`
            );
            setLoading(false);
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setLoading(false);
            setErrorMsg('Payment was cancelled. Your bag is saved — you can try again any time.');
          }
        }
      });
      rzp.on('payment.failed', (resp: any) => {
        setErrorMsg(`Payment failed: ${resp?.error?.description || 'please try another payment method.'}`);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please check your details.');
      setLoading(false);
      fetchCart();
    }
  };

  const inputClass = 'w-full bg-white border border-black/20 p-3 text-sm focus:border-black focus:outline-none';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10">
      <div className="border-b border-black/10 pb-6 mb-8">
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">Secure Checkout</h1>
        <p className="text-xs text-neutral-600 mt-1">
          Pay safely with UPI, cards, net banking or wallets via Razorpay.
          {!user && (
            <>
              {' '}
              <Link to="/login" state={{ from: '/checkout' }} className="underline font-semibold text-black">Sign in</Link> to save your address and track orders.
            </>
          )}
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 mb-6 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{errorMsg}</div>
      )}
      {stockProblem && (
        <div className="p-4 mb-6 bg-yellow-50 border border-yellow-300 text-yellow-900 text-xs font-semibold">
          {stockProblem.productName} ({stockProblem.size}) has only {stockProblem.stockQuantity} left. Please update your{' '}
          <Link to="/cart" className="underline">bag</Link>.
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-sm text-black">1. Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-email" className={labelClass}>Email Address *</label>
                <input id="co-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-phone" className={labelClass}>Mobile Number (for delivery updates) *</label>
                <input id="co-phone" type="tel" required inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className={`${inputClass} font-mono`} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-sm text-black">2. Shipping Address</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="co-name" className={labelClass}>Full Recipient Name *</label>
                <input id="co-name" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-l1" className={labelClass}>Address Line 1 (House, Street, Area) *</label>
                <input id="co-l1" type="text" required autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="House / Flat No., Street, Area" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-l2" className={labelClass}>Address Line 2 (Landmark, Optional)</label>
                <input id="co-l2" type="text" autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Apartment, landmark (optional)" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="co-city" className={labelClass}>City *</label>
                  <input id="co-city" type="text" required autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="co-state" className={labelClass}>State *</label>
                  <select id="co-state" required value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="co-pin" className={labelClass}>PIN Code *</label>
                  <input id="co-pin" type="text" required inputMode="numeric" maxLength={6} autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))} placeholder="110001" className={`${inputClass} font-mono`} />
                </div>
              </div>
              {user && (
                <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-black" />
                  <span>Save this address to my account</span>
                </label>
              )}
            </div>
          </div>

          <div className="p-4 bg-white/70 border border-black/10 flex items-center space-x-3 text-xs text-neutral-700">
            <Lock className="w-5 h-5 text-black flex-shrink-0" />
            <span>Payments are processed securely by Razorpay. LEVIX never sees or stores your card details.</span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-6 border border-black/10 shadow-sm space-y-6 self-start lg:sticky lg:top-24">
          <h3 className="font-display font-black text-xl uppercase tracking-tight text-black border-b border-black/10 pb-3">
            Order Summary ({cart.itemCount})
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 text-xs">
                <div className="w-14 h-16 bg-neutral-200 overflow-hidden flex-shrink-0">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black truncate">{item.productName}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">Size: {item.size}{item.color ? ` • ${item.color}` : ''} • Qty: {item.quantity}</p>
                </div>
                <span className="font-bold font-mono text-black">RS. {inr(item.totalPaise)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-black/10">
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 text-[11px] text-green-800 font-semibold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {appliedCoupon.code} applied — {appliedCoupon.description}
                </span>
                <button type="button" aria-label="Remove coupon" onClick={() => setAppliedCoupon(null)} className="p-1 hover:text-black">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="PROMO CODE"
                  aria-label="Promo code"
                  className="flex-1 border border-black/20 px-3 py-2 text-xs uppercase font-mono focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black disabled:opacity-50"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="text-[11px] text-red-700 font-semibold mt-1.5">{couponError}</p>}
          </div>

          <div className="space-y-2 border-t border-black/10 pt-4 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-mono text-black font-semibold">RS. {inr(cart.subtotalPaise)}</span>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Coupon Discount</span>
                <span className="font-mono">- RS. {inr(discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Shipping</span>
              <span className="font-mono text-black font-semibold">{cart.shippingPaise === 0 ? 'FREE' : `RS. ${inr(cart.shippingPaise)}`}</span>
            </div>
            {cart.remainingForFreeShippingPaise > 0 && cart.shippingPaise > 0 && (
              <p className="text-[11px] text-neutral-500">Add RS. {inr(cart.remainingForFreeShippingPaise)} more for free shipping.</p>
            )}
            <div className="flex justify-between text-base font-bold text-black border-t border-black/10 pt-3">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-mono text-lg">RS. {inr(totalPaise)}</span>
            </div>
          </div>

          <label className="flex items-start gap-2 text-[11px] text-neutral-700 leading-relaxed cursor-pointer">
            <input
              id="checkout-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-black w-4 h-4 mt-0.5 shrink-0"
            />
            <span>
              I agree to the{' '}
              <Link to="/policies/terms-of-service" target="_blank" className="underline text-black">Terms & Conditions</Link>,{' '}
              <Link to="/policies/privacy-policy" target="_blank" className="underline text-black">Privacy policy</Link> and{' '}
              <Link to="/policies/refund-policy" target="_blank" className="underline text-black">Returns policy</Link>. I understand returns are accepted only for damaged, defective or wrong items reported within 48 hours, and there are no size exchanges.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || Boolean(stockProblem)}
            className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
          >
            <span>{loading ? 'Opening secure payment...' : `Pay RS. ${inr(totalPaise)}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
