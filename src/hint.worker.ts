/// <reference lib="webworker" />
import { Puzzle } from './engine/puzzle';
import { solve } from './engine/solver';
import type { LevelDef } from './engine/types';

self.onmessage = (e: MessageEvent<{ id: number; level: LevelDef; state: number[] }>) => {
  const { id, level, state } = e.data;
  const p = new Puzzle(level);
  const res = solve(p, Int8Array.from(state), 600_000);
  (self as DedicatedWorkerGlobalScope).postMessage({ id, path: res.path });
};
