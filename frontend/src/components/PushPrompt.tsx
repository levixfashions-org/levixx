import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { enablePush, pushState, syncPushSubscription } from '../utils/push';

const DISMISS_KEY = 'levix_push_prompt_at';
const HIDE_FOR_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Friendly "Get drop alerts" card. Appears after the customer has been browsing for a bit
 * (never on checkout/admin, never on top of the install banner), and only if they haven't decided yet.
 * Also keeps this device linked to the signed-in customer so order updates reach them.
 */
export const PushPrompt: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Link this device to the customer after sign-in (only if notifications are already allowed).
  useEffect(() => {
    if (user) syncPushSubscription();
  }, [user]);

  useEffect(() => {
    if (pushState() !== 'default') return;
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < HIDE_FOR_MS) return;
    } catch {
      /* ignore */
    }
    const inApp = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      const blocked =
        /^\/(admin|checkout|order-success|login|register)/.test(window.location.pathname) ||
        document.querySelector('aside[aria-label="App installation notification"]') ||
        document.documentElement.classList.contains('lx-app') ||
        document.querySelector('.lx-intro');
      if (!blocked) {
        setShow(true);
        clearInterval(timer);
      } else if (tries > 40) clearInterval(timer);
    }, inApp ? 6000 : 15000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const turnOn = async () => {
    setBusy(true);
    const st = await enablePush();
    setBusy(false);
    if (st === 'granted') {
      setDone(true);
      setTimeout(() => setShow(false), 2200);
    } else dismiss();
  };

  if (!show || /^\/(admin|checkout)/.test(pathname)) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed z-50 bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-500"
    >
      <div className="relative overflow-hidden rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/15 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#FF5400]/25 rounded-full blur-2xl pointer-events-none" />
        <button type="button" onClick={dismiss} aria-label="Close" className="absolute top-2 right-2 z-20 w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
        <div className="relative z-10 flex items-start gap-3 pr-6">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#FF5400] flex items-center justify-center shadow-lg shadow-[#FF5400]/30">
            {done ? <Check className="w-5 h-5" /> : <Bell className="w-5 h-5 animate-[wiggle_1.2s_ease-in-out_2]" />}
          </div>
          <div className="flex-1">
            {done ? (
              <>
                <p className="font-bold text-sm uppercase tracking-tight">You're in!</p>
                <p className="text-[11.5px] text-white/70 mt-0.5">We'll ping you when new drops land.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-sm uppercase tracking-tight">Get drop alerts</p>
                <p className="text-[11.5px] text-white/70 mt-0.5 leading-relaxed">Be the first to know about new drops & offers, and get your order updates instantly.</p>
                <div className="flex items-center gap-2 pt-2.5">
                  <button type="button" onClick={turnOn} disabled={busy} className="px-4 py-2 rounded-lg bg-white text-black text-[11px] font-bold uppercase tracking-wider disabled:opacity-60">
                    {busy ? 'Turning on…' : 'Turn on'}
                  </button>
                  <button type="button" onClick={dismiss} className="px-3 py-2 text-[11px] text-white/60 hover:text-white uppercase tracking-wider font-semibold">
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
