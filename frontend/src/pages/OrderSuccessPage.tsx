import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiClient } from '../services/api';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettingsStore } from '../store/settingsStore';

export const OrderSuccessPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const supportEmail = useSettingsStore((s) => s.settings.supportEmail);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading || !orderNumber) return;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let key = params.get('key') || '';
    if (!key) {
      try {
        key = sessionStorage.getItem(`levix_order_${orderNumber}`) || '';
      } catch {
        /* ignore */
      }
    }

    const load = async () => {
      try {
        const res = await apiClient.get(`/orders/${orderNumber}`, key ? { key } : undefined);
        setOrder(res.data.order);
        // Payment confirmation can take a few seconds (webhook) — poll briefly.
        if (res.data.order?.paymentStatus !== 'PAID' && res.data.order?.paymentMethod !== 'COD' && attempts < 6) {
          attempts++;
          timer = setTimeout(load, 3000);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, authLoading, user?.uid]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-24 text-center font-mono text-xs uppercase tracking-widest text-neutral-500">Loading your order...</div>;
  }

  if (notFound || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-display font-black text-2xl uppercase text-black">Order {orderNumber}</h1>
        <p className="text-xs text-neutral-600">
          We couldn't show this order on this device. Sign in with the email you used at checkout to see it under My Orders, or contact{' '}
          <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <Link to="/account/orders" className="inline-block px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest">My Orders</Link>
      </div>
    );
  }

  const cod = order.paymentMethod === 'COD';
  const paid = order.paymentStatus === 'PAID' || cod;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-8">
      <div className="flex flex-col items-center space-y-3">
        {paid ? <CheckCircle2 className="w-16 h-16 text-black stroke-[1.5]" /> : <Clock className="w-16 h-16 text-black stroke-[1.5]" />}
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
          {paid ? 'ORDER CONFIRMED' : 'CONFIRMING PAYMENT'}
        </span>
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">
          {paid ? 'Thank You For Your Order' : 'Almost There'}
        </h1>
        <p className="text-xs text-neutral-600 max-w-md">
          {cod
            ? `Your Cash on Delivery order is confirmed. Please keep RS. ${(order.totalPaise / 100).toLocaleString('en-IN')} ready — pay the courier in cash or by UPI when it arrives. We will share courier tracking as soon as it ships.`
            : paid
            ? 'Your payment was successful. We will pack your order and share courier tracking as soon as it ships.'
            : 'We are waiting for Razorpay to confirm your payment. This usually takes a few seconds — this page will update automatically.'}
        </p>
      </div>

      <div className="bg-white p-6 border border-black/10 text-left space-y-5 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2 border-b border-black/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">Order Number</p>
            <p className="font-mono font-bold text-black">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">Status</p>
            <p className="font-bold text-black text-xs uppercase">{order.status}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">Items Ordered ({order.items.length})</p>
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center space-x-3 text-xs">
              <div className="w-12 h-14 bg-neutral-200 overflow-hidden flex-shrink-0">
                {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-black truncate">{it.productName}</p>
                <p className="text-[11px] text-neutral-500 font-mono">Size {it.size}{it.color ? ` • ${it.color}` : ''} • Qty {it.quantity}</p>
              </div>
              <span className="font-mono font-bold">RS. {(it.subtotalPaise / 100).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black/10 pt-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span className="font-mono">RS. {(order.subtotalPaise / 100).toLocaleString('en-IN')}</span></div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-green-700"><span>Discount</span><span className="font-mono">- RS. {(order.discountPaise / 100).toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between text-neutral-600"><span>Shipping</span><span className="font-mono">{order.shippingPaise === 0 ? 'FREE' : `RS. ${(order.shippingPaise / 100).toLocaleString('en-IN')}`}</span></div>
          {cod && (order.codFeePaise || 0) > 0 && (
            <div className="flex justify-between text-neutral-600"><span>Cash on Delivery fee</span><span className="font-mono">RS. {((order.codFeePaise || 0) / 100).toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between font-bold text-black text-sm pt-1"><span>{cod && order.paymentStatus !== 'PAID' ? 'To pay on delivery' : 'Total Paid'}</span><span className="font-mono">RS. {(order.totalPaise / 100).toLocaleString('en-IN')}</span></div>
        </div>

        {order.shippingAddress && (
          <div className="border-t border-black/10 pt-4 text-xs text-neutral-700">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Shipping To</p>
            <p>{order.shippingAddress}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/collections/all-products" className="px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
        {user && (
          <Link to="/account/orders" className="px-8 py-3 border border-black text-black text-xs font-bold uppercase tracking-widest">My Orders</Link>
        )}
      </div>

      <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" /> Need help? Email <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order number.
      </p>
    </div>
  );
};
