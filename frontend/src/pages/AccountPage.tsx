import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updateProfile as fbUpdateProfile } from 'firebase/auth';
import {
  Package, Heart, MapPin, LogOut, Plus, Pencil, Trash2, Shield, ChevronRight, Truck, Mail, Phone, User as UserIcon,
  CheckCircle2, AlertCircle, Star, HelpCircle, FileText, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import { apiClient } from '../services/api';
import { authService } from '../services/authService';
import { useWishlistStore } from '../store/wishlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { PushToggle } from '../components/PushToggle';
import { InstagramGlyph } from '../components/InstagramGlyph';
import { ShipmentTracker } from '../components/ShipmentTracker';
import { AddressSheet, AddressInput } from '../components/account/AddressSheet';
import { StatusPill, isActiveOrder, orderDate, rupees } from '../components/account/orderStatus';
import { Address, Order } from '../types';

const card = 'lx-acct-card';

export const AccountPage: React.FC = () => {
  const { user, profile, loading, logout, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const savedCount = useWishlistStore((s) => s.ids.length);
  const supportEmail = useSettingsStore((s) => s.settings.supportEmail);
  const live = useLiveRefresh();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Personal details
  const [editProfile, setEditProfile] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [igEdit, setIgEdit] = useState('');
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login', { state: { from: '/account' } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/orders/my-orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders((o) => o || []));
  }, [user, live]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  if (loading || !user) {
    return (
      <div className="lx-acct flex items-center justify-center">
        <div className="lx-login-wallpaper" aria-hidden="true" />
        <div className="relative w-8 h-8 rounded-full border-2 border-black/10 border-t-[#FF5400] animate-spin" aria-label="Loading account" />
      </div>
    );
  }

  const displayName = profile?.name || user.displayName || user.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];
  const initial = displayName.trim().charAt(0).toUpperCase();
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null;
  const needsVerify = !user.emailVerified && user.providerData.some((p) => p.providerId === 'password');
  const addresses = profile?.addresses || [];
  const orderCount = orders?.length ?? profile?._count?.orders ?? 0;
  const latest = orders?.find((o) => isActiveOrder(o.status)) || orders?.[0];
  const activeCount = orders?.filter((o) => isActiveOrder(o.status)).length || 0;

  const startEditProfile = () => {
    setName(profile?.name || user.displayName || '');
    setPhone(profile?.phone || '');
    setIgEdit(profile?.instagram || '');
    setProfileErr(null);
    setEditProfile(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const ph = phone.replace(/[\s-]/g, '');
    if (n.length < 2) return setProfileErr('Please enter your name (at least 2 letters).');
    if (ph && !/^(\+91)?[6-9]\d{9}$/.test(ph)) return setProfileErr('Enter a valid 10-digit mobile number.');
    const igm = igEdit.trim().match(/instagram\.com\/([^/?#\s]+)/i);
    const ig = (igm ? igm[1] : igEdit).trim().replace(/^@+/, '').replace(/\/+$/, '').toLowerCase();
    if (ig && !/^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/.test(ig)) return setProfileErr("That Instagram ID doesn't look right. Use letters, numbers, dots or underscores.");
    setSavingProfile(true);
    setProfileErr(null);
    try {
      await apiClient.put('/auth/profile', { name: n, ...(ph ? { phone: ph } : {}), instagram: ig });
      if (auth.currentUser && auth.currentUser.displayName !== n) await fbUpdateProfile(auth.currentUser, { displayName: n }).catch(() => undefined);
      await refreshProfile();
      setEditProfile(false);
      setToast('Profile updated');
    } catch (err: any) {
      setProfileErr(err?.message || 'Could not save. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async (a: AddressInput) => {
    const body = { ...a, country: 'India' };
    if (editing?.id) await apiClient.put(`/auth/addresses/${editing.id}`, body);
    else await apiClient.post('/auth/addresses', body);
    await refreshProfile();
    setToast(editing ? 'Address updated' : 'Address saved');
  };

  const makeDefault = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient.patch(`/auth/addresses/${id}/default`, {});
      await refreshProfile();
      setToast('Default address changed');
    } catch (err: any) {
      setToast(err?.message || 'Could not change the default');
    } finally {
      setBusyId(null);
    }
  };

  const removeAddress = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient.delete(`/auth/addresses/${id}`);
      await refreshProfile();
      setToast('Address removed');
    } catch (err: any) {
      setToast(err?.message || 'Could not remove this address');
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  const resendVerify = async () => {
    try {
      await authService.resendVerification();
      setVerifySent(true);
    } catch (err: any) {
      setToast(err?.message || 'Could not send the email');
    }
  };

  return (
    <div className="lx-acct px-4 sm:px-6 py-6 sm:py-10">
      <div className="lx-login-wallpaper" aria-hidden="true" />

      <div className="relative z-[1] max-w-[1080px] mx-auto space-y-4 sm:space-y-5">
        {/* ── Profile header ── */}
        <section className={`${card} p-5 sm:p-7`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="lx-acct-avatar w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center text-white text-[26px] font-semibold flex-shrink-0">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] text-[#6e6e73]">Hi there,</p>
                <h1 className="text-[24px] sm:text-[28px] leading-tight font-semibold tracking-[-0.03em] text-[#0b0b0f] truncate">{displayName}</h1>
                <p className="mt-0.5 text-[13px] text-[#6e6e73] truncate">
                  {user.email}
                  {memberSince && <span className="hidden sm:inline"> · Member since {memberSince}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="lx-btn-primary h-10 px-4 flex items-center gap-1.5 text-[13.5px] font-semibold">
                  <Shield className="w-4 h-4" /> Admin panel
                </Link>
              )}
              <button type="button" onClick={signOut} className="lx-btn-soft h-10 px-4 flex items-center gap-1.5 text-[13.5px] font-semibold">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          {needsVerify && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-4 py-3 rounded-[16px] bg-amber-50/90 border border-amber-200">
              <p className="flex items-start gap-2 text-[13px] text-amber-900">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Please verify your email — we sent a link to {user.email}.
              </p>
              <button type="button" onClick={resendVerify} disabled={verifySent} className="lx-btn-soft h-9 px-3.5 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-60">
                {verifySent ? 'Email sent ✓' : 'Resend link'}
              </button>
            </div>
          )}
        </section>

        {/* ── Quick tiles ── */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { to: '/account/orders', icon: Package, label: 'Orders', value: orderCount, sub: activeCount ? `${activeCount} active` : 'All orders' },
            { to: '/wishlist', icon: Heart, label: 'Saved', value: savedCount, sub: 'Wishlist' },
            { to: '#addresses', icon: MapPin, label: 'Addresses', value: addresses.length, sub: 'Saved' }
          ].map((t) => {
            const Icon = t.icon;
            const inner = (
              <>
                <span className="w-9 h-9 rounded-[11px] bg-white/80 ring-1 ring-black/5 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-[#FF5400]" />
                </span>
                <p className="mt-3 text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em] text-[#0b0b0f] leading-none">{t.value}</p>
                <p className="mt-1 text-[12.5px] sm:text-[13.5px] font-medium text-[#0b0b0f]">{t.label}</p>
                <p className="text-[11px] sm:text-[12px] text-[#8e8e93]">{t.sub}</p>
              </>
            );
            return t.to.startsWith('#') ? (
              <a key={t.label} href={t.to} className={`${card} lx-acct-tile block p-4 sm:p-5`}>{inner}</a>
            ) : (
              <Link key={t.label} to={t.to} className={`${card} lx-acct-tile block p-4 sm:p-5`}>{inner}</Link>
            );
          })}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* ── Left column ── */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* Latest order */}
            <section className={`${card} p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2">
                  <Truck className="w-[18px] h-[18px] text-[#FF5400]" />
                  {latest && isActiveOrder(latest.status) ? 'Your latest order' : 'Recent order'}
                </h2>
                <Link to="/account/orders" className="text-[13px] font-medium text-[#ff5400] hover:text-[#d94800] flex items-center">
                  All orders <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {orders === null ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-1/3 bg-black/5 rounded" />
                  <div className="h-16 bg-black/5 rounded-[14px]" />
                </div>
              ) : latest ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-[#0b0b0f] truncate">{latest.orderNumber}</p>
                      <p className="text-[12px] text-[#8e8e93]">
                        {orderDate(latest.createdAt)} · {latest.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {rupees(latest.totalPaise)}
                      </p>
                    </div>
                    <StatusPill order={latest} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {latest.items.slice(0, 5).map((it) => (
                      <div key={it.id} className="w-14 h-[68px] rounded-[12px] overflow-hidden bg-black/5 flex-shrink-0 ring-1 ring-black/5">
                        {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                    ))}
                  </div>
                  <ShipmentTracker
                    status={latest.status}
                    courier={latest.courier}
                    trackingNumber={latest.trackingNumber}
                    paymentMethod={latest.paymentMethod}
                    paymentStatus={latest.paymentStatus}
                    refundStatus={latest.refundStatus}
                    refundAmountPaise={latest.refundAmountPaise}
                    refundedAt={latest.refundedAt}
                    refundRequestedAt={latest.refundRequestedAt}
                    totalPaise={latest.totalPaise}
                  />
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package className="w-10 h-10 mx-auto text-black/20" strokeWidth={1.4} />
                  <p className="mt-2 text-[14px] font-medium text-[#0b0b0f]">No orders yet</p>
                  <p className="text-[12.5px] text-[#8e8e93]">Your orders and live tracking will show up here.</p>
                  <Link to="/collections/all-products" className="lx-btn-primary inline-flex mt-4 h-10 px-5 items-center text-[13.5px] font-semibold">
                    Start shopping
                  </Link>
                </div>
              )}
            </section>

            {/* Addresses */}
            <section id="addresses" className={`${card} p-5 sm:p-6 scroll-mt-24`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2">
                    <MapPin className="w-[18px] h-[18px] text-[#FF5400]" /> Saved addresses
                  </h2>
                  <p className="text-[12.5px] text-[#8e8e93]">Used for faster checkout.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setSheetOpen(true);
                  }}
                  className="lx-btn-primary h-9 px-3.5 flex items-center gap-1 text-[13px] font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {addresses.length ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`lx-acct-row p-4 ${addr.isDefault ? 'ring-1 ring-[#FF5400]/40' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#0b0b0f] flex items-center gap-2 flex-wrap">
                            {addr.fullName}
                            {addr.isDefault && <span className="lx-pill bg-orange-100 text-[#c24100]"><Check className="w-3 h-3" /> Default</span>}
                          </p>
                          <p className="mt-1 text-[13px] text-[#3a3a3f] leading-relaxed">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ''}
                            <br />
                            {addr.city}, {addr.state} – {addr.postalCode}
                          </p>
                          <p className="mt-1 text-[12.5px] text-[#6e6e73] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {addr.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(addr);
                              setSheetOpen(true);
                            }}
                            className="lx-btn-soft w-9 h-9 flex items-center justify-center"
                            aria-label={`Edit address of ${addr.fullName}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(addr.id!)} className="lx-btn-soft w-9 h-9 flex items-center justify-center hover:!text-red-600" aria-label={`Delete address of ${addr.fullName}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {confirmDelete === addr.id ? (
                        <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-[12px] bg-red-50 border border-red-100">
                          <span className="text-[12.5px] text-red-700 font-medium">Delete this address?</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmDelete(null)} className="lx-btn-soft h-8 px-3 text-[12.5px] font-semibold">Keep</button>
                            <button type="button" disabled={busyId === addr.id} onClick={() => removeAddress(addr.id!)} className="h-8 px-3 rounded-[10px] bg-red-600 text-white text-[12.5px] font-semibold disabled:opacity-60">
                              {busyId === addr.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        !addr.isDefault && (
                          <button type="button" disabled={busyId === addr.id} onClick={() => makeDefault(addr.id!)} className="mt-3 text-[12.5px] font-medium text-[#ff5400] hover:text-[#d94800] disabled:opacity-60">
                            {busyId === addr.id ? 'Saving…' : 'Set as default'}
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setSheetOpen(true);
                  }}
                  className="w-full py-8 rounded-[18px] border-2 border-dashed border-black/10 text-center hover:border-[#FF5400]/40 transition-colors"
                >
                  <MapPin className="w-7 h-7 mx-auto text-black/25" />
                  <p className="mt-2 text-[14px] font-medium text-[#0b0b0f]">Add your first address</p>
                  <p className="text-[12.5px] text-[#8e8e93]">Checkout becomes one tap.</p>
                </button>
              )}
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            {/* Personal details */}
            <section className={`${card} p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#0b0b0f] flex items-center gap-2">
                  <UserIcon className="w-[18px] h-[18px] text-[#FF5400]" /> Personal details
                </h2>
                {!editProfile && (
                  <button type="button" onClick={startEditProfile} className="lx-btn-soft h-8 px-3 flex items-center gap-1 text-[12.5px] font-semibold">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              {editProfile ? (
                <form onSubmit={saveProfile} className="space-y-3.5">
                  {profileErr && <div role="alert" className="px-3.5 py-2.5 rounded-[12px] bg-red-50/90 border border-red-200 text-red-700 text-[12.5px] font-medium">{profileErr}</div>}
                  <div>
                    <label htmlFor="pf-name" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">Full name</label>
                    <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="lx-field w-full h-11 px-3.5 text-[14.5px]" />
                  </div>
                  <div>
                    <label htmlFor="pf-phone" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">Mobile number</label>
                    <input id="pf-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="10-digit number" className="lx-field w-full h-11 px-3.5 text-[14.5px]" />
                  </div>
                  <div>
                    <label htmlFor="pf-ig" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">Instagram ID <span className="text-[#8e8e93] font-normal">(optional)</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14.5px] text-[#8e8e93] pointer-events-none">@</span>
                      <input id="pf-ig" value={igEdit} onChange={(e) => setIgEdit(e.target.value.replace(/^@+/, ''))} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="your.username" className="lx-field w-full h-11 pl-8 pr-3.5 text-[14.5px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button type="button" onClick={() => setEditProfile(false)} className="lx-btn-soft h-11 text-[14px] font-semibold">Cancel</button>
                    <button type="submit" disabled={savingProfile} className="lx-btn-primary h-11 text-[14px] font-semibold disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save'}</button>
                  </div>
                </form>
              ) : (
                <dl className="divide-y divide-black/[0.06]">
                  {[
                    { icon: UserIcon, k: 'Name', v: profile?.name || user.displayName || '—' },
                    { icon: Mail, k: 'Email', v: user.email || '—', ok: !needsVerify },
                    { icon: Phone, k: 'Mobile', v: profile?.phone || 'Not added' },
                    { icon: InstagramGlyph, k: 'Instagram', v: profile?.instagram ? `@${profile.instagram}` : 'Not added' },
                    ...(memberSince ? [{ icon: Star, k: 'Member since', v: memberSince }] : [])
                  ].map((r) => {
                    const Icon = r.icon;
                    return (
                      <div key={r.k} className="flex items-center gap-3 py-2.5">
                        <Icon className="w-4 h-4 text-[#8e8e93] flex-shrink-0" />
                        <dt className="text-[13px] text-[#6e6e73] w-[92px] flex-shrink-0">{r.k}</dt>
                        <dd className="text-[13.5px] text-[#0b0b0f] font-medium truncate flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{r.v}</span>
                          {'ok' in r && r.ok && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-label="Verified" />}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </section>

            {/* Notifications */}
            <PushToggle className={`${card} p-5 sm:p-6 space-y-3`} />

            {/* Help */}
            <section className={`${card} p-2`}>
              {[
                { to: '/pages/track', icon: Truck, label: 'Track an order', sub: 'With your order number' },
                { to: '/policies/refund-policy', icon: FileText, label: 'Returns & refunds', sub: 'Exchanges, damaged items, cancellations' },
                { to: '/policies/shipping-policy', icon: Package, label: 'Shipping policy', sub: 'Delivery times and charges' },
                supportEmail
                  ? { href: `mailto:${supportEmail}`, icon: HelpCircle, label: 'Help & support', sub: supportEmail }
                  : { to: '/policies/contact', icon: HelpCircle, label: 'Help & support', sub: "FAQ's & contact" }
              ].map((r: any) => {
                const Icon = r.icon;
                const body = (
                  <>
                    <span className="w-9 h-9 rounded-[11px] bg-white/80 ring-1 ring-black/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-[17px] h-[17px] text-[#3a3a3f]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium text-[#0b0b0f]">{r.label}</span>
                      <span className="block text-[12px] text-[#8e8e93] truncate">{r.sub}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#c7c7cc]" />
                  </>
                );
                const cls = 'flex items-center gap-3 px-3 py-3 rounded-[16px] hover:bg-white/60 transition-colors';
                return r.href ? <a key={r.label} href={r.href} className={cls}>{body}</a> : <Link key={r.label} to={r.to} className={cls}>{body}</Link>;
              })}
            </section>

            <p className="text-center text-[11.5px] text-[#8e8e93] pb-2">Signed in as {firstName} · LEVIX</p>
          </div>
        </div>
      </div>

      <AddressSheet open={sheetOpen} initial={editing} defaultName={profile?.name || user.displayName || ''} onClose={closeSheet} onSave={saveAddress} />

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(24px+env(safe-area-inset-bottom))] z-[90] px-4 py-2.5 rounded-full bg-[#111]/90 text-white text-[13px] font-medium shadow-lg backdrop-blur" role="status">
          {toast}
        </div>
      )}
    </div>
  );
};
