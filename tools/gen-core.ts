/**
 * Level generation by state-graph analysis:
 *  1. Build a random "seed" board for the requested mechanics.
 *  2. Explore every state reachable from it, recording edges.
 *  3. Reverse-BFS from the winning states: exact optimal distance for every state.
 *  4. Pick a state at exactly the requested distance as the level start.
 * This gives full control over difficulty (optimal move count) and every level is solver-verified.
 */
import { Puzzle, type State } from '../src/engine/puzzle';
import type { BlockDef, Dir, LevelDef, Side } from '../src/engine/types';

export type Rng = () => number;
export function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T>(r: Rng, a: T[]) => a[Math.floor(r() * a.length)];

/**
 * mirror / parallel / any: members share an axis (any = random signs).
 * cross: members on different axes.  free: any axis, random signs.
 */
export type LinkKind = 'mirror' | 'parallel' | 'cross' | 'any' | 'free' | 'echo';
export interface GenCfg {
  w: number;
  h: number;
  blocks: [number, number]; // non-gold blocks
  lens?: number[]; // pool of lengths
  groups?: { size: number; kind: LinkKind }[];
  walls?: [number, number];
  ice?: [number, number];
  gates?: [number, number];
  pads?: [number, number];
  arrows?: [number, number];
  golds?: 1 | 2;
  goldLinkChance?: number;
  /** Mechanic that must appear on the optimal path. */
  require?: 'link' | 'ice' | 'gate' | 'pad' | 'arrow' | 'cross' | 'echo' | null;
  maxStates?: number;
}

interface Seed {
  def: Omit<LevelDef, 'opt' | 'max' | 'id'>;
}

