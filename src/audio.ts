/**
 * Procedural audio (no sound files): effects bus with a small reverb, plus an
 * optional generative ambient music bed. Haptics live here too.
 */
let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let reverbIn: GainNode;
let enabledSound = true;
let enabledHaptics = true;
let enabledMusic = true;

export function configureFeedback(sound: boolean, haptics: boolean, music = enabledMusic) {
  enabledSound = sound;
  enabledHaptics = haptics;
  enabledMusic = music;
  if (ctx) musicBus.gain.setTargetAtTime(music ? 1 : 0, ctx.currentTime, 0.4);
  if (music) ambient.start();
  else ambient.stop();
}

function impulse(a: AudioContext, seconds: number) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function ac(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = enabledMusic ? 1 : 0;
    musicBus.connect(master);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    verb.connect(wet).connect(master);
    reverbIn = ctx.createGain();
    reverbIn.connect(verb);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Browsers (iOS especially) only allow audio after a user gesture: unlock on the first touch. */
export function unlockAudioOnFirstGesture() {
  const go = () => {
    ac();
    if (enabledMusic) ambient.start();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
  attack?: number;
  verb?: number;
  bus?: 'sfx' | 'music';
  detune?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  if (o.bus !== 'music' && !enabledSound) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.detune) osc.detune.value = o.detune;
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + o.slide), t0 + dur);
  const vol = o.vol ?? 0.2;
  const att = o.attack ?? 0.006;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(o.bus === 'music' ? musicBus : sfxBus);
  if (o.verb) {
    const s = a.createGain();
    s.gain.value = o.verb;
    g.connect(s).connect(reverbIn);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Filtered noise burst: clacks, whooshes, thuds. */
function noise(dur: number, freq: number, o: { q?: number; vol?: number; delay?: number; sweep?: number; type?: BiquadFilterType; verb?: number } = {}) {
  if (!enabledSound) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + (o.delay ?? 0);
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + o.sweep), t0 + dur);
  f.Q.value = o.q ?? 1.2;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxBus);
  if (o.verb) {
    const s = a.createGain();
    s.gain.value = o.verb;
    g.connect(s).connect(reverbIn);
  }
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Spoken praise for the kids zone, when the device has a matching voice. */
export function speak(text: string) {
  if (!enabledSound || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const lang = document.documentElement.lang === 'he' ? 'he-IL' : 'en-US';
    u.lang = lang;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
    if (!voice) return; // no voice for this language: skip rather than read Hebrew with an English voice
    u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1.25;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* speech not available */
  }
}

function vibrate(p: number | number[]) {
  if (enabledHaptics && navigator.vibrate) navigator.vibrate(p);
}

