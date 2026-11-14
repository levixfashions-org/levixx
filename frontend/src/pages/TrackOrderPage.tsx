import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { ShipmentTracker } from '../components/ShipmentTracker';

interface TrackResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  courier?: string | null;
  trackingNumber?: string | null;
  paymentMethod?: string | null;
  refundStatus?: string | null;
  refundAmountPaise?: number | null;
  refundedAt?: string | null;
  createdAt: string;
  itemCount: number;
}

export const TrackOrderPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/orders/track', { orderNumber: orderNumber.trim().toUpperCase(), email: email.trim() });
      setResult(res.data.order);
    } catch (err: any) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  // While a tracked order is on screen, update it live when the store changes it.
  const live = useLiveRefresh();
  useEffect(() => {
    if (!live || !result) return;
    apiClient
      .post('/orders/track', { orderNumber: result.orderNumber, email: email.trim() })
      .then((res) => res.data?.order && setResult(res.data.order))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);


  return (
    <div className="pt-8 pb-16 px-4 max-w-lg mx-auto">
      <h1 className="text-[20px] font-bold">Track your order</h1>
      <p className="text-[12px] text-neutral-600 mt-1">Enter your order number and the email you used at checkout.</p>
      <form onSubmit={submit} className="lx-panel p-5 mt-5 space-y-3">
        <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required placeholder="Order number (e.g. LVX-261110-ABC123)" className="w-full rounded-full bg-[#EFEFEF] px-4 py-3 text-[13px] focus:outline-none font-mono" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email address" className="w-full rounded-full bg-[#EFEFEF] px-4 py-3 text-[13px] focus:outline-none" />
        <button disabled={loading} className="w-full py-3 rounded-full bg-black text-white text-[11px] font-semibold uppercase disabled:opacity-50">
          {loading ? 'Checking…' : 'Track order'}
        </button>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="lx-panel p-5 mt-3 lx-fade-in">
          <div className="flex justify-between text-[12px]">
            <span className="font-mono font-bold">{result.orderNumber}</span>
            <span>{new Date(result.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          {result.status !== 'CANCELLED' && result.paymentStatus === 'PENDING' && result.paymentMethod !== 'COD' ? (
            <p className="mt-4 text-[13px] font-semibold">Payment not completed for this order.</p>
          ) : (
            <div className="mt-5">
              <ShipmentTracker
                status={result.status}
                courier={result.courier}
                trackingNumber={result.trackingNumber}
                paymentMethod={result.paymentMethod}
                paymentStatus={result.paymentStatus}
                refundStatus={result.refundStatus}
                refundAmountPaise={result.refundAmountPaise}
                refundedAt={result.refundedAt}
              />
            </div>
          )}
          <p className="mt-3 text-[11px] text-neutral-500">{result.itemCount} item(s)</p>
        </div>
      )}
      <p className="text-[11px] text-neutral-500 mt-6">
        Signed in? See all orders in <Link to="/account/orders" className="underline">My orders</Link>.
      </p>
    </div>
  );
};
