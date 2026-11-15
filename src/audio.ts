/** Procedural sound effects (no audio assets) + haptics. */
let ctx: AudioContext | null = null;
let enabledSound = true;
let enabledHaptics = true;

export function configureFeedback(sound: boolean, haptics: boolean) {
  enabledSound = sound;
  enabledHaptics = haptics;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!enabledSound) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function vibrate(p: number | number[]) {
  if (enabledHaptics && navigator.vibrate) navigator.vibrate(p);
}

export const sfx = {
  pick() {
    tone(520, 0.06, 'triangle', 0.08);
    vibrate(8);
  },
  move() {
    tone(330, 0.09, 'sine', 0.14, 120);
    tone(660, 0.07, 'triangle', 0.05, 0, 0.02);
    vibrate(14);
  },
  bump() {
    tone(110, 0.12, 'square', 0.06, -40);
    vibrate([20, 30, 20]);
  },
  flip() {
    tone(300, 0.25, 'sawtooth', 0.05, 500);
    tone(900, 0.25, 'sine', 0.06, -500);
    vibrate([10, 40, 10]);
  },
  exit() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, 0, i * 0.07));
    vibrate([30, 40, 60]);
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.5, 'sine', 0.09, 0, 0.25 + i * 0.09));
  },
  star(i: number) {
    tone(880 + i * 220, 0.25, 'triangle', 0.08);
    vibrate(12);
  },
  fail() {
    tone(330, 0.4, 'sawtooth', 0.06, -180);
    vibrate([40, 60, 40]);
  },
  tap() {
    tone(700, 0.04, 'sine', 0.05);
  },
  tick() {
    tone(1200, 0.03, 'square', 0.025);
  },
};
