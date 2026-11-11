import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient, DEFAULT_STORE_SETTINGS, StoreSettings } from '../../services/api';
import { useSettingsStore } from '../../store/settingsStore';
import { AdminCategoriesManager } from '../../components/admin/AdminCategoriesManager';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { VideoUploader } from '../../components/admin/VideoUploader';
import { AdminNav } from '../../components/admin/AdminNav';
import { Sliders, CheckCircle2, RotateCcw, Save, Sparkles, Megaphone, Mail, Phone, Globe, Truck } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const storeSettings = useSettingsStore((st) => st.settings);
  const setStoreSettings = useSettingsStore((st) => st.setSettings);
  const [settings, setSettings] = useState<StoreSettings>(storeSettings);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }
    if (user && isAdmin) {
      apiClient
        .get('/admin/settings')
        .then((res) => res.data?.settings && setSettings({ ...DEFAULT_STORE_SETTINGS, ...res.data.settings }))
        .catch(() => undefined);
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.post('/admin/settings', settings);
      const saved = { ...DEFAULT_STORE_SETTINGS, ...(res.data?.settings || settings) };
      setSettings(saved);
      setStoreSettings(saved);
      setSuccessMsg('✓ Store settings saved and live across the entire website!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Fill the form with the original brand defaults? Click "Save All Settings" afterwards to publish.')) {
      setSettings(DEFAULT_STORE_SETTINGS);
      setSuccessMsg('Defaults loaded into the form — click Save to publish.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>CONTENT & CONFIGURATION</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">
              Store Content & Settings
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Customize top marquee announcements, brand concierge details, homepage headlines, and shipping rules.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2.5 border border-black/20 hover:border-black text-neutral-700 hover:text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#FF5400] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e04a00] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-black text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF5400]" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Marquee Announcement Bar */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-[#FF5400]" />
                <h3 className="font-display font-black text-lg uppercase tracking-tight text-black">
                  Top Announcement Ticker (Marquee)
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-neutral-100 px-2 py-0.5 text-neutral-600">
                Displays globally at top of store
              </span>
            </div>

            <p className="text-xs text-neutral-600">
              This message scrolls continuously across the very top bar of every page on the website. Use bullets (•) to separate multiple announcements.
            </p>

            <div>
              <textarea
                rows={3}
                required
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                placeholder="e.g. FREE DOMESTIC SHIPPING ON ALL PREPAID ORDERS • USE CODE 'LEVIX20' FOR 20% OFF • "
                className="w-full border border-black/20 p-3 text-xs font-mono focus:border-black focus:outline-none"
              />
            </div>

            {/* Live Preview */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                Live Marquee Preview:
              </span>
              <div className="h-8 bg-black text-white text-[11px] uppercase tracking-widest font-medium overflow-hidden flex items-center px-4 select-none">
                <div className="whitespace-nowrap truncate font-mono">
                  {settings.announcementText}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Homepage Hero Banner */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-black/10 pb-3">
              <Sparkles className="w-4 h-4 text-[#FF5400]" />
              <h3 className="font-display font-black text-lg uppercase tracking-tight text-black">
                Homepage Hero Headline & Tagline
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Main Headline
                </label>
                <input
                  type="text"
                  required
                  value={settings.heroHeadline}
                  onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                  placeholder="e.g. STREETWEAR ARCHITECTURE"
                  className="w-full border border-black/20 p-2.5 text-xs font-display font-black uppercase tracking-tight focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subtitle / Mission Statement
                </label>
                <input
                  type="text"
                  required
                  value={settings.heroSubtitle}
                  onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  placeholder="e.g. Heavyweight Custom-Milled Silhouettes & Limited Private Drops."
                  className="w-full border border-black/20 p-2.5 text-xs focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Brand Concierge & Contact */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-black/10 pb-3">
              <Mail className="w-4 h-4 text-[#FF5400]" />
              <h3 className="font-display font-black text-lg uppercase tracking-tight text-black">
                Brand Concierge & Contact Coordinates
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Support Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Customer Care Phone</span>
                </label>
                <input
                  type="tel"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Instagram Handle</span>
                </label>
                <div className="flex">
                  <span className="bg-neutral-100 border border-r-0 border-black/20 px-2.5 py-2.5 font-mono text-neutral-500">@</span>
                  <input
                    type="text"
                    value={settings.instagramHandle.replace('@', '')}
                    onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                    className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Shipping Rules */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-black/10 pb-3">
              <Truck className="w-4 h-4 text-[#FF5400]" />
              <h3 className="font-display font-black text-lg uppercase tracking-tight text-black">
                Shipping & Cart Rules
              </h3>
            </div>

            <div className="max-w-xs text-xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Free Domestic Shipping Threshold (INR)
              </label>
              <div className="flex">
                <span className="bg-neutral-100 border border-r-0 border-black/20 px-3 py-2.5 font-mono font-bold text-neutral-700">RS.</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.freeShippingThreshold}
                  onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-black/20 p-2.5 font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Carts equal or greater than this value receive free delivery. Set 0 for free shipping on everything.
              </p>
            </div>

            <div className="max-w-xs text-xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Shipping Fee Below Threshold (INR)
              </label>
              <div className="flex">
                <span className="bg-neutral-100 border border-r-0 border-black/20 px-3 py-2.5 font-mono font-bold text-neutral-700">RS.</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.shippingFee}
                  onChange={(e) => setSettings({ ...settings, shippingFee: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-black/20 p-2.5 font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Business & legal details — shown on Terms, Privacy, Returns and Contact pages */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold uppercase tracking-wider text-sm text-black">Business & Legal Details</h2>
              <p className="text-[11px] text-neutral-500 mt-1">
                Shown on your Terms, Privacy, Returns and Contact pages. Indian e-commerce rules and Razorpay require your registered business name, address and a grievance contact to be visible on the site.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Registered business name</label>
                <input id="legalName" value={settings.legalName} onChange={(e) => setSettings({ ...settings, legalName: e.target.value })} placeholder="e.g. LEVIX Fashions (proprietor name)" className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Grievance officer name</label>
                <input id="grievanceOfficer" value={settings.grievanceOfficer} onChange={(e) => setSettings({ ...settings, grievanceOfficer: e.target.value })} placeholder="Full name of the person handling complaints" className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Registered address</label>
                <textarea id="businessAddress" rows={3} value={settings.businessAddress} onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })} placeholder="Door no, street, area, city, state, PIN" className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">City for legal jurisdiction</label>
                <input id="jurisdictionCity" value={settings.jurisdictionCity} onChange={(e) => setSettings({ ...settings, jurisdictionCity: e.target.value })} placeholder="e.g. Hyderabad" className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">GSTIN (optional)</label>
                <input id="gstin" value={settings.gstin} onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })} maxLength={15} placeholder="15-character GST number, if registered" className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none" />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">Support email and phone (set above) are also shown on these pages. Add a phone number so customers can reach you on WhatsApp for damage claims.</p>
          </div>

          {/* Homepage hero, SEO & product page info */}
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-5">
            <h2 className="font-bold uppercase tracking-wider text-sm text-black">Homepage & Product Page</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <ImageUploader
                  single
                  label="Hero image — desktop (landscape)"
                  value={settings.heroDesktopImage ? [settings.heroDesktopImage] : []}
                  onChange={(urls) => setSettings({ ...settings, heroDesktopImage: urls[0] || '' })}
                  hint="Full-screen photo at the top of the homepage. 1920×1080 or larger works best."
                />
              </div>
              <div>
                <ImageUploader
                  single
                  label="Hero image — mobile (portrait)"
                  value={settings.heroMobileImage ? [settings.heroMobileImage] : []}
                  onChange={(urls) => setSettings({ ...settings, heroMobileImage: urls[0] || '' })}
                  hint="Shown on phones. If empty, the desktop photo is used."
                />
              </div>
              <div className="md:col-span-2 border-t border-black/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-black">Hero video (optional)</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Add a video and it plays on loop instead of the photo (muted, with a sound button for visitors). The photo above shows while the video loads and for visitors who turn off motion.
                </p>
              </div>
              <div>
                <VideoUploader
                  label="Hero video — desktop (landscape 16:9)"
                  value={settings.heroDesktopVideo}
                  onChange={(url) => setSettings({ ...settings, heroDesktopVideo: url })}
                  hint="Best: 1920×1080 MP4, 10–20 seconds, under 15 MB."
                />
              </div>
              <div>
                <VideoUploader
                  shape="portrait"
                  label="Hero video — mobile (portrait 9:16)"
                  value={settings.heroMobileVideo}
                  onChange={(url) => setSettings({ ...settings, heroMobileVideo: url })}
                  hint="Best: 1080×1920 MP4 (a Reel), under 15 MB. If empty, phones show the desktop video."
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Hero button text</label>
                <input value={settings.heroCtaText} onChange={(e) => setSettings({ ...settings, heroCtaText: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Hero link</label>
                <input value={settings.heroLink} onChange={(e) => setSettings({ ...settings, heroLink: e.target.value })} placeholder="/collections/all-products" className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">"Latest drop" row title</label>
                <input value={settings.latestDropTitle} onChange={(e) => setSettings({ ...settings, latestDropTitle: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 font-semibold cursor-pointer self-end pb-2">
                <input type="checkbox" checked={settings.announcementEnabled} onChange={(e) => setSettings({ ...settings, announcementEnabled: e.target.checked })} className="accent-black w-4 h-4" />
                Show the scrolling announcement bar at the top of the site
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Footer SEO heading</label>
                <input value={settings.seoTitle} onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1 mt-3">Footer SEO text ("Read more")</label>
                <textarea rows={5} value={settings.seoText} onChange={(e) => setSettings({ ...settings, seoText: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">Product page "Shipping" tab (one point per line)</label>
                <textarea rows={4} value={settings.shippingInfo} onChange={(e) => setSettings({ ...settings, shippingInfo: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1 mt-3">Default "Washcare" tab (used when a product has no fabric & care text)</label>
                <textarea rows={4} value={settings.careInfo} onChange={(e) => setSettings({ ...settings, careInfo: e.target.value })} className="w-full border border-black/20 p-2.5 focus:border-black focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-black/10">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
            >
              <Save className="w-4 h-4 text-[#FF5400]" />
              <span>{saving ? 'Publishing Changes...' : 'Save All Settings'}</span>
            </button>
          </div>

        </form>

        <AdminCategoriesManager />

      </div>
    </div>
  );
};