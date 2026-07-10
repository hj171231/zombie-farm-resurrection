/* Zombie Farm Resurrection — service worker.
   Strategy:
   - index.html: network-first (so updates roll out), cache fallback (so it works offline)
   - Google Fonts CSS + woff2: stale-while-revalidate style cache-first (fonts basically never change)
   - icons/manifest: precached
   Bump VERSION on every deploy that changes cached files. */
const VERSION = 'zfr-v19';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Google Fonts (css + font files): cache-first, fill cache on first online load
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        // The fonts CSS arrives as an opaque (no-cors) response — status 0, ok=false —
        // but it's still perfectly cacheable and needed for offline text rendering.
        if (res && (res.ok || res.type === 'opaque')) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Same-origin navigations + files: network-first so a new deploy shows up
  // immediately, falling back to cache when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((hit) => hit || caches.match('./index.html'))
        )
    );
  }
});
