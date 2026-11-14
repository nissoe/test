# Generates src/icon-art.svg: an isometric 3D board of raised territories + the title.
import colorsys
N=4; A=72; B=41.5; HZ=118; CX=512; CY=318
terr={ # cells -> (color, height)
 'A':([(0,0),(0,1),(1,0),(1,1),(2,1)],'#ff6a3d',1.0),
 'B':([(0,2),(0,3),(1,3)],'#2f8fe0',.55),
 'C':([(1,2),(2,2),(2,3)],'#2fca7a',.38),
 'D':([(2,0),(3,0),(3,1)],'#9b5de5',.5),
 'E':([(3,2),(3,3)],'#ffb547',.3),
}
owner={}; 
for k,(cells,col,h) in terr.items():
    for c in cells: owner[c]=k
P=lambda x,y,z:(CX+(x-y)*A, CY+(x+y)*B-z*HZ)
def shade(hexc,f):
    r,g,b=[int(hexc[i:i+2],16)/255 for i in (1,3,5)]
    h,l,s=colorsys.rgb_to_hls(r,g,b); r,g,b=colorsys.hls_to_rgb(h,max(0,min(1,l*f)),s)
    return '#%02x%02x%02x'%(int(r*255),int(g*255),int(b*255))
poly=lambda pts,fill,extra='':'<path d="M%s Z" fill="%s"%s/>'%(' L'.join('%.1f %.1f'%p for p in pts),fill,extra)
out=[]
# base slab
z0=-.22
out.append(poly([P(0,N,0),P(N,N,0),P(N,N,z0),P(0,N,z0)],'#0d1630'))
out.append(poly([P(N,0,0),P(N,N,0),P(N,N,z0),P(N,0,z0)],'#0a1124'))
out.append(poly([P(0,0,0),P(N,0,0),P(N,N,0),P(0,N,0)],'#0b1324'))
H=lambda r,c: terr[owner[(r,c)]][2] if (r,c) in owner else 0
cells=sorted(owner,key=lambda rc:(rc[0]+rc[1],rc[1]))
for (r,c) in cells:
    k=owner[(r,c)]; col=terr[k][1]; h=terr[k][2]
    # face toward +y (screen lower-left) and +x (screen lower-right), only where the neighbour is lower
    if H(r+1,c)<h or (r+1,c) not in owner:
        lo=H(r+1,c) if owner.get((r+1,c))!=k else h
        out.append(poly([P(c,r+1,h),P(c+1,r+1,h),P(c+1,r+1,lo),P(c,r+1,lo)],shade(col,.62)))
    if H(r,c+1)<h or (r,c+1) not in owner:
        lo=H(r,c+1) if owner.get((r,c+1))!=k else h
        out.append(poly([P(c+1,r,h),P(c+1,r+1,h),P(c+1,r+1,lo),P(c+1,r,lo)],shade(col,.45)))
    out.append(poly([P(c,r,h),P(c+1,r,h),P(c+1,r+1,h),P(c,r+1,h)],col,' stroke="%s" stroke-width="3" stroke-linejoin="round"'%col))
# territory outlines on top faces (only where the neighbour belongs to someone else)
edges=[]
for (r,c),k in owner.items():
    h=terr[k][2]
    for dr,dc,a,b in [(-1,0,(c,r),(c+1,r)),(1,0,(c,r+1),(c+1,r+1)),(0,-1,(c,r),(c,r+1)),(0,1,(c+1,r),(c+1,r+1))]:
        if owner.get((r+dr,c+dc))!=k:
            p1=P(a[0],a[1],h); p2=P(b[0],b[1],h); edges.append((k,'M%.1f %.1fL%.1f %.1f'%(p1+p2)))
hi=''.join(d for k,d in edges if k=='A'); rest=''.join(d for k,d in edges if k!='A')
board='\n'.join(out)
top_gloss='<path d="M%s Z" fill="url(#topgloss)"/>'%' L'.join('%.1f %.1f'%P(x,y,1.0) for x,y in [(0,0),(2,0),(2,2),(1,2),(1,3)][:0] or [(0,0),(2,0),(2,2),(0,2)])
cx,cy=P(1.1,1.1,1.0)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="32%" r="80%"><stop offset="0" stop-color="#22386a"/><stop offset=".55" stop-color="#111c36"/><stop offset="1" stop-color="#080d1a"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset=".6" stop-color="#ff8a3d" stop-opacity=".12"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff1c9" stop-opacity=".75"/><stop offset=".5" stop-color="#ffcf7a" stop-opacity=".25"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></linearGradient>
    <linearGradient id="topgloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="titlegrad" gradientUnits="userSpaceOnUse" x1="0" y1="700" x2="0" y2="850"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#ffe1ad"/><stop offset="1" stop-color="#ffb547"/></linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="lineglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="titleglow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="12" result="b"/><feFlood flood-color="#ffb547" flood-opacity=".55"/><feComposite in2="b" operator="in" result="g"/><feOffset in="SourceAlpha" dy="5" result="o"/><feFlood flood-color="#1a0d00" flood-opacity=".55"/><feComposite in2="o" operator="in" result="sh"/><feMerge><feMergeNode in="g"/><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g stroke="#7aa2ff" stroke-opacity=".10" stroke-width="3" fill="none">
    <path d="M512 620L-200 1024M512 620L0 1024M512 620L200 1024M512 620L380 1024M512 620L512 1024M512 620L644 1024M512 620L824 1024M512 620L1024 1024M512 620L1224 1024"/>
    <path d="M0 790H1024M0 870H1024M0 950H1024"/>
  </g>
  <ellipse cx="512" cy="560" rx="400" ry="150" fill="url(#glow)"/>
  <ellipse cx="512" cy="640" rx="300" ry="40" fill="#000" opacity=".45" filter="url(#soft)"/>
  {board}
  {top_gloss}
  <path d="{rest}" stroke="#0b1324" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
  <path d="{hi}" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" filter="url(#lineglow)"/>
  <path d="M{cx-60:.1f} {cy:.1f} L{cx-22:.1f} 70 L{cx+22:.1f} 70 L{cx+60:.1f} {cy:.1f} Z" fill="url(#beam)" filter="url(#soft)" opacity=".9"/>
  <g fill="#fff4cf">
    <circle cx="{cx-30:.1f}" cy="{cy-70:.1f}" r="6" opacity=".9"/><circle cx="{cx+26:.1f}" cy="{cy-120:.1f}" r="4.5" opacity=".75"/><circle cx="{cx-8:.1f}" cy="{cy-170:.1f}" r="3.5" opacity=".6"/>
    <path d="M222 250l10 26 26 10-26 10-10 26-10-26-26-10 26-10z" opacity=".85"/>
    <path d="M808 214l8 20 20 8-20 8-8 20-8-20-20-8 20-8z" opacity=".75"/>
    <path d="M830 470l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" opacity=".55"/>
    <path d="M180 500l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" opacity=".5"/>
  </g>
  <g filter="url(#titleglow)">
    <text x="512" y="842" text-anchor="middle" direction="rtl" font-family="Karantina" font-weight="700" font-size="206" letter-spacing="2" fill="url(#titlegrad)">טריטוריה</text>
  </g>
</svg>'''
open(__file__.replace('icon_gen.py','icon-art.svg'),'w').write(svg)
print('ok')
