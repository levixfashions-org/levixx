import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Order } from '../types';
import { Package, ArrowLeft, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export const OrderHistoryPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    async function loadOrders() {
      try {
        setLoading(true);
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
  }, [user, authLoading, navigate]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-2">
        <div>
          <Link
            to="/account"
            className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-black flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">
            Order History
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Track your orders and courier details.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-xs uppercase text-neutral-500">
          Loading order archive...
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => {
            const formattedTotal = (order.totalPaise / 100).toLocaleString('en-IN');
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={order.id}
                className="bg-white p-6 border border-black/10 shadow-sm space-y-5"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-neutral-500">Order Number</span>
                    <p className="font-mono font-bold text-sm text-black">{order.orderNumber}</p>
                    <span className="text-[11px] text-neutral-500">{dateStr}</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono text-neutral-500">Status</span>
                      <p className="text-xs font-bold uppercase tracking-wider text-black">
                        {order.status}
                      </p>
                      {order.paymentMethod === 'COD' && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF5400] mt-0.5">
                          {order.paymentStatus === 'PAID' ? 'Cash on Delivery · Paid' : 'Cash on Delivery'}
                        </p>
                      )}
                      {order.trackingNumber && (
                        <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
                          {order.courier ? `${order.courier}: ` : 'Tracking: '}{order.trackingNumber}
                        </p>
                      )}
                    </div>

                    <Link
                      to={`/order-success/${order.orderNumber}`}
                      className="px-4 py-2 border border-black text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
                    >
                      View Receipt
                    </Link>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-black/5">
                  {order.items.map((it) => (
                    <div key={it.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-14 bg-neutral-200 overflow-hidden flex-shrink-0">
                          {it.imageUrl && (
                            <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-black">{it.productName}</p>
                          <p className="text-[11px] font-mono text-neutral-500">
                            Size: {it.size}{it.color ? ` • ${it.color}` : ''} • Qty: {it.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-black">
                        RS. {(it.subtotalPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t border-black/10 pt-3 flex justify-between items-center text-xs">
                  <span className="uppercase text-neutral-600 font-semibold tracking-wider">Total Paid</span>
                  <span className="font-mono font-bold text-base text-black">RS. {formattedTotal}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 bg-white border border-black/10 p-8">
          <Package className="w-12 h-12 text-neutral-400 mx-auto stroke-1" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg uppercase tracking-tight text-black">
              No orders placed yet
            </h3>
            <p className="text-xs text-neutral-500">
              When you purchase garments from our drops, your receipts and tracking will appear here.
            </p>
          </div>
          <Link
            to="/collections/all-products"
            className="inline-block mt-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
          >
            Explore Drops
          </Link>
        </div>
      )}

    </div>
  );
};
