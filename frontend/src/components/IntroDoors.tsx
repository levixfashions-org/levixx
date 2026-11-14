import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';

const SEEN_KEY = 'levix_intro_seen';

type Phase = 'closed' | 'open' | 'reveal' | 'leave' | 'done';

function shouldShow(pathname: string): boolean {
  if (typeof window === 'undefined') return false;
  if (/^\/(admin|login|register|forgot-password|checkout|order-success)/.test(pathname)) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  // Opened as the installed app: the launch screen (index.html) already played — don't show a second intro.
  if (document.documentElement.classList.contains('lx-app')) return false;
  // Installed app: never show the website's door intro (also not after a refresh) — the app has its own opening screen.
  if (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true) return false;
  if (/bot|crawler|spider|lighthouse|headless/i.test(navigator.userAgent)) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
  } catch {
    /* storage blocked — still show once per page load */
  }
  return true;
}

/**
 * Opening animation: two frosted "liquid glass" doors slowly swing open and reveal the LEVIX wordmark
 * with the tagline underneath, then the whole intro dissolves into the site.
 * Shows once per browser session; tap, click or any key skips it.
 */
export const IntroDoors: React.FC = () => {
  const { pathname } = useLocation();
  const tagline = useSettingsStore((s) => s.settings.introTagline);
  const subline = useSettingsStore((s) => s.settings.introSubline);
  const loaded = useSettingsStore((s) => s.loaded);
  // First visit: wait for your saved text (max ~1.2s) so the old default never flashes.
  const [hadCache] = useState(() => {
    try { return !!localStorage.getItem('levix_settings_cache'); } catch { return false; }
  });
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const textReady = loaded || hadCache || waited;
  const [show] = useState(() => shouldShow(pathname));
  const [phase, setPhase] = useState<Phase>('closed');
  const timers = useRef<number[]>([]);

  const finish = () => {
    timers.current.forEach(clearTimeout);
    setPhase('leave');
    timers.current = [window.setTimeout(() => setPhase('done'), 700)];
  };

  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(450, () => setPhase('open'));
    at(750, () => setPhase('reveal'));
    // Hold the text long enough to read it comfortably (tap / SKIP still closes it right away).
    at(5600, () => setPhase('leave'));
    at(6300, () => setPhase('done'));
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (phase === 'done') document.body.style.overflow = '';
  }, [phase]);

  if (!show || phase === 'done') return null;

  const opened = phase !== 'closed';
  const revealed = phase === 'reveal' || phase === 'leave';

  return (
    <div
      className={`lx-intro ${opened ? 'is-open' : ''} ${revealed ? 'is-revealed' : ''} ${phase === 'leave' ? 'is-leaving' : ''}`}
      onClick={finish}
      role="presentation"
      aria-hidden="true"
    >
      {/* Stage behind the glass: drifting light + the wordmark */}
      <div className="lx-intro-stage">
        <span className="lx-orb lx-orb-a" />
        <span className="lx-orb lx-orb-b" />
        <span className="lx-orb lx-orb-c" />
        <div className="lx-intro-copy">
          <h1 className="lx-intro-word" aria-label="LEVIX">
            {'LEVIX'.split('').map((c, i) => (
              <span key={i} style={{ transitionDelay: `${i * 70}ms` }}>
                {c}
              </span>
            ))}
          </h1>
          <span className="lx-intro-line" />
          <div style={{ opacity: textReady ? 1 : 0, transition: 'opacity .4s ease' }}>
            {tagline?.trim() && <p className="lx-intro-tag">{tagline}</p>}
            {subline?.trim() && <p className="lx-intro-sub">{subline}</p>}
          </div>
        </div>
      </div>

      {/* The two glass doors */}
      <div className="lx-door lx-door-left">
        <span className="lx-door-sheen" />
        <span className="lx-door-handle" />
      </div>
      <div className="lx-door lx-door-right">
        <span className="lx-door-sheen" />
        <span className="lx-door-handle" />
      </div>
      <span className="lx-door-seam" />

      <button
        type="button"
        className="lx-intro-skip"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
      >
        Skip
      </button>
    </div>
  );
};
