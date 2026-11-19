// צלילי המשחק, מסונתזים בזמן אמת (Web Audio). מקוריים לגמרי, בלי קבצים.
// בגרסת המובייל המקומית נחליף לנגן קבצים (expo-audio) עם אותם שמות.
import { Platform } from 'react-native';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

try {
  if (typeof localStorage !== 'undefined') muted = localStorage.getItem('lwf-muted') === '1';
} catch {}

function ac(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as AudioContext;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('lwf-muted', m ? '1' : '0'); } catch {}
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
  listeners.forEach((f) => f(m));
}
export function onMute(f: (m: boolean) => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  // רעש ורוד בקירוב: נשמע כמו קהל ולא כמו רעש לבן חד
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return buf;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode = master!) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(dest);
  o.start(start);
  o.stop(start + dur + 0.05);
}

/** קליק קצר לכפתורים */
export function click() {
  const c = ac(); if (!c || muted) return;
  tone(c, 1800, c.currentTime, 0.04, 'square', 0.04);
}

/** בחירה בדראפט: חבטה נמוכה ומשב */
export function pick(big = false) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(big ? 140 : 110, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.35);
  g.gain.setValueAtTime(big ? 0.9 : 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g).connect(master!);
  o.start(t); o.stop(t + 0.45);
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.4);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  n.connect(f).connect(ng).connect(master!);
  n.start(t);
}

/** פעמון הזירה: צלילים לא הרמוניים עם דעיכה, כמה הקשות */
export function bell(times = 3) {
  const c = ac(); if (!c || muted) return;
  for (let k = 0; k < times; k++) {
    const t = c.currentTime + k * 0.32;
    for (const [ratio, vol] of [[1, 0.35], [2.76, 0.18], [5.4, 0.1], [8.93, 0.05]] as const) {
      tone(c, 620 * ratio, t, 1.4 - ratio * 0.08, 'sine', vol);
    }
  }
}

/** קהל: עוצמה 0–1. קהל חלש מזמזם, קהל חזק שואג עם קריאות */
export function crowd(intensity: number, seconds = 2.5) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, seconds + 0.5);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 500 + intensity * 900;
  f.Q.value = 0.6;
  const g = c.createGain();
  const peak = 0.15 + intensity * 0.85;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.25 + (1 - intensity) * 0.4);
  g.gain.setValueAtTime(peak, t + seconds * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  n.connect(f).connect(g).connect(master!);
  n.start(t);
  // קריאות עידוד: רעש קצר בתדרים גבוהים יותר
  const whoops = Math.round(intensity * 8);
  for (let i = 0; i < whoops; i++) {
    const s = t + 0.2 + Math.random() * seconds * 0.6;
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = 'sawtooth';
    const base = 500 + Math.random() * 500;
    o.frequency.setValueAtTime(base, s);
    o.frequency.linearRampToValueAtTime(base * 1.5, s + 0.25);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    og.gain.setValueAtTime(0.0001, s);
    og.gain.exponentialRampToValueAtTime(0.03 * intensity, s + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, s + 0.35);
    o.connect(lp).connect(og).connect(master!);
    o.start(s); o.stop(s + 0.4);
  }
}

/** כוכב: צליל עולה לכל כוכב שנחשף */
export function star(index: number) {
  const c = ac(); if (!c || muted) return;
  const notes = [523, 659, 784, 988, 1175];
  tone(c, notes[Math.min(index, 4)], c.currentTime, 0.25, 'triangle', 0.18);
}

/** פנפרה: לאירוע שיא ולאלוף חדש. אקורד נחושת קצר */
export function fanfare() {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const seq: [number[], number, number][] = [
    [[392, 494, 587], 0, 0.18],
    [[392, 494, 587], 0.2, 0.12],
    [[523, 659, 784], 0.34, 0.9],
  ];
  for (const [chord, at, dur] of seq) {
    for (const f of chord) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(800, t + at);
      lp.frequency.linearRampToValueAtTime(2500, t + at + 0.08);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.09, t + at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(lp).connect(g).connect(master!);
      o.start(t + at); o.stop(t + at + dur + 0.05);
    }
  }
}

/** רעש מעבר מסך (וווש) */
export function whoosh() {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.5);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(4000, t + 0.35);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  n.connect(f).connect(g).connect(master!);
  n.start(t);
}
