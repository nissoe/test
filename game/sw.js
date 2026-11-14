// Offline support: the game shell is cached; photos are cached as they are seen.
const SHELL='terr-shell-v7', IMGS='terr-img-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(['./','./index.html','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png','./manifest.webmanifest'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==IMGS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.hostname==='upload.wikimedia.org'){
    e.respondWith(caches.open(IMGS).then(async c=>{const hit=await c.match(e.request); if(hit) return hit; try{const r=await fetch(e.request); if(r.ok||r.type==='opaque'){c.put(e.request,r.clone()); trim(c);} return r;}catch(err){return hit||Response.error()}}));
    return;
  }
  if(u.origin===location.origin){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone(); caches.open(SHELL).then(c=>c.put(e.request,cp)); return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  }
});
async function trim(c){const ks=await c.keys(); if(ks.length>400) for(const k of ks.slice(0,ks.length-400)) await c.delete(k);}
