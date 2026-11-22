import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import { StatusPill } from '../components/account/orderStatus';
import { apiClient } from '../services/api';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettingsStore } from '../store/settingsStore';
import { ShipmentTracker } from '../components/ShipmentTracker';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { ReturnPanel } from '../components/account/ReturnPanel';

export const OrderSuccessPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const supportEmail = useSettingsStore((s) => s.settings.supportEmail);
  // Updates live when the store changes this order (status, tracking, refund).
  const live = useLiveRefresh();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState(0);
  const accessKey = React.useMemo(() => {
    let k = params.get('key') || '';
    if (!k && orderNumber) {
      try {
        k = sessionStorage.getItem(`levix_order_${orderNumber}`) || '';
      } catch {
        /* ignore */
      }
    }
    return k;
  }, [params, orderNumber]);

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
        if (res.data.order?.paymentStatus === 'PENDING' && res.data.order?.paymentMethod !== 'COD' && res.data.order?.status !== 'CANCELLED' && attempts < 6) {
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
  }, [orderNumber, authLoading, user?.uid, live, reload]);

  if (loading) {
    return <div className="py-24 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-black/10 border-t-[#FF5400] animate-spin" aria-label="Loading your order" /></div>;
  }

  if (notFound || !order) {
    return (
      <div className="lx-acct-card max-w-md mx-4 sm:mx-auto my-14 px-6 py-10 text-center space-y-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">Order {orderNumber}</h1>
        <p className="lx-sub">
          We couldn't show this order on this device. Sign in with the email you used at checkout to see it under My Orders, or contact{' '}
          <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <Link to="/account/orders" className="lx-btn-primary inline-flex h-11 px-6 items-center text-[14px] font-semibold">My orders</Link>
      </div>
    );
  }

  const cod = order.paymentMethod === 'COD';
  const paid = order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED' || cod;
  const cancelled = order.status === 'CANCELLED';
  const refunded = order.refundStatus === 'PROCESSED' || order.paymentStatus === 'REFUNDED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 text-center space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <span className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-[0_14px_34px_-14px_rgba(0,0,0,0.35)] ${cancelled ? 'bg-red-100 text-red-600' : paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {cancelled ? <XCircle className="w-9 h-9" strokeWidth={1.8} /> : paid ? <CheckCircle2 className="w-9 h-9" strokeWidth={1.8} /> : <Clock className="w-9 h-9" strokeWidth={1.8} />}
        </span>
        <span className="lx-eyebrow">
          {cancelled ? (refunded ? 'Order cancelled · refunded' : 'Order cancelled') : paid ? 'Order confirmed' : 'Confirming payment'}
        </span>
        <h1 className="lx-h1">
          {cancelled ? 'Order cancelled' : paid ? 'Thank you for your order' : 'Almost there'}
        </h1>
        <p className="lx-sub max-w-md">
          {cancelled
            ? cod && order.paymentStatus !== 'PAID'
              ? 'This order has been cancelled. Nothing was charged.'
              : 'This order has been cancelled. Your refund status is shown below.'
            : cod
            ? `Your Cash on Delivery order is confirmed. Please keep ₹${(order.totalPaise / 100).toLocaleString('en-IN')} ready — pay the courier in cash or by UPI when it arrives. We will share courier tracking as soon as it ships.`
            : paid
            ? 'Your payment was successful. We will pack your order and share courier tracking as soon as it ships.'
            : 'We are waiting for Razorpay to confirm your payment. This usually takes a few seconds — this page will update automatically.'}
        </p>
      </div>

      <div className="lx-acct-card p-5 sm:p-7 text-left space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/[0.07] pb-4">
          <div>
            <p className="text-[12px] text-[#8e8e93]">Order number</p>
            <p className="font-mono font-semibold text-[14px] text-[#0b0b0f]">{order.orderNumber}</p>
          </div>
          <StatusPill order={order} />
        </div>

        {order.status !== 'PENDING' && (
          <div className="border-b border-black/[0.07] pb-5">
            <ShipmentTracker status={order.status} courier={order.courier} trackingNumber={order.trackingNumber} paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus} refundStatus={order.refundStatus} refundAmountPaise={order.refundAmountPaise} refundedAt={order.refundedAt} refundRequestedAt={order.refundRequestedAt} totalPaise={order.totalPaise} />
          </div>
        )}

        {(order.status === 'DELIVERED' || (order.returns && order.returns.length > 0)) && (
          <div id="return" className="border-b border-black/[0.07] pb-5">
            <ReturnPanel order={order} accessKey={accessKey} onSubmitted={() => setReload((r) => r + 1)} />
          </div>
        )}

        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-[#3a3a3f]">Items ({order.items.length})</p>
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <div className="w-14 h-[68px] rounded-[12px] bg-black/5 ring-1 ring-black/5 overflow-hidden flex-shrink-0">
                {it.imageUrl && <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#0b0b0f] truncate">{it.productName}</p>
                <p className="text-[12px] text-[#8e8e93]">Size {it.size}{it.color ? ` • ${it.color}` : ''} • Qty {it.quantity}</p>
              </div>
              <span className="text-[14px] font-semibold text-[#0b0b0f]">₹{(it.subtotalPaise / 100).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.07] pt-4 space-y-2 text-[13.5px]">
          <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>₹{(order.subtotalPaise / 100).toLocaleString('en-IN')}</span></div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-green-700"><span>Discount</span><span>− ₹{(order.discountPaise / 100).toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between text-neutral-600"><span>Shipping</span><span className="font-mono">{order.shippingPaise === 0 ? 'Free' : `₹${(order.shippingPaise / 100).toLocaleString('en-IN')}`}</span></div>
          {cod && (order.codFeePaise || 0) > 0 && (
            <div className="flex justify-between text-neutral-600"><span>Cash on Delivery fee</span><span>₹{((order.codFeePaise || 0) / 100).toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between items-baseline font-semibold text-[#0b0b0f] text-[15px] pt-1 border-t border-black/[0.07] mt-1"><span>{cod && order.paymentStatus !== 'PAID' ? 'To pay on delivery' : 'Total paid'}</span><span>₹{(order.totalPaise / 100).toLocaleString('en-IN')}</span></div>
          {(order.refundStatus === 'PROCESSED' || order.refundStatus === 'PROCESSING' || order.paymentStatus === 'REFUNDED') && (
            <div className={`flex justify-between font-bold text-sm ${order.refundStatus === 'PROCESSING' ? 'text-amber-700' : 'text-green-700'}`}>
              <span>{order.refundStatus === 'PROCESSING' ? 'Refund on its way' : 'Refunded'}</span>
              <span>− ₹{(((order.refundAmountPaise || order.totalPaise) as number) / 100).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {order.shippingAddress && (
          <div className="border-t border-black/[0.07] pt-4 text-[13.5px] text-[#3a3a3f]">
            <p className="text-[12px] text-[#8e8e93] mb-1">Delivering to</p>
            <p>{order.shippingAddress}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/collections/all-products" className="lx-btn-primary h-12 px-7 text-[15px] font-semibold flex items-center justify-center gap-2">
          Continue shopping <ArrowRight className="w-4 h-4" />
        </Link>
        {user && (
          <Link to="/account/orders" className="lx-btn-soft h-12 px-7 text-[15px] font-semibold flex items-center justify-center">My orders</Link>
        )}
      </div>

      <p className="text-[12.5px] text-[#8e8e93] flex items-center justify-center gap-1.5 flex-wrap">
        <ShieldCheck className="w-3.5 h-3.5" /> Need help? Email <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order number.
      </p>
    </div>
  );
};
