import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Phone, Mail, Film, Loader2, CheckCircle2, XCircle, Truck, PackageCheck, ExternalLink, X } from 'lucide-react';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../services/api';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { ReturnRequest, ReturnStatus } from '../../types';
import { REASON_LABEL } from '../../components/account/ReturnPanel';

interface AdminReturn extends ReturnRequest {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    paymentMethod: string;
    paymentStatus: string;
    totalPaise: number;
    status: string;
    deliveredAt: string;
    refundStatus?: string | null;
  };
}

const FILTERS: { id: string; label: string }[] = [
  { id: 'OPEN', label: 'Open' },
  { id: 'REQUESTED', label: 'New' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PICKED_UP', label: 'Picked up' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'ALL', label: 'All' }
];
const STATUS_STYLE: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-[#FF5400] text-white',
  APPROVED: 'bg-blue-600 text-white',
  PICKED_UP: 'bg-violet-600 text-white',
  COMPLETED: 'bg-green-600 text-white',
  REJECTED: 'bg-red-600 text-white'
};
const STATUS_LABEL: Record<ReturnStatus, string> = { REQUESTED: 'New', APPROVED: 'Approved', PICKED_UP: 'Picked up', COMPLETED: 'Completed', REJECTED: 'Rejected' };
const when = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const ReturnCard: React.FC<{ r: AdminReturn; onSaved: () => void; onPhoto: (src: string) => void }> = ({ r, onSaved, onPhoto }) => {
  const [note, setNote] = useState(r.adminNote || '');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const save = async (status?: ReturnStatus) => {
    if (status === 'REJECTED' && !note.trim()) {
      setErr('Add a short note for the customer explaining why it was not approved.');
      return;
    }
    setErr('');
    setBusy(status || 'note');
    try {
      await apiClient.patch(`/admin/returns/${r.id}`, { ...(status ? { status } : {}), adminNote: note });
      onSaved();
    } catch (e: any) {
      setErr(e?.message || 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  const cod = r.order.paymentMethod === 'COD';
  const btn = 'h-10 px-4 text-[12px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 disabled:opacity-50';
  const actions: { to: ReturnStatus; label: string; icon: React.ElementType; cls: string }[] =
    r.status === 'REQUESTED'
      ? [
          { to: 'APPROVED', label: 'Approve', icon: CheckCircle2, cls: 'bg-black text-white hover:bg-neutral-800' },
          { to: 'REJECTED', label: 'Reject', icon: XCircle, cls: 'border border-red-300 text-red-700 hover:bg-red-50' }
        ]
      : r.status === 'APPROVED'
        ? [
            { to: 'PICKED_UP', label: 'Mark picked up', icon: Truck, cls: 'bg-black text-white hover:bg-neutral-800' },
            { to: 'COMPLETED', label: r.resolution === 'REFUND' ? 'Refund done' : 'Replacement sent', icon: PackageCheck, cls: 'border border-black/20 hover:bg-black hover:text-white' }
          ]
        : r.status === 'PICKED_UP'
          ? [{ to: 'COMPLETED', label: r.resolution === 'REFUND' ? 'Refund done' : 'Replacement sent', icon: PackageCheck, cls: 'bg-black text-white hover:bg-neutral-800' }]
          : [{ to: 'REQUESTED', label: 'Re-open', icon: RotateCcw, cls: 'border border-black/20 hover:bg-black hover:text-white' }];

  return (
    <article className="bg-white border border-black/10 p-4 sm:p-5 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            <Link to={`/admin/orders?q=${encodeURIComponent(r.order.orderNumber)}`} className="font-mono text-[14px] font-bold hover:underline">{r.order.orderNumber}</Link>
            <span className="text-[12px] text-neutral-500">· requested {when(r.createdAt)}</span>
          </div>
          <p className="text-[15px] font-bold">{REASON_LABEL[r.reason]} → wants <span className="text-[#FF5400]">{r.resolution === 'REFUND' ? 'Refund' : 'Replacement'}</span></p>
          <p className="text-[12.5px] text-neutral-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-black">{r.order.customerName}</span>
            <a href={`tel:${r.order.customerPhone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="w-3.5 h-3.5" />{r.order.customerPhone}</a>
            <a href={`https://wa.me/${(r.order.customerPhone || '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} target="_blank" rel="noreferrer" className="hover:underline text-green-700 font-semibold">WhatsApp</a>
            <a href={`mailto:${r.order.customerEmail}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="w-3.5 h-3.5" />{r.order.customerEmail}</a>
          </p>
          <p className="text-[12px] text-neutral-500">
            {cod ? 'Cash on Delivery' : 'Paid online'} · order ₹{Math.round(r.order.totalPaise / 100).toLocaleString('en-IN')} · delivered {when(r.order.deliveredAt)}
            {r.refundUpi && <> · <span className="font-semibold text-black">UPI: {r.refundUpi}</span></>}
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_1fr] gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Items</p>
            <ul className="space-y-1.5">
              {r.items.map((i) => (
                <li key={i.orderItemId} className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-9 h-11 bg-neutral-100 overflow-hidden shrink-0">{i.imageUrl && <img src={i.imageUrl} alt="" className="w-full h-full object-cover" />}</span>
                  <span>{i.productName} <span className="text-neutral-500">· {[i.color, i.size].filter(Boolean).join(' / ')} × {i.quantity}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Customer says</p>
            <p className="text-[13.5px] whitespace-pre-line bg-neutral-50 border border-black/5 p-3">{r.details}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Photos ({r.photos.length})</p>
            {r.photos.length ? (
              <div className="flex flex-wrap gap-2">
                {r.photos.map((p) => (
                  <button key={p} type="button" onClick={() => onPhoto(p)} className="w-[84px] h-[104px] bg-neutral-100 overflow-hidden ring-1 ring-black/10 hover:ring-black" aria-label="Open photo">
                    <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-neutral-500">No photos</p>
            )}
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Unboxing video</p>
            {r.videoUrl ? (
              <video src={r.videoUrl} controls preload="metadata" playsInline className="w-full max-h-[260px] bg-black" />
            ) : (
              <p className="text-[12.5px] text-amber-700 font-semibold flex items-center gap-1.5"><Film className="w-4 h-4" /> Not uploaded — ask for it on WhatsApp if needed</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 pt-4 space-y-3">
        <div>
          <label htmlFor={`note-${r.id}`} className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 mb-1 block">Note to the customer (shown on their order page and in the email)</label>
          <textarea id={`note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder="e.g. Our courier partner will pick it up on Monday between 10 am and 6 pm." className="w-full border border-black/15 focus:border-black outline-none px-3 py-2 text-[13.5px]" />
        </div>
        {err && <p className="text-[12.5px] font-semibold text-red-700">{err}</p>}
        <div className="flex flex-wrap gap-2 items-center">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.to} type="button" disabled={!!busy} onClick={() => save(a.to)} className={`${btn} ${a.cls}`}>
                {busy === a.to ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {a.label}
              </button>
            );
          })}
          {note !== (r.adminNote || '') && (
            <button type="button" disabled={!!busy} onClick={() => save()} className={`${btn} border border-black/20 hover:bg-neutral-100`}>
              {busy === 'note' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save note only
            </button>
          )}
          {r.resolution === 'REFUND' && !cod && ['APPROVED', 'PICKED_UP'].includes(r.status) && (
            <Link to={`/admin/orders?q=${encodeURIComponent(r.order.orderNumber)}`} className="text-[12px] font-semibold underline inline-flex items-center gap-1 ml-1">
              Refund through Razorpay in Orders <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <p className="text-[11.5px] text-neutral-500">The customer gets an email (and a phone notification if they turned them on) each time you change the status.</p>
      </div>
    </article>
  );
};

export const AdminReturnsPage: React.FC = () => {
  const [filter, setFilter] = useState('OPEN');
  const [rows, setRows] = useState<AdminReturn[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = useLiveRefresh();

  useEffect(() => {
    let alive = true;
    apiClient
      .get<{ returns: AdminReturn[]; counts: Record<string, number> }>('/admin/returns', { status: filter })
      .then((res) => {
        if (!alive) return;
        setRows(res.data.returns);
        setCounts(res.data.counts || {});
        setError('');
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [filter, tick, live]);

  const countFor = (id: string) =>
    id === 'ALL'
      ? Object.values(counts).reduce((a, b) => a + b, 0)
      : id === 'OPEN'
        ? (counts.REQUESTED || 0) + (counts.APPROVED || 0) + (counts.PICKED_UP || 0)
        : counts[id] || 0;

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-6 h-6 text-[#FF5400]" />
          <div>
            <h1 className="font-display font-black text-2xl uppercase tracking-tight">Returns</h1>
            <p className="text-xs text-neutral-600">Damaged, defective, wrong or missing item requests sent by customers from their order page.</p>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-9 px-3.5 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap border ${filter === f.id ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black'}`}
            >
              {f.label} <span className={filter === f.id ? 'text-white/70' : 'text-neutral-400'}>({countFor(f.id)})</span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        {!rows ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-black/10 py-14 text-center">
            <RotateCcw className="w-10 h-10 mx-auto text-black/15" />
            <p className="mt-3 font-bold">No {filter === 'ALL' ? '' : FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} requests</p>
            <p className="text-[12.5px] text-neutral-500">New requests also arrive in your email.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => <ReturnCard key={r.id + r.updatedAt} r={r} onSaved={() => setTick((t) => t + 1)} onPhoto={setPhoto} />)}
          </div>
        )}
      </div>

      {photo && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPhoto(null)} role="dialog" aria-label="Photo">
          <button type="button" onClick={() => setPhoto(null)} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          <img src={photo} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default AdminReturnsPage;
