import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock, Film, Loader2, PackageX, RefreshCcw, RotateCcw, Shirt, Truck, X, XCircle } from 'lucide-react';
import { apiClient, uploadReturnPhoto, uploadVideo, MAX_VIDEO_MB } from '../../services/api';
import { Order, ReturnReason, ReturnRequest, ReturnStatus } from '../../types';

const REASONS: { id: ReturnReason; title: string; sub: string; icon: React.ElementType }[] = [
  { id: 'DAMAGED', title: 'Arrived damaged', sub: 'Torn, hole, stain or damaged print', icon: PackageX },
  { id: 'DEFECTIVE', title: 'Manufacturing defect', sub: 'Faulty stitching, peeling print, broken seam', icon: AlertTriangle },
  { id: 'WRONG_ITEM', title: 'Wrong item received', sub: 'Different product, colour or size than ordered', icon: Shirt },
  { id: 'MISSING', title: 'Item missing', sub: 'Something from the order was not in the parcel', icon: X }
];
export const REASON_LABEL: Record<ReturnReason, string> = {
  DAMAGED: 'Arrived damaged',
  DEFECTIVE: 'Manufacturing defect',
  WRONG_ITEM: 'Wrong item received',
  MISSING: 'Item missing'
};
const STEPS: { id: ReturnStatus; label: string }[] = [
  { id: 'REQUESTED', label: 'Requested' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PICKED_UP', label: 'Picked up' },
  { id: 'COMPLETED', label: 'Completed' }
];

const fmtDate = (d: string | Date) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Shrinks a phone photo to max 1600px JPEG so it uploads quickly on mobile data. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob || file;
}

