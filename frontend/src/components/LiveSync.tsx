import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useHomeStore } from '../store/homeStore';
import { useCartStore } from '../store/cartStore';
import { LIVE_EVENT } from '../hooks/useLiveRefresh';

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

/**
 * Keeps the shop in sync with the admin panel in real time.
 * One Server-Sent Events connection per tab; when the server says "changed", we re-fetch
 * settings, homepage/menu data, the bag (prices) and tell open pages to reload their data silently.
 * Falls back to a cheap version check when the tab comes back into view or if streaming is blocked.
 */
export const LiveSync: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let version = 0;
    let es: EventSource | null = null;
    let failures = 0;
    let pollTimer: number | undefined;
    let refreshTimer: number | undefined;
    let lastRefresh = 0;

    const refreshNow = () => {
      lastRefresh = Date.now();
      useSettingsStore.getState().fetchSettings();
      useHomeStore.getState().fetchHome(true);
      if (useCartStore.getState().cart) useCartStore.getState().fetchCart();
      window.dispatchEvent(new Event(LIVE_EVENT));
    };
    // Merge bursts; at most one refresh every 800 ms.
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      const wait = Math.max(0, 800 - (Date.now() - lastRefresh));
      refreshTimer = window.setTimeout(refreshNow, wait);
    };
    const seen = (v: number) => {
      if (!v) return;
      if (version && v !== version) refresh();
      version = v;
    };

    const checkVersion = async () => {
      try {
        const r = await fetch(`${BASE}/live/version`, { cache: 'no-store' });
        if (r.ok) seen((await r.json()).v);
      } catch {
        /* offline */
      }
    };

    const connect = () => {
      if (typeof EventSource === 'undefined') {
        pollTimer = window.setInterval(checkVersion, 15000);
        return;
      }
      es = new EventSource(`${BASE}/live`);
      const onMsg = (e: MessageEvent) => {
        failures = 0;
        try {
          seen(JSON.parse(e.data).v);
        } catch {
          /* ignore */
        }
      };
      es.addEventListener('hello', onMsg as EventListener);
      es.addEventListener('change', onMsg as EventListener);
      es.onerror = () => {
        failures += 1;
        // If the stream keeps failing (strict proxy / network), switch to light polling.
        if (failures >= 5 && es) {
          es.close();
          es = null;
          window.clearInterval(pollTimer);
          pollTimer = window.setInterval(checkVersion, 15000);
        }
      };
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };

    connect();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', checkVersion);
    return () => {
      es?.close();
      window.clearInterval(pollTimer);
      window.clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', checkVersion);
    };
  }, []);
  return null;
};
