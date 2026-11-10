import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHomeStore } from '../store/homeStore';
import { COLOR_SWATCHES } from '../services/api';

const GROUPS: { key: string; label: string }[] = [
  { key: 'TOP', label: 'Top' },
  { key: 'BOTTOM', label: 'Bottom' },
  { key: 'ACCESSORIES', label: 'Accessories' }
];

export const colorLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export const Chip: React.FC<{ to: string; children: React.ReactNode; onClick?: () => void }> = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/10 text-[10.5px] hover:border-black transition-colors whitespace-nowrap"
  >
    {children}
  </Link>
);

export const MegaMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, fetchHome } = useHomeStore();
  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const collections = data?.menu.collections || [];
  const categories = data?.menu.categories || [];
  const colors = data?.menu.colors || [];

  return (
    <div className="lx-drop-in absolute left-0 right-0 top-16 bg-white rounded-b-[22px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] px-[22px] pt-4 pb-8">
      <div className="grid grid-cols-12 gap-6 text-black">
        <div className="col-span-3 space-y-2.5">
          <Link to="/collections/new-in" onClick={onClose} className="block text-[12px] font-semibold hover:opacity-60">New Arrivals</Link>
          <Link to="/collections/all-products" onClick={onClose} className="block text-[12px] font-semibold hover:opacity-60">All Products</Link>
          {collections.map((c) => (
            <Link key={c.id} to={`/collections/${c.slug}`} onClick={onClose} className="block text-[12px] font-semibold hover:opacity-60">
              {c.name}
            </Link>
          ))}
        </div>

        {GROUPS.map((g) => {
          const items = categories.filter((c) => (c.group || 'TOP') === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} className="col-span-2">
              <p className="text-[11px] font-semibold mb-2.5">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((c) => (
                  <Chip key={c.id} to={`/collections/${c.slug}`} onClick={onClose}>{c.name}</Chip>
                ))}
              </div>
            </div>
          );
        })}

        {colors.length > 0 && (
          <div className="col-span-3">
            <p className="text-[11px] font-semibold mb-2.5">Shop by colour</p>
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <Chip key={c} to={`/collections/all-products?color=${c}`} onClick={onClose}>
                  <span>{c}</span>
                  <span className="w-6 h-2 rounded-full" style={{ background: COLOR_SWATCHES[c] || '#ccc' }} />
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
