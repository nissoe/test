const CACHE='samurai-v8';
const FILES=["./", "index.html", "privacy.html", "manifest.webmanifest", "three.module.min.js", "fonts.css", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/maskable-512.png", "fonts/fredoka-hebrew-400-normal.woff2", "fonts/fredoka-hebrew-500-normal.woff2", "fonts/fredoka-hebrew-600-normal.woff2", "fonts/fredoka-hebrew-700-normal.woff2", "fonts/fredoka-latin-400-normal.woff2", "fonts/fredoka-latin-500-normal.woff2", "fonts/fredoka-latin-600-normal.woff2", "fonts/fredoka-latin-700-normal.woff2", "fonts/gveret-levin-hebrew-400-normal.woff2", "fonts/gveret-levin-latin-400-normal.woff2", "fonts/suez-one-hebrew-400-normal.woff2", "fonts/suez-one-latin-400-normal.woff2"];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res; }).catch(()=>caches.match('index.html'))));
});
