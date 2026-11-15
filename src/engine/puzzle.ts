import type { Axis, Dir, LevelDef, Move, Side } from './types';

/**
 * State layout: one Int8Array of length n+1.
 *   s[i]  = position of block i along its axis (x for 'h', y for 'v'), or -1 once a gold block has exited.
 *   s[n]  = global polarity (0 = links as authored, 1 = every link inverted).
 */
export type State = Int8Array;

const DIR_CODE: Record<Dir, number> = { r: 0, l: 1, u: 2, d: 3 };

export interface StaticBlock {
  axis: Axis;
  len: number;
  /** Fixed coordinate: y for horizontal blocks, x for vertical ones. */
  lane: number;
  gold: boolean;
  group: number; // -1 if unlinked
  sign: number;
  ice: boolean;
}

export interface MoveResult {
  state: State;
  /** Gold block indices that exited during this move. */
  exited: number[];
  /** Number of polarity flips triggered. */
  flips: number;
}

export class Puzzle {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  readonly blocks: StaticBlock[];
  readonly groups: number[][];
  /** 0 empty, 1 wall */
  readonly wall: Uint8Array;
  /** group id of a gate, -1 none */
  readonly gate: Int8Array;
  /** one-way dir code, -1 none */
  readonly arrow: Int8Array;
  readonly pad: Uint8Array;
  readonly padCells: number[];
  /** exit side code per cell, -1 none. (0 r, 1 l, 2 t, 3 b) */
  readonly exit: Int8Array;
  readonly goldIdx: number[];

  constructor(readonly def: LevelDef) {
    const { w, h } = def;
    this.w = w;
    this.h = h;
    this.n = def.blocks.length;
    this.blocks = def.blocks.map((b) => ({
      axis: b.axis,
      len: b.len,
      lane: b.axis === 'h' ? b.y : b.x,
      gold: !!b.gold,
      group: b.group ?? -1,
      sign: b.sign ?? 1,
      ice: !!b.ice,
    }));
    const gmap = new Map<number, number[]>();
    this.blocks.forEach((b, i) => {
      if (b.group < 0) return;
      if (!gmap.has(b.group)) gmap.set(b.group, []);
      gmap.get(b.group)!.push(i);
    });
    this.groups = [];
    for (const [g, m] of gmap) this.groups[g] = m;
    this.wall = new Uint8Array(w * h);
    this.gate = new Int8Array(w * h).fill(-1);
    this.arrow = new Int8Array(w * h).fill(-1);
    this.pad = new Uint8Array(w * h);
    this.exit = new Int8Array(w * h).fill(-1);
    for (const [x, y] of def.walls ?? []) this.wall[y * w + x] = 1;
    for (const g of def.gates ?? []) this.gate[g.y * w + g.x] = g.g;
    for (const a of def.arrows ?? []) this.arrow[a.y * w + a.x] = DIR_CODE[a.d];
    this.padCells = [];
    for (const [x, y] of def.pads ?? []) {
      this.pad[y * w + x] = 1;
      this.padCells.push(y * w + x);
    }
    const sideCode: Record<Side, number> = { r: 0, l: 1, t: 2, b: 3 };
    for (const e of def.exits) this.exit[e.y * w + e.x] = sideCode[e.side];
    this.goldIdx = this.blocks.map((b, i) => (b.gold ? i : -1)).filter((i) => i >= 0);
  }

  initial(): State {
    const s = new Int8Array(this.n + 1);
    this.def.blocks.forEach((b, i) => (s[i] = b.axis === 'h' ? b.x : b.y));
    s[this.n] = this.def.pol ?? 0;
    return s;
  }

  static key(s: State): string {
    // Positions are small (-1..15) so offset into printable range.
    let k = '';
    for (let i = 0; i < s.length; i++) k += String.fromCharCode(s[i] + 40);
    return k;
  }

  isWin(s: State): boolean {
    for (const g of this.goldIdx) if (s[g] >= 0) return false;
    return true;
  }

  /** Cell (x,y) of segment k of block i at position p. */
  cellOf(i: number, p: number, k: number): number {
    const b = this.blocks[i];
    return b.axis === 'h' ? b.lane * this.w + p + k : (p + k) * this.w + b.lane;
  }

  occupancy(s: State): Int16Array {
    const occ = new Int16Array(this.w * this.h).fill(-1);
    for (let c = 0; c < occ.length; c++) if (this.wall[c]) occ[c] = -2;
    for (let i = 0; i < this.n; i++) {
      if (s[i] < 0) continue;
      for (let k = 0; k < this.blocks[i].len; k++) occ[this.cellOf(i, s[i], k)] = i;
    }
    return occ;
  }

