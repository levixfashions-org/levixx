/** Light / dark / automatic (follow the phone) theme for the storefront. */
export type ThemeMode = 'light' | 'dark' | 'auto';
const KEY = 'lx_theme';
const listeners = new Set<(m: ThemeMode, dark: boolean) => void>();

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* storage blocked */
  }
  return 'auto';
}

const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
export const isDarkActive = (mode: ThemeMode = getThemeMode()) => mode === 'dark' || (mode === 'auto' && systemDark());

export function applyTheme(mode: ThemeMode = getThemeMode()) {
  const dark = isDarkActive(mode);
  document.documentElement.classList.toggle('lx-dark', dark);
  listeners.forEach((fn) => fn(mode, dark));
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  // Smooth colour change, without animating every element on normal page loads.
  const root = document.documentElement;
  root.classList.add('lx-theme-switching');
  applyTheme(mode);
  window.setTimeout(() => root.classList.remove('lx-theme-switching'), 450);
}

export function onThemeChange(fn: (m: ThemeMode, dark: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let started = false;
/** Follow the phone's light/dark setting live while in "auto". */
export function startThemeWatcher() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const on = () => getThemeMode() === 'auto' && applyTheme('auto');
  if (mq?.addEventListener) mq.addEventListener('change', on);
  else if ((mq as any)?.addListener) (mq as any).addListener(on); // iOS 13 and older
  window.addEventListener('storage', (e) => e.key === KEY && applyTheme());
  applyTheme();
}
