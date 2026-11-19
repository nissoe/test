"""Builds championship belt sketches (world + secondary title for each brand)
into brand/belt-sketches.html, reusing the brand letter family."""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'belt-sketches.html')

H = 240
GAP = 18
L = {
    'E': (170, 'M0 0 H170 L156 52 H58 V94 H146 L134 146 H58 V188 H170 L156 240 H0 Z'),
    'G': (170, 'M14 0 H170 L156 52 H58 V188 H112 V152 H88 L100 110 H170 V226 L156 240 H14 L0 226 V14 Z'),
    'R': (172, 'M0 0 H156 L170 14 V118 L150 138 L172 240 H112 L94 150 H58 V240 H0 Z M58 52 V100 H112 V52 Z'),
    'A': (170, 'M48 0 H122 L170 240 H110 L101 190 H69 L60 240 H0 Z M77 142 H93 L85 84 Z'),
    'T': (170, 'M0 0 H170 L156 52 H114 V240 H56 V52 H0 Z'),
    'H': (170, 'M0 0 H58 V94 H112 V0 H170 V240 H112 V146 H58 V240 H0 Z'),
    'O': (170, 'M14 0 H156 L170 14 V226 L156 240 H14 L0 226 V14 Z M58 52 V188 H112 V52 Z'),
    'W': (260, 'M0 0 H60 L92 150 L116 70 H144 L168 150 L200 0 H260 L208 240 H154 L130 160 L106 240 H52 Z'),
    'D': (170, 'M0 0 H140 L170 30 V210 L140 240 H0 Z M58 52 V188 H104 L112 180 V60 L104 52 Z'),
    'N': (170, 'M0 0 H58 L112 130 V0 H170 V240 H112 L58 110 V240 H0 Z'),
    'I': (62, 'M0 0 H62 V240 H0 Z'),
    'B': (170, 'M0 0 H150 L170 20 V100 L156 120 L170 140 V220 L150 240 H0 Z M58 46 V96 H112 V46 Z M58 144 V194 H112 V144 Z'),
    'K': (172, 'M0 0 H58 V92 L108 0 H172 L106 120 L172 240 H108 L58 148 V240 H0 Z'),
    'U': (170, 'M0 0 H58 V188 H112 V0 H170 V226 L156 240 H14 L0 226 Z'),
    'P': (170, 'M0 0 H156 L170 14 V134 L156 148 H58 V240 H0 Z M58 52 V96 H112 V52 Z'),
}


def shift(path, dx):
    out, toks = [], re.findall(r'[MHVLZ]|-?\d+(?:\.\d+)?', path)
    cmd, i = None, 0
    while i < len(toks):
        t = toks[i]
        if t in 'MHVLZ':
            cmd = t
            out.append(t)
            i += 1
            continue
        if cmd in ('M', 'L'):
            out.append(f'{float(t) + dx:g} {toks[i + 1]}')
            i += 2
        elif cmd == 'H':
            out.append(f'{float(t) + dx:g}')
            i += 1
        else:
            out.append(t)
            i += 1
    return ' '.join(out)


def word(text):
    x, parts = 0, []
    for ch in text:
        w, p = L[ch]
        parts.append(shift(p, x))
        x += w + GAP
    return ' '.join(parts), x - GAP


def fit(width, box_w, box_h, cx, cy, skew=-8):
    s = min(box_w / width, box_h / H)
    return f'translate({cx} {cy}) scale({s:.4f}) translate({-width / 2:.1f} {-H / 2}) skewX({skew})'


BRANDS = [
    # name, strap, stitch, accent (gems / inner plate), inner dark, secondary title, wordmark fill
    ('RAGE', '#141518', '#c8101f', '#c8101f', '#3a050b', 'LEGACY', '#c8101f'),
    ('THROWDOWN', '#2a1250', '#c9b6f2', '#9b6bff', '#1b0b35', 'IRON', '#e9ebf2'),
    ('IGNITE', '#121212', '#ff8a00', '#ff6a00', '#2a1000', 'BLAZE', '#ff9a1f'),
    ('BREAKOUT', '#0b2a2e', '#19e3d0', '#19e3d0', '#06191c', 'RISING STAR', '#ffffff'),
    ('UPROAR', '#1a1a1a', '#ffd400', '#ffd400', '#2b2b2b', 'BRAWL', '#ffd400'),
]

