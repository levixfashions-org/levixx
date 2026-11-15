import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Tag, X, Plus, Minus } from 'lucide-react';
import { InstagramGlyph } from '../components/InstagramGlyph';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Address } from '../types';
import { SavedAddress, loadDeviceAddresses, upsertDeviceAddress, removeDeviceAddress, setDeviceDefault } from '../services/deviceAddresses';

const CONTACT_KEY = 'levix_checkout_contact';

/** "@Levix.Wear" or an instagram.com link → "levix.wear". */
const cleanInstagram = (raw: string) => {
  let v = raw.trim();
  const m = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) v = m[1];
  return v.replace(/^@+/, '').replace(/\/+$/, '').trim().toLowerCase();
};
const IG_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
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
  const { cart, fetchCart, updateQuantity, removeItem } = useCartStore();
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const changeItem = async (itemId: string, qty: number) => {
    setItemBusy(itemId);
    setItemError(null);
    try {
      if (qty <= 0) await removeItem(itemId);
      else await updateQuantity(itemId, qty);
    } catch (err: any) {
      setItemError(err?.message || 'Could not update your bag. Please try again.');
    } finally {
      setItemBusy(null);
    }
  };
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
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
      if (profile?.instagram) setInstagram((v) => v || profile.instagram || '');
    } else {
      try {
        const c = JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}');
        if (c.email) setEmail((v) => v || c.email);
        if (c.instagram) setInstagram((v) => v || c.instagram);
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

    const igHandle = cleanInstagram(instagram);
    if (igHandle && !IG_RE.test(igHandle)) {
      setErrorMsg("That Instagram ID doesn't look right. Use letters, numbers, dots or underscores, or leave it empty.");
      document.getElementById('co-ig')?.focus();
      return;
    }
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
        instagram: igHandle || null,
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
      if (user && igHandle && igHandle !== profile?.instagram) setTimeout(() => refreshProfile().catch(() => undefined), 300);
      if (user && typed) setTimeout(() => refreshProfile().catch(() => undefined), 300);
      if (!user) {
        if (typed) setDeviceAddrs(upsertDeviceAddress(currentAddress(), editingId).list);
        try {
          localStorage.setItem(CONTACT_KEY, JSON.stringify({ email: email.trim(), instagram: igHandle }));
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

  const inputClass = 'lx-field w-full h-12 px-4 text-[15px]';
  const labelClass = 'block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1';

  return (
    <div className="lx-acct px-4 sm:px-6 py-6 sm:py-10">
      <div className="lx-login-wallpaper" aria-hidden="true" />
      <div className="relative z-[1] max-w-[1180px] mx-auto">
      <div className="mb-5 sm:mb-7 px-1">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6e6e73]"><Lock className="w-3.5 h-3.5" /> Secure checkout</p>
        <h1 className="mt-1 text-[28px] sm:text-[36px] leading-tight font-semibold tracking-[-0.035em] text-[#0b0b0f]">Checkout</h1>
        <p className="text-[13.5px] text-[#6e6e73] mt-1 max-w-[640px] leading-relaxed">
          {storeSettings.codEnabled
            ? 'Pay online with UPI, cards, net banking or wallets via Razorpay — or choose Cash on Delivery.'
            : 'Pay safely with UPI, cards, net banking or wallets via Razorpay. Prepaid orders only — Cash on Delivery is not available.'}
          {!user && (
            <>
              {' '}
              <Link to="/login" state={{ from: '/checkout' }} className="font-semibold text-[#ff5400] hover:text-[#d94800]">Sign in</Link> to save your address and track orders.
            </>
          )}
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="px-4 py-3 mb-5 rounded-[16px] bg-red-50/95 border border-red-200 text-red-700 text-[13px] font-medium">{errorMsg}</div>
      )}
      {stockProblem && (
        <div className="px-4 py-3 mb-5 rounded-[16px] bg-amber-50/95 border border-amber-200 text-amber-900 text-[13px] font-medium">
          {stockProblem.productName} ({stockProblem.size}) has only {stockProblem.stockQuantity} left. Please update your{' '}
          <Link to="/cart" className="underline">bag</Link>.
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          <div className="lx-acct-card p-5 sm:p-7 space-y-4">
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-[#0b0b0f] text-white text-[12px] font-semibold flex items-center justify-center">1</span> Contact details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-email" className={labelClass}>Email *</label>
                <input id="co-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-phone" className={labelClass}>Mobile number *</label>
                <input id="co-phone" type="tel" required inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-ig" className={`${labelClass} flex items-center gap-1.5`}>
                  <InstagramGlyph className="w-3.5 h-3.5" /> Instagram ID <span className="text-[#8e8e93] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[#8e8e93] pointer-events-none">@</span>
                  <input
                    id="co-ig"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={120}
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ''))}
                    onBlur={() => setInstagram((v) => cleanInstagram(v))}
                    placeholder="your.username"
                    className={`${inputClass} !pl-9`}
                    aria-describedby="co-ig-help"
                  />
                </div>
                <p id="co-ig-help" className="mt-1.5 pl-1 text-[12px] text-[#8e8e93]">
                  {storeSettings.instagramHandle ? `Follow @${storeSettings.instagramHandle.replace(/^@/, '')} on Instagram and add your ID so we can recognise our followers.` : 'Add your ID so we can recognise our Instagram followers.'}
                </p>
              </div>
            </div>
          </div>

          <div className="lx-acct-card p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-[#0b0b0f] text-white text-[12px] font-semibold flex items-center justify-center">2</span> Delivery address</h3>
              {addrMode === 'list' && savedList.length < MAX_ADDRESSES && (
                <button type="button" onClick={startAdd} className="lx-btn-soft h-9 px-3 inline-flex items-center gap-1 text-[13px] font-semibold">
                  <Plus className="w-4 h-4" /> Add new
                </button>
              )}
            </div>
            {addrError && <p role="alert" className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-[12px] px-3 py-2">{addrError}</p>}

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
                      className={`lx-acct-row p-4 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5400]/40 ${on ? '!border-[#ff5400]/60 ring-2 ring-[#ff5400]/25 bg-white' : 'hover:bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${on ? 'border-[#ff5400] bg-[#ff5400] shadow-[inset_0_0_0_3px_#fff]' : 'border-black/25'}`} />
                        <div className="min-w-0 flex-1 text-xs text-neutral-700 space-y-0.5 break-words">
                          <p className="font-bold text-black text-[13px] flex flex-wrap items-center gap-2">
                            {a.fullName}
                            {a.isDefault && <span className="lx-pill bg-orange-100 text-[#c24100]">Default</span>}
                          </p>
                          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                          <p>{a.city}, {a.state} – {a.postalCode}</p>
                          <p>{a.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pl-7 text-[11px] font-semibold">
                        <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(a); }} className="underline text-[#0b0b0f]">Edit</button>
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
                    className="flex flex-col items-center justify-center gap-1.5 p-4 min-h-[132px] rounded-[18px] border-2 border-dashed border-black/15 hover:border-[#ff5400]/50 bg-white/40 text-[13px] font-medium text-[#6e6e73] hover:text-[#0b0b0f] transition-colors"
                  >
                    <Plus className="w-7 h-7" strokeWidth={1.5} />
                    Add new address
                  </button>
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {savedList.length > 0 && (
                <p className="text-[13px] font-semibold text-[#3a3a3f]">{editingId ? 'Edit address' : 'New address'}</p>
              )}
              <div>
                <label htmlFor="co-name" className={labelClass}>Full name *</label>
                <input id="co-name" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Who receives the parcel" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-l1" className={labelClass}>House / flat, street, area *</label>
                <input id="co-l1" type="text" required autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat 12, Green Residency, MG Road" className={inputClass} />
              </div>
              <div>
                <label htmlFor="co-l2" className={labelClass}>Landmark (optional)</label>
                <input id="co-l2" type="text" autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Near City Mall" className={inputClass} />
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
                  <label htmlFor="co-pin" className={labelClass}>PIN code *</label>
                  <input id="co-pin" type="text" required inputMode="numeric" maxLength={6} autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))} placeholder="500001" className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-[13.5px] text-[#3a3a3f] cursor-pointer select-none pl-1">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-[18px] h-[18px] accent-[#FF5400]" />
                <span>{user ? 'Save this address to my account for next time' : 'Remember this address on this device for next time'}</span>
              </label>
              {(savedList.length > 0 || editingId) && (
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={addrBusy} onClick={saveAddressNow} className="lx-btn-primary h-11 px-5 text-[14px] font-semibold disabled:opacity-50">
                    {addrBusy ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
                  </button>
                  {savedList.length > 0 && (
                    <button type="button" onClick={cancelForm} className="lx-btn-soft h-11 px-5 text-[14px] font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              )}
              {!user && (
                <p className="text-[12.5px] text-[#8e8e93] pl-1">
                  <Link to="/login" state={{ from: '/checkout' }} className="font-semibold text-[#ff5400]">Sign in</Link> to keep your addresses on every device.
                </p>
              )}
            </div>
            )}
          </div>

          {storeSettings.codEnabled && (
            <div className="lx-acct-card p-5 sm:p-7 space-y-4">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-[#0b0b0f] text-white text-[12px] font-semibold flex items-center justify-center">3</span> Payment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`lx-acct-row flex items-start gap-3 p-4 cursor-pointer transition-all ${payMethod === 'ONLINE' || !codAvailable ? '!border-[#ff5400]/60 ring-2 ring-[#ff5400]/25 bg-white' : 'hover:bg-white'}`}>
                  <input id="pay-online" type="radio" name="payMethod" checked={payMethod === 'ONLINE' || !codAvailable} onChange={() => setPayMethod('ONLINE')} className="w-[18px] h-[18px] accent-[#FF5400] mt-0.5" />
                  <span>
                    <span className="block text-[14px] font-semibold text-[#0b0b0f]">Pay online</span>
                    <span className="block text-[12.5px] text-[#6e6e73] mt-0.5">UPI, cards, net banking or wallets via Razorpay</span>
                  </span>
                </label>
                <label className={`lx-acct-row flex items-start gap-3 p-4 transition-all ${!codAvailable ? 'opacity-50 cursor-not-allowed' : payMethod === 'COD' ? '!border-[#ff5400]/60 ring-2 ring-[#ff5400]/25 bg-white cursor-pointer' : 'hover:bg-white cursor-pointer'}`}>
                  <input id="pay-cod" type="radio" name="payMethod" disabled={!codAvailable} checked={isCod} onChange={() => setPayMethod('COD')} className="w-[18px] h-[18px] accent-[#FF5400] mt-0.5" />
                  <span>
                    <span className="block text-[14px] font-semibold text-[#0b0b0f]">Cash on Delivery</span>
                    <span className="block text-[12.5px] text-[#6e6e73] mt-0.5">
                      {codAvailable
                        ? `Pay in cash or UPI when your order arrives${codFeePaise > 0 ? ` · +₹${inr(codFeePaise)} COD fee` : ''}`
                        : `Available for orders up to ₹${inr(codLimitPaise)}`}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="lx-acct-card px-5 py-4 flex items-center gap-3 text-[13px] text-[#3a3a3f]">
            <span className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0"><Lock className="w-4 h-4" /></span>
            <span>
              {isCod
                ? 'Your order is confirmed right away. Please keep the exact amount ready — you can pay the courier in cash or by UPI.'
                : 'Payments are processed securely by Razorpay. LEVIX never sees or stores your card details.'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 lx-acct-card p-5 sm:p-7 space-y-5 self-start lg:sticky lg:top-24">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f] border-b border-black/[0.07] pb-3">
            Order Summary ({cart.itemCount})
          </h3>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className={`flex items-center space-x-3 text-xs transition-opacity ${itemBusy === item.id ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="w-14 h-[68px] rounded-[12px] bg-black/5 ring-1 ring-black/5 overflow-hidden flex-shrink-0">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-[#0b0b0f] truncate">{item.productName}</p>
                  <p className="text-[12px] text-[#8e8e93]">Size {item.size}{item.color ? ` • ${item.color}` : ''}</p>
                  <div className="mt-1.5 inline-flex items-center rounded-[10px] bg-white/80 ring-1 ring-black/10 overflow-hidden">
                    <button type="button" onClick={() => changeItem(item.id, item.quantity - 1)} aria-label={`Decrease quantity of ${item.productName}`} className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-semibold text-[12.5px]">{item.quantity}</span>
                    <button type="button" onClick={() => changeItem(item.id, item.quantity + 1)} disabled={item.quantity >= item.stockQuantity} aria-label={`Increase quantity of ${item.productName}`} className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 self-stretch justify-between">
                  <button type="button" onClick={() => changeItem(item.id, 0)} aria-label={`Remove ${item.productName}`} title="Remove" className="w-7 h-7 -mr-1 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50">
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-[14px] font-semibold text-[#0b0b0f] whitespace-nowrap">₹{inr(item.totalPaise)}</span>
                </div>
              </div>
            ))}
          </div>

          {itemError && <p className="text-[11px] text-red-600 -mt-3">{itemError}</p>}

          <div className="pt-1">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-[12px] bg-green-50 border border-green-200 px-3 py-2.5 text-[12.5px] text-green-800 font-medium">
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
                  placeholder="Promo code"
                  aria-label="Promo code"
                  className="lx-field flex-1 min-w-0 h-11 px-3.5 text-[14px] uppercase placeholder:normal-case"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="lx-btn-primary h-11 px-5 text-[14px] font-semibold disabled:opacity-40"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="text-[11px] text-red-700 font-semibold mt-1.5">{couponError}</p>}
          </div>

          <div className="space-y-2.5 border-t border-black/[0.07] pt-4 text-[13.5px]">
            <div className="flex justify-between text-[#6e6e73]">
              <span>Subtotal</span>
              <span className="text-[#0b0b0f] font-medium">₹{inr(cart.subtotalPaise)}</span>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Coupon Discount</span>
                <span>− ₹{inr(discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6e6e73]">
              <span>Shipping</span>
              <span className="text-[#0b0b0f] font-medium">{cart.shippingPaise === 0 ? <span className="text-green-700">Free</span> : `₹${inr(cart.shippingPaise)}`}</span>
            </div>
            {isCod && codFeePaise > 0 && (
              <div className="flex justify-between text-[#6e6e73]">
                <span>Cash on Delivery fee</span>
                <span className="text-[#0b0b0f] font-medium">₹{inr(codFeePaise)}</span>
              </div>
            )}
            {cart.remainingForFreeShippingPaise > 0 && cart.shippingPaise > 0 && (
              <p className="text-[12px] text-[#c24100] bg-orange-50 rounded-[10px] px-3 py-2">Add ₹{inr(cart.remainingForFreeShippingPaise)} more for free shipping.</p>
            )}
            <div className="flex justify-between items-baseline text-[#0b0b0f] border-t border-black/[0.07] pt-3">
              <span className="text-[15px] font-semibold">{isCod ? 'Pay on delivery' : 'Total'}</span>
              <span className="text-[24px] font-semibold tracking-[-0.03em]">₹{inr(totalPaise)}</span>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-[12px] text-[#6e6e73] leading-relaxed cursor-pointer">
            <input
              id="checkout-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-[#FF5400] w-[18px] h-[18px] mt-0.5 shrink-0"
            />
            <span>
              I agree to the{' '}
              <Link to="/policies/terms-of-service" target="_blank" className="underline text-[#0b0b0f]">Terms & Conditions</Link>,{' '}
              <Link to="/policies/privacy-policy" target="_blank" className="underline text-[#0b0b0f]">Privacy policy</Link> and{' '}
              <Link to="/policies/refund-policy" target="_blank" className="underline text-[#0b0b0f]">Returns policy</Link>. I understand returns are accepted only for damaged, defective or wrong items reported within 48 hours, and there are no size exchanges.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || Boolean(stockProblem)}
            className="lx-btn-primary w-full h-14 text-[15.5px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? (isCod ? 'Placing your order...' : 'Opening secure payment...') : isCod ? `Place order · Pay ₹${inr(totalPaise)} on delivery` : `Pay ₹${inr(totalPaise)} securely`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};