function buildSeed(r: Rng, cfg: GenCfg): Seed | null {
  const { w, h } = cfg;
  const occ = new Int8Array(w * h);
  const blocks: BlockDef[] = [];
  const exits: { x: number; y: number; side: Side }[] = [];
  const free = (b: BlockDef) => {
    for (let k = 0; k < b.len; k++) {
      const x = b.axis === 'h' ? b.x + k : b.x;
      const y = b.axis === 'h' ? b.y : b.y + k;
      if (x >= w || y >= h || occ[y * w + x]) return false;
    }
    return true;
  };
  const put = (b: BlockDef) => {
    for (let k = 0; k < b.len; k++) {
      const x = b.axis === 'h' ? b.x + k : b.x;
      const y = b.axis === 'h' ? b.y : b.y + k;
      occ[y * w + x] = 1;
    }
    blocks.push(b);
  };
  // Gold #1: horizontal, exits right.
  const gy = ri(r, 1, h - 2);
  put({ x: ri(r, 0, w - 4), y: gy, len: 2, axis: 'h', gold: true });
  exits.push({ x: w - 1, y: gy, side: 'r' });
  if (cfg.golds === 2) {
    // Gold #2: vertical, exits bottom, lane not crossing gold #1 start.
    for (let t = 0; t < 40; t++) {
      const gx = ri(r, 1, w - 2);
      const b: BlockDef = { x: gx, y: ri(r, 0, Math.max(0, gy - 2)), len: 2, axis: 'v', gold: true };
      if (b.y + 2 > h - 1) continue;
      if (!free(b)) continue;
      put(b);
      exits.push({ x: gx, y: h - 1, side: 'b' });
      break;
    }
    if (exits.length < 2) return null;
  }
  // Walls first so blocks avoid them.
  const walls: [number, number][] = [];
  const nW = cfg.walls ? ri(r, ...cfg.walls) : 0;
  for (let t = 0; walls.length < nW && t < 200; t++) {
    const x = ri(r, 0, w - 1);
    const y = ri(r, 0, h - 1);
    if (occ[y * w + x]) continue;
    if (exits.some((e) => e.x === x && e.y === y)) continue;
    occ[y * w + x] = 1;
    walls.push([x, y]);
  }
  const lens = cfg.lens ?? [2, 2, 2, 3];
  const nB = ri(r, ...cfg.blocks);
  for (let t = 0; blocks.length - (cfg.golds ?? 1) < nB && t < 600; t++) {
    const axis = r() < 0.5 ? 'h' : 'v';
    const len = pick(r, lens);
    const b: BlockDef = {
      axis,
      len,
      x: ri(r, 0, axis === 'h' ? w - len : w - 1),
      y: ri(r, 0, axis === 'v' ? h - len : h - 1),
    };
    // Keep the gold lane from being filled with same-axis blockers (they could never clear).
    if (axis === 'h' && b.y === gy) continue;
    if (free(b)) put(b);
  }
  if (blocks.length - (cfg.golds ?? 1) < cfg.blocks[0]) return null;

  // Links.
  const nonGold = blocks.map((b, i) => (b.gold ? -1 : i)).filter((i) => i >= 0);
  const available = [...nonGold];
  let g = 0;
  for (const grp of cfg.groups ?? []) {
    const members: number[] = [];
    if (g === 0 && cfg.goldLinkChance && r() < cfg.goldLinkChance) members.push(0);
    while (members.length < grp.size && available.length) {
      let cand: number;
      if (!members.length || grp.kind === 'free' || grp.kind === 'echo') cand = available.splice(Math.floor(r() * available.length), 1)[0];
      else {
        const want = (i: number) => (grp.kind === 'cross' ? members.length === 1 ? blocks[i].axis !== blocks[members[0]].axis : true : blocks[i].axis === blocks[members[0]].axis);
        const opts = available.filter(want);
        if (!opts.length) return null;
        cand = opts[Math.floor(r() * opts.length)];
        available.splice(available.indexOf(cand), 1);
      }
      members.push(cand);
    }
    if (members.length < 2) break;
    members.forEach((m, k) => {
      blocks[m].group = g;
      let sign: 1 | -1 = 1;
      if (grp.kind === 'mirror' || grp.kind === 'cross') sign = k % 2 === 0 ? 1 : -1;
      else if (grp.kind === 'parallel') sign = 1;
      else sign = r() < 0.5 ? 1 : -1;
      if (grp.kind === 'cross' && r() < 0.5) sign = 1;
      blocks[m].sign = sign;
      if (grp.kind === 'echo') blocks[m].echo = true;
    });
    g++;
  }
  if (cfg.groups?.length && g === 0) return null;

  // Ice.
  const nIce = cfg.ice ? ri(r, ...cfg.ice) : 0;
  for (const i of nonGold.sort(() => r() - 0.5).slice(0, nIce)) blocks[i].ice = true;

  const emptyCells = () => {
    const out: [number, number][] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (!occ[y * w + x] && !exits.some((e) => e.x === x && e.y === y)) out.push([x, y]);
    return out.sort(() => r() - 0.5);
  };
  const gates: { x: number; y: number; g: number }[] = [];
  const nGate = cfg.gates && g > 0 ? ri(r, ...cfg.gates) : 0;
  for (const [x, y] of emptyCells().slice(0, nGate)) {
    gates.push({ x, y, g: ri(r, 0, g - 1) });
    occ[y * w + x] = 1; // keep other specials off this tile
  }
  const pads: [number, number][] = [];
  const nPad = cfg.pads ? ri(r, ...cfg.pads) : 0;
  for (const [x, y] of emptyCells().slice(0, nPad)) {
    pads.push([x, y]);
    occ[y * w + x] = 1;
  }
  const arrows: { x: number; y: number; d: Dir }[] = [];
  const nArr = cfg.arrows ? ri(r, ...cfg.arrows) : 0;
  for (const [x, y] of emptyCells().slice(0, nArr)) {
    arrows.push({ x, y, d: pick(r, ['r', 'l', 'u', 'd'] as Dir[]) });
    occ[y * w + x] = 1;
  }
  return {
    def: {
      w, h, blocks, exits,
      ...(walls.length ? { walls } : {}),
      ...(gates.length ? { gates } : {}),
      ...(pads.length ? { pads } : {}),
      ...(arrows.length ? { arrows } : {}),
    },
  };
}

export interface Candidate {
  level: Omit<LevelDef, 'id' | 'max'>;
  dist: number;
}

type Def = Seed['def'];

interface Analysis {
  p: Puzzle;
  states: State[];
  fwd: number[][];
  dist: Int32Array;
  maxDist: number;
}

