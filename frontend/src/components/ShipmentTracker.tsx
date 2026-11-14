import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Package, Truck, Home, Clock, XCircle } from 'lucide-react';

/** Tracking page for a courier name typed by the admin (falls back to a Google search). */
export function courierTrackUrl(courier: string | null | undefined, awb: string): string {
  const c = (courier || '').toLowerCase().replace(/[^a-z]/g, '');
  const n = encodeURIComponent(awb.trim());
  if (c.includes('delhivery')) return `https://www.delhivery.com/track-v2/package/${n}`;
  if (c.includes('ekart') || c.includes('flipkart')) return `https://ekartlogistics.com/shipmenttrack/${n}`;
  if (c.includes('bluedart')) return `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${n}`;
  if (c.includes('dtdc')) return `https://www.dtdc.in/trace.asp?strCnno=${n}`;
  if (c.includes('xpressbees') || c.includes('expressbees')) return `https://www.xpressbees.com/shipment/tracking?awbNo=${n}`;
  if (c.includes('shadowfax')) return `https://tracker.shadowfax.in/#/track/${n}`;
  if (c.includes('ecom')) return `https://ecomexpress.in/tracking/?awb_field=${n}`;
  if (c.includes('shiprocket')) return `https://shiprocket.co/tracking/${n}`;
  if (c.includes('indiapost') || c.includes('speedpost') || c === 'post') return 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
  if (c.includes('amazon')) return `https://track.amazon.in/tracking/${n}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${courier || ''} tracking ${awb}`.trim())}`;
}

const STEPS = [
  { key: 'PLACED', label: 'Ordered', icon: Check },
  { key: 'PROCESSING', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home }
];

function stepIndex(status: string): number {
  switch (status) {
    case 'DELIVERED':
      return 3;
    case 'SHIPPED':
      return 2;
    case 'PROCESSING':
      return 1;
    default:
      return 0; // PENDING / PAID
  }
}

/** Order progress + courier details for customers (My Orders, receipt). */
interface RefundInfo {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  refundStatus?: string | null;
  refundAmountPaise?: number | null;
  refundedAt?: string | null;
  refundRequestedAt?: string | null;
  totalPaise?: number;
}

const rupees = (p?: number | null) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

/** What a customer sees for a cancelled order: refund progress (online payments) or a simple note (COD). */
const CancelledNote: React.FC<RefundInfo> = (r) => {
  const amount = rupees(r.refundAmountPaise || r.totalPaise);
  if (r.refundStatus === 'PROCESSED' || r.paymentStatus === 'REFUNDED') {
    return (
      <div className="px-4 py-3.5 bg-green-50 border border-green-200 text-green-800 text-[12px] space-y-0.5">
        <p className="font-bold flex items-center gap-2"><Check className="w-4 h-4" /> Refund of {amount} completed{r.refundedAt ? ` on ${day(r.refundedAt)}` : ''}</p>
        <p className="text-green-700/90 pl-6">The money has been sent back to your original payment method. Some banks take 1–2 days to show it.</p>
      </div>
    );
  }
  if (r.refundStatus === 'PROCESSING' || r.refundStatus === 'REQUESTING') {
    return (
      <div className="px-4 py-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-[12px] space-y-2">
        <p className="font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Refund of {amount} on its way{r.refundRequestedAt ? ` · started ${day(r.refundRequestedAt)}` : ''}</p>
        <div className="pl-6">
          <div className="h-1.5 bg-amber-200/70 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-amber-500 rounded-full" /></div>
          <p className="mt-1.5 text-amber-800/90">It reaches your original payment method (UPI / card / bank) in about 5–7 working days.</p>
        </div>
      </div>
    );
  }
  const paidOnline = r.paymentMethod !== 'COD' && r.paymentStatus === 'PAID';
  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-[12px] font-semibold">
      <XCircle className="w-4 h-4 flex-shrink-0 mt-px" />
      <span>
        This order was cancelled.{' '}
        {paidOnline
          ? `Your refund of ${amount} is being arranged — you'll see its progress right here.`
          : r.paymentMethod === 'COD' && r.paymentStatus !== 'PAID'
            ? 'Nothing was charged.'
            : ''}
      </span>
    </div>
  );
};

export const ShipmentTracker: React.FC<{ status: string; courier?: string | null; trackingNumber?: string | null } & RefundInfo> = ({ status, courier, trackingNumber, ...refund }) => {
  const [copied, setCopied] = useState(false);

  if (status === 'CANCELLED') {
    return <CancelledNote {...refund} />;
  }

  const idx = stepIndex(status);
  const awb = (trackingNumber || '').trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(awb);
    } catch {
      const t = document.createElement('textarea');
      t.value = awb;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="relative flex items-start justify-between">
        <div className="absolute left-[12%] right-[12%] top-[15px] h-[2px] bg-black/10" />
        <div className="absolute left-[12%] top-[15px] h-[2px] bg-[#FF5400] transition-all duration-500" style={{ width: `${(idx / 3) * 76}%` }} />
        {STEPS.map((s, i) => {
          const done = i <= idx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center w-1/4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-[#FF5400] border-[#FF5400] text-white' : 'bg-white border-black/15 text-neutral-400'} ${i === idx ? 'ring-4 ring-[#FF5400]/15' : ''}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className={`mt-1.5 text-[10px] uppercase tracking-wider font-bold ${done ? 'text-black' : 'text-neutral-400'}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Courier details */}
      {awb ? (
        <div className="border border-black/10 bg-[#FAFAFA] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 flex-shrink-0 rounded-full bg-black text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">{courier || 'Courier'} · Tracking ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-[15px] text-black break-all">{awb}</p>
                <button type="button" onClick={copy} aria-label="Copy tracking ID" title="Copy" className="p-1 text-neutral-500 hover:text-black">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {copied && <p className="text-[10px] text-green-700 font-semibold">Copied!</p>}
            </div>
          </div>
          <a
            href={courierTrackUrl(courier, awb)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 whitespace-nowrap"
          >
            Track shipment <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11.5px] text-neutral-600 bg-[#FAFAFA] border border-black/5 px-3.5 py-2.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {idx >= 3 ? 'Delivered — enjoy your LEVIX fit!' : 'Your courier tracking ID will appear here as soon as your order ships.'}
        </div>
      )}
    </div>
  );
};
