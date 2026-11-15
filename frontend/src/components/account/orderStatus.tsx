import React from 'react';

/** Friendly, colour-coded order status for customers. */
export function orderStatusInfo(o: { status: string; paymentMethod?: string | null; paymentStatus?: string | null; refundStatus?: string | null }) {
  if (o.status === 'CANCELLED') {
    if (o.refundStatus === 'PROCESSED' || o.paymentStatus === 'REFUNDED') return { label: 'Refunded', cls: 'bg-green-100 text-green-800', dot: 'bg-green-600' };
    if (o.refundStatus === 'PROCESSING' || o.refundStatus === 'REQUESTING') return { label: 'Refund on the way', cls: 'bg-amber-100 text-amber-900', dot: 'bg-amber-500' };
    return { label: 'Cancelled', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
  }
  switch (o.status) {
    case 'DELIVERED':
      return { label: 'Delivered', cls: 'bg-green-100 text-green-800', dot: 'bg-green-600' };
    case 'SHIPPED':
      return { label: 'On the way', cls: 'bg-blue-100 text-blue-800', dot: 'bg-blue-600' };
    case 'PROCESSING':
      return { label: 'Packing', cls: 'bg-violet-100 text-violet-800', dot: 'bg-violet-600' };
    case 'PAID':
      return { label: 'Confirmed', cls: 'bg-orange-100 text-[#c24100]', dot: 'bg-[#FF5400]' };
    default:
      return o.paymentMethod === 'COD'
        ? { label: 'Confirmed · COD', cls: 'bg-orange-100 text-[#c24100]', dot: 'bg-[#FF5400]' }
        : { label: 'Awaiting payment', cls: 'bg-neutral-200 text-neutral-700', dot: 'bg-neutral-500' };
  }
}

export const StatusPill: React.FC<{ order: Parameters<typeof orderStatusInfo>[0] }> = ({ order }) => {
  const s = orderStatusInfo(order);
  return (
    <span className={`lx-pill ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

export const isActiveOrder = (status: string) => ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(status);
export const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
export const orderDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
