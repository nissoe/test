import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Glyph on top of linked blocks (shape per group, so color is never the only cue). */
export const GLYPHS = ['●', '▲', '■', '◆', '✚', '★'];
export function glyphTexture(i: number) {
  return canvasTex('glyph' + i, 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#fff';
    g.font = `bold ${s * 0.62}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,255,255,0.9)';
    g.shadowBlur = s * 0.08;
    g.fillText(GLYPHS[i % GLYPHS.length], s / 2, s / 2 + s * 0.04);
  });
}

/** Mirror / parallel badge that floats over each link arc. */
export function relationTexture(rel: 1 | -1, color: string) {
  return canvasTex(`rel${rel}${color}`, 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
    g.fillStyle = 'rgba(8,6,20,0.85)';
    g.fill();
    g.lineWidth = s * 0.06;
    g.strokeStyle = color;
    g.stroke();
    g.fillStyle = '#fff';
    g.font = `bold ${s * 0.5}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(rel === 1 ? '⇉' : '⇄', s / 2, s / 2 + s * 0.03);
  });
}

/** Badge for echo links: dashed ring = "later". */
export function echoTexture(rel: 1 | -1, color: string) {
  return canvasTex(`echo${rel}${color}`, 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
    g.fillStyle = 'rgba(8,6,20,0.85)';
    g.fill();
    g.setLineDash([s * 0.09, s * 0.06]);
    g.lineWidth = s * 0.07;
    g.strokeStyle = color;
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#fff';
    g.font = `bold ${s * 0.44}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(rel === 1 ? '⇉' : '⇄', s / 2, s / 2 + s * 0.03);
  });
}

export function arrowTexture() {
  return canvasTex('arrow', 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#fff';
    g.lineWidth = s * 0.11;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = '#fff';
    g.shadowBlur = s * 0.06;
    for (const off of [-0.16, 0.12]) {
      g.beginPath();
      g.moveTo(s * (0.36 + off), s * 0.24);
      g.lineTo(s * (0.62 + off), s * 0.5);
      g.lineTo(s * (0.36 + off), s * 0.76);
      g.stroke();
    }
  });
}

export function padTexture() {
  return canvasTex('pad', 256, (g, s) => {
    g.clearRect(0, 0, s, s);
    const grd = g.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.48);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.15)');
    grd.addColorStop(0.62, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#fff';
    g.font = `bold ${s * 0.3}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('⇄', s / 2, s / 2);
  });
}

export function softDot() {
  return canvasTex('dot', 64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  });
}

export function gradientTexture(top: string, bottom: string) {
  return canvasTex(`grad${top}${bottom}`, 512, (g, s) => {
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, top);
    grd.addColorStop(1, bottom);
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    // subtle vignette glow
    const r = g.createRadialGradient(s / 2, s * 0.35, 0, s / 2, s * 0.35, s * 0.7);
    r.addColorStop(0, 'rgba(255,255,255,0.08)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
}

export function frostTexture() {
  return canvasTex('frost', 256, (g, s) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(150,200,255,${0.15 + Math.random() * 0.35})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const x = Math.random() * s;
      const y = Math.random() * s;
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
      g.stroke();
    }
  });
}
