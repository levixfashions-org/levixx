import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePwa } from '../context/PwaContext';
import { useSettingsStore } from '../store/settingsStore';
import { useHomeStore } from '../store/homeStore';
import { apiClient } from '../services/api';
import { Logo } from './Logo';

type SeoTab = 'popular' | 'category' | 'style' | 'colour';

const FLink: React.FC<{ to: string; children: React.ReactNode; external?: boolean }> = ({ to, children, external }) =>
  external ? (
    <a href={to} target="_blank" rel="noreferrer" className="block text-[11px] text-neutral-500 hover:text-black transition-colors py-[3px]">
      {children}
    </a>
  ) : (
    <Link to={to} className="block text-[11px] text-neutral-500 hover:text-black transition-colors py-[3px]">
      {children}
    </Link>
  );

export const Footer: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const { data: home, fetchHome } = useHomeStore();
  const { promptInstall, isInstalled } = usePwa();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<SeoTab | null>(null);
  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState<'idle' | 'done' | 'error'>('idle');
  const [subMsg, setSubMsg] = useState('');

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const instagram = (settings.instagramHandle || '').replace(/^@/, '');
  const categories = home?.menu.categories || [];
  const collections = home?.menu.collections || [];
  const colors = home?.menu.colors || [];

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/store/subscribe', { email });
      setSubState('done');
      setEmail('');
    } catch (err: any) {
      setSubState('error');
      setSubMsg(err.message || 'Could not subscribe');
    }
  };

  const tabLinks: Record<SeoTab, { label: string; to: string }[]> = {
    popular: [
      { label: 'New Arrivals', to: '/collections/new-in' },
      { label: 'All Products', to: '/collections/all-products' },
      ...collections.slice(0, 6).map((c) => ({ label: c.name, to: `/collections/${c.slug}` }))
    ],
    category: categories.map((c) => ({ label: c.name, to: `/collections/${c.slug}` })),
    style: collections.map((c) => ({ label: c.name, to: `/collections/${c.slug}` })),
    colour: colors.map((c) => ({ label: c.charAt(0) + c.slice(1).toLowerCase(), to: `/collections/all-products?color=${c}` }))
  };

  return (
    <footer className="px-2 md:px-[10px] pb-3 pt-8 space-y-2">
      {/* SEO strip */}
      {(settings.seoTitle || settings.seoText) && (
        <div className="lx-panel px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="md:max-w-[55%]">
              <h2 className="text-[11px] font-semibold">{settings.seoTitle}</h2>
              {settings.seoText && (
                <>
                  <p className={`text-[11px] text-neutral-500 mt-1 whitespace-pre-line ${expanded ? '' : 'line-clamp-1'}`}>{settings.seoText}</p>
                  <button onClick={() => setExpanded((v) => !v)} className="text-[10.5px] text-neutral-500 underline mt-0.5">
                    {expanded ? 'Read less' : 'Read more…'}
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10.5px]">
              {(
                [
                  ['popular', 'Popular searches'],
                  ['category', 'Shop by category'],
                  ['style', 'Shop by style'],
                  ['colour', 'Shop by colour']
                ] as [SeoTab, string][]
              )
                .filter(([k]) => tabLinks[k].length > 0)
                .map(([k, label]) => (
                  <button key={k} onClick={() => setTab(tab === k ? null : k)} className={tab === k ? 'font-semibold text-black' : 'text-neutral-600 hover:text-black'}>
                    {label}
                  </button>
                ))}
            </div>
          </div>
          {tab && (
            <div className="flex flex-wrap gap-1.5 mt-3 lx-fade-in">
              {tabLinks[tab].map((l) => (
                <Link key={l.to + l.label} to={l.to} className="px-3 py-1 rounded-full bg-[#EFEFEF] text-[10.5px] hover:bg-black hover:text-white">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer card */}
      <div className="lx-panel px-6 md:px-12 pt-10 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-8 gap-x-6">
          <div className="md:col-span-2">
            <h3 className="text-[12px] font-semibold mb-3">Connect with us</h3>
            {instagram && <FLink to={`https://instagram.com/${instagram}`} external>Instagram</FLink>}
            {settings.supportEmail && <FLink to={`mailto:${settings.supportEmail}`} external>Email</FLink>}
            {settings.supportPhone && <FLink to={`tel:${settings.supportPhone.replace(/\s/g, '')}`} external>Call</FLink>}
            {settings.supportPhone && (
              <FLink to={`https://wa.me/${settings.supportPhone.replace(/[^\d]/g, '').replace(/^(\d{10})$/, '91$1')}`} external>
                Text (WhatsApp)
              </FLink>
            )}
          </div>
          <div className="md:col-span-3">
            <h3 className="text-[12px] font-semibold mb-3">Order Support</h3>
            <FLink to="/policies/refund-policy#returns">Make a return/Exchange</FLink>
            <FLink to="/policies/refund-policy">Refund/Exchange policy</FLink>
            <FLink to="/pages/track">Track your order</FLink>
            <FLink to="/policies/shipping-policy">Shipping policy</FLink>
            <FLink to="/policies/contact">FAQ's & Contact</FLink>
            <FLink to="/policies/terms-of-service">Terms</FLink>
            <FLink to="/policies/privacy-policy">Privacy policy</FLink>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-[12px] font-semibold mb-3">We are LEVIX</h3>
            <FLink to="/pages/about">Our story</FLink>
            <FLink to="/collections">Collections</FLink>
            <FLink to="/account">Members login</FLink>
            <FLink to="/wishlist">Saved items</FLink>
            {!isInstalled && (
              <button onClick={promptInstall} className="block text-[11px] text-neutral-500 hover:text-black py-[3px]">Install the app</button>
            )}
          </div>
          <div className="col-span-2 md:col-span-5 flex flex-col md:items-end justify-between gap-6">
            <div className="flex items-end gap-6 md:gap-10">
              <span className="font-[cursive] italic text-[34px] md:text-[42px] leading-none text-neutral-700 select-none" aria-hidden="true">
                Levix
              </span>
              <div className="relative w-[78px] h-[96px] rounded-[3px] bg-gradient-to-br from-white to-neutral-200 shadow-[6px_10px_18px_rgba(0,0,0,0.12)] flex items-center justify-center" aria-hidden="true">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 border-2 border-neutral-300 rounded-t-full border-b-0" />
                <Logo className="text-[11px]" />
              </div>
            </div>
            <form onSubmit={subscribe} className="w-full md:w-[320px]">
              {subState === 'done' ? (
                <p className="text-[11px] text-neutral-700">You're on the list — we'll email you about new drops.</p>
              ) : (
                <div className="flex items-center rounded-full bg-[#EFEFEF] pl-4 pr-1 py-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email for drop alerts"
                    aria-label="Email for drop alerts"
                    className="flex-1 bg-transparent text-[11px] focus:outline-none"
                  />
                  <button className="px-4 py-1.5 rounded-full bg-black text-white text-[10px] font-semibold">Join</button>
                </div>
              )}
              {subState === 'error' && <p className="text-[10px] text-red-600 mt-1">{subMsg}</p>}
            </form>
          </div>
        </div>
        <p className="text-[9px] text-neutral-400 uppercase tracking-wide mt-10 md:text-right">
          © {new Date().getFullYear()} LEVIX. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
