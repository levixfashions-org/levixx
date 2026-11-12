import type React from 'react';
/**
 * Image framing (zoom + position) chosen in the admin, stored right inside the image link as
 * "#lx=X,Y,Z" (X/Y = focus point in %, Z = zoom). Browsers ignore the "#…" part when loading,
 * so the same link works everywhere and the framing travels with it.
 */
export interface Frame {
  x: number; // 0–100, horizontal focus
  y: number; // 0–100, vertical focus
  z: number; // zoom, 0.5–3 (1 = fill the frame)
}

export const DEFAULT_FRAME: Frame = { x: 50, y: 50, z: 1 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function parseFrame(url?: string | null): { src: string; frame: Frame; framed: boolean } {
  const raw = url || '';
  const m = raw.match(/#lx=([\d.]+),([\d.]+),([\d.]+)$/);
  if (!m) return { src: raw, frame: DEFAULT_FRAME, framed: false };
  return {
    src: raw.slice(0, m.index),
    frame: { x: clamp(+m[1], 0, 100), y: clamp(+m[2], 0, 100), z: clamp(+m[3], 0.5, 3) },
    framed: true
  };
}

export function withFrame(url: string, f: Frame): string {
  const { src } = parseFrame(url);
  if (!src) return '';
  const same = Math.abs(f.x - 50) < 0.5 && Math.abs(f.y - 50) < 0.5 && Math.abs(f.z - 1) < 0.01;
  return same ? src : `${src}#lx=${f.x.toFixed(1)},${f.y.toFixed(1)},${f.z.toFixed(2)}`;
}

/** Inline styles that apply a frame to an <img> filling its box. */
export function frameStyle(f: Frame): React.CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: `${f.x}% ${f.y}%`,
    transform: f.z !== 1 ? `scale(${f.z})` : undefined,
    transformOrigin: `${f.x}% ${f.y}%`
  };
}
