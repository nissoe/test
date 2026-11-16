/**
 * Generates every TWINLOCK level pack into src/data/*.json.
 *   npm run gen -- w3 clock   (build some packs into tools/out/)
 *   npm run gen               (build all packs)
 *   npm run gen -- --merge    (combine tools/out/*.json into src/data/levels.json)
 */
import { writeFileSync, existsSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { evolve, harvest, mulberry, type GenCfg, type LinkKind } from './gen-core';
import type { LevelDef } from '../src/engine/types';

interface PackSpec {
  id: string;
  count: number;
  /** Target optimal length for level index i. */
  target: (i: number) => number;
  /** Generator config for level index i (may vary to introduce pieces gradually). */
  cfg: (i: number) => GenCfg;
  /** Move limit. */
  max: (opt: number, i: number) => number;
  time?: (opt: number, i: number) => number;
}

const ramp = (lo: number, hi: number, n = 20) => (i: number) => {
  const t = i / (n - 1);
  let v = Math.round(lo + (hi - lo) * Math.pow(t, 1.15));
  if (i > 0 && i % 5 === 4 && i < n - 1) v = Math.max(lo, v - 2); // breather level
  return v;
};
const slack = (pct: number, min = 1) => (opt: number) => opt + Math.max(min, Math.round(opt * pct));
const lerpI = (a: number, b: number, i: number, n = 20) => Math.round(a + ((b - a) * i) / (n - 1));

const pair = (kind: LinkKind) => ({ size: 2, kind });

const worlds: PackSpec[] = [
  {
    // 1-3: learn to drag. 4-9: first mirror twins. 10-14: first parallel twins. 15-20: both together.
    id: 'w1', count: 20, target: (i) => [1, 2, 3, 3, 4, 4, 5, 5, 6, 4, 5, 5, 6, 7, 6, 7, 8, 8, 9, 10][i],
    cfg: (i) => {
      const size = i < 6 ? 5 : 6;
      const base: GenCfg = { w: size, h: size, blocks: [lerpI(2, 6, i), lerpI(3, 8, i)] };
      if (i < 3) return { ...base, blocks: [i, i + 1] };
      if (i < 9) return { ...base, groups: [pair('mirror')], require: 'link' };
      if (i < 14) return { ...base, groups: [pair('parallel')], require: 'link' };
      return { ...base, groups: [pair('parallel'), pair('mirror')], require: 'link' };
    },
    max: (o, i) => o + Math.max(2, Math.round(o * (i < 10 ? 0.8 : 0.5))),
  },
  {
    id: 'w2', count: 20, target: ramp(2, 11),
    cfg: (i) => ({ w: 6, h: 6, blocks: [lerpI(3, 7, i), lerpI(5, 9, i)], groups: i < 8 ? [pair('mirror')] : [pair('mirror'), pair('mirror')], require: 'link' }),
    max: slack(0.5, 2),
  },
  {
    id: 'w3', count: 20, target: ramp(3, 12),
    cfg: (i) => ({ w: 6, h: 6, blocks: [lerpI(4, 7, i), lerpI(6, 10, i)], groups: i < 6 ? [pair('parallel')] : [pair('parallel'), pair('mirror')], require: 'link' }),
    max: slack(0.45, 2),
  },
  {
    id: 'w4', count: 20, target: ramp(4, 13),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], lens: [1, 2, 2, 3], walls: [1, lerpI(1, 4, i)], groups: [pair('any'), pair('any')], require: 'link' }),
    max: slack(0.4, 2),
  },
  {
    id: 'w5', count: 20, target: ramp(4, 14),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], groups: i < 7 ? [pair('cross')] : [pair('cross'), pair('free')], walls: i > 10 ? [0, 2] : undefined, require: 'cross' }),
    max: slack(0.4, 2),
  },
  {
    id: 'w6', count: 20, target: ramp(4, 14),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], ice: [1, i < 8 ? 1 : 3], groups: i < 5 ? [] : [pair('free'), pair('free')].slice(0, i < 12 ? 1 : 2), walls: [0, 2], require: 'ice' }),
    max: slack(0.35, 2),
  },
  {
    id: 'w7', count: 20, target: ramp(5, 15),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], gates: [1, i < 8 ? 2 : 4], groups: i < 6 ? [pair('free')] : [pair('free'), pair('free')], goldLinkChance: i > 12 ? 0.4 : 0, require: 'gate' }),
    max: slack(0.35, 2),
  },
  {
    id: 'w8', count: 20, target: ramp(5, 15),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], lens: [1, 2, 2, 2, 3], pads: [1, i < 8 ? 1 : 2], groups: i < 6 ? [pair('mirror')] : [pair('free'), pair('free')], require: 'pad', maxStates: 90_000 }),
    max: slack(0.35, 2),
  },
  {
    id: 'w9', count: 20, target: ramp(5, 16),
    cfg: (i) => ({ w: 6, h: 6, blocks: [6, 10], lens: [1, 2, 2, 3], groups: i < 7 ? [{ size: 3, kind: 'free' }] : [{ size: 3, kind: 'free' }, pair('free')], walls: [0, 2], require: 'link' }),
    max: slack(0.3, 2),
  },
  {
    id: 'w10', count: 20, target: ramp(6, 16),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], arrows: [1, i < 8 ? 2 : 4], groups: [pair('free'), pair('free')], walls: [0, 1], require: 'arrow' }),
    max: slack(0.3, 2),
  },
  {
    id: 'w11', count: 20, target: ramp(6, 18),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], golds: 2, groups: i < 6 ? [pair('free')] : [pair('free'), pair('free')], goldLinkChance: i > 10 ? 0.5 : 0, walls: [0, 2], require: 'link', maxStates: 90_000 }),
    max: slack(0.3, 2),
  },
  {
    id: 'w12', count: 20, target: ramp(9, 20),
    cfg: (i) => {
      const r = mulberry(1000 + (i % 4));
      const f = (p: number) => r() < p;
      return {
        w: 7, h: 7, blocks: [7, 12], lens: [1, 2, 2, 3],
        groups: [{ size: f(0.4) ? 3 : 2, kind: 'free' }, pair('free'), ...(f(0.5) ? [pair('cross')] : [])],
        walls: [1, 3], ice: f(0.4) ? [1, 1] : undefined, gates: f(0.5) ? [1, 2] : undefined,
        pads: f(0.35) ? [1, 1] : undefined, arrows: f(0.4) ? [1, 2] : undefined, golds: f(0.25) ? 2 : 1,
        goldLinkChance: 0.3, require: 'link', maxStates: 50_000,
      };
    },
    max: slack(0.25, 1),
  },
  {
    // Expert: echo twins repeat your move one turn later; mixed with instant twins from world 3 on.
    id: 'w13', count: 20, target: ramp(9, 18),
    cfg: (i) => ({
      w: 6, h: 6, blocks: [6, 10], lens: [1, 2, 2, 3],
      groups: i < 8 ? [{ size: 2, kind: 'echo' }] : [{ size: 2, kind: 'echo' }, pair('free')],
      walls: [0, 2], require: 'echo', maxStates: 40_000,
    }),
    max: slack(0.2, 1),
  },
];

