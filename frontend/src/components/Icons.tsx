import React from 'react';

type P = { className?: string; filled?: boolean };

export const BookmarkIcon: React.FC<P> = ({ className = 'w-4 h-4', filled }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} aria-hidden="true">
    <path d="M6 2.75h12a.75.75 0 0 1 .75.75v18.1a.4.4 0 0 1-.64.32L12 17.5l-6.11 4.42a.4.4 0 0 1-.64-.32V3.5A.75.75 0 0 1 6 2.75Z" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon: React.FC<P> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.75" />
    <path d="m15.5 15.5 5.25 5.25" strokeLinecap="round" />
  </svg>
);

export const UserIcon: React.FC<P> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="7.5" r="4.25" />
    <path d="M3.75 20.5c.6-4.1 4-6.75 8.25-6.75s7.65 2.65 8.25 6.75a.6.6 0 0 1-.6.7H4.35a.6.6 0 0 1-.6-.7Z" />
  </svg>
);

export const BagIcon: React.FC<P & { count?: number }> = ({ className = 'w-[18px] h-[22px]', count = 0 }) => (
  <span className="relative inline-flex">
    <svg viewBox="0 0 20 24" className={className} aria-hidden="true">
      <rect x="1" y="4.5" width="18" height="18.5" rx="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 7V4.5a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="10" y="15.5" textAnchor="middle" fontSize="3.4" fontWeight="900" fill="currentColor" fontFamily="Archivo Black, sans-serif">LEVIX</text>
    </svg>
    {count > 0 && (
      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-black text-white text-[9px] font-semibold flex items-center justify-center">
        {count > 99 ? '99+' : count}
      </span>
    )}
  </span>
);

export const MenuIcon: React.FC<P> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <path d="M5 9h14M5 15h14" />
  </svg>
);

export const CloseIcon: React.FC<P> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const PlusIcon: React.FC<P> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ArrowUpRight: React.FC<P> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ChevronIcon: React.FC<P & { dir?: 'left' | 'right' }> = ({ className = 'w-4 h-4', dir = 'right' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    {dir === 'right' ? <path d="m9 5 7 7-7 7" /> : <path d="m15 5-7 7 7 7" />}
  </svg>
);

export const FilterIcon: React.FC<P> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
    <path d="M3 8h11M18 8h3M3 16h3M10 16h11" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="8" cy="16" r="2" />
  </svg>
);
