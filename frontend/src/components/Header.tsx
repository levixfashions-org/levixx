import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { useWishlistStore } from '../store/wishlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { Logo } from './Logo';
import { MegaMenu } from './MegaMenu';
import { ScrollRing } from './ScrollRing';
import { BagIcon, BookmarkIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';

/**
 * Fixed header.
 * - Desktop: "New in · Collections" left, wordmark centre, icons + menu pill right. Transparent over the
 *   homepage hero, white once you scroll or on every other page.
 * - Mobile: floating translucent pill (menu + wordmark) on the left, icons on the right.
 */
export const Header: React.FC = () => {
  const { cart, openCart, openSearch, openMobileNav } = useCartStore();
  const { user, isAdmin } = useAuth();
  const wishCount = useWishlistStore((s) => s.ids.length);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const announce = useSettingsStore((s) => s.settings.announcementEnabled && Boolean(s.settings.announcementText?.trim()));
  const offset = announce ? 32 : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMegaOpen(false), [location.pathname, location.search]);

  const solid = !isHome || scrolled || megaOpen;
  const itemCount = cart?.itemCount || 0;
  const accountHref = user ? (isAdmin ? '/admin' : '/account') : '/login';

  return (
    <>
      {/* ---------------- Desktop ---------------- */}
      <header
        style={{ top: offset }}
        className={`hidden md:block fixed inset-x-0 z-50 transition-colors duration-300 ${
          solid ? 'bg-white' : 'bg-transparent'
        }`}
      >
        <div className="h-16 px-6 lg:px-[22px] grid grid-cols-3 items-center text-black">
          <nav className="flex items-center gap-8 text-[11.5px]">
            <Link to="/collections/new-in" className="hover:opacity-60 transition-opacity">New in</Link>
            <Link to="/collections/men" className="hover:opacity-60 transition-opacity">Men</Link>
            <Link to="/collections/women" className="hover:opacity-60 transition-opacity">Women</Link>
            <button onClick={() => setMegaOpen((v) => !v)} className="hover:opacity-60 transition-opacity">
              Collections
            </button>
          </nav>

          <Link to="/" className="justify-self-center" aria-label="LEVIX home">
            <Logo className="text-[26px]" />
          </Link>

          <div className="justify-self-end flex items-center gap-5">
            <button onClick={openSearch} aria-label="Search" className="hover:opacity-60 transition-opacity">
              <SearchIcon className="w-[17px] h-[17px]" />
            </button>
            <Link to={accountHref} aria-label="Account" className="hover:opacity-60 transition-opacity">
              <UserIcon className="w-[16px] h-[16px]" />
            </Link>
            <Link to="/wishlist" aria-label="Saved items" className="relative hover:opacity-60 transition-opacity">
              <BookmarkIcon className="w-[15px] h-[17px]" filled />
              {wishCount > 0 && <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-black" />}
            </Link>
            <button onClick={openCart} aria-label="Open bag" className="hover:opacity-60 transition-opacity">
              <BagIcon count={itemCount} />
            </button>
            <button
              onClick={() => setMegaOpen((v) => !v)}
              aria-label={megaOpen ? 'Close menu' : 'Open menu'}
              className="w-[42px] h-[26px] rounded-full bg-[#E8E8E8] hover:bg-[#dcdcdc] flex items-center justify-center transition-colors"
            >
              {megaOpen ? <CloseIcon className="w-3.5 h-3.5" /> : <MenuIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {megaOpen && <MegaMenu onClose={() => setMegaOpen(false)} />}
      </header>
      {megaOpen && <div className="hidden md:block fixed inset-0 z-40 bg-black/25" onClick={() => setMegaOpen(false)} />}

      {/* ---------------- Mobile ---------------- */}
      <header style={{ top: offset }} className="md:hidden fixed inset-x-0 z-50 pointer-events-none">
        <div className={`flex items-center justify-between px-3 pt-3 pb-2 transition-colors ${solid ? 'bg-[#EFEFEF]/90 backdrop-blur-md' : ''}`}>
          <ScrollRing className="pointer-events-auto flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-white/55 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
            <button onClick={openMobileNav} aria-label="Open menu" className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
              <MenuIcon className="w-4 h-4" />
            </button>
            <Link to="/" aria-label="LEVIX home">
              <Logo className="text-[20px]" />
            </Link>
          </ScrollRing>
          <div className="pointer-events-auto flex items-center gap-4 pr-1">
            <button onClick={openSearch} aria-label="Search"><SearchIcon className="w-[19px] h-[19px]" /></button>
            <Link to="/wishlist" aria-label="Saved items"><BookmarkIcon className="w-[16px] h-[19px]" filled /></Link>
            <button onClick={openCart} aria-label="Open bag"><BagIcon count={itemCount} className="w-[19px] h-[23px]" /></button>
          </div>
        </div>
      </header>
    </>
  );
};