type MixKind = 'basic' | 'mirror' | 'parallel' | 'walls' | 'cross' | 'ice' | 'gate' | 'pad';
const EARLY: MixKind[] = ['basic', 'mirror', 'parallel', 'walls'];
const MID: MixKind[] = [...EARLY, 'cross', 'ice'];
const ALL: MixKind[] = [...MID, 'gate', 'pad'];
/** Challenge boards mix only mechanics the player has already been taught. */
const mixCfg = (i: number, seedBase: number, kinds: MixKind[]): GenCfg => {
  const r = mulberry(seedBase + i);
  const k = kinds[Math.floor(r() * kinds.length)];
  const base: GenCfg = { w: 6, h: 6, blocks: [5, 9], groups: [pair('any')] };
  switch (k) {
    case 'basic': return { ...base, groups: [] };
    case 'mirror': return { ...base, groups: [pair('mirror'), pair('mirror')], require: 'link' };
    case 'parallel': return { ...base, groups: [pair('parallel'), pair('mirror')], require: 'link' };
    case 'walls': return { ...base, walls: [1, 3], lens: [1, 2, 2, 3], groups: [pair('any'), pair('any')], require: 'link' };
    case 'cross': return { ...base, groups: [pair('cross'), pair('free')], require: 'cross' };
    case 'ice': return { ...base, ice: [1, 2], groups: [pair('free')], require: 'ice' };
    case 'gate': return { ...base, gates: [1, 3], groups: [pair('free'), pair('free')], require: 'gate' };
    case 'pad': return { ...base, pads: [1, 1], groups: [pair('free'), pair('free')], require: 'pad' };
  }
};

