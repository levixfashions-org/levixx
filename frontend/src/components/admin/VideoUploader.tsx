import React, { useRef, useState } from 'react';
import { Film, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import { MAX_VIDEO_MB, uploadVideo } from '../../services/api';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  /** 'landscape' (16:9) or 'portrait' (9:16) — only changes the preview shape. */
  shape?: 'landscape' | 'portrait';
}

const ACCEPT = ['video/mp4', 'video/webm', 'video/quicktime'];

/** Drag & drop (or pick) a video; it uploads in pieces with a progress bar and shows a live preview. */
export const VideoUploader: React.FC<Props> = ({ value, onChange, label, hint, shape = 'landscape' }) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const start = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type) && !/\.(mp4|mov|webm)$/i.test(file.name)) {
      setError('Please choose an MP4, MOV or WEBM video.');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`This video is ${(file.size / 1048576).toFixed(0)} MB. Please keep it under ${MAX_VIDEO_MB} MB (export at 1080p, 10–20 seconds).`);
      return;
    }
    setName(file.name);
    setProgress(0);
    try {
      const url = await uploadVideo(file, (f) => setProgress(f));
      onChange(url);
    } catch (e: any) {
      setError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const box = shape === 'portrait' ? 'aspect-[9/16] max-h-[380px]' : 'aspect-video';

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">{label}</label>
      {value && !busy ? (
        <div className="space-y-2">
          <div className={`relative ${box} mx-auto bg-black overflow-hidden border border-black/10`}>
            <video key={value} src={value} className="w-full h-full object-cover" muted loop autoPlay playsInline controls />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-black/20 text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-50">
              <UploadCloud className="w-3.5 h-3.5" /> Replace video
            </button>
            <button type="button" onClick={() => onChange('')} className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (!busy) start(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 text-center px-4 py-8 border-2 border-dashed cursor-pointer transition-colors ${
            over ? 'border-black bg-neutral-100' : 'border-black/20 hover:border-black/50 bg-neutral-50'
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs font-semibold truncate max-w-full">Uploading {name}…</p>
              <div className="w-full max-w-xs h-2 bg-neutral-200 overflow-hidden">
                <div className="h-full bg-black transition-all" style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-neutral-500">{Math.round((progress || 0) * 100)}% — keep this page open</p>
            </>
          ) : (
            <>
              <Film className="w-6 h-6 text-neutral-500" />
              <p className="text-xs font-semibold">Drag a video here or click to choose</p>
              <p className="text-[11px] text-neutral-500">MP4, MOV or WEBM · up to {MAX_VIDEO_MB} MB</p>
            </>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
        className="hidden"
        onChange={(e) => {
          start(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="text-[11px] text-red-600 mt-1.5">{error}</p>}
      {hint && <p className="text-[10.5px] text-neutral-500 mt-1.5">{hint}</p>}
    </div>
  );
};
