"""Builds the five brand logos from one custom angular letter family and
replaces the brand grid in brand/logo-sketches.html."""
import re

import os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo-sketches.html')
H = 240
GAP = 18

# letter: (width, path) — paths in a 0..w x 0..240 box, counters drawn as extra subpaths (evenodd)
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
        else:  # V
            out.append(t)
            i += 1
    return ' '.join(out)


def word(text):
    x, parts, spans = 0, [], []
    for ch in text:
        w, p = L[ch]
        parts.append(shift(p, x))
        spans.append((x, x + w))
        x += w + GAP
    return ' '.join(parts), x - GAP, spans


def fit(width, box_w, box_h, cx, cy, skew):
    s = min(box_w / width, box_h / H)
    return f'translate({cx} {cy}) scale({s:.4f}) translate({-width / 2:.1f} {-H / 2}) skewX({skew})'


def lwf_tag(y, color):
    return (f'<text x="300" y="{y}" text-anchor="middle" font-family="\'Bebas Neue\', Impact, sans-serif" '
            f'font-size="24" letter-spacing="10" fill="{color}">LWF</text>')


def figure(svg, title, desc, swatches):
    sw = ''.join(f'<i style="background:{c}"></i>' for c in swatches)
    return f'''    <figure>
      {svg}
      <figcaption><b>{title}</b><span>{desc}</span><div class="sw">{sw}</div></figcaption>
    </figure>
'''


figs = []

# RAGE — raw, aggressive: blood red, charcoal, claw marks
d, w, _ = word('RAGE')
svg = f'''<svg viewBox="0 0 600 300" role="img" aria-label="LWF Rage logo sketch">
        <defs><linearGradient id="rgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a4a"/><stop offset=".5" stop-color="#c8101f"/><stop offset="1" stop-color="#6e0610"/></linearGradient></defs>
        <rect width="600" height="300" fill="#15171c"/>
        <g stroke="#262931" stroke-width="2"><path d="M0 70 L600 10"/><path d="M0 150 L600 90"/><path d="M0 230 L600 170"/></g>
        <g transform="{fit(w, 430, 140, 312, 132, -12)}">
          <path d="{d}" fill="none" stroke="#000" stroke-width="22" stroke-linejoin="miter"/>
          <path d="{d}" fill="url(#rgR)" fill-rule="evenodd" stroke="#2a0005" stroke-width="5"/>
        </g>
        <g fill="#3a030a"><path d="M150 60 L158 60 L104 206 L98 206 Z"/><path d="M174 60 L181 60 L127 206 L121 206 Z"/><path d="M197 60 L203 60 L149 206 L144 206 Z"/></g>
        {lwf_tag(262, '#9aa0ad')}
      </svg>'''
figs.append(figure(svg, 'Rage', 'מותג ראשי. גולמי ואגרסיבי: אותיות כבדות ונטויות, מעבר אדום דם, ושלוש שריטות טופר דקות שחוצות את ה-R.', ['#c8101f', '#15171c']))

# THROWDOWN — polished star power: silver on royal purple, star
d, w, _ = word('THROWDOWN')
svg = f'''<svg viewBox="0 0 600 300" role="img" aria-label="LWF Throwdown logo sketch">
        <defs><linearGradient id="rgS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="#d7dae4"/><stop offset=".55" stop-color="#8f93a4"/><stop offset="1" stop-color="#e9ebf2"/></linearGradient>
        <radialGradient id="rgP" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#5a2aa0"/><stop offset="1" stop-color="#1b0b35"/></radialGradient></defs>
        <rect width="600" height="300" fill="url(#rgP)"/>
        <path d="M300 40 l9 19 21 3 -15 14 4 21 -19 -10 -19 10 4 -21 -15 -14 21 -3z" fill="url(#rgS)" stroke="#1b0b35" stroke-width="2"/>
        <g transform="{fit(w, 500, 90, 306, 162, -8)}">
          <path d="{d}" fill="none" stroke="#c9b6f2" stroke-width="18" stroke-linejoin="miter"/>
          <path d="{d}" fill="url(#rgS)" fill-rule="evenodd" stroke="#1b0b35" stroke-width="6"/>
        </g>
        <path d="M120 226 H480" stroke="#c9b6f2" stroke-opacity=".6" stroke-width="2"/>
        {lwf_tag(262, '#d9c9f5')}
      </svg>'''
figs.append(figure(svg, 'Throwdown', 'מותג ראשי שני. מלוטש עם כוכבים: פלדה מבריקה עם מסגרת לילך על סגול מלכותי, וכוכב מעל.', ['#3d1a73', '#d7dae4', '#c9b6f2']))