const challenges: PackSpec[] = [
  {
    id: 'clock', count: 60, target: (i) => 3 + Math.round((i / 59) * 10),
    cfg: (i) => mixCfg(i, 5000, MID), max: slack(0.4, 2),
    time: (o, i) => Math.round(o * (7 - (i / 59) * 3.5) + 12),
  },
  { id: 'exact', count: 60, target: (i) => 3 + Math.round((i / 59) * 11), cfg: (i) => mixCfg(i, 7000, ALL), max: (o) => o },
  {
    id: 'fog', count: 40, target: (i) => 3 + Math.round((i / 39) * 9),
    cfg: (i) => ({ w: 6, h: 6, blocks: [5, 9], groups: [pair('free'), pair(i % 3 === 0 ? 'cross' : 'free')], require: 'link' }),
    max: slack(0.4, 2),
  },
  { id: 'rush', count: 120, target: (i) => 3 + (i % 5), cfg: (i) => mixCfg(i, 9000, EARLY), max: slack(0.6, 3) },
  { id: 'daily', count: 90, target: (i) => 8 + (i % 7), cfg: (i) => mixCfg(i, 11000, EARLY), max: slack(0.3, 2) },
  {
    // Kids zone: plain sliding only (no twins, no specials), small boards, no move limit.
    // 1-20 on 4x4 (1-3 moves), 21-40 on 5x5 (2-5), 41-60 on 6x6 (3-7).
    id: 'kids', count: 60,
    target: (i) => (i < 20 ? [1, 1, 1, 2, 2, 2, 2, 2, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3][i] : i < 40 ? 2 + Math.floor(((i - 20) / 20) * 4) : 3 + Math.floor(((i - 40) / 20) * 5)),
    cfg: (i) => (i < 20 ? { w: 4, h: 4, blocks: [1, 3] } : i < 40 ? { w: 5, h: 5, blocks: [2, 5] } : { w: 6, h: 6, blocks: [3, 7] }),
    max: () => 999,
  },
];

/** Optional slice of a pack (`--part k/N`): build only indices j with j % N === k, to run one pack on several cores. */
let PART: { k: number; n: number } | null = null;

function buildPack(spec: PackSpec, seed: number): LevelDef[] {
  const t0 = Date.now();
  const out: (LevelDef | null)[] = Array(spec.count).fill(null);
  const seen = new Set<string>();
  const r = mulberry(seed);
  let explorations = 0;
  const accept = (j: number, c: { level: Omit<LevelDef, 'id' | 'max'> } | undefined | null) => {
    if (!c || out[j]) return false;
    const key = JSON.stringify(c.level.blocks);
    if (seen.has(key)) return false;
    seen.add(key);
    const opt = c.level.opt;
    out[j] = {
      id: `${spec.id}-${String(j + 1).padStart(3, '0')}`,
      ...c.level,
      max: spec.max(opt, j),
      ...(spec.time ? { time: spec.time(opt, j) } : {}),
    } as LevelDef;
    return true;
  };
  // Pass 1: cheap random seeds, harvested for every pending slot sharing the config.
  for (let round = 0; round < 40; round++) {
    const pending = out.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0 && (!PART || i % PART.n === PART.k));
    if (!pending.length) break;
    const bySig = new Map<string, number[]>();
    for (const j of pending) {
      const sig = JSON.stringify(spec.cfg(j));
      if (!bySig.has(sig)) bySig.set(sig, []);
      bySig.get(sig)!.push(j);
    }
    for (const [, js] of bySig) {
      const cfg = spec.cfg(js[0]);
      const wanted = new Set(js.map((j) => spec.target(j)));
      explorations++;
      const got = harvest(r, cfg, wanted);
      for (const j of js) if (accept(j, got.get(spec.target(j)))) got.delete(spec.target(j));
    }
  }
  // Pass 2: hill-climb for the remaining (hard) slots.
  for (let j = 0; j < spec.count; j++) {
    if (PART && j % PART.n !== PART.k) continue;
    if (PART) console.log(`${spec.id}: level ${j + 1} (target ${spec.target(j)})`);
    for (let attempt = 0; !out[j]; attempt++) {
      if (attempt > 60) throw new Error(`pack ${spec.id}: cannot build level ${j + 1} (target ${spec.target(j)})`);
      const target = spec.target(j);
      const floor = target - Math.floor(attempt / 6);
      explorations++;
      accept(j, evolve(r, spec.cfg(j), target, floor));
    }
  }
  if (PART) return out as LevelDef[];
  // Smooth the curve: within each config band, order levels by optimal length.
  const bands = new Map<string, number[]>();
  for (let j = 0; j < spec.count; j++) {
    const sig = JSON.stringify(spec.cfg(j));
    if (!bands.has(sig)) bands.set(sig, []);
    bands.get(sig)!.push(j);
  }
  const final = [...out] as LevelDef[];
  for (const idx of bands.values()) {
    const sorted = idx.map((j) => out[j]!).sort((x, y) => x.opt - y.opt);
    idx.forEach((j, k) => {
      const lv = { ...sorted[k], id: `${spec.id}-${String(j + 1).padStart(3, '0')}` };
      lv.max = spec.max(lv.opt, j);
      if (spec.time) lv.time = spec.time(lv.opt, j);
      final[j] = lv;
    });
  }
  console.log(`${spec.id}: ${spec.count} levels in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${explorations} runs, opt ${final.map((l) => l.opt).join(',')}`);
  return final;
}

