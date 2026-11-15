import { Puzzle, type State } from './puzzle';
import type { Move } from './types';

export interface SolveResult {
  /** Optimal move sequence, or null if unsolvable / limit hit. */
  path: Move[] | null;
  explored: number;
}

/** Breadth-first search for an optimal solution (each drag counts as one move). */
export function solve(p: Puzzle, start: State, maxNodes = 400_000): SolveResult {
  if (p.isWin(start)) return { path: [], explored: 1 };
  const startKey = Puzzle.key(start);
  const parent = new Map<string, { prev: string; mv: Move } | null>();
  parent.set(startKey, null);
  let frontier: State[] = [start];
  let explored = 1;
  while (frontier.length) {
    const next: State[] = [];
    for (const s of frontier) {
      const sk = Puzzle.key(s);
      for (const mv of p.moves(s)) {
        const t = p.apply(s, mv).state;
        const tk = Puzzle.key(t);
        if (parent.has(tk)) continue;
        parent.set(tk, { prev: sk, mv });
        explored++;
        if (p.isWin(t)) {
          const path: Move[] = [];
          let k: string = tk;
          for (let e = parent.get(k); e; e = parent.get(k)) {
            path.push(e.mv);
            k = e.prev;
          }
          return { path: path.reverse(), explored };
        }
        if (explored > maxNodes) return { path: null, explored };
        next.push(t);
      }
    }
    frontier = next;
  }
  return { path: null, explored };
}
