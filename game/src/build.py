# Builds app.html (Claude artifact) and index.html (installable web app) from src/.
import json,os,re
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.dirname(here)
ui=open(os.path.join(here,'ui.html'),encoding='utf8').read()
data=open(os.path.join(here,'data.js'),encoding='utf8').read()
cred_path=os.path.join(here,'credits.json')
cred=json.load(open(cred_path,encoding='utf8')) if os.path.exists(cred_path) else {}
data+='\nconst CREDITS='+json.dumps(cred,ensure_ascii=False,separators=(',',':'))+';\n'
page=ui.replace('/*__DATA__*/',data)
open(os.path.join(root,'app.html'),'w',encoding='utf8').write(page)
head=('<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8">'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg" type="image/svg+xml">'
 '<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png"><meta name="apple-mobile-web-app-title" content="טריטוריה"><meta name="apple-mobile-web-app-capable" content="yes">'
 '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
 '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
 '</head><body>\n')
open(os.path.join(root,'index.html'),'w',encoding='utf8').write(head+page+'\n</body></html>\n')
print('built',len(page))
