/* Royal Scanner service worker. Har nayi upload par sirf VER badlein. */
const VER = 'royal-scanner-2026-10-29-d';
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
      .then(keys => Promise.all(keys.filter(k => k !== VER && k !== 'royal-share' && k !== 'royal-libs').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // WhatsApp wagera se "Share" ki hui PDF: cache mein rakh kar app kholo
  if (req.method === 'POST' && url.origin === self.location.origin && url.searchParams.has('share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const f = fd.get('pdf');
        if (f && f.size !== undefined) {
          const c = await caches.open('royal-share');
          await c.put('shared-pdf', new Response(f, { headers: { 'Content-Type': 'application/pdf', 'X-Name': encodeURIComponent(f.name || 'shared.pdf') } }));
        }
      } catch (err) {}
      return Response.redirect(new URL('index.html?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  // PDF viewer ki library ek baar cache ho jaye to offline bhi chale
  if (url.origin !== self.location.origin) {
    if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@3\.11\.174\//.test(req.url)) {
      e.respondWith(caches.open('royal-libs').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    }
    return; // Firebase / Google ko haath nahi lagana
  }

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
