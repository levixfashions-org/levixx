import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { ShipmentTracker } from '../components/ShipmentTracker';
import { Order } from '../types';
import { Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { StatusPill, isActiveOrder, orderDate, rupees } from '../components/account/orderStatus';
import { ReturnPanel } from '../components/account/ReturnPanel';

export const OrderHistoryPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Goes up whenever the store (e.g. the admin updating an order) changes → reload silently.
  const live = useLiveRefresh();
  const [focusTick, setFocusTick] = useState(0);

  // Also refresh when the customer comes back to this tab / app.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setFocusTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const silent = live > 0 || focusTick > 0;
    async function loadOrders() {
      try {
        if (!silent) setLoading(true);
        const res = await apiClient.get('/orders/my-orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        console.warn('Could not load orders:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadOrders();
    }
  }, [user, authLoading, navigate, live, focusTick]);

  const [tab, setTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const counts = {
    all: orders.length,
    active: orders.filter((o) => isActiveOrder(o.status)).length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length
  };
  const shown = orders.filter((o) =>
    tab === 'all' ? true : tab === 'active' ? isActiveOrder(o.status) : tab === 'delivered' ? o.status === 'DELIVERED' : o.status === 'CANCELLED'
  );

  return (
    <div className="lx-acct px-4 sm:px-6 py-6 sm:py-10">
      <div className="lx-login-wallpaper" aria-hidden="true" />
      <div className="relative z-[1] max-w-[880px] mx-auto space-y-4 sm:space-y-5">
        <div className="px-1">
          <Link to="/account" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#6e6e73] hover:text-[#0b0b0f]">
            <ArrowLeft className="w-4 h-4" /> My account
          </Link>
          <h1 className="mt-2 text-[28px] sm:text-[34px] leading-tight font-semibold tracking-[-0.035em] text-[#0b0b0f]">My orders</h1>
          <p className="text-[13.5px] text-[#6e6e73]">Live status, courier tracking and refunds — updates by itself.</p>
        </div>

        {!loading && orders.length > 0 && (
          <div className="lx-segment inline-flex items-center gap-0.5 p-[3px] max-w-full overflow-x-auto">
            {(['all', 'active', 'delivered', 'cancelled'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`lx-seg-item px-3.5 h-8 rounded-[10px] text-[13px] font-medium whitespace-nowrap capitalize ${tab === t ? 'is-active' : ''}`}
              >
                {t} <span className="opacity-60">{counts[t]}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="lx-acct-card p-6 animate-pulse space-y-3">
                <div className="h-4 w-1/3 bg-black/5 rounded" />
                <div className="h-3 w-1/4 bg-black/5 rounded" />
                <div className="h-20 bg-black/5 rounded-[14px]" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="lx-acct-card py-14 px-6 text-center">
            <Package className="w-12 h-12 text-black/20 mx-auto" strokeWidth={1.3} />
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">No orders yet</h3>
            <p className="mt-1 text-[13.5px] text-[#6e6e73]">When you shop a drop, your receipts and live tracking appear here.</p>
            <Link to="/collections/all-products" className="lx-btn-primary inline-flex mt-5 h-11 px-6 items-center text-[14px] font-semibold">
              Explore drops
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <div className="lx-acct-card py-10 text-center text-[13.5px] text-[#6e6e73]">No {tab} orders.</div>
        ) : (
          <div className="space-y-4">
            {shown.map((order) => {
              const qty = order.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <article key={order.id} className="lx-acct-card overflow-hidden">
                  <header className="px-5 sm:px-6 pt-5 pb-4 flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06]">
                    <div className="min-w-0">
                      <p className="font-mono text-[13.5px] font-semibold text-[#0b0b0f]">{order.orderNumber}</p>
                      <p className="text-[12.5px] text-[#8e8e93]">
                        {orderDate(order.createdAt)} · {qty} item{qty === 1 ? '' : 's'} · {order.paymentMethod === 'COD' ? (order.paymentStatus === 'PAID' ? 'COD · Paid' : 'Cash on Delivery') : 'Paid online'}
                      </p>
                    </div>
                    <StatusPill order={order} />
                  </header>

                  <div className="px-5 sm:px-6 py-5 border-b border-black/[0.06]">
                    <ShipmentTracker status={order.status} courier={order.courier} trackingNumber={order.trackingNumber} paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus} refundStatus={order.refundStatus} refundAmountPaise={order.refundAmountPaise} refundedAt={order.refundedAt} refundRequestedAt={order.refundRequestedAt} totalPaise={order.totalPaise} />
                  </div>

                  {(order.status === 'DELIVERED' || (order.returns && order.returns.length > 0)) && (
                    <div id={`return-${order.orderNumber}`} className="px-5 sm:px-6 py-4 border-b border-black/[0.06]">
                      <ReturnPanel order={order} onSubmitted={() => setFocusTick((t) => t + 1)} />
                    </div>
                  )}

                  <ul className="px-5 sm:px-6 divide-y divide-black/[0.06]">
                    {order.items.map((it) => (
                      <li key={it.id} className="py-3 flex items-center gap-3">
                        <div className="w-14 h-[68px] rounded-[12px] overflow-hidden bg-black/5 ring-1 ring-black/5 flex-shrink-0">
                          {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" loading="lazy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#0b0b0f] truncate">{it.productName}</p>
                          <p className="text-[12.5px] text-[#8e8e93]">
                            Size {it.size}{it.color ? ` · ${it.color}` : ''} · Qty {it.quantity}
                          </p>
                        </div>
                        <span className="text-[14px] font-semibold text-[#0b0b0f]">{rupees(it.subtotalPaise)}</span>
                      </li>
                    ))}
                  </ul>

                  <footer className="px-5 sm:px-6 py-4 bg-white/40 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-[#8e8e93]">{order.status === 'CANCELLED' ? 'Order total' : order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? 'To pay on delivery' : 'Total paid'}</p>
                      <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">{rupees(order.totalPaise)}</p>
                    </div>
                    <Link to={`/order-success/${order.orderNumber}`} className="lx-btn-soft h-10 px-4 inline-flex items-center gap-1 text-[13.5px] font-semibold">
                      Receipt <ArrowRight className="w-4 h-4" />
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
