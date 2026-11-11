import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { SearchDrawer } from './components/SearchDrawer';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { SizeGuideModal } from './components/SizeGuideModal';
import { GlassyPwaNotification } from './components/GlassyPwaNotification';
import { IntroDoors } from './components/IntroDoors';
import { LiveSync } from './components/LiveSync';
import { AdminGuard } from './components/admin/AdminGuard';
import { useSettingsStore } from './store/settingsStore';
import { HomePage } from './pages/HomePage';

const named = <T extends Record<string, any>>(loader: () => Promise<T>, key: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[key] as React.ComponentType<any> })));

const CollectionsPage = named(() => import('./pages/CollectionsPage'), 'CollectionsPage');
const CollectionDetailPage = named(() => import('./pages/CollectionDetailPage'), 'CollectionDetailPage');
const ProductDetailPage = named(() => import('./pages/ProductDetailPage'), 'ProductDetailPage');
const CartPage = named(() => import('./pages/CartPage'), 'CartPage');
const SearchPage = named(() => import('./pages/SearchPage'), 'SearchPage');
const CheckoutPage = named(() => import('./pages/CheckoutPage'), 'CheckoutPage');
const OrderSuccessPage = named(() => import('./pages/OrderSuccessPage'), 'OrderSuccessPage');
const LoginPage = named(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = named(() => import('./pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = named(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const AccountPage = named(() => import('./pages/AccountPage'), 'AccountPage');
const OrderHistoryPage = named(() => import('./pages/OrderHistoryPage'), 'OrderHistoryPage');
const AboutPage = named(() => import('./pages/AboutPage'), 'AboutPage');
const StoreLocatorPage = named(() => import('./pages/StoreLocatorPage'), 'StoreLocatorPage');
const PolicyPage = named(() => import('./pages/PolicyPage'), 'PolicyPage');
const WishlistPage = named(() => import('./pages/WishlistPage'), 'WishlistPage');
const TrackOrderPage = named(() => import('./pages/TrackOrderPage'), 'TrackOrderPage');
const AdminCollectionsPage = named(() => import('./pages/admin/AdminCollectionsPage'), 'AdminCollectionsPage');
const AdminDashboardPage = named(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminProductsPage = named(() => import('./pages/admin/AdminProductsPage'), 'AdminProductsPage');
const AdminOrdersPage = named(() => import('./pages/admin/AdminOrdersPage'), 'AdminOrdersPage');
const AdminDiscountsPage = named(() => import('./pages/admin/AdminDiscountsPage'), 'AdminDiscountsPage');
const AdminSettingsPage = named(() => import('./pages/admin/AdminSettingsPage'), 'AdminSettingsPage');

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const PageLoader = () => (
  <div className="py-24 text-center font-mono text-xs uppercase tracking-widest text-neutral-500">Loading...</div>
);

const admin = (el: React.ReactNode) => <AdminGuard>{el}</AdminGuard>;

/** Pushes page content below the fixed header everywhere except the homepage (hero sits under the header). */
const Main: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const announce = useSettingsStore((s) => s.settings.announcementEnabled && Boolean(s.settings.announcementText?.trim()));
  const isHome = pathname === '/';
  const top = (isHome ? 0 : 64) + (announce ? 32 : 0);
  return (
    <main className="flex-1" style={{ paddingTop: top }}>
      {children}
    </main>
  );
};

export const App: React.FC = () => {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <AuthProvider>
      <PwaProvider>
        <BrowserRouter>
          <ScrollToTop />
          <IntroDoors />
          <LiveSync />
          <div className="flex flex-col min-h-screen bg-[#EFEFEF] text-black">
            <AnnouncementBar />
            <Header />

            <CartDrawer />
            <SearchDrawer />
            <MobileNavDrawer />
            <SizeGuideModal />
            <GlassyPwaNotification />

            <Main>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/collections/:handle" element={<CollectionDetailPage />} />
                  <Route path="/products/:handle" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/account/orders" element={<OrderHistoryPage />} />
                  <Route path="/pages/about" element={<AboutPage />} />
                  <Route path="/pages/store" element={<StoreLocatorPage />} />
                  <Route path="/pages/contact" element={<PolicyPage />} />
                  <Route path="/policies/*" element={<PolicyPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/pages/track" element={<TrackOrderPage />} />

                  <Route path="/admin" element={admin(<AdminDashboardPage />)} />
                  <Route path="/admin/products" element={admin(<AdminProductsPage />)} />
                  <Route path="/admin/orders" element={admin(<AdminOrdersPage />)} />
                  <Route path="/admin/discounts" element={admin(<AdminDiscountsPage />)} />
                  <Route path="/admin/settings" element={admin(<AdminSettingsPage />)} />
                  <Route path="/admin/collections" element={admin(<AdminCollectionsPage />)} />

                  <Route
                    path="*"
                    element={
                      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
                        <h2 className="font-display font-black text-3xl uppercase text-black">Page Not Found</h2>
                        <p className="text-xs text-neutral-600">The page you requested does not exist.</p>
                        <a href="/" className="inline-block px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest">
                          Return Home
                        </a>
                      </div>
                    }
                  />
                </Routes>
              </Suspense>
            </Main>

            <Footer />
          </div>
        </BrowserRouter>
      </PwaProvider>
    </AuthProvider>
  );
};
