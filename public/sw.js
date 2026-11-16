// Offline cache: network-first for navigation, cache-first for built assets.
const CACHE = 'twinlock-v2';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => {
        if (res.ok && new URL(req.url).origin === location.origin) c.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return req.mode === 'navigate' ? net : hit || net;
    }),
  );
});