// A-minor pentatonic, used everywhere so every sound fits with the music.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export const sfx = {
  /** Finger lands on a block. */
  pick() {
    tone(660, 0.09, { type: 'triangle', vol: 0.12 });
    noise(0.03, 3200, { vol: 0.06 });
    vibrate(8);
  },
  /** The dragged block crosses into the next cell (n = cells from start). */
  cell(n: number) {
    const f = SCALE[Math.min(SCALE.length - 1, 4 + Math.abs(n))];
    tone(f, 0.05, { type: 'triangle', vol: 0.08 });
    noise(0.018, 4800, { vol: 0.07, q: 3 });
    vibrate(5);
  },
  /**
   * Block settles. twin: 0 = no twin, -1 mirror twin, +1 parallel twin moved too.
   * Twins answer with a second voice: a fifth for mirror, an octave for parallel.
   */
  move(twin: 0 | 1 | -1 = 0) {
    noise(0.07, 900, { vol: 0.32, q: 0.8, sweep: -500 });
    tone(130, 0.14, { vol: 0.28, slide: -40 });
    tone(392, 0.16, { type: 'triangle', vol: 0.09 });
    if (twin === -1) {
      tone(587.33, 0.35, { type: 'sine', vol: 0.12, delay: 0.06, verb: 0.6 });
      tone(392, 0.35, { type: 'sine', vol: 0.1, delay: 0.06, verb: 0.6 });
    } else if (twin === 1) {
      tone(784, 0.35, { type: 'sine', vol: 0.12, delay: 0.06, verb: 0.6 });
      tone(392, 0.35, { type: 'sine', vol: 0.1, delay: 0.06, verb: 0.6 });
    }
    vibrate(twin ? [14, 30, 14] : 14);
  },
  /** A delayed echo plays out: the move sound, softer and washed in reverb. */
  echo() {
    noise(0.06, 1100, { vol: 0.16, q: 0.8, sweep: -500, delay: 0.28, verb: 0.8 });
    tone(392, 0.4, { type: 'sine', vol: 0.08, delay: 0.28, verb: 1 });
    tone(587.33, 0.5, { type: 'sine', vol: 0.06, delay: 0.36, verb: 1 });
  },
  bump() {
    noise(0.12, 260, { vol: 0.35, type: 'lowpass' });
    tone(90, 0.16, { vol: 0.25, slide: -30 });
    vibrate([20, 30, 20]);
  },
  /** A twin is the reason the move stopped. */
  twinBlocked() {
    tone(311, 0.14, { type: 'square', vol: 0.05 });
    tone(294, 0.18, { type: 'square', vol: 0.05, delay: 0.1 });
  },
  flip() {
    noise(0.45, 400, { vol: 0.18, sweep: 3200, q: 2, verb: 0.5 });
    tone(440, 0.4, { type: 'sine', vol: 0.12, slide: 440, verb: 0.6 });
    tone(880, 0.4, { type: 'sine', vol: 0.1, slide: -440, verb: 0.6 });
    vibrate([10, 40, 10]);
  },
  /** Gold block slides out through the exit. */
  exit() {
    noise(0.6, 500, { vol: 0.22, sweep: 4000, q: 0.7, verb: 0.4 });
    [440, 523.25, 659.25, 880].forEach((f, i) => tone(f, 0.45, { type: 'triangle', vol: 0.12, delay: 0.08 + i * 0.07, verb: 0.7 }));
    vibrate([30, 40, 60]);
  },
  /** Level complete. More stars, bigger ending. */
  win(stars = 3) {
    const chord = [220, 329.63, 440, 523.25, 659.25];
    chord.forEach((f, i) => tone(f, 1.6, { type: 'sine', vol: 0.07, delay: 0.25, attack: 0.05, verb: 0.9, detune: (i - 2) * 4 }));
    const run = [523.25, 659.25, 783.99, 880, 1046.5, 1318.5].slice(0, 3 + stars);
    run.forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.1, delay: 0.25 + i * 0.09, verb: 0.8 }));
    for (let i = 0; i < 6 * stars; i++) tone(1800 + Math.random() * 2200, 0.08, { vol: 0.03, delay: 0.6 + Math.random() * 1.2, verb: 1 });
  },
  star(i: number) {
    tone([880, 1108.7, 1318.5][i] ?? 1318.5, 0.5, { type: 'triangle', vol: 0.13, verb: 0.8 });
    tone(([880, 1108.7, 1318.5][i] ?? 1318.5) * 2, 0.3, { type: 'sine', vol: 0.05, delay: 0.02, verb: 0.8 });
    vibrate(12);
  },
  coin() {
    tone(1318.5, 0.08, { type: 'square', vol: 0.04 });
    tone(1760, 0.18, { type: 'square', vol: 0.04, delay: 0.07 });
  },
  fail() {
    [392, 329.63, 261.63, 196].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.11, delay: i * 0.12, verb: 0.5 }));
    vibrate([40, 60, 40]);
  },
  undo() {
    tone(523.25, 0.1, { type: 'triangle', vol: 0.08, slide: -150 });
    noise(0.05, 1500, { vol: 0.06 });
  },
  hint() {
    [659.25, 880, 1174.7].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.08, delay: i * 0.08, verb: 1 }));
  },
  tap() {
    tone(880, 0.05, { type: 'triangle', vol: 0.06 });
  },
  tick() {
    tone(1400, 0.035, { type: 'square', vol: 0.03 });
  },
};

/**
 * Ambient bed: slow pad chords in A minor with an occasional soft bell note.
 * Quiet by design; toggled by the Music setting.
 */
const ambient = (() => {
  let timer: number | null = null;
  let step = 0;
  const chords = [
    [110, 220, 261.63, 329.63],
    [87.31, 174.61, 261.63, 349.23],
    [130.81, 196, 261.63, 329.63],
    [98, 196, 246.94, 293.66],
  ];
  const play = () => {
    const a = ctx;
    if (!a || a.state !== 'running' || document.hidden) return;
    const ch = chords[step % chords.length];
    ch.forEach((f, i) => tone(f, 6.5, { type: i === 0 ? 'sine' : 'triangle', vol: i === 0 ? 0.05 : 0.018, attack: 2.2, bus: 'music', verb: 0.9, detune: (Math.random() - 0.5) * 8 }));
    if (Math.random() < 0.6) {
      const bell = SCALE[5 + Math.floor(Math.random() * 6)];
      tone(bell, 2.2, { type: 'sine', vol: 0.025, delay: 1 + Math.random() * 3, bus: 'music', verb: 1 });
    }
    step++;
  };
  return {
    start() {
      if (timer !== null || !ctx) return;
      play();
      timer = window.setInterval(play, 6000);
    },
    stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    },
  };
})();

if (import.meta.env.DEV) {
  // Test hook for automated checks.
  (window as unknown as Record<string, unknown>).__audio = { sfx, state: () => ctx?.state ?? 'none', musicOn: () => enabledMusic };
}