/** Explore every state reachable from the def's start and compute exact distance-to-win for each. */
function analyze(def: Def, maxStates: number): Analysis | null {
  const p = new Puzzle({ ...def, id: 'seed', opt: 0, max: 0 });
  const keys = new Map<string, number>();
  const states: State[] = [];
  const fwd: number[][] = [];
  const add = (s: State) => {
    const k = Puzzle.key(s);
    let id = keys.get(k);
    if (id === undefined) {
      id = states.length;
      keys.set(k, id);
      states.push(s);
      fwd.push([]);
    }
    return id;
  };
  add(p.initial());
  const wins: number[] = [];
  for (let q = 0; q < states.length; q++) {
    if (states.length > maxStates) return null;
    const s = states[q];
    if (p.isWin(s)) {
      wins.push(q);
      continue;
    }
    for (const mv of p.moves(s)) fwd[q].push(add(p.apply(s, mv).state));
  }
  if (!wins.length) return null;
  const rev: number[][] = states.map(() => []);
  fwd.forEach((list, a) => list.forEach((b) => rev[b].push(a)));
  const dist = new Int32Array(states.length).fill(-1);
  let frontier = wins;
  for (const wv of wins) dist[wv] = 0;
  let maxDist = 0;
  for (let d = 1; frontier.length; d++) {
    const nf: number[] = [];
    for (const v of frontier)
      for (const u of rev[v])
        if (dist[u] < 0) {
          dist[u] = d;
          nf.push(u);
        }
    frontier = nf;
    if (nf.length) maxDist = d;
  }
  return { p, states, fwd, dist, maxDist };
}

/** Find a start state at exactly distance d that passes quality filters. */
function pickAt(a: Analysis, def: Def, d: number, cfg: GenCfg, r: Rng): Candidate | null {
  const list: number[] = [];
  // A level can't start with an echo already pending.
  for (let i = 0; i < a.states.length; i++) if (a.dist[i] === d && a.states[i][a.p.n + 1] === 0) list.push(i);
  for (let t = 0; t < 8 && list.length; t++) {
    const sid = list.splice(Math.floor(r() * list.length), 1)[0];
    if (!usesMechanic(a.p, a.states, a.fwd, a.dist, sid, cfg)) continue;
    if (!interesting(a.p, a.states, a.fwd, a.dist, sid)) continue;
    return { level: toLevel(a.p, def, a.states[sid], d), dist: d };
  }
  return null;
}

export const genStats = { maxDist: 0, states: 0 };

/** One random seed, harvested at the wanted distances (cheap path for easy levels). */
export function harvest(r: Rng, cfg: GenCfg, wanted: Set<number>): Map<number, Candidate> {
  const out = new Map<number, Candidate>();
  genStats.maxDist = 0;
  genStats.states = 0;
  const seed = buildSeed(r, cfg);
  if (!seed) return out;
  const a = analyze(seed.def, cfg.maxStates ?? 60_000);
  if (!a) return out;
  genStats.maxDist = a.maxDist;
  genStats.states = a.states.length;
  for (const d of wanted) {
    if (d > a.maxDist) continue;
    const c = pickAt(a, seed.def, d, cfg, r);
    if (c) out.set(d, c);
  }
  return out;
}

/**
 * Hill-climb a board toward a target difficulty: mutate pieces, keep changes that
 * don't reduce the hardest reachable distance. Returns a level at exactly `target`
 * (or the closest >= `floor`) once found.
 */
export function evolve(r: Rng, cfg: GenCfg, target: number, floor: number, iters = 400): Candidate | null {
  const maxStates = cfg.maxStates ?? 60_000;
  let def: Def | null = null;
  let a: Analysis | null = null;
  for (let t = 0; t < 60 && !a; t++) {
    const s = buildSeed(r, cfg);
    if (!s) continue;
    def = s.def;
    a = analyze(def, maxStates);
  }
  if (!a || !def) return null;
  let stale = 0;
  for (let it = 0; it < iters; it++) {
    if (a.maxDist >= target) {
      const c = pickAt(a, def, target, cfg, r);
      if (c) return c;
    }
    const cand = mutate(r, def, cfg);
    if (!cand) continue;
    const ca = analyze(cand, maxStates);
    if (!ca) continue;
    if (ca.maxDist >= a.maxDist) {
      if (ca.maxDist > a.maxDist) stale = 0;
      def = cand;
      a = ca;
    } else stale++;
    if (stale > 120) break;
  }
  for (let d = Math.min(target, a.maxDist); d >= floor; d--) {
    const c = pickAt(a, def, d, cfg, r);
    if (c) return c;
  }
  return null;
}

