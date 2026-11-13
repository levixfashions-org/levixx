import React, { useEffect, useRef, useState } from 'react';

/**
 * Wraps a pill-shaped element and draws a thin black line around its edge that grows as the
 * page is scrolled down (0% at the top, full outline at the bottom) and shrinks when scrolling up.
 */
export const ScrollRing: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track the pill's size so the outline always hugs it.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // Scroll progress → how much of the outline is drawn (updated without re-rendering React).
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (rectRef.current) rectRef.current.style.strokeDashoffset = String(1 - p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size.w, size.h]);

  const sw = 2; // line thickness
  return (
    <div ref={boxRef} className={`relative ${className || ''}`}>
      {children}
      {size.w > 0 && (
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width={size.w} height={size.h} aria-hidden="true">
          <rect
            ref={rectRef}
            x={sw / 2}
            y={sw / 2}
            width={size.w - sw}
            height={size.h - sw}
            rx={(size.h - sw) / 2}
            ry={(size.h - sw) / 2}
            fill="none"
            stroke="#000"
            strokeWidth={sw}
            strokeLinecap="round"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 1, transition: 'stroke-dashoffset 80ms linear' }}
          />
        </svg>
      )}
    </div>
  );
};
