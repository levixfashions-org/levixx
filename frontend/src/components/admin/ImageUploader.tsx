import React, { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { uploadImage } from '../../services/api';

const MAX_SIDE = 1800;

/** Resizes big photos and converts them to WebP/JPEG in the browser so uploads are fast and pages load quickly. */
async function compress(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.type === 'image/gif') return { blob: file, width: 0, height: 0 };
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, width: 0, height: 0 };
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: file, width: bitmap.width, height: bitmap.height };
  ctx.drawImage(bitmap, 0, 0, width, height);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await toBlob('image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.86);
  if (!blob) return { blob: file, width: bitmap.width, height: bitmap.height };
  // Keep the original if it was already smaller (e.g. an optimised JPEG).
  return blob.size < file.size || file.size > 8 * 1024 * 1024 ? { blob, width, height } : { blob: file, width: bitmap.width, height: bitmap.height };
}

interface Pending {
  id: string;
  preview: string;
  name: string;
  error?: string;
}

interface Props {
  /** Image URLs in display order (first = cover). */
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** Single-image mode (banners, hero). */
  single?: boolean;
  label?: string;
  hint?: string;
  compact?: boolean;
}

export const ImageUploader: React.FC<Props> = ({ value, onChange, max = 12, single = false, label, hint, compact }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const limit = single ? 1 : max;
  const room = Math.max(0, limit - value.length - pending.length);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    const take = single ? list.slice(0, 1) : list.slice(0, Math.max(room, 0));
    if (!take.length) return;
    const jobs = take.map((f) => ({ file: f, p: { id: Math.random().toString(36).slice(2), preview: URL.createObjectURL(f), name: f.name } as Pending }));
    setPending((cur) => [...cur, ...jobs.map((j) => j.p)]);

    for (const { file, p } of jobs) {
      try {
        const { blob, width, height } = await compress(file);
        const url = await uploadImage(blob, { width, height, fileName: file.name });
        onChange(single ? [url] : [...valueRef.current, url]);
        setPending((cur) => cur.filter((x) => x.id !== p.id));
        URL.revokeObjectURL(p.preview);
      } catch (err: any) {
        setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, error: err.message || 'Upload failed' } : x)));
      }
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setLinkError('Link must start with https://');
      return;
    }
    setLinkError(null);
    onChange(single ? [url] : [...value, url].slice(0, limit));
    setLink('');
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {label && <p className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">{label}</p>}

      {(value.length > 0 || pending.length > 0) && (
        <div className={`grid gap-2 ${single ? 'grid-cols-1' : compact ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5'}`}>
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable={!single}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className={`relative group bg-neutral-100 border border-black/10 overflow-hidden ${single ? 'aspect-[16/7]' : 'aspect-[4/5]'} ${!single ? 'cursor-grab active:cursor-grabbing' : ''} ${dragIndex === i ? 'opacity-40' : ''}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              {!single && i === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black text-white text-[9px] font-bold uppercase">Cover</span>}
              <button type="button" onClick={() => onChange(value.filter((_, x) => x !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-red-50 hover:text-red-600" aria-label="Remove image">
                <X className="w-3.5 h-3.5" />
              </button>
              {!single && value.length > 1 && (
                <div className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100 transition-opacity">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-0" aria-label="Move left"><ArrowLeft className="w-3 h-3" /></button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-0" aria-label="Move right"><ArrowRight className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className={`relative bg-neutral-100 border border-black/10 overflow-hidden ${single ? 'aspect-[16/7]' : 'aspect-[4/5]'}`}>
              <img src={p.preview} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-semibold text-center p-1">
                {p.error ? (
                  <>
                    <span className="text-red-700 bg-white/90 px-1">{p.error}</span>
                    <button type="button" onClick={() => setPending((cur) => cur.filter((x) => x.id !== p.id))} className="mt-1 underline bg-white/90 px-1">Dismiss</button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(single || room > 0) && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          className={`border-2 border-dashed ${compact ? 'p-3' : 'p-5'} text-center cursor-pointer transition-colors ${
            dragOver ? 'border-black bg-neutral-100' : 'border-black/20 hover:border-black/50 bg-white'
          }`}
        >
          <ImagePlus className="w-5 h-5 mx-auto text-neutral-500" />
          <p className="text-[12px] font-semibold mt-1">
            {single && value.length ? 'Replace image' : 'Drag & drop photos here'} <span className="font-normal text-neutral-500">or click to choose from your computer</span>
          </p>
          <p className="text-[10.5px] text-neutral-500 mt-0.5">
            {hint || (single ? 'JPG, PNG or WEBP. Large photos are resized automatically.' : `JPG, PNG or WEBP — up to ${limit} photos. Drag thumbnails to reorder; the first one is the cover.`)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={!single}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="…or paste an image link (e.g. from Hostinger)"
            className="w-full border border-black/15 pl-8 pr-2 py-2 text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>
        <button type="button" onClick={addLink} className="px-3 text-[11px] font-bold uppercase border border-black/20 hover:bg-black hover:text-white">Add</button>
      </div>
      {linkError && <p className="text-[11px] text-red-600">{linkError}</p>}
    </div>
  );
};
