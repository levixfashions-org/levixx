import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Tag, X, Plus } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Address } from '../types';
import { SavedAddress, loadDeviceAddresses, upsertDeviceAddress, removeDeviceAddress, setDeviceDefault } from '../services/deviceAddresses';

const CONTACT_KEY = 'levix_checkout_contact';
const MAX_ADDRESSES = 10;
import { useSettingsStore } from '../store/settingsStore';

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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
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

  // Saved addresses: account addresses when signed in, otherwise addresses remembered on this device.
  const [deviceAddrs, setDeviceAddrs] = useState<SavedAddress[]>(() => loadDeviceAddresses());
  const [addrMode, setAddrMode] = useState<'list' | 'form'>('form');
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const savedList: SavedAddress[] = user
    ? ((profile?.addresses || []).filter((a) => a.id) as SavedAddress[])
    : deviceAddrs;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number; description: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const storeSettings = useSettingsStore((s) => s.settings);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
    loadRazorpay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillFrom = (a: Address) => {
    setFullName(a.fullName);
    setPhone(a.phone);
    setLine1(a.line1);
    setLine2(a.line2 || '');
    setCity(a.city);
    setState(a.state);
    setPostalCode(a.postalCode);
  };

  // Prefill contact details and pick the default saved address.
  useEffect(() => {
    if (prefilled || authLoading) return;
    if (user && !profile) return; // wait for the account to load
    if (user) {
      setEmail((v) => v || user.email || '');
      setFullName((v) => v || user.displayName || '');
    } else {
      try {
        const c = JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}');
        if (c.email) setEmail((v) => v || c.email);
      } catch {
        /* ignore */
      }
    }
    const list = user ? profile?.addresses || [] : deviceAddrs;
    const addr = list.find((a) => a.isDefault) || list[0];
    if (addr) {
      fillFrom(addr);
      setSelectedAddrId(addr.id || null);
      setAddrMode('list');
    } else if (profile?.phone) {
      setPhone(profile.phone);
    }
    setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, prefilled, authLoading]);

  const currentAddress = (): Address => ({
    fullName: fullName.trim(),
    line1: line1.trim(),
    line2: line2.trim() || undefined,
    city: city.trim(),
    state,
    postalCode: postalCode.trim(),
    country: 'India',
    phone: phone.replace(/[\s-]/g, '')
  });

  const addressProblem = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter the recipient’s full name.';
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) return 'Please enter a valid 10-digit Indian mobile number.';
    if (line1.trim().length < 3) return 'Please enter the house / street / area.';
    if (city.trim().length < 2) return 'Please enter the city.';
    if (!state) return 'Please select your state.';
    if (!/^\d{6}$/.test(postalCode.trim())) return 'Please enter a valid 6-digit PIN code.';
    return null;
  };

  const chooseAddress = (a: SavedAddress) => {
    setSelectedAddrId(a.id);
    fillFrom(a);
    setAddrError(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setSelectedAddrId(null);
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    if (user) setFullName(user.displayName || fullName);
    setSaveAddress(true);
    setAddrError(null);
    setAddrMode('form');
  };

  const startEdit = (a: SavedAddress) => {
    setEditingId(a.id);
    setSelectedAddrId(a.id);
    fillFrom(a);
    setSaveAddress(true);
    setAddrError(null);
    setAddrMode('form');
  };

  const cancelForm = () => {
    setEditingId(null);
    setAddrError(null);
    const back = savedList.find((a) => a.id === selectedAddrId) || savedList.find((a) => a.isDefault) || savedList[0];
    if (back) chooseAddress(back);
    setAddrMode('list');
  };

  /** "Save address" button in the form: stores it right away and selects it. */
  const saveAddressNow = async () => {
    const problem = addressProblem();
    if (problem) return setAddrError(problem);
    setAddrBusy(true);
    setAddrError(null);
    try {
      const addr = currentAddress();
      let id: string;
      if (user) {
        const res = editingId
          ? await apiClient.put(`/auth/addresses/${editingId}`, addr)
          : await apiClient.post('/auth/addresses', addr);
        id = res.data.address.id;
        await refreshProfile();
      } else {
        const r = upsertDeviceAddress(addr, editingId);
        setDeviceAddrs(r.list);
        id = r.id;
      }
      setSelectedAddrId(id);
      setEditingId(null);
      setAddrMode('list');
    } catch (err: any) {
      setAddrError(err.message || 'Could not save this address. Please try again.');
    } finally {
      setAddrBusy(false);
    }
  };

  const removeAddress = async (a: SavedAddress) => {
    if (!window.confirm(`Remove the address for ${a.fullName} (${a.postalCode})?`)) return;
    setAddrError(null);
    try {
      let list: SavedAddress[];
      if (user) {
        await apiClient.delete(`/auth/addresses/${a.id}`);
        await refreshProfile();
        list = savedList.filter((x) => x.id !== a.id);
      } else {
        list = removeDeviceAddress(a.id);
        setDeviceAddrs(list);
      }
      if (selectedAddrId === a.id) {
        const next = list.find((x) => x.isDefault) || list[0];
        if (next) chooseAddress(next);
        else startAdd();
      }
      if (!list.length) setAddrMode('form');
    } catch (err: any) {
      setAddrError(err.message || 'Could not remove this address.');
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    setAddrError(null);
    try {
      if (user) {
        await apiClient.patch(`/auth/addresses/${a.id}/default`);
        await refreshProfile();
      } else {
        setDeviceAddrs(setDeviceDefault(a.id));
      }
    } catch (err: any) {
      setAddrError(err.message || 'Could not update the default address.');
    }
  };

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
  const onlineTotalPaise = Math.max(0, cart.subtotalPaise - discountPaise) + cart.shippingPaise;
  const codFeePaise = Math.max(0, Math.round((storeSettings.codFee || 0) * 100));
  const codLimitPaise = (storeSettings.codMaxOrder || 0) * 100;
  const codAvailable = Boolean(storeSettings.codEnabled) && (codLimitPaise === 0 || onlineTotalPaise + codFeePaise <= codLimitPaise);
  const isCod = payMethod === 'COD' && codAvailable;
  const totalPaise = onlineTotalPaise + (isCod ? codFeePaise : 0);
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
    if (addrMode === 'list' && !selectedAddrId) return setErrorMsg('Please choose a delivery address, or add a new one.');
    const problem = addressProblem();
    if (problem) {
      if (addrMode === 'list' && selectedAddrId) {
        const bad = savedList.find((a) => a.id === selectedAddrId);
        if (bad) startEdit(bad);
        return setErrorMsg(`${problem} Please update the selected address.`);
      }
      return setErrorMsg(problem);
    }
    if (!agreed) return setErrorMsg('Please accept the Terms & Conditions and the Returns policy to continue.');

    setLoading(true);
    try {
      if (!isCod) {
        const ready = await loadRazorpay();
        if (!ready) throw new Error('Could not load the Razorpay payment window. Please check your connection and try again.');
      }

      const orderRes = await apiClient.post('/orders', {
        paymentMethod: isCod ? 'COD' : 'ONLINE',
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
        // New address typed at checkout → saved to the account (the server skips duplicates).
        saveAddress: Boolean(user) && addrMode === 'form' && !editingId && saveAddress
      });

      // Remember the address for next time.
      const typed = addrMode === 'form' && saveAddress;
      if (user && typed && editingId) {
        apiClient.put(`/auth/addresses/${editingId}`, currentAddress()).catch(() => undefined);
      }
      if (user && typed) setTimeout(() => refreshProfile().catch(() => undefined), 300);
      if (!user) {
        if (typed) setDeviceAddrs(upsertDeviceAddress(currentAddress(), editingId).list);
        try {
          localStorage.setItem(CONTACT_KEY, JSON.stringify({ email: email.trim() }));
        } catch {
          /* ignore */
        }
      }

      const { order, accessKey, razorpayOrderId, amountPaise, keyId } = orderRes.data;
      try {
        sessionStorage.setItem(`levix_order_${order.orderNumber}`, accessKey);
      } catch {
        /* ignore */
      }
      const successUrl = `/order-success/${order.orderNumber}?key=${encodeURIComponent(accessKey)}`;

      if (isCod) {
        // Cash on Delivery: the order is already confirmed — no payment window.
        await fetchCart();
        navigate(successUrl, { replace: true });
        return;
      }

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
          {storeSettings.codEnabled
            ? 'Pay online with UPI, cards, net banking or wallets via Razorpay — or choose Cash on Delivery.'
            : 'Pay safely with UPI, cards, net banking or wallets via Razorpay. Prepaid orders only — Cash on Delivery is not available.'}
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
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold uppercase tracking-wider text-sm text-black">2. Delivery Address</h3>
              {addrMode === 'list' && savedList.length < MAX_ADDRESSES && (
                <button type="button" onClick={startAdd} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-black hover:underline">
                  <Plus className="w-4 h-4" /> Add new
                </button>
              )}
            </div>
            {addrError && <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 px-3 py-2">{addrError}</p>}

            {addrMode === 'list' ? (
              <div role="radiogroup" aria-label="Saved delivery addresses" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedList.map((a) => {
                  const on = a.id === selectedAddrId;
                  return (
                    <div
                      key={a.id}
                      role="radio"
                      aria-checked={on}
                      tabIndex={0}
                      onClick={() => chooseAddress(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          chooseAddress(a);
                        }
                      }}
                      className={`p-4 bg-white border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${on ? 'border-black ring-1 ring-black' : 'border-black/20 hover:border-black/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${on ? 'border-black bg-black shadow-[inset_0_0_0_3px_#fff]' : 'border-black/30'}`} />
                        <div className="min-w-0 flex-1 text-xs text-neutral-700 space-y-0.5 break-words">
                          <p className="font-bold text-black text-[13px] flex flex-wrap items-center gap-2">
                            {a.fullName}
                            {a.isDefault && <span className="text-[9px] uppercase tracking-wider bg-black text-white px-1.5 py-0.5">Default</span>}
                          </p>
                          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                          <p>{a.city}, {a.state} – {a.postalCode}</p>
                          <p className="font-mono">{a.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pl-7 text-[11px] font-semibold">
                        <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(a); }} className="underline text-black">Edit</button>
                        {!a.isDefault && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); makeDefault(a); }} className="underline text-neutral-600 hover:text-black">Set as default</button>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeAddress(a); }} className="underline text-red-600">Remove</button>
                      </div>
                    </div>
                  );
                })}
                {savedList.length < MAX_ADDRESSES && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 min-h-[132px] border-2 border-dashed border-black/25 hover:border-black bg-white/60 text-[11px] font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors"
                  >
                    <Plus className="w-7 h-7" strokeWidth={1.5} />
                    Add new address
                  </button>
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {savedList.length > 0 && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">{editingId ? 'Edit address' : 'New address'}</p>
              )}
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
              <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-black" />
                <span>{user ? 'Save this address to my account for next time' : 'Remember this address on this device for next time'}</span>
              </label>
              {(savedList.length > 0 || editingId) && (
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={addrBusy} onClick={saveAddressNow} className="px-5 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">
                    {addrBusy ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
                  </button>
                  {savedList.length > 0 && (
                    <button type="button" onClick={cancelForm} className="px-5 py-2.5 border border-black/30 text-[11px] font-bold uppercase tracking-wider text-black hover:border-black">
                      Cancel
                    </button>
                  )}
                </div>
              )}
              {!user && (
                <p className="text-[10.5px] text-neutral-500">
                  <Link to="/login" state={{ from: '/checkout' }} className="underline">Sign in</Link> to keep your addresses on every device.
                </p>
              )}
            </div>
            )}
          </div>

          {storeSettings.codEnabled && (
            <div className="space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-sm text-black">3. Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start gap-3 p-4 border cursor-pointer bg-white ${payMethod === 'ONLINE' || !codAvailable ? 'border-black ring-1 ring-black' : 'border-black/20 hover:border-black/50'}`}>
                  <input id="pay-online" type="radio" name="payMethod" checked={payMethod === 'ONLINE' || !codAvailable} onChange={() => setPayMethod('ONLINE')} className="accent-black mt-0.5" />
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wider text-black">Pay online</span>
                    <span className="block text-[11px] text-neutral-600 mt-0.5">UPI, cards, net banking or wallets via Razorpay</span>
                  </span>
                </label>
                <label className={`flex items-start gap-3 p-4 border bg-white ${!codAvailable ? 'opacity-50 cursor-not-allowed border-black/10' : payMethod === 'COD' ? 'border-black ring-1 ring-black cursor-pointer' : 'border-black/20 hover:border-black/50 cursor-pointer'}`}>
                  <input id="pay-cod" type="radio" name="payMethod" disabled={!codAvailable} checked={isCod} onChange={() => setPayMethod('COD')} className="accent-black mt-0.5" />
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wider text-black">Cash on Delivery</span>
                    <span className="block text-[11px] text-neutral-600 mt-0.5">
                      {codAvailable
                        ? `Pay in cash or UPI when your order arrives${codFeePaise > 0 ? ` · +RS. ${inr(codFeePaise)} COD fee` : ''}`
                        : `Available for orders up to RS. ${inr(codLimitPaise)}`}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="p-4 bg-white/70 border border-black/10 flex items-center space-x-3 text-xs text-neutral-700">
            <Lock className="w-5 h-5 text-black flex-shrink-0" />
            <span>
              {isCod
                ? 'Your order is confirmed right away. Please keep the exact amount ready — you can pay the courier in cash or by UPI.'
                : 'Payments are processed securely by Razorpay. LEVIX never sees or stores your card details.'}
            </span>
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
            {isCod && codFeePaise > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Cash on Delivery fee</span>
                <span className="font-mono text-black font-semibold">RS. {inr(codFeePaise)}</span>
              </div>
            )}
            {cart.remainingForFreeShippingPaise > 0 && cart.shippingPaise > 0 && (
              <p className="text-[11px] text-neutral-500">Add RS. {inr(cart.remainingForFreeShippingPaise)} more for free shipping.</p>
            )}
            <div className="flex justify-between text-base font-bold text-black border-t border-black/10 pt-3">
              <span className="uppercase tracking-wider">{isCod ? 'Pay on delivery' : 'Total'}</span>
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
            <span>{loading ? (isCod ? 'Placing your order...' : 'Opening secure payment...') : isCod ? `Place order · Pay RS. ${inr(totalPaise)} on delivery` : `Pay RS. ${inr(totalPaise)}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
