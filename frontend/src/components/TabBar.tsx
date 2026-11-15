import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuth } from '../context/AuthContext';

/* Simple line icons (24×24) so every tab reads clearly at small sizes. */
const I = {
  home: (on: boolean) => (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={on ? 0 : 1.8} strokeLinejoin="round">
      <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z" />
    </svg>
  ),
  shop: (on: boolean) => (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill={on ? 'currentColor' : 'none'} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" fill={on ? 'currentColor' : 'none'} />
    </svg>
  ),
  saved: (on: boolean) => (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.5l-7-4.5-7 4.5V5a1.5 1.5 0 0 1 1.5-1.5z" />
    </svg>
  ),
  bag: (on: boolean) => (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5h14l-1 12a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 19.5z" fill={on ? 'currentColor' : 'none'} />
      <path d="M8.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  ),
  me: (on: boolean) => (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c.8-3.9 4-6 8-6s7.2 2.1 8 6" strokeLinecap="round" />
    </svg>
  )
};

const Badge: React.FC<{ n: number }> = ({ n }) =>
  n > 0 ? (
    <span className="absolute -top-1 left-[calc(50%+6px)] min-w-[17px] h-[17px] px-1 rounded-full bg-[#FF5400] text-white text-[10px] font-bold leading-[17px] text-center shadow-[0_0_0_2px_rgba(255,255,255,0.95)]">
      {n > 99 ? '99+' : n}
    </span>
  ) : null;

/**
 * Phone tab bar: Home · Shop · Saved · Bag · Account — always one tap away.
 * Slides away while scrolling down to give the products room, comes back on scroll up.
 */
export const TabBar: React.FC = () => {
  const { pathname } = useLocation();
  const { cart, openCart, openMobileNav, isMobileNavOpen, isCartOpen } = useCartStore();
  const saved = useWishlistStore((s) => s.ids.length);
  const { user, isAdmin } = useAuth();
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  const hideOn = pathname.startsWith('/checkout') || pathname.startsWith('/order-success');

  useEffect(() => {
    document.body.classList.toggle('lx-tabbar', !hideOn);
    return () => document.body.classList.remove('lx-tabbar');
  }, [hideOn]);

  useEffect(() => {
    setHidden(false);
    last.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
        if (y < 80 || nearBottom) setHidden(false);
        else if (y > last.current + 8) setHidden(true);
        else if (y < last.current - 8) setHidden(false);
        last.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  if (hideOn) return null;

  const bagCount = cart?.itemCount || 0;
  const accountTo = user ? (isAdmin ? '/account' : '/account') : '/login';
  const is = {
    home: pathname === '/',
    shop: isMobileNavOpen || pathname.startsWith('/collections') || pathname.startsWith('/products') || pathname.startsWith('/search'),
    saved: pathname.startsWith('/wishlist'),
    bag: isCartOpen || pathname.startsWith('/cart'),
    me: pathname.startsWith('/account') || pathname === '/login' || pathname === '/register'
  };

  const item = (key: keyof typeof is, label: string, icon: React.ReactNode, extra?: React.ReactNode) => (
    <span className={`relative flex flex-col items-center justify-center gap-[3px] h-full w-full transition-colors ${is[key] ? 'text-[#0b0b0f]' : 'text-[#8e8e93]'}`}>
      {icon}
      <span className={`text-[10.5px] leading-none ${is[key] ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      {extra}
    </span>
  );

  const cls = 'flex-1 h-full rounded-[18px] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5400]/40';

  return (
    <nav
      aria-label="Main"
      className={`lx-tabbar-nav md:hidden fixed z-[45] left-3 right-3 transition-transform duration-300 ease-out ${hidden ? 'translate-y-[140%]' : ''}`}
      style={{ bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-stretch h-[62px] px-1.5 rounded-[24px] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_14px_40px_-12px_rgba(17,17,26,0.35),0_0_0_0.5px_rgba(17,17,26,0.06)]">
        <Link to="/" className={cls} aria-label="Home" aria-current={is.home ? 'page' : undefined}>
          {item('home', 'Home', I.home(is.home))}
        </Link>
        <button type="button" onClick={openMobileNav} className={cls} aria-label="Shop categories and collections">
          {item('shop', 'Shop', I.shop(is.shop))}
        </button>
        <Link to="/wishlist" className={cls} aria-label={`Saved items${saved ? ` (${saved})` : ''}`} aria-current={is.saved ? 'page' : undefined}>
          {item('saved', 'Saved', I.saved(is.saved), <Badge n={saved} />)}
        </Link>
        <button type="button" onClick={openCart} className={cls} aria-label={`Bag${bagCount ? ` (${bagCount} items)` : ''}`}>
          {item('bag', 'Bag', I.bag(is.bag), <Badge n={bagCount} />)}
        </button>
        <Link to={accountTo} className={cls} aria-label={user ? 'My account' : 'Sign in'} aria-current={is.me ? 'page' : undefined}>
          {item('me', user ? 'Account' : 'Sign in', I.me(is.me))}
        </Link>
      </div>
    </nav>
  );
};
