import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { useHomeStore } from '../store/homeStore';
import { COLOR_SWATCHES } from '../services/api';
import { Logo } from './Logo';
import { CloseIcon, PlusIcon } from './Icons';
import { ThemeToggle } from './ThemeToggle';

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/5">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between py-3.5 text-[13px]">
        <span>{title}</span>
        <span className={`transition-transform ${open ? 'rotate-45' : ''}`}><PlusIcon /></span>
      </button>
      {open && <div className="pb-4 flex flex-wrap gap-2 lx-fade-in">{children}</div>}
    </div>
  );
};

const MChip: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 border border-white/80 shadow-[0_4px_14px_-10px_rgba(0,0,0,0.3)] text-[12.5px] font-medium">
    {children}
  </Link>
);

export const MobileNavDrawer: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav } = useCartStore();
  const { user, isAdmin, logout } = useAuth();
  const { data, fetchHome } = useHomeStore();
  const location = useLocation();

  useEffect(() => {
    if (isMobileNavOpen) fetchHome();
  }, [isMobileNavOpen, fetchHome]);
  useEffect(() => closeMobileNav(), [location.pathname, location.search, closeMobileNav]);
  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  if (!isMobileNavOpen) return null;
  const cats = data?.menu.categories || [];
  const groups = [
    { key: 'TOP', label: 'Top' },
    { key: 'BOTTOM', label: 'Bottom' },
    { key: 'ACCESSORIES', label: 'Accessories' }
  ];

  return (
    <div className="md:hidden fixed inset-0 z-[60] bg-[#EFEFEF] lx-glass-sheet overflow-y-auto lx-fade-in">
      <div className="px-3 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full lx-head-pill">
          <button onClick={closeMobileNav} aria-label="Close menu" className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
          <Logo className="text-[20px]" />
        </div>
      </div>

      <div className="px-5 pt-8 pb-10">
        <div className="grid grid-cols-2 gap-2 mb-6">
          {(['men', 'women'] as const).map((k) => (
            <Link key={k} to={`/collections/${k}`} className="lx-btn-primary h-12 flex items-center justify-center text-[15px] font-semibold">
              {k === 'men' ? 'Men' : 'Women'}
            </Link>
          ))}
        </div>
        <nav className="space-y-2.5">
          <Link to="/collections/all-products" className="block text-[20px] font-semibold tracking-[-0.02em]">All Products</Link>
          <Link to="/collections/new-in" className="block text-[20px] font-semibold tracking-[-0.02em]">New Arrivals</Link>
          {(data?.menu.collections || []).map((c) => (
            <Link key={c.id} to={`/collections/${c.slug}`} className="block text-[20px] font-semibold tracking-[-0.02em]">{c.name}</Link>
          ))}
        </nav>

        <div className="mt-10">
          {(data?.menu.departments || []).filter((d) => d.count > 0).map((d) => (
            <Accordion key={d.key} title={d.name}>
              <MChip to={`/collections/${d.key}`}>All {d.name.toLowerCase()}</MChip>
              {d.categories.map((c) => <MChip key={c.id} to={`/collections/${c.slug}?gender=${d.key}`}>{c.name}</MChip>)}
              {d.collections.map((c) => <MChip key={c.id} to={`/collections/${c.slug}?gender=${d.key}`}>{c.name}</MChip>)}
            </Accordion>
          ))}
          {groups.map((g) => {
            const items = cats.filter((c) => (c.group || 'TOP') === g.key);
            if (!items.length) return null;
            return (
              <Accordion key={g.key} title={g.label}>
                {items.map((c) => <MChip key={c.id} to={`/collections/${c.slug}`}>{c.name}</MChip>)}
              </Accordion>
            );
          })}
          {(data?.menu.colors || []).length > 0 && (
            <Accordion title="Shop by colour">
              {data!.menu.colors.map((c) => (
                <MChip key={c} to={`/collections/all-products?color=${c}`}>
                  {c}
                  <span className="w-6 h-2 rounded-full" style={{ background: COLOR_SWATCHES[c] || '#ccc' }} />
                </MChip>
              ))}
            </Accordion>
          )}
          <Accordion title="Support">
            <MChip to="/pages/track">Track your order</MChip>
            <MChip to="/policies/refund-policy">Returns & refunds</MChip>
            <MChip to="/policies/terms-of-service">Terms & conditions</MChip>
            <MChip to="/policies/shipping-policy">Shipping policy</MChip>
            <MChip to="/policies/contact">Contact us</MChip>
          </Accordion>
        </div>

        <div className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 mb-2">Appearance</p>
          <ThemeToggle compact />
        </div>

        <nav className="mt-10 space-y-2.5 text-[14px]">
          <Link to={user ? '/account' : '/login'} className="block">{user ? 'Account' : 'Sign in'}</Link>
          <Link to="/wishlist" className="block">Saved items</Link>
          {user && <Link to="/account/orders" className="block">My orders</Link>}
          <Link to="/pages/about" className="block">Our Story</Link>
          {isAdmin && <Link to="/admin" className="block font-semibold">Admin panel</Link>}
          {user && (
            <button onClick={() => logout()} className="block text-neutral-500">Sign out</button>
          )}
        </nav>

        <button onClick={closeMobileNav} className="mx-auto mt-14 block text-[12px] text-neutral-500 border-t border-neutral-400 pt-1 px-1">
          Close
        </button>
      </div>
    </div>
  );
};
