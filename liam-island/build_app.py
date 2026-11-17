"""Build the installable app version of the game.

Wraps liam-island/index.html (the page source, which has no <html>/<head>)
into a full document with home-screen app metadata, and writes the web app
manifest and an offline service worker into liam-island/app/.

Run from anywhere:  python3 liam-island/build_app.py
"""
import hashlib, json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'index.html'
OUT = HERE / 'app'
OUT.mkdir(exist_ok=True)

page = SRC.read_text(encoding='utf-8')
m = re.match(r'\s*<title>(.*?)</title>\s*', page)
title = m.group(1) if m else 'האי של ליאם'
body = page[m.end():] if m else page
_h = hashlib.sha1(page.encode('utf-8'))
for _icon in sorted(OUT.glob('icon-*.png')):
    _h.update(_icon.read_bytes())
version = _h.hexdigest()[:10]

head = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>{title}</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="{title}">
<meta name="theme-color" content="#3cbcff">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<style>[hidden]{{display:none!important}}</style>
</head>
<body>
'''
tail = '''
<script>
if('serviceWorker' in navigator){ addEventListener('load', ()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
</script>
</body>
</html>
'''
(OUT / 'index.html').write_text(head + body + tail, encoding='utf-8')

manifest = {
    'name': title,
    'short_name': title,
    'lang': 'he',
    'dir': 'rtl',
    'start_url': 'index.html',
    'scope': './',
    'display': 'fullscreen',
    'display_override': ['fullscreen', 'standalone'],
    'orientation': 'landscape',
    'background_color': '#3cbcff',
    'theme_color': '#3cbcff',
    'icons': [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
(OUT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

sw = f'''// Offline cache for the game. The cache name changes with every build, so a new version replaces the old one.
const CACHE = 'liam-island-{version}';
const CORE = ['index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fonts: cache first
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {{
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {{ c.put(req, res.clone()); return res; }}))));
    return;
  }}
  if (url.origin !== location.origin) return;
  // game files: network first so updates arrive, cache when offline
  e.respondWith(fetch(req).then(res => {{
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
  }}).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
}});
'''
(OUT / 'sw.js').write_text(sw, encoding='utf-8')
print('built', OUT, 'version', version)
