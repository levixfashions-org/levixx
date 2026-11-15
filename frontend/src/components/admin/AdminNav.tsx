import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, Tag, SlidersHorizontal, Layers, LogOut, Bell, ArrowUpRight } from 'lucide-react';

const NAV = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Products', path: '/admin/products', icon: Package },
  { name: 'Collections', path: '/admin/collections', icon: Layers },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Discounts', path: '/admin/discounts', icon: Tag },
  { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  { name: 'Settings', path: '/admin/settings', icon: SlidersHorizontal }
];

/** Floating frosted-glass navigation bar for the admin app. */
export const AdminNav: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // On phones the tab row scrolls — keep the current tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = (user?.displayName || user?.email || 'A').trim().charAt(0).toUpperCase();

  return (
    <header className="lx-adminbar-wrap sticky top-0 z-40 px-2.5 sm:px-5 pt-2.5 sm:pt-3 pb-2">
      <div className="lx-glass-bar mx-auto max-w-[1440px] flex items-center gap-2 sm:gap-3 pl-2 pr-2 sm:pr-2.5 py-2">
        {/* Brand */}
        <Link to="/admin" className="flex items-center gap-2.5 pl-0.5 pr-1 sm:pr-2 flex-shrink-0" aria-label="LEVIX Admin home">
          <img src="/icons/icon-192.png?v=3" alt="" aria-hidden="true" className="w-9 h-9 rounded-[11px] flex items-center justify-center object-cover shadow-[0_6px_16px_-6px_rgba(255,84,0,0.55)]" />
          <span className="hidden lg:block leading-tight">
            <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[#0b0b0f]">LEVIX</span>
            <span className="block text-[11px] text-[#6e6e73]">Admin</span>
          </span>
        </Link>

        {/* Tabs */}
        <nav className="lx-tabs-scroll flex-1 min-w-0 overflow-x-auto" aria-label="Admin sections">
          <div className="lx-segment inline-flex items-center gap-0.5 p-[3px]">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  ref={active ? activeRef : undefined}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`lx-seg-item flex items-center gap-1.5 px-3 sm:px-3.5 h-8 rounded-[10px] text-[13px] font-medium whitespace-nowrap ${active ? 'is-active' : ''}`}
                >
                  <Icon className="w-[15px] h-[15px]" strokeWidth={active ? 2.2 : 1.9} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link to="/" target="_blank" className="lx-icon-btn hidden sm:flex h-8 px-3 rounded-[10px] items-center gap-1 text-[12.5px] font-medium" title="Open the live store in a new tab">
            Store <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button type="button" onClick={handleLogout} className="lx-icon-btn w-8 h-8 rounded-[10px] flex items-center justify-center" title="Sign out" aria-label="Sign out">
            <LogOut className="w-[15px] h-[15px]" />
          </button>
          <span className="lx-avatar hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-[12.5px] font-semibold" title={user?.email || ''}>
            {initial}
          </span>
        </div>
      </div>
    </header>
  );
};