/** Status card for a return request the customer has already made. */
const RequestStatus: React.FC<{ r: ReturnRequest }> = ({ r }) => {
  const rejected = r.status === 'REJECTED';
  const at = STEPS.findIndex((s) => s.id === r.status);
  const done = r.status === 'COMPLETED';
  return (
    <div className={`rounded-[16px] p-4 sm:p-5 space-y-3 ${rejected ? 'bg-red-50 ring-1 ring-red-200' : done ? 'bg-green-50 ring-1 ring-green-200' : 'bg-[#fff6ef] ring-1 ring-[#ffd9bf]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#0b0b0f] flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> {r.resolution === 'REFUND' ? 'Refund' : 'Replacement'} request · {REASON_LABEL[r.reason]}
          </p>
          <p className="text-[12px] text-[#6e6e73]">Sent {fmtDate(r.createdAt)} · {r.items.map((i) => `${i.productName} (${i.size}) × ${i.quantity}`).join(', ')}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${rejected ? 'bg-red-600 text-white' : done ? 'bg-green-600 text-white' : 'bg-[#FF5400] text-white'}`}>
          {rejected ? 'Not approved' : STEPS[at]?.label || r.status}
        </span>
      </div>

      {!rejected && (
        <ol className="grid grid-cols-4 gap-1" aria-label="Request progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="space-y-1.5">
              <span className={`block h-1.5 rounded-full ${i <= at ? (done ? 'bg-green-600' : 'bg-[#FF5400]') : 'bg-black/10'}`} />
              <span className={`block text-[10.5px] sm:text-[11.5px] font-semibold ${i <= at ? 'text-[#0b0b0f]' : 'text-[#8e8e93]'}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-[12.5px] text-[#3a3a3f] leading-relaxed">
        {r.status === 'REQUESTED' && 'We have your request and will review it within 2 business days. Please keep the product unused, with tags and packaging.'}
        {r.status === 'APPROVED' && `Approved! We will arrange a pickup of the item${r.resolution === 'REPLACEMENT' ? ' and send you a fresh piece' : ' and then start your refund'}.`}
        {r.status === 'PICKED_UP' && `We have collected the item. Once it is checked we will ${r.resolution === 'REPLACEMENT' ? 'ship your replacement' : 'start your refund'}.`}
        {r.status === 'COMPLETED' && (r.resolution === 'REPLACEMENT' ? 'Your replacement has been sent.' : 'Your refund has been processed — it usually shows in 5–7 business days.')}
        {rejected && 'We reviewed your request and could not approve it.'}
      </p>
      {r.adminNote && (
        <p className="text-[12.5px] bg-white/80 rounded-[10px] px-3 py-2 text-[#0b0b0f]">
          <span className="font-semibold">Note from LEVIX:</span> {r.adminNote}
        </p>
      )}
    </div>
  );
};

interface Props {
  order: Order;
  /** Secret order key (guests). Signed-in owners don't need it. */
  accessKey?: string;
  onSubmitted: () => void;
}

/**
 * Lets a customer report a damaged / defective / wrong / missing item straight from their order,
 * with photos and an unboxing video, and then follow the request's progress.
 */
export const ReturnPanel: React.FC<Props> = ({ order, accessKey = '', onSubmitted }) => {
  const returns = order.returns || [];
  const hours = order.returnWindowHours || 48;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<{ id: string; preview: string; url?: string; error?: string }[]>([]);
  const [video, setVideo] = useState<{ name: string; progress: number; url?: string; error?: string } | null>(null);
  const [resolution, setResolution] = useState<'REPLACEMENT' | 'REFUND'>('REPLACEMENT');
  const [upi, setUpi] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cod = order.paymentMethod === 'COD';

  const deadline = order.returnDeadline ? new Date(order.returnDeadline) : null;
  const left = useMemo(() => {
    if (!deadline) return '';
    const ms = deadline.getTime() - Date.now();
    if (ms <= 0) return '';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m} min left`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.returnDeadline, open]);

  if (order.status !== 'DELIVERED' && returns.length === 0) return null;

  const uploading = photos.some((p) => !p.url && !p.error) || Boolean(video && !video.url && !video.error);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = 6 - photos.length;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    for (const f of list) {
      const id = Math.random().toString(36).slice(2);
      const preview = URL.createObjectURL(f);
      setPhotos((cur) => [...cur, { id, preview }]);
      try {
        const blob = await shrink(f);
        const url = await uploadReturnPhoto(order.orderNumber, accessKey, blob);
        setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, url } : p)));
      } catch (e: any) {
        setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, error: e?.message || 'Upload failed' } : p)));
      }
    }
  };

  const addVideo = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setVideo({ name: file.name, progress: 0, error: `This video is ${Math.round(file.size / 1048576)} MB — the limit is ${MAX_VIDEO_MB} MB. Trim it, or submit without it and send it to us on WhatsApp/email.` });
      return;
    }
    setVideo({ name: file.name, progress: 0 });
    try {
      const url = await uploadVideo(file, (p) => setVideo((v) => (v ? { ...v, progress: p } : v)), `/returns/${encodeURIComponent(order.orderNumber)}/video${accessKey ? `?key=${encodeURIComponent(accessKey)}` : ''}`);
      setVideo((v) => (v ? { ...v, url, progress: 1 } : v));
    } catch (e: any) {
      setVideo((v) => (v ? { ...v, error: e?.message || 'Upload failed' } : v));
    }
  };

  const submit = async () => {
    setError('');
    const items = Object.entries(picked).filter(([, q]) => q > 0).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
    if (!items.length) return setError('Choose the item(s) with the problem.');
    if (!reason) return setError('Tell us what is wrong.');
    if (details.trim().length < 10) return setError('Please describe the problem in a few words (at least 10 characters).');
    const done = photos.filter((p) => p.url).map((p) => p.url!);
    if (reason !== 'MISSING' && done.length === 0) return setError('Please add at least one clear photo of the problem.');
    if (resolution === 'REFUND' && cod && !upi.trim()) return setError('Please enter a UPI ID for your refund.');
    if (!confirm) return setError('Please confirm the product is unused with its tags and packaging.');
    if (uploading) return setError('Please wait for the uploads to finish.');
    setBusy(true);
    try {
      await apiClient.post(`/returns/${encodeURIComponent(order.orderNumber)}${accessKey ? `?key=${encodeURIComponent(accessKey)}` : ''}`, {
        reason,
        resolution,
        details: details.trim(),
        items,
        photos: done,
        videoUrl: video?.url || null,
        refundUpi: resolution === 'REFUND' && cod ? upi.trim() : null
      });
      setOpen(false);
      onSubmitted();
      setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    } catch (e: any) {
      setError(e?.message || 'Could not send your request — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = (id: string) => setPicked((cur) => ({ ...cur, [id]: cur[id] ? 0 : 1 }));
  const card = 'rounded-[14px] ring-1 transition-colors text-left';

  return (
    <div ref={rootRef} className="space-y-3 scroll-mt-24">
      {returns.map((r) => <RequestStatus key={r.id} r={r} />)}

      {order.canReturn && !open && (
        <div className="rounded-[16px] bg-white ring-1 ring-black/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#0b0b0f]">Received a damaged or wrong item?</p>
            <p className="text-[12.5px] text-[#6e6e73] flex items-center gap-1 flex-wrap">
              <Clock className="w-3.5 h-3.5" /> Report it within {hours} hours of delivery{deadline ? ` · until ${fmtDate(deadline)}` : ''}{left ? ` (${left})` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="lx-btn-primary h-11 px-5 text-[14px] font-semibold inline-flex items-center justify-center gap-2 shrink-0">
            <RotateCcw className="w-4 h-4" /> Return / report a problem
          </button>
        </div>
      )}

      {!order.canReturn && order.status === 'DELIVERED' && !returns.some((r) => ['REQUESTED', 'APPROVED', 'PICKED_UP'].includes(r.status)) && (
        <p className="text-[12.5px] text-[#8e8e93]">
          The {hours}-hour window to report a problem with this order has closed{deadline ? ` (${fmtDate(deadline)})` : ''}. Need help? Contact us with your order number.
        </p>
      )}

      {open && (
        <div className="rounded-[18px] bg-white ring-1 ring-black/[0.08] p-4 sm:p-6 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.01em] text-[#0b0b0f]">Return / report a problem</p>
              <p className="text-[12.5px] text-[#6e6e73]">For damaged, defective, wrong or missing items. Size / fit exchanges are not accepted.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0 hover:bg-black/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Items */}
          <section className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0b0b0f]">1. Which item has the problem?</p>
            <div className="space-y-2">
              {order.items.map((it) => {
                const q = picked[it.id] || 0;
                return (
                  <div key={it.id} className={`${card} p-2.5 flex items-center gap-3 ${q ? 'ring-[#FF5400] bg-[#fff6ef]' : 'ring-black/10 bg-white'}`}>
                    <button type="button" onClick={() => toggleItem(it.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-pressed={Boolean(q)}>
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${q ? 'bg-[#FF5400] border-[#FF5400]' : 'border-black/25'}`}>
                        {q > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <span className="w-11 h-[54px] rounded-[10px] overflow-hidden bg-black/5 shrink-0">
                        {it.imageUrl && <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-[#0b0b0f] truncate">{it.productName}</span>
                        <span className="block text-[12px] text-[#8e8e93]">Size {it.size}{it.color ? ` · ${it.color}` : ''} · Ordered {it.quantity}</span>
                      </span>
                    </button>
                    {q > 0 && it.quantity > 1 && (
                      <div className="flex items-center gap-1 shrink-0" aria-label="How many">
                        <button type="button" onClick={() => setPicked((c) => ({ ...c, [it.id]: Math.max(1, q - 1) }))} className="w-8 h-8 rounded-full bg-black/5 font-bold">−</button>
                        <span className="w-6 text-center text-[13px] font-semibold">{q}</span>
                        <button type="button" onClick={() => setPicked((c) => ({ ...c, [it.id]: Math.min(it.quantity, q + 1) }))} className="w-8 h-8 rounded-full bg-black/5 font-bold">+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Reason */}
          <section className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0b0b0f]">2. What is wrong?</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {REASONS.map((r) => {
                const on = reason === r.id;
                const Icon = r.icon;
                return (
                  <button key={r.id} type="button" onClick={() => setReason(r.id)} aria-pressed={on} className={`${card} p-3 flex items-start gap-3 ${on ? 'ring-2 ring-[#FF5400] bg-[#fff6ef]' : 'ring-black/10 bg-white hover:ring-black/25'}`}>
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-[#FF5400]' : 'text-[#6e6e73]'}`} />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-[#0b0b0f]">{r.title}</span>
                      <span className="block text-[12px] text-[#6e6e73]">{r.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Details */}
          <section className="space-y-2">
            <label htmlFor={`rd-${order.id}`} className="text-[13px] font-semibold text-[#0b0b0f] block">3. Describe the problem</label>
            <textarea
              id={`rd-${order.id}`}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. There is a small hole near the left sleeve and the print is cracked on the back."
              className="w-full rounded-[12px] ring-1 ring-black/10 focus:ring-2 focus:ring-[#FF5400] outline-none px-3 py-2.5 text-[14px] bg-white resize-y"
            />
          </section>

          {/* 4. Photos */}
          <section className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0b0b0f]">4. Photos {reason === 'MISSING' ? <span className="font-normal text-[#8e8e93]">(of the parcel and what you received)</span> : <span className="font-normal text-[#8e8e93]">(required · up to 6)</span>}</p>
            <p className="text-[12px] text-[#6e6e73]">Show the problem clearly, the full product, and the size label.</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative w-[78px] h-[96px] rounded-[12px] overflow-hidden bg-black/5 ring-1 ring-black/10">
                  <img src={p.preview} alt="" className={`w-full h-full object-cover ${p.url ? '' : 'opacity-50'}`} />
                  {!p.url && !p.error && <Loader2 className="absolute inset-0 m-auto w-5 h-5 animate-spin text-[#0b0b0f]" />}
                  {p.error && <span className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[9px] font-semibold p-1 leading-tight">{p.error}</span>}
                  <button type="button" onClick={() => setPhotos((c) => c.filter((x) => x.id !== p.id))} aria-label="Remove photo" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <button type="button" onClick={() => photoInput.current?.click()} className="w-[78px] h-[96px] rounded-[12px] border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[#3a3a3f] hover:border-[#FF5400] hover:text-[#FF5400]">
                  <Camera className="w-5 h-5" /> Add photo
                </button>
              )}
              <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
            </div>
          </section>

          {/* 5. Video */}
          <section className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0b0b0f]">5. Unboxing video <span className="font-normal text-[#8e8e93]">(strongly recommended · max {MAX_VIDEO_MB} MB)</span></p>
            <p className="text-[12px] text-[#6e6e73]">A continuous video starting from the sealed parcel with its shipping label helps us approve your request quickly.</p>
            {video ? (
              <div className={`rounded-[12px] ring-1 px-3 py-2.5 flex items-center gap-3 ${video.error ? 'ring-red-200 bg-red-50' : 'ring-black/10 bg-white'}`}>
                <Film className="w-5 h-5 shrink-0 text-[#6e6e73]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{video.name}</p>
                  {video.error ? (
                    <p className="text-[12px] text-red-700">{video.error}</p>
                  ) : video.url ? (
                    <p className="text-[12px] text-green-700 font-semibold">Uploaded</p>
                  ) : (
                    <div className="h-1.5 rounded-full bg-black/10 mt-1.5 overflow-hidden"><div className="h-full bg-[#FF5400] transition-all" style={{ width: `${Math.round(video.progress * 100)}%` }} /></div>
                  )}
                </div>
                <button type="button" onClick={() => setVideo(null)} aria-label="Remove video" className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => videoInput.current?.click()} className="h-11 px-4 rounded-[12px] border-2 border-dashed border-black/20 inline-flex items-center gap-2 text-[13px] font-semibold text-[#3a3a3f] hover:border-[#FF5400] hover:text-[#FF5400]">
                <Film className="w-4 h-4" /> Add unboxing video
              </button>
            )}
            <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => { addVideo(e.target.files?.[0]); e.target.value = ''; }} />
          </section>

          {/* 6. Resolution */}
          <section className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0b0b0f]">6. What would you like?</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'REPLACEMENT', title: 'Replacement', sub: 'A fresh piece of the same item', icon: RefreshCcw },
                { id: 'REFUND', title: 'Refund', sub: cod ? 'Sent to your UPI ID' : 'Back to your original payment', icon: Truck }
              ] as const).map((o) => {
                const on = resolution === o.id;
                const Icon = o.icon;
                return (
                  <button key={o.id} type="button" onClick={() => setResolution(o.id)} aria-pressed={on} className={`${card} p-3 flex items-start gap-2.5 ${on ? 'ring-2 ring-[#FF5400] bg-[#fff6ef]' : 'ring-black/10 bg-white hover:ring-black/25'}`}>
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-[#FF5400]' : 'text-[#6e6e73]'}`} />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-[#0b0b0f]">{o.title}</span>
                      <span className="block text-[12px] text-[#6e6e73]">{o.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {resolution === 'REPLACEMENT' && <p className="text-[12px] text-[#6e6e73]">If the same item is out of stock, we refund you in full instead.</p>}
            {resolution === 'REFUND' && cod && (
              <div className="space-y-1">
                <label htmlFor={`upi-${order.id}`} className="text-[12.5px] font-semibold text-[#3a3a3f]">UPI ID for the refund</label>
                <input id={`upi-${order.id}`} value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" maxLength={80} className="w-full h-11 rounded-[12px] ring-1 ring-black/10 focus:ring-2 focus:ring-[#FF5400] outline-none px-3 text-[14px]" />
              </div>
            )}
          </section>

          <label className="flex items-start gap-2.5 text-[12.5px] text-[#3a3a3f] cursor-pointer">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#FF5400]" />
            The product is unused, unwashed, with its tags and original packaging, and I will keep it that way until the request is resolved.
          </label>

          {error && <p role="alert" className="text-[13px] font-medium text-red-700 bg-red-50 rounded-[10px] px-3 py-2 flex items-center gap-2"><XCircle className="w-4 h-4 shrink-0" /> {error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="lx-btn-soft h-12 px-6 text-[14px] font-semibold">Cancel</button>
            <button type="button" onClick={submit} disabled={busy || uploading} className="lx-btn-primary h-12 px-7 text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnPanel;
