import React from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

/** "Home › Men › Overlength T-Shirts" — quick way back up from any page. */
export const Breadcrumbs: React.FC<{ items: Crumb[]; className?: string }> = ({ items, className = '' }) => (
  <nav aria-label="Breadcrumb" className={`text-[12.5px] ${className}`}>
    <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[#8e8e93]">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-[#0b0b0f] transition-colors whitespace-nowrap">
                {c.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[60vw] sm:max-w-none ${last ? 'text-[#3a3a3f] font-medium' : ''}`} aria-current={last ? 'page' : undefined}>
                {c.label}
              </span>
            )}
            {!last && (
              <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
