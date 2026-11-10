import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { AdminNav } from '../../components/admin/AdminNav';
import { Shield, TrendingUp, Package, Users, AlertTriangle, ArrowRight, Tag, Sliders, ExternalLink } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const downloadSubscribers = async () => {
    try {
      const res = await apiClient.get('/admin/subscribers', { format: 'json' });
      const rows = ['email,subscribed_at', ...(res.data.subscribers || []).map((s: any) => `${s.email},${s.createdAt}`)];
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'levix-subscribers.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }

    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await apiClient.get('/admin/metrics');
        if (res.data && res.data.metrics) {
          setData(res.data);
        } else {
          throw new Error('Invalid metrics response format');
        }
      } catch (err) {
        console.warn('Admin metrics error:', err);
        setMetricsError((err as any)?.message || 'Could not load metrics');
        setData({
          metrics: {
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            totalProducts: 0
          },
          recentOrders: [],
          lowStockVariants: []
        });
      } finally {
        setLoading(false);
      }
    }

    if (user && isAdmin) {
      loadMetrics();
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#EFEFEF]">
        <AdminNav />
        <div className="max-w-[1440px] mx-auto px-4 py-20 text-center font-mono text-xs uppercase text-neutral-500">
          Loading admin console...
        </div>
      </div>
    );
  }

  const { metrics, recentOrders, lowStockVariants } = data;

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>LEVIX EXECUTIVE CONSOLE</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">
              Store Master Suite
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Live operational controls, inventory status, fulfillment tracking, and catalog management for thelevix.shop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/products"
              className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catalog & Drops</span>
            </Link>
            <Link
              to="/admin/settings"
              className="px-4 py-2 bg-white border border-black/20 text-black text-xs font-bold uppercase tracking-wider hover:border-black flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Store Settings</span>
            </Link>
          </div>
        </div>

        {/* Quick Hub Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/products"
            className="p-5 bg-white border border-black/10 hover:border-black transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Catalog</span>
              <Package className="w-4 h-4 text-[#FF5400]" />
            </div>
            <h4 className="font-display font-black text-lg uppercase text-black group-hover:text-[#FF5400] transition-colors">
              Manage Products & Drops
            </h4>
            <p className="text-[11px] text-neutral-500">
              Add new drops, update prices, manage sizes S-XXL, and feature drops.
            </p>
          </Link>

          <Link
            to="/admin/orders"
            className="p-5 bg-white border border-black/10 hover:border-black transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Orders</span>
              <TrendingUp className="w-4 h-4 text-[#FF5400]" />
            </div>
            <h4 className="font-display font-black text-lg uppercase text-black group-hover:text-[#FF5400] transition-colors">
              Fulfillment & Tracking
            </h4>
            <p className="text-[11px] text-neutral-500">
              Update order statuses (Shipped, Delivered), assign courier tracking.
            </p>
          </Link>

          <Link
            to="/admin/discounts"
            className="p-5 bg-white border border-black/10 hover:border-black transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Marketing</span>
              <Tag className="w-4 h-4 text-[#FF5400]" />
            </div>
            <h4 className="font-display font-black text-lg uppercase text-black group-hover:text-[#FF5400] transition-colors">
              Promo & Discount Codes
            </h4>
            <p className="text-[11px] text-neutral-500">
              Create coupons (% or flat INR discount), set cart limits and expiry.
            </p>
          </Link>

          <Link
            to="/admin/settings"
            className="p-5 bg-white border border-black/10 hover:border-black transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Content</span>
              <Sliders className="w-4 h-4 text-[#FF5400]" />
            </div>
            <h4 className="font-display font-black text-lg uppercase text-black group-hover:text-[#FF5400] transition-colors">
              Marquee & Store Settings
            </h4>
            <p className="text-[11px] text-neutral-500">
              Edit the top announcement bar ticker text, hero headlines, and contacts.
            </p>
          </Link>
        </div>

        {metricsError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{metricsError}</div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Total Revenue</span>
            <p className="font-display font-black text-3xl text-black">
              RS. {(metrics.totalRevenueINR ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-green-700 font-semibold">Today: RS. {(metrics.todayRevenueINR ?? 0).toLocaleString('en-IN')} ({metrics.todayOrders ?? 0} orders)</p>
          </div>

          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Total Orders</span>
            <p className="font-display font-black text-3xl text-black font-mono">
              {metrics.totalOrders}
            </p>
            <p className="text-[11px] text-neutral-600 font-medium">{metrics.ordersToFulfil ?? 0} waiting to be shipped</p>
          </div>

          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Active Customers</span>
            <p className="font-display font-black text-3xl text-black font-mono">
              {metrics.totalCustomers}
            </p>
            <p className="text-[11px] text-neutral-600 font-medium">
              {metrics.subscribers ?? 0} newsletter subscribers{' '}
              {(metrics.subscribers ?? 0) > 0 && (
                <button type="button" onClick={downloadSubscribers} className="underline font-semibold text-black ml-1">Export CSV</button>
              )}
            </p>
          </div>

          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Active Products</span>
            <p className="font-display font-black text-3xl text-black font-mono">
              {metrics.totalProducts}
            </p>
            <p className="text-[11px] text-neutral-600 font-medium">Live Streetwear SKUs</p>
          </div>

        </div>

      {/* Tables: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 border border-black/10 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-black/10 pb-3">
            <h3 className="font-display font-bold text-lg uppercase tracking-tight text-black">
              Recent Transactions
            </h3>
            <Link to="/admin/orders" className="text-xs font-bold text-[#FF5400] uppercase hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 uppercase tracking-wider text-[10px] text-neutral-500">
                  <th className="py-2.5">Order</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-mono">
                {recentOrders.map((ord: any) => (
                  <tr key={ord.id}>
                    <td className="py-3 font-bold text-black">{ord.orderNumber}</td>
                    <td className="py-3 font-sans text-neutral-700">{ord.customerName}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-neutral-100 text-black text-[10px] font-bold uppercase">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-black">
                      RS. {(ord.totalPaise / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 border border-black/10 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-black/10 pb-3">
            <AlertTriangle className="w-4 h-4 text-[#FF5400]" />
            <h3 className="font-display font-bold text-lg uppercase tracking-tight text-black">
              Low Stock Alerts
            </h3>
          </div>

          <div className="space-y-3">
            {lowStockVariants.length > 0 ? (
              lowStockVariants.map((v: any) => (
                <div key={v.id} className="p-3 bg-neutral-50 border border-black/10 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-black">{v.product.name}</p>
                    <p className="text-[11px] font-mono text-neutral-500">
                      SKU: {v.sku} • Size: {v.size}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold font-mono text-xs">
                    {v.stockQuantity} Left
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 py-6 text-center">
                All variant inventory levels are healthy.
              </p>
            )}
          </div>
        </div>

      </div>

      </div>

    </div>
  );
};