function cellsOf(b: BlockDef): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < b.len; k++) out.push(b.axis === 'h' ? [b.x + k, b.y] : [b.x, b.y + k]);
  return out;
}

function validDef(def: Def): boolean {
  const { w, h } = def;
  const occ = new Int16Array(w * h).fill(-1);
  for (const [x, y] of def.walls ?? []) occ[y * w + x] = -2;
  for (let i = 0; i < def.blocks.length; i++) {
    for (const [x, y] of cellsOf(def.blocks[i])) {
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      if (occ[y * w + x] !== -1) return false;
      occ[y * w + x] = i;
    }
  }
  for (const g of def.gates ?? []) {
    const o = occ[g.y * w + g.x];
    if (o >= 0 && def.blocks[o].group !== g.g) return false;
  }
  // Gold must not already sit on its exit.
  for (const b of def.blocks) {
    if (!b.gold) continue;
    for (const [x, y] of cellsOf(b)) if (def.exits.some((e) => e.x === x && e.y === y)) return false;
  }
  return true;
}

function linksMatchCfg(def: Def, cfg: GenCfg): boolean {
  const groups = cfg.groups ?? [];
  for (let g = 0; g < groups.length; g++) {
    const axes = def.blocks.filter((b) => b.group === g).map((b) => b.axis);
    if (axes.length < 2) continue;
    const same = axes.every((a) => a === axes[0]);
    const k = groups[g].kind;
    if (k === 'cross' && same) return false;
    if ((k === 'mirror' || k === 'parallel' || k === 'any') && !same) return false;
  }
  return true;
}

function mutate(r: Rng, def: Def, cfg: GenCfg): Def | null {
  const nd: Def = JSON.parse(JSON.stringify(def));
  const { w, h } = nd;
  const lens = cfg.lens ?? [2, 2, 2, 3];
  const nonGold = nd.blocks.map((b, i) => (b.gold ? -1 : i)).filter((i) => i >= 0);
  const unlinked = nonGold.filter((i) => nd.blocks[i].group === undefined);
  const op = r();
  const randomPlace = (b: BlockDef) => {
    if (r() < 0.5) {
      b.axis = r() < 0.5 ? 'h' : 'v';
      b.len = pick(r, lens);
    }
    b.x = ri(r, 0, b.axis === 'h' ? w - b.len : w - 1);
    b.y = ri(r, 0, b.axis === 'v' ? h - b.len : h - 1);
  };
  if (op < 0.45 && nonGold.length) {
    randomPlace(nd.blocks[pick(r, nonGold)]);
  } else if (op < 0.6 && unlinked.length && nonGold.length > cfg.blocks[0]) {
    nd.blocks.splice(pick(r, unlinked), 1);
  } else if (op < 0.78 && nonGold.length < cfg.blocks[1]) {
    const b: BlockDef = { x: 0, y: 0, axis: 'h', len: 2 };
    randomPlace(b);
    nd.blocks.push(b);
  } else if (op < 0.88) {
    // Flip a link sign (mirror <-> parallel) unless the world fixes the link type.
    const kinds = new Set((cfg.groups ?? []).map((g) => g.kind));
    const linked = nd.blocks.filter((b) => b.group !== undefined);
    if (!linked.length || kinds.has('mirror') || kinds.has('parallel')) return null;
    const b = pick(r, linked);
    b.sign = b.sign === -1 ? 1 : -1;
  } else {
    // Nudge a special tile or a wall.
    const cats = (['gates', 'arrows', 'pads', 'walls'] as const).filter((c) => nd[c]?.length);
    if (!cats.length) return null;
    const cat = pick(r, [...cats]);
    const x = ri(r, 0, w - 1);
    const y = ri(r, 0, h - 1);
    const taken = [
      ...(nd.gates ?? []).map((g) => [g.x, g.y]),
      ...(nd.arrows ?? []).map((g) => [g.x, g.y]),
      ...(nd.pads ?? []),
      ...(nd.walls ?? []),
      ...nd.exits.map((e) => [e.x, e.y]),
    ];
    if (taken.some(([tx, ty]) => tx === x && ty === y)) return null;
    if (cat === 'gates') Object.assign(pick(r, nd.gates!), { x, y });
    else if (cat === 'arrows') Object.assign(pick(r, nd.arrows!), { x, y, d: pick(r, ['r', 'l', 'u', 'd'] as Dir[]) });
    else {
      const list = nd[cat]!;
      list[Math.floor(r() * list.length)] = [x, y];
    }
  }
  return validDef(nd) && linksMatchCfg(nd, cfg) ? nd : null;
}

