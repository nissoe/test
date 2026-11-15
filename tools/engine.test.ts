import { Puzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import type { LevelDef } from '../src/engine/types';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failed++;
    console.error('FAIL', name);
  } else console.log('ok  ', name);
}
const base = (o: Partial<LevelDef>): LevelDef => ({
  id: 't', w: 6, h: 6, blocks: [], exits: [{ x: 5, y: 2, side: 'r' }], opt: 0, max: 0, ...o,
});

// 1. Gold alone exits in one move.
{
  const p = new Puzzle(base({ blocks: [{ x: 0, y: 2, len: 2, axis: 'h', gold: true }] }));
  const s = p.initial();
  check('gold reach right = 4', p.range(s, 0)[1] === 4);
  const r = p.apply(s, { b: 0, d: 4 });
  check('gold exits', r.exited.length === 1 && p.isWin(r.state));
  check('solve len 1', solve(p, s).path?.length === 1);
}

// 2. Mirror twins: moving A right moves B left; B blocked by wall stops A.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 2, y: 0, len: 2, axis: 'h', group: 0, sign: 1 },
      { x: 2, y: 4, len: 2, axis: 'h', group: 0, sign: -1 },
    ],
    walls: [[0, 4]],
  }));
  const s = p.initial();
  const [neg, pos] = p.range(s, 1);
  check('mirror: A right limited by B hitting wall (1 step)', pos === 1);
  check('mirror: A left limited by B right edge (2 steps)', neg === 2);
  const t = p.apply(s, { b: 1, d: 1 }).state;
  check('mirror: B moved left', t[2] === 1 && t[1] === 3);
}

// 3. Parallel twins move together.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 0, y: 0, len: 2, axis: 'h', group: 0, sign: 1 },
      { x: 3, y: 5, len: 2, axis: 'h', group: 0, sign: 1 },
    ],
  }));
  const s = p.initial();
  check('parallel: right reach limited by B (1)', p.range(s, 1)[1] === 1);
}

// 4. Perpendicular twin: horizontal A moving right moves vertical B down.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 0, y: 0, len: 2, axis: 'h', group: 0, sign: 1 },
      { x: 4, y: 3, len: 2, axis: 'v', group: 0, sign: 1 },
    ],
  }));
  const s = p.initial();
  check('cross: A right limited by B bottom (1)', p.range(s, 1)[1] === 1);
  const t = p.apply(s, { b: 1, d: 1 }).state;
  check('cross: B moved down', t[2] === 4);
}

// 5. Ice slides fully.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 0, y: 0, len: 2, axis: 'h', ice: true },
    ],
  }));
  const mv = p.moves(p.initial()).filter((m) => m.b === 1);
  check('ice: one move only, full slide', mv.length === 1 && mv[0].d === 4);
}

// 6. Gates.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 0, y: 0, len: 2, axis: 'h', group: 0, sign: 1 },
      { x: 0, y: 4, len: 1, axis: 'h', group: 0, sign: -1 },
    ],
    gates: [{ x: 3, y: 2, g: 0 }],
  }));
  check('gate blocks gold', p.range(p.initial(), 0)[1] === 1);
}

// 7. Polarity pad flips relationship.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 0, y: 0, len: 1, axis: 'h', group: 0, sign: 1 },
      { x: 2, y: 4, len: 1, axis: 'h', group: 0, sign: -1 },
    ],
    pads: [[1, 0]],
  }));
  const s = p.initial();
  const r = p.apply(s, { b: 1, d: 1 });
  check('pad flip triggered', r.flips === 1 && r.state[p.n] === 1);
  const t = p.apply(r.state, { b: 1, d: 1 }).state;
  check('after flip twins move parallel', t[2] === 2 && t[1] === 2);
}

// 8. One-way arrows.
{
  const p = new Puzzle(base({
    blocks: [{ x: 0, y: 2, len: 2, axis: 'h', gold: true }],
    arrows: [{ x: 3, y: 2, d: 'l' }],
  }));
  check('arrow blocks wrong-way entry', p.range(p.initial(), 0)[1] === 1);
}

// 9. Two golds.
{
  const p = new Puzzle(base({
    blocks: [
      { x: 0, y: 2, len: 2, axis: 'h', gold: true },
      { x: 1, y: 0, len: 2, axis: 'v', gold: true },
    ],
    exits: [{ x: 5, y: 2, side: 'r' }, { x: 1, y: 5, side: 'b' }],
  }));
  const res = solve(p, p.initial());
  check('two golds: needs 2 moves', res.path?.length === 2);
}

if (failed) {
  console.error(`${failed} engine test(s) failed`);
  process.exit(1);
}
console.log('all engine tests passed');
