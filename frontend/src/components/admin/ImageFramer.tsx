import React, { useEffect, useRef, useState } from 'react';
import { Move, RotateCcw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { DEFAULT_FRAME, Frame, frameStyle, parseFrame, withFrame } from '../../utils/frame';

interface Props {
  /** Image link (may already contain a saved frame). */
  value: string;
  /** Called with the same link plus the chosen frame. */
  onChange: (url: string) => void;
  /** Which shapes to preview, e.g. wide banner, tile, circle. */
  shapes?: { label: string; aspect: string; round?: boolean }[];
}

const DEFAULT_SHAPES = [
  { label: 'Banner', aspect: '2 / 1' },
  { label: 'Tile', aspect: '4 / 5' },
  { label: 'Story', aspect: '1 / 1', round: true }
];

/**
 * Zoom in / zoom out and drag to position a banner or cover photo so it looks right everywhere.
 * Drag on any preview to move the photo; use the slider or +/- to zoom.
 */
export const ImageFramer: React.FC<Props> = ({ value, onChange, shapes = DEFAULT_SHAPES }) => {
  const parsed = parseFrame(value);
  const [f, setF] = useState<Frame>(parsed.frame);
  const drag = useRef<{ x: number; y: number; f: Frame; dx: number; dy: number } | null>(null);
  const [stuck, setStuck] = useState(false);

  // Keep in sync when a different image is picked.
  useEffect(() => {
    setF(parseFrame(value).frame);
    setStuck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.src]);

  const commit = (next: Frame) => {
    setF(next);
    setStuck(false);
    onChange(withFrame(value, next));
  };
  const setZoom = (z: number) => commit({ ...f, z: Math.round(Math.min(3, Math.max(0.5, z)) * 100) / 100 });

  /**
   * How far the photo moves on screen per 1% change of the focus point, worked out from the real
   * photo size so the photo follows the finger/mouse exactly. (Photo is "cover"-fitted, then scaled
   * by z around the focus point — the same maths frameStyle() uses in the shop.)
   */
  const pxPerPercent = (box: HTMLElement, z: number) => {
    const img = box.querySelector('img') as HTMLImageElement | null;
    const W = box.clientWidth || 1;
    const H = box.clientHeight || 1;
    const nw = img?.naturalWidth || W;
    const nh = img?.naturalHeight || H;
    const s = Math.max(W / nw, H / nh);
    const ox = nw * s - W; // hidden width when cover-fitted
    const oy = nh * s - H; // hidden height when cover-fitted
    return { dx: (z * ox + (z - 1) * W) / 100, dy: (z * oy + (z - 1) * H) / 100 };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const k = pxPerPercent(e.currentTarget, f.z);
    drag.current = { x: e.clientX, y: e.clientY, f, dx: k.dx, dy: k.dy };
    setStuck(Math.abs(k.dx) < 0.05 && Math.abs(k.dy) < 0.05);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // Dragging the photo right shows more of its left side → focus moves left.
    const x = Math.abs(d.dx) < 0.05 ? d.f.x : Math.min(100, Math.max(0, d.f.x - (e.clientX - d.x) / d.dx));
    const y = Math.abs(d.dy) < 0.05 ? d.f.y : Math.min(100, Math.max(0, d.f.y - (e.clientY - d.y) / d.dy));
    setF({ ...d.f, x, y });
  };
  const onUp = () => {
    if (drag.current) onChange(withFrame(value, f));
    drag.current = null;
  };

  if (!parsed.src) return null;
  const btn = 'p-2 border border-black/20 bg-white hover:bg-black hover:text-white';

  return (
    <div className="border border-black/10 bg-neutral-50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5" /> Adjust photo
        </p>
        <p className="text-[10px] text-neutral-500">Drag a preview to move · zoom with the slider</p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: shapes.map((s) => (s.aspect === '2 / 1' ? '2fr' : '1fr')).join(' ') }}>
        {shapes.map((s) => (
          <div key={s.label} className="space-y-1">
            <div
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className={`relative overflow-hidden bg-neutral-200 cursor-grab active:cursor-grabbing touch-none select-none ${s.round ? 'rounded-full' : ''}`}
              style={{ aspectRatio: s.aspect }}
            >
              <img src={parsed.src} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={frameStyle(f)} />
            </div>
            <p className="text-[9.5px] text-center uppercase tracking-wider text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => setZoom(f.z - 0.1)} aria-label="Zoom out" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.01}
          value={f.z}
          onChange={(e) => setF({ ...f, z: +e.target.value })}
          onPointerUp={() => commit(f)}
          onKeyUp={() => commit(f)}
          className="flex-1 accent-black"
          aria-label="Zoom"
        />
        <button type="button" className={btn} onClick={() => setZoom(f.z + 0.1)} aria-label="Zoom in" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
        <span className="w-12 text-center text-[11px] font-mono font-bold">{Math.round(f.z * 100)}%</span>
        <button type="button" className={btn} onClick={() => commit({ x: 50, y: 50, z: 0.5 })} aria-label="Show whole photo" title="Show whole photo"><Maximize className="w-3.5 h-3.5" /></button>
        <button type="button" className={btn} onClick={() => commit(DEFAULT_FRAME)} aria-label="Reset" title="Reset"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>
      {stuck && (
        <p className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1.5">
          This photo already fills the frame exactly, so there is nothing to move yet. Zoom in (+) to move it around, or zoom out (−) to fit more of it.
        </p>
      )}
      <p className="text-[10px] text-neutral-500">Tip: below 100% the whole photo fits with a plain background around it. Remember to save.</p>
    </div>
  );
};
