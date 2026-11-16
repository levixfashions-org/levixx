import React, { useEffect, useState } from 'react';
import { Sun, Moon, Smartphone } from 'lucide-react';
import { ThemeMode, getThemeMode, onThemeChange, setThemeMode } from '../utils/theme';

const OPTIONS: { mode: ThemeMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'auto', label: 'Auto', Icon: Smartphone }
];

/** Light · Dark · Auto (follows the phone) switch. */
export const ThemeToggle: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact }) => {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  useEffect(() => {
    const off = onThemeChange((m) => setMode(m));
    return () => {
      off();
    };
  }, []);
  return (
    <div role="radiogroup" aria-label="Appearance" className={`lx-segment inline-flex p-1 rounded-full ${className}`}>
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => {
            setThemeMode(m);
            setMode(m);
          }}
          className={`lx-seg-item inline-flex items-center justify-center gap-1.5 rounded-full ${compact ? 'h-8 px-3 text-[12px]' : 'h-9 px-3.5 text-[13px]'} font-medium ${mode === m ? 'is-active' : ''}`}
        >
          <Icon className="w-[15px] h-[15px]" />
          {label}
        </button>
      ))}
    </div>
  );
};
