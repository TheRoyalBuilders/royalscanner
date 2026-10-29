/* Royal Scanner service worker. Har nayi upload par sirf VER badlein. */
const VER = 'royal-scanner-2026-10-29-b';
const CORE = [
  './', 'index.html', 'manifest.json', 'fb.js',
  'logo.png', 'r-mark.png', 'royal-icon.png',
  'icon-192.png', 'icon-512.png', 'icon-512-square.png',
  'icon-maskable-512.png', 'apple-icon-v2.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER).then(c =>
      Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase / Google ko haath nahi lagana

  const fresh = req.mode === 'navigate' || /\/(index\.html|fb\.js|manifest\.json)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (fresh) {
    // pehle network (nayi file), net na ho to cache
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // images waghera: pehle cache, sath sath update
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