GOLD = '<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e2b041"/><stop offset=".55" stop-color="#a8740f"/><stop offset="1" stop-color="#f0c75e"/></linearGradient>'
SILVER = '<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="#d7dae4"/><stop offset=".55" stop-color="#8f93a4"/><stop offset="1" stop-color="#e9ebf2"/></linearGradient>'


def gem(x, y, r, color):
    return f'<path d="M{x} {y - r} L{x + r} {y} L{x} {y + r} L{x - r} {y} Z" fill="{color}" stroke="#000" stroke-opacity=".5" stroke-width="1.5"/>'


def strap(strap_c, stitch_c, metal_id, accent):
    s = f'<rect x="8" y="78" width="784" height="108" rx="46" fill="{strap_c}"/>'
    s += f'<rect x="20" y="90" width="760" height="84" rx="38" fill="none" stroke="{stitch_c}" stroke-opacity=".7" stroke-width="2" stroke-dasharray="7 6"/>'
    for x in (120, 600):  # side plates
        s += f'<rect x="{x}" y="92" width="80" height="80" rx="12" fill="url(#{metal_id})" stroke="#000" stroke-opacity=".5" stroke-width="2"/>'
        s += f'<text x="{x + 40}" y="141" text-anchor="middle" font-family="\'Bebas Neue\', Impact, sans-serif" font-size="26" letter-spacing="2" fill="#1a1205">LWF</text>'
        s += gem(x + 40, 104, 6, accent)
    return s


def world_belt(i, b):
    name, strap_c, stitch_c, accent, inner, _, wm = b
    gid = f'g{i}'
    d, w = word(name)
    plate = 'M290 40 L330 16 L400 30 L470 16 L510 40 L532 132 L510 222 L400 250 L290 222 L268 132 Z'
    inner_p = 'M306 52 L336 34 L400 46 L464 34 L494 52 L512 132 L494 208 L400 232 L306 208 L288 132 Z'
    svg = f'''<svg viewBox="0 0 800 270" role="img" aria-label="{name.title()} World Championship belt sketch">
      <defs>{GOLD.format(id=gid)}</defs>
      <rect width="800" height="270" fill="#0e1015"/>
      {strap(strap_c, stitch_c, gid, accent)}
      <path d="{plate}" fill="url(#{gid})" stroke="#2a1a02" stroke-width="3"/>
      <path d="{inner_p}" fill="{inner}" stroke="url(#{gid})" stroke-width="3"/>
      {gem(400, 30, 11, accent)}{gem(336, 34, 7, accent)}{gem(464, 34, 7, accent)}
      <text x="400" y="88" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="24" letter-spacing="6" fill="url(#{gid})">WORLD</text>
      <g transform="{fit(w, 190, 54, 400, 134)}"><path d="{d}" fill="{wm}" fill-rule="evenodd" stroke="#000" stroke-width="10"/></g>
      <path d="M318 172 H482 L470 194 H330 Z" fill="url(#{gid})"/>
      <text x="400" y="190" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="19" letter-spacing="4" fill="#1a1205">CHAMPION</text>
      {gem(400, 216, 8, accent)}
    </svg>'''
    return svg


def secondary_belt(i, b):
    name, strap_c, stitch_c, accent, inner, title, wm = b
    sid = f's{i}'
    plate = 'M318 54 H482 L522 132 L482 210 H318 L278 132 Z'
    inner_p = 'M330 68 H470 L504 132 L470 196 H330 L296 132 Z'
    d, w = word(name)
    size = 34 if len(title) > 6 else 44
    svg = f'''<svg viewBox="0 0 800 270" role="img" aria-label="{name.title()} {title.title()} Championship belt sketch">
      <defs>{SILVER.format(id=sid)}</defs>
      <rect width="800" height="270" fill="#0e1015"/>
      {strap(strap_c, stitch_c, sid, accent)}
      <path d="{plate}" fill="url(#{sid})" stroke="#2a2d36" stroke-width="3"/>
      <path d="{inner_p}" fill="{inner}" stroke="url(#{sid})" stroke-width="2"/>
      <g transform="{fit(w, 120, 22, 400, 92)}"><path d="{d}" fill="{wm}" fill-rule="evenodd"/></g>
      <text x="400" y="{148 if size == 44 else 144}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="{size}" letter-spacing="2" fill="url(#{sid})" transform="skewX(-6) translate(14 0)">{title}</text>
      <text x="400" y="184" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="17" letter-spacing="5" fill="{accent}">CHAMPION</text>
      {gem(278, 132, 8, accent)}{gem(522, 132, 8, accent)}
    </svg>'''
    return svg