  /** Members that move when `driver` is dragged (alive only), with their relative direction factor. */
  linked(s: State, driver: number): { idx: number[]; rel: number[] } {
    const b = this.blocks[driver];
    if (b.group < 0) return { idx: [driver], rel: [1] };
    const inv = s[this.n] ? -1 : 1;
    const idx: number[] = [];
    const rel: number[] = [];
    for (const m of this.groups[b.group]) {
      if (s[m] < 0) continue;
      idx.push(m);
      rel.push(m === driver ? 1 : b.sign * this.blocks[m].sign * inv);
    }
    return { idx, rel };
  }

  private motionDir(i: number, delta: number): number {
    const b = this.blocks[i];
    if (b.axis === 'h') return delta > 0 ? 0 : 1;
    return delta > 0 ? 3 : 2;
  }

  /** How many unit steps the group can travel when `driver` moves in direction `dir` (+1/-1). */
  reach(s: State, driver: number, dir: 1 | -1, occ?: Int16Array): number {
    if (s[driver] < 0) return 0;
    occ ??= this.occupancy(s);
    const { idx, rel } = this.linked(s, driver);
    const cur = idx.map((m) => s[m]);
    const limit = Math.max(this.w, this.h);
    let steps = 0;
    const seen = new Int16Array(this.w * this.h).fill(-1);
    while (steps < limit) {
      let ok = true;
      const nxt: number[] = [];
      const stamp = steps;
      for (let j = 0; j < idx.length && ok; j++) {
        const m = idx[j];
        const blk = this.blocks[m];
        const delta = dir * rel[j];
        const np = cur[j] + delta;
        const max = (blk.axis === 'h' ? this.w : this.h) - blk.len;
        if (np < 0 || np > max) {
          ok = false;
          break;
        }
        const md = this.motionDir(m, delta);
        for (let k = 0; k < blk.len; k++) {
          const c = this.cellOf(m, np, k);
          const o = occ[c];
          if (o === -2 || (o >= 0 && !idx.includes(o))) {
            ok = false;
            break;
          }
          if (seen[c] === stamp) {
            ok = false; // two members collide
            break;
          }
          seen[c] = stamp;
          const g = this.gate[c];
          if (g >= 0 && blk.group !== g) {
            ok = false;
            break;
          }
          const a = this.arrow[c];
          if (a >= 0 && a !== md) {
            // Only blocked when newly entering the tile.
            let wasInside = false;
            for (let q = 0; q < blk.len; q++) if (this.cellOf(m, cur[j], q) === c) wasInside = true;
            if (!wasInside) {
              ok = false;
              break;
            }
          }
        }
        nxt.push(np);
      }
      if (!ok) break;
      for (let j = 0; j < idx.length; j++) cur[j] = nxt[j];
      steps++;
    }
    return steps;
  }

  /** All legal moves. Ice drivers only offer their full slide. */
  moves(s: State): Move[] {
    const out: Move[] = [];
    const occ = this.occupancy(s);
    for (let i = 0; i < this.n; i++) {
      if (s[i] < 0) continue;
      for (const dir of [1, -1] as const) {
        const r = this.reach(s, i, dir, occ);
        if (r === 0) continue;
        if (this.blocks[i].ice) out.push({ b: i, d: dir * r });
        else for (let k = 1; k <= r; k++) out.push({ b: i, d: dir * k });
      }
    }
    return out;
  }

  /** Range of legal drags for UI: [-neg, +pos]. */
  range(s: State, i: number): [number, number] {
    const occ = this.occupancy(s);
    return [this.reach(s, i, -1, occ), this.reach(s, i, 1, occ)];
  }

  /** Apply a move assumed legal. */
  apply(s: State, mv: Move): MoveResult {
    const n = this.n;
    const before = this.padCells.length ? this.occupancy(s) : null;
    const t = new Int8Array(s);
    const { idx, rel } = this.linked(s, mv.b);
    for (let j = 0; j < idx.length; j++) t[idx[j]] = s[idx[j]] + mv.d * rel[j];
    let flips = 0;
    if (before) {
      const after = this.occupancy(t);
      for (const c of this.padCells) if (before[c] < 0 && after[c] >= 0) flips++;
      if (flips & 1) t[n] = t[n] ? 0 : 1;
    }
    const exited: number[] = [];
    for (const g of this.goldIdx) {
      if (t[g] < 0) continue;
      const b = this.blocks[g];
      for (let k = 0; k < b.len; k++) {
        const c = this.cellOf(g, t[g], k);
        const e = this.exit[c];
        if (e < 0) continue;
        if ((b.axis === 'h' && e <= 1) || (b.axis === 'v' && e >= 2)) {
          exited.push(g);
          t[g] = -1;
          break;
        }
      }
    }
    return { state: t, exited, flips };
  }

  isLegal(s: State, mv: Move): boolean {
    if (mv.d === 0 || s[mv.b] < 0) return false;
    const r = this.reach(s, mv.b, mv.d > 0 ? 1 : -1);
    if (this.blocks[mv.b].ice) return Math.abs(mv.d) === r;
    return Math.abs(mv.d) <= r;
  }
}
