// LEVIX PWA service worker
// - Pages (HTML): network-first, so customers always get the latest deployment.
// - Hashed JS/CSS in /assets: cache-first (file names change on every build).
// - API calls and payments are never cached.
const CACHE_NAME = 'levix-pwa-v4';
const PRECACHE = ['/manifest.json', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/__/')) return;

  // HTML navigations: network first, fall back to the last cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Immutable hashed build assets: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Other static files (icons, hero images): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ---------------------------------------------------------------------------------------------
// Notifications (sent from Admin → Notifications, and order updates)
// ---------------------------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'LEVIX', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'LEVIX';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    image: data.image || undefined,
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  // Only open pages on this shop.
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          return w.focus().then(() => ('navigate' in w ? w.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    })
  );
});

// The browser rotated this device's push address: re-register it with the shop.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/key')
      .then((r) => r.json())
      .then(({ publicKey }) => {
        const pad = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const raw = atob((publicKey + pad).replace(/-/g, '+').replace(/_/g, '/'));
        const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        return self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      })
      .then((sub) => fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) }))
      .catch(() => undefined)
  );
});
