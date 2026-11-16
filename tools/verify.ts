/** Independently re-solves every shipped level and checks its metadata. */
import { readFileSync } from 'node:fs';
import { Puzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import type { LevelDef } from '../src/engine/types';

const packs: Record<string, LevelDef[]> = JSON.parse(readFileSync('src/data/levels.json', 'utf8'));
let bad = 0;
let total = 0;
const ids = new Set<string>();
for (const [name, levels] of Object.entries(packs)) {
  for (const lv of levels) {
    total++;
    if (ids.has(lv.id)) {
      bad++;
      console.error(`${lv.id}: duplicate id`);
    }
    ids.add(lv.id);
    const p = new Puzzle(lv);
    const res = solve(p, p.initial(), 2_000_000);
    const n = res.path?.length;
    if (n !== lv.opt) {
      bad++;
      console.error(`${lv.id}: stored opt ${lv.opt}, solver found ${n ?? 'none'}`);
    }
    if (lv.max < lv.opt) {
      bad++;
      console.error(`${lv.id}: move limit ${lv.max} below optimum ${lv.opt}`);
    }
    // Replay the solution with legality checks.
    let s = p.initial();
    for (const mv of res.path ?? []) {
      if (!p.isLegal(s, mv)) {
        bad++;
        console.error(`${lv.id}: illegal move in solution`);
        break;
      }
      s = p.apply(s, mv).state;
    }
    if (res.path && !p.isWin(s)) {
      bad++;
      console.error(`${lv.id}: solution does not win`);
    }
  }
  // Curriculum: horizontal<->vertical (cross) links are only taught from world 5 on.
  if (['w1', 'w2', 'w3', 'w4', 'rush', 'daily'].includes(name)) {
    for (const lv of levels) {
      const axes = new Map<number, Set<string>>();
      for (const b of lv.blocks) if (b.group !== undefined) axes.set(b.group, (axes.get(b.group) ?? new Set()).add(b.axis));
      for (const set of axes.values())
        if (set.size > 1) {
          bad++;
          console.error(`${lv.id}: cross link before world 5`);
        }
    }
  }
  if (name === 'kids') {
    // Kids zone: plain sliding only.
    for (const lv of levels)
      if (lv.blocks.some((b) => b.group !== undefined || b.ice || b.echo) || lv.walls || lv.gates || lv.pads || lv.arrows || lv.exits.length > 1) {
        bad++;
        console.error(`${lv.id}: kids level has twins or special pieces`);
      }
  }
  if (name === 'w1') {
    // Levels 1-3 have no twins, 4-9 only mirror pairs, 10-14 only parallel pairs.
    levels.forEach((lv, i) => {
      const signs = new Map<number, number[]>();
      for (const b of lv.blocks) if (b.group !== undefined) signs.set(b.group, [...(signs.get(b.group) ?? []), b.sign ?? 1]);
      const kinds = [...signs.values()].map((s) => (s[0] === s[1] ? 'P' : 'M')).sort().join('');
      const want = i < 3 ? '' : i < 9 ? 'M' : i < 14 ? 'P' : 'MP';
      if (kinds !== want) {
        bad++;
        console.error(`${lv.id}: twins ${kinds || 'none'}, expected ${want || 'none'}`);
      }
    });
  }
  console.log(`${name}: ${levels.length} levels checked`);
}
console.log(`${total} levels, ${bad} problems`);
if (bad) process.exit(1);
