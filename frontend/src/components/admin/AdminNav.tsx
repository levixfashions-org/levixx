import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Tag, 
  Sliders, 
  Layers, 
  ExternalLink, 
  LogOut, 
  Shield 
} from 'lucide-react';

export const AdminNav: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Collections & Home', path: '/admin/collections', icon: Layers },
    { name: 'Customer Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Promo Discounts', path: '/admin/discounts', icon: Tag },
    { name: 'Store Settings', path: '/admin/settings', icon: Sliders },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="bg-black text-white border-b border-white/10 sticky top-16 z-40 shadow-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          
          {/* Brand & Badge */}
          <div className="flex items-center space-x-3">
            <Link to="/admin" className="flex items-center space-x-2">
              <span className="font-display font-black text-2xl uppercase tracking-tighter text-white">
                LEVIX
              </span>
              <span className="px-2 py-0.5 bg-[#FF5400] text-white text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs">
                Admin Console
              </span>
            </Link>
            <span className="hidden sm:inline-block text-neutral-600 text-xs">|</span>
            <span className="hidden sm:inline-block text-neutral-400 text-[11px] font-mono">
              levixfashions@gmail.com
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap rounded-xs ${
                    isActive
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF5400]' : 'text-neutral-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link
              to="/"
              target="_blank"
              className="text-xs text-neutral-300 hover:text-white flex items-center space-x-1 font-mono uppercase tracking-wider px-2 py-1 hover:bg-white/5 transition-all"
              title="Open Live Storefront in new tab"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center space-x-1 font-mono uppercase tracking-wider px-2 py-1 transition-all"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};