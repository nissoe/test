"""אורז את בניית הווב של Expo לדף מפורסם: קובץ JS אחד ופונטים בנתיבים יחסיים ושטוחים."""
import glob, os, re, shutil, sys

dist, out = sys.argv[1], sys.argv[2]
shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, 'fonts'))
js_path = glob.glob(os.path.join(dist, '_expo/static/js/web/*.js'))[0]
js = open(js_path, encoding='utf-8').read()
for f in glob.glob(os.path.join(dist, 'assets/**/*.ttf'), recursive=True):
    rel = '/' + os.path.relpath(f, dist).replace(os.sep, '/')
    name = re.sub(r'\.[0-9a-f]{32}\.ttf$', '.ttf', os.path.basename(f))
    shutil.copy(f, os.path.join(out, 'fonts', name))
    assert rel in js, rel
    js = js.replace(rel, 'fonts/' + name)
open(os.path.join(out, 'app.js'), 'w', encoding='utf-8').write(js)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write('''<title>LWF GM</title>
<style>
  /* מראה אחד, כהה בכוונה: מסך שידור של משחק */
  :root { --bg: #06070B; color-scheme: dark; }
  html, body { height: 100%; margin: 0; background: var(--bg); overflow: hidden; overscroll-behavior: none; }
  body { overflow: hidden; }
  /* המשחק ממלא את כל המסך; את השוליים של המגרעת והפס התחתון הוא מטפל בעצמו */
  #root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; }
</style>
<noscript>You need to enable JavaScript to run this app.</noscript>
<div id="root"></div>
<script src="app.js" defer></script>
''')
print(sorted(os.listdir(os.path.join(out, 'fonts'))))
