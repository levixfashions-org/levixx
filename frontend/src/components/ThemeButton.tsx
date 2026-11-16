import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { isDarkActive, onThemeChange, setThemeMode } from '../utils/theme';

/** One-tap light / dark switch for the header. */
export const ThemeButton: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 19 }) => {
  const [dark, setDark] = useState(() => isDarkActive());
  useEffect(() => {
    const off = onThemeChange((_m, d) => setDark(d));
    return () => {
      off();
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => setThemeMode(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={className}
    >
      {dark ? <Sun style={{ width: size, height: size }} strokeWidth={1.9} /> : <Moon style={{ width: size, height: size }} strokeWidth={1.9} />}
    </button>
  );
};