function optimalPath(states: State[], fwd: number[][], dist: Int32Array, sid: number) {
  const path = [sid];
  let cur = sid;
  while (dist[cur] > 0) {
    cur = fwd[cur].find((n) => dist[n] === dist[cur] - 1)!;
    path.push(cur);
  }
  return path.map((i) => states[i]);
}

/** Reject starts where many blocks are idle or the solution is a trivial gold slide. */
function interesting(p: Puzzle, states: State[], fwd: number[][], dist: Int32Array, sid: number) {
  if (dist[sid] <= 2) return true;
  const path = optimalPath(states, fwd, dist, sid);
  const moved = new Set<number>();
  for (let i = 1; i < path.length; i++)
    for (let b = 0; b < p.n; b++) if (path[i][b] !== path[i - 1][b]) moved.add(b);
  return moved.size >= Math.min(p.n, 3);
}

function usesMechanic(p: Puzzle, states: State[], fwd: number[][], dist: Int32Array, sid: number, cfg: GenCfg) {
  const req = cfg.require;
  if (!req || dist[sid] <= 1) return true;
  const path = optimalPath(states, fwd, dist, sid);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    for (let k = 0; k < p.n; k++) {
      if (a[k] === b[k]) continue;
      const blk = p.blocks[k];
      if (req === 'link' && blk.group >= 0) return true;
      if (req === 'cross' && blk.group >= 0 && p.groups[blk.group].some((m) => p.blocks[m].axis !== blk.axis)) return true;
      if (req === 'ice' && blk.ice) return true;
    }
    if (req === 'pad' && a[p.n] !== b[p.n]) return true;
    if (req === 'echo' && a[p.n + 1] > 0) {
      const eb = a[p.n + 1] - 1;
      if (a[eb] !== b[eb] && p.blocks[eb].echo) return true;
    }
    if (req === 'gate' || req === 'arrow') {
      const occ = p.occupancy(b);
      const prev = p.occupancy(a);
      for (let c = 0; c < occ.length; c++) {
        if (occ[c] < 0 || occ[c] === prev[c]) continue;
        if (req === 'gate' && p.gate[c] >= 0) return true;
        if (req === 'arrow' && p.arrow[c] >= 0) return true;
      }
    }
  }
  return false;
}

function toLevel(p: Puzzle, def: Seed['def'], s: State, opt: number): Omit<LevelDef, 'id' | 'max'> {
  const blocks = def.blocks.map((b, i) => {
    const nb: BlockDef = { ...b };
    if (b.axis === 'h') nb.x = s[i];
    else nb.y = s[i];
    return nb;
  });
  const mech: string[] = [];
  if (blocks.some((b) => b.group !== undefined)) mech.push('link');
  if (def.walls) mech.push('wall');
  if (blocks.some((b) => b.ice)) mech.push('ice');
  if (def.gates) mech.push('gate');
  if (def.pads) mech.push('pad');
  if (def.arrows) mech.push('arrow');
  if (p.goldIdx.length > 1) mech.push('double');
  return { ...def, blocks, opt, mech, ...(s[p.n] ? { pol: 1 as const } : {}) };
}
