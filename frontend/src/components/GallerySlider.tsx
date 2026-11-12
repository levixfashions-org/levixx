import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FramedImg } from './FramedImg';
import { parseFrame } from '../utils/frame';

export interface Slide {
  id: string;
  name: string;
  href: string;
  image: string;
  mobileImage?: string | null;
}

/** Full-width banner slideshow ("discover collection"): title + SHOP NOW, dots, auto-advances. */
export const GallerySlider: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [idx, setIdx] = useState(0);
  const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;

  return (
    <section className="relative w-full h-[78vh] md:h-[90vh] max-h-[860px] overflow-hidden bg-neutral-900">
      {slides.map((s, i) => (
        <Link
          key={s.id}
          to={s.href}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          aria-hidden={i !== idx}
          tabIndex={i === idx ? 0 : -1}
        >
          <picture>
            {s.mobileImage && <source media="(max-width: 767px)" srcSet={parseFrame(s.mobileImage).src} />}
            <FramedImg src={isMobile && s.mobileImage ? s.mobileImage : s.image} alt={s.name} loading={i === 0 ? 'eager' : 'lazy'} />
          </picture>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-[11%] text-center text-white px-6">
            <h3 className="text-[22px] md:text-[26px] font-bold uppercase tracking-tight">{s.name}</h3>
            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider border-b border-white/70">Shop now</span>
          </div>
        </Link>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-[5%] inset-x-0 z-20 flex justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              aria-label={`Show ${s.name}`}
              className={`h-[6px] rounded-full transition-all ${i === idx ? 'w-[18px] bg-white' : 'w-[6px] bg-white/55'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
