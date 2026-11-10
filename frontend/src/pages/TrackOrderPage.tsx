import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';

interface TrackResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  courier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  itemCount: number;
}

const STEPS = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

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

  const stepIdx = result ? STEPS.indexOf(result.status) : -1;

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
          {result.status === 'CANCELLED' ? (
            <p className="mt-4 text-[13px] font-semibold text-red-600">This order was cancelled.</p>
          ) : result.paymentStatus !== 'PAID' ? (
            <p className="mt-4 text-[13px] font-semibold">Payment not completed for this order.</p>
          ) : (
            <div className="mt-5 grid grid-cols-4 gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="text-center">
                  <div className={`h-1.5 rounded-full ${i <= stepIdx ? 'bg-black' : 'bg-black/10'}`} />
                  <p className={`text-[9.5px] mt-1.5 uppercase ${i <= stepIdx ? 'text-black font-semibold' : 'text-neutral-400'}`}>
                    {s === 'PAID' ? 'Confirmed' : s.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          )}
          {result.trackingNumber && (
            <p className="mt-4 text-[12px]">
              <span className="text-neutral-500">{result.courier || 'Courier'}:</span> <span className="font-mono font-semibold">{result.trackingNumber}</span>
            </p>
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