# IGNITE — fast, high-flying: flame gradient, black
d, w, _ = word('IGNITE')
svg = f'''<svg viewBox="0 0 600 300" role="img" aria-label="LWF Ignite logo sketch">
        <defs><linearGradient id="rgF" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d00"/><stop offset=".55" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ffe07a"/></linearGradient></defs>
        <rect width="600" height="300" fill="#0c0c0e"/>
        <path d="M70 230 C130 170 190 220 250 150 C285 108 270 74 258 50 C330 88 372 160 330 214 C400 186 426 128 414 90 C476 150 470 230 380 250 L70 250 Z" fill="url(#rgF)" opacity=".18"/>
        <g transform="{fit(w, 420, 130, 318, 140, -14)}">
          <path d="{d}" fill="none" stroke="#ff6a00" stroke-opacity=".55" stroke-width="26" stroke-linejoin="miter"/>
          <path d="{d}" fill="url(#rgF)" fill-rule="evenodd" stroke="#1a0700" stroke-width="5"/>
        </g>
        {lwf_tag(262, '#ffb35c')}
      </svg>'''
figs.append(figure(svg, 'Ignite', 'מהיר ואווירי: הטיה חזקה קדימה, אותיות בצבעי להבה עם זוהר כתום, ולהבה גדולה מאחור.', ['#ff6a00', '#ffe07a', '#0c0c0e']))

# BREAKOUT — young and hungry: white + electric turquoise, shattered panel
d, w, spans = word('BREAKOUT')
split = spans[5][0]  # start of the "O" in OUT
svg = f'''<svg viewBox="0 0 600 300" role="img" aria-label="LWF Breakout logo sketch">
        <defs><clipPath id="cpIn"><rect x="-100" y="-100" width="{split - 9 + 100}" height="500"/></clipPath>
        <clipPath id="cpOut"><rect x="{split - 9}" y="-100" width="2000" height="500"/></clipPath></defs>
        <rect width="600" height="300" fill="#06191c"/>
        <g fill="none" stroke="#19e3d0" stroke-opacity=".3" stroke-width="2"><path d="M430 140 L380 20"/><path d="M430 140 L560 30"/><path d="M430 140 L590 170"/><path d="M430 140 L520 290"/><path d="M430 140 L330 290"/></g>
        <g fill="#19e3d0"><path d="M548 52 l18 -10 4 20z"/><path d="M560 230 l22 6 -14 14z"/><path d="M372 36 l-14 -12 20 -2z"/></g>
        <g transform="{fit(w, 520, 110, 300, 148, -8)}">
          <path d="{d}" fill="none" stroke="#19e3d0" stroke-width="18" stroke-linejoin="miter"/>
          <g clip-path="url(#cpIn)"><path d="{d}" fill="#ffffff" fill-rule="evenodd" stroke="#06191c" stroke-width="5"/></g>
          <g clip-path="url(#cpOut)"><path d="{d}" fill="#19e3d0" fill-rule="evenodd" stroke="#06191c" stroke-width="5"/></g>
        </g>
        {lwf_tag(262, '#8ff3ea')}
      </svg>'''
figs.append(figure(svg, 'Breakout', 'מותג הפיתוח. צעיר ורעב: BREAK בלבן ו-OUT בטורקיז, מסגרת חשמלית ולוח שמתנפץ החוצה.', ['#19e3d0', '#ffffff', '#06191c']))

# UPROAR — chaotic, brutal: hazard yellow, concrete grey
d, w, _ = word('UPROAR')
svg = f'''<svg viewBox="0 0 600 300" role="img" aria-label="LWF Uproar logo sketch">
        <defs><pattern id="hz" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="#ffd400"/><rect x="20" width="20" height="40" fill="#1a1a1a"/></pattern></defs>
        <rect width="600" height="300" fill="#45474b"/>
        <rect x="0" y="26" width="600" height="18" fill="url(#hz)"/>
        <rect x="0" y="256" width="600" height="18" fill="url(#hz)"/>
        <g transform="rotate(-4 300 150) {fit(w, 480, 130, 300, 142, -10)}">
          <path d="{d}" fill="none" stroke="#111" stroke-width="26" stroke-linejoin="miter"/>
          <path d="{d}" fill="#ffd400" fill-rule="evenodd" stroke="#111" stroke-width="4"/>
        </g>
        {lwf_tag(238, '#f2f2f2')}
      </svg>'''
figs.append(figure(svg, 'Uproar', 'כאוטי ואכזרי: צהוב אזהרה עם קו שחור עבה, הטיה עקומה, ופסי אזהרה על אפור בטון.', ['#ffd400', '#45474b', '#1a1a1a']))

s = open(P, encoding='utf-8').read()
a = s.index('  <div class="grid">')
b = s.rindex('</div>')  # closes .wrap
s = s[:a] + '  <div class="grid">\n' + ''.join(figs) + '  </div>\n' + s[b:]
open(P, 'w', encoding='utf-8').write(s)
print('ok')
