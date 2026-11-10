import React from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Optional scrolling announcement strip (Admin → Settings). Hidden unless enabled. */
export const AnnouncementBar: React.FC = () => {
  const enabled = useSettingsStore((s) => s.settings.announcementEnabled);
  const text = useSettingsStore((s) => (s.settings.announcementText || '').trim());
  if (!enabled || !text) return null;
  const displayText = text.replace(/[•\s]+$/, '') + ' • ';
  return (
    <div className="fixed top-0 inset-x-0 z-[55] h-8 bg-black text-white text-[10.5px] uppercase tracking-widest overflow-hidden flex items-center select-none">
      <div className="animate-marquee whitespace-nowrap flex items-center">
        <span>{displayText}</span>
        <span>{displayText}</span>
        <span>{displayText}</span>
        <span>{displayText}</span>
      </div>
    </div>
  );
};