const args = process.argv.slice(2);
const file = 'src/data/levels.json';
const all = [...worlds, ...challenges];
mkdirSync('tools/out', { recursive: true });
if (args[0] === '--merge') {
  const packs: Record<string, LevelDef[]> = {};
  for (const spec of all) {
    const f = `tools/out/${spec.id}.json`;
    if (existsSync(f)) packs[spec.id] = JSON.parse(readFileSync(f, 'utf8'));
    else console.warn(`missing pack ${spec.id}`);
  }
  writeFileSync(file, JSON.stringify(packs));
  console.log(`wrote ${file}: ${Object.values(packs).reduce((a, p) => a + p.length, 0)} levels`);
} else {
  const pi = args.indexOf('--part');
  if (pi >= 0) {
    const [k, n] = args[pi + 1].split('/').map(Number);
    PART = { k, n };
    args.splice(pi, 2);
  }
  if (args[0] === '--join') {
    // Combine part files of one pack, then sort by difficulty within config bands.
    const spec = all.find((x) => x.id === args[1])!;
    const out: (LevelDef | null)[] = Array(spec.count).fill(null);
    for (const f of readdirSync('tools/out').filter((f) => f.startsWith(`${spec.id}.part`))) {
      (JSON.parse(readFileSync(`tools/out/${f}`, 'utf8')) as (LevelDef | null)[]).forEach((lv, j) => lv && (out[j] = lv));
    }
    if (out.some((x) => !x)) throw new Error(`${spec.id}: missing levels after join`);
    const bands = new Map<string, number[]>();
    for (let j = 0; j < spec.count; j++) {
      const sig = JSON.stringify(spec.cfg(j));
      if (!bands.has(sig)) bands.set(sig, []);
      bands.get(sig)!.push(j);
    }
    const final = [...out] as LevelDef[];
    for (const idx of bands.values()) {
      const sorted = idx.map((j) => out[j]!).sort((x, y) => x.opt - y.opt);
      idx.forEach((j, q) => {
        const lv = { ...sorted[q], id: `${spec.id}-${String(j + 1).padStart(3, '0')}` };
        lv.max = spec.max(lv.opt, j);
        if (spec.time) lv.time = spec.time(lv.opt, j);
        final[j] = lv;
      });
    }
    writeFileSync(`tools/out/${spec.id}.json`, JSON.stringify(final));
    console.log(`${spec.id}: joined, opt ${final.map((l) => l.opt).join(',')}`);
  } else {
    const only = new Set(args);
    all.forEach((spec, k) => {
      if (only.size && !only.has(spec.id)) return;
      const levels = buildPack(spec, 4242 + k * 101 + (PART ? PART.k * 7919 : 0));
      writeFileSync(PART ? `tools/out/${spec.id}.part${PART.k}.json` : `tools/out/${spec.id}.json`, JSON.stringify(levels));
    });
  }
}