def fig(svg, title, desc):
    return f'''    <figure>
      {svg}
      <figcaption><b>{title}</b><span>{desc}</span></figcaption>
    </figure>
'''


HE = {'RAGE': 'רצועה שחורה, תפרים ואבנים אדומים', 'THROWDOWN': 'רצועה סגולה, תפרים לילך', 'IGNITE': 'רצועה שחורה, תפרים ואבנים כתומים',
      'BREAKOUT': 'רצועה טורקיז כהה, תפרים חשמליים', 'UPROAR': 'רצועה שחורה, תפרים ואבנים צהובים'}

sections = []
for i, b in enumerate(BRANDS):
    name, title = b[0], b[5]
    t = name.title()
    sections.append(f'  <h2>{t}</h2>\n  <div class="grid">\n'
                    + fig(world_belt(i, b), f'{t} World Championship', f'התואר העולמי: לוחית זהב עם כתר של שלוש אבנים, סמל המותג במרכז. {HE[name]}.')
                    + fig(secondary_belt(i, b), f'{t} {title.title()} Championship', f'התואר המשני: לוחית כסף משושה, שם התואר במרכז וסמל המותג מעליו. {HE[name]}.')
                    + '  </div>\n')

page = '''<title>סקיצות חגורות LWF</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Assistant:wght@400;600;700&family=Bebas+Neue&family=Secular+One&display=swap">
<style>
/* Layout: one column; per brand a heading and a 2-up row (world belt, secondary belt). Belts are fixed-color art on their own dark plates. */
:root {
  --paper: #f5f6f9; --ink: #161922; --ink-soft: #4a5063; --rule: #dfe2ea; --card: #ffffff;
  --font-display: "Secular One", "Assistant", system-ui, sans-serif;
  --font-body: "Assistant", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #0f1219; --ink: #e9ebf1; --ink-soft: #a3a9ba; --rule: #2a303d; --card: #161a23; color-scheme: dark; } }
:root[data-theme="dark"] { --paper: #0f1219; --ink: #e9ebf1; --ink-soft: #a3a9ba; --rule: #2a303d; --card: #161a23; color-scheme: dark; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-body); font-size: 1.0625rem; line-height: 1.6; }
.wrap { direction: rtl; max-width: 1180px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 18px; }
header h1 { font-family: var(--font-display); font-weight: 400; font-size: clamp(1.9rem, 5vw, 2.6rem); margin: 0; line-height: 1.2; }
header p { margin: 6px 0 0; color: var(--ink-soft); max-width: 66ch; }
h2 { font-family: var(--font-display); font-weight: 400; font-size: 1.5rem; margin: 18px 0 0; }
.note { font-size: 0.9rem; color: var(--ink-soft); border-inline-start: 3px solid #b3471d; padding: 6px 12px; background: var(--card); border-radius: 8px; margin: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr)); gap: 18px; }
figure { margin: 0; background: var(--card); border: 1px solid var(--rule); border-radius: 14px; overflow: hidden; display: grid; }
figure svg { display: block; width: 100%; height: auto; }
figcaption { padding: 12px 16px 14px; display: grid; gap: 2px; }
figcaption b { font-size: 1.05rem; }
figcaption span { color: var(--ink-soft); font-size: 0.95rem; }
</style>
<div class="wrap">
  <header>
    <h1>סקיצות חגורות: תארי LWF</h1>
    <p>לכל מותג שתי חגורות: התואר העולמי בזהב, והתואר המשני בכסף. הרצועה, התפרים והאבנים בצבעי המותג, וסמל המותג באותיות המצוירות של משפחת הלוגואים (החלטות 32–33, 38).</p>
  </header>
  <p class="note">סקיצות בלבד. תארי הנשים והזוגות ייבנו באותו סגנון בשלב העיצוב.</p>
''' + ''.join(sections) + '</div>\n'

open(OUT, 'w', encoding='utf-8').write(page)
print('built', OUT)
