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
    <div className="pt-6 sm:pt-10 pb-16 px-4 max-w-lg mx-auto">
      <div className="px-1">
        <p className="lx-eyebrow">Order status</p>
        <h1 className="lx-h1 mt-1">Track your order</h1>
        <p className="lx-sub mt-1.5">Enter your order number and the email you used at checkout.</p>
      </div>
      <form onSubmit={submit} className="lx-acct-card p-5 sm:p-6 mt-5 space-y-3.5">
        <div>
          <label htmlFor="tr-num" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">Order number</label>
          <input id="tr-num" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required autoCapitalize="characters" placeholder="e.g. LVX-261110-ABC123" className="lx-field w-full h-12 px-4 text-[15px]" />
        </div>
        <div>
          <label htmlFor="tr-email" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">Email</label>
          <input id="tr-email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" autoComplete="email" placeholder="Enter your email" className="lx-field w-full h-12 px-4 text-[15px]" />
        </div>
        <button disabled={loading} className="lx-btn-primary w-full h-12 text-[15px] font-semibold disabled:opacity-50">
          {loading ? 'Checking…' : 'Track order'}
        </button>
        {error && <p role="alert" className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-[12px] px-3 py-2">{error}</p>}
      </form>

      {result && (
        <div className="lx-acct-card p-5 sm:p-6 mt-4 lx-fade-in">
          <div className="flex justify-between text-[13px]">
            <span className="font-mono font-semibold text-[#0b0b0f]">{result.orderNumber}</span>
            <span className="text-[#8e8e93]">{new Date(result.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
          <p className="mt-3 text-[12px] text-[#8e8e93]">{result.itemCount} item(s)</p>
        </div>
      )}
      <p className="text-[12.5px] text-[#8e8e93] mt-5 px-1">
        Signed in? See all orders in <Link to="/account/orders" className="font-semibold text-[#ff5400]">My orders</Link>.
      </p>
    </div>
  );
};
