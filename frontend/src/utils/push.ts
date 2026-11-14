import { apiClient } from '../services/api';

/** Web push helpers: turn LEVIX notifications on/off for this device. */

export type PushState = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

const isIOS = () => {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
};
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export function platform(): 'android' | 'ios' | 'desktop' {
  if (isIOS()) return 'ios';
  if (/android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApis = 'serviceWorker' in navigator && 'Notification' in window;
  // iPhone/iPad only allow notifications for apps added to the Home Screen (iOS 16.4+).
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!hasApis || !('PushManager' in window)) return 'unsupported';
  return Notification.permission as PushState;
}

function keyToBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

/** Asks permission (must be called from a tap) and registers this device. */
export async function enablePush(): Promise<PushState> {
  const st = pushState();
  if (st === 'unsupported' || st === 'needs-install' || st === 'denied') return st;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm as PushState;
  await syncPushSubscription();
  return 'granted';
}

/** Makes sure the server knows this device (and which customer is signed in). Safe to call often. */
export async function syncPushSubscription(): Promise<boolean> {
  try {
    if (pushState() !== 'granted') return false;
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    const { data } = await apiClient.get<{ publicKey: string }>('/push/key');
    const want = data.publicKey;
    // Server keys changed → re-subscribe with the new key.
    if (sub) {
      const cur = sub.options?.applicationServerKey;
      if (cur) {
        const a = new Uint8Array(cur as ArrayBuffer);
        const b = keyToBytes(want);
        if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
          await sub.unsubscribe();
          sub = null;
        }
      }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(want) as BufferSource });
    await apiClient.post('/push/subscribe', { subscription: sub.toJSON(), platform: platform() });
    try {
      localStorage.setItem('levix_push_on', '1');
    } catch {
      /* ignore */
    }
    return true;
  } catch (err) {
    console.warn('Push sync failed', err);
    return false;
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await apiClient.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
      await sub.unsubscribe();
    }
  } finally {
    try {
      localStorage.removeItem('levix_push_on');
    } catch {
      /* ignore */
    }
  }
}

export async function isPushOn(): Promise<boolean> {
  try {
    if (pushState() !== 'granted') return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(await reg?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
