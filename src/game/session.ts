import { Puzzle, type State } from '../engine/puzzle';
import type { LevelDef, Move } from '../engine/types';

export type Status = 'playing' | 'won' | 'failed';
export type FailReason = 'moves' | 'time';

export interface SessionOptions {
  /** Seconds; the session fails when it runs out. */
  timeLimit?: number;
  /** Fog mode: link identities are hidden until a group moves. */
  fog?: boolean;
}

/** One attempt at one level: state, history, limits. Rendering-agnostic. */
export class Session {
  readonly puzzle: Puzzle;
  state: State;
  history: State[] = [];
  moves = 0;
  maxMoves: number;
  status: Status = 'playing';
  failReason: FailReason | null = null;
  timeLeft: number | null;
  readonly revealed = new Set<number>();

  constructor(readonly level: LevelDef, readonly opts: SessionOptions = {}) {
    this.puzzle = new Puzzle(level);
    this.state = this.puzzle.initial();
    this.maxMoves = level.max;
    this.timeLeft = opts.timeLimit ?? null;
  }

  get movesLeft() {
    return this.maxMoves - this.moves;
  }

  range(b: number): [number, number] {
    if (this.status !== 'playing') return [0, 0];
    return this.puzzle.range(this.state, b);
  }

  play(mv: Move) {
    if (this.status !== 'playing' || !this.puzzle.isLegal(this.state, mv)) return null;
    this.history.push(this.state);
    const res = this.puzzle.apply(this.state, mv);
    this.state = res.state;
    this.moves++;
    const g = this.puzzle.blocks[mv.b].group;
    if (g >= 0) this.revealed.add(g);
    if (this.puzzle.isWin(this.state)) this.status = 'won';
    else if (this.moves >= this.maxMoves) {
      this.status = 'failed';
      this.failReason = 'moves';
    }
    return res;
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.state = prev;
    this.moves--;
    if (this.status === 'failed' && this.failReason === 'moves') {
      this.status = 'playing';
      this.failReason = null;
    }
    return true;
  }

  /** Reset the board. A clock that already ran out stays failed (the UI offers a full retry). */
  restart() {
    this.state = this.puzzle.initial();
    this.history = [];
    this.moves = 0;
    this.maxMoves = this.level.max;
    if (this.failReason !== 'time') {
      this.status = 'playing';
      this.failReason = null;
    }
  }

  addMoves(n: number) {
    this.maxMoves += n;
    if (this.status === 'failed' && this.failReason === 'moves') {
      this.status = 'playing';
      this.failReason = null;
    }
  }

  tick(dt: number) {
    if (this.timeLeft === null || this.status !== 'playing') return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft === 0) {
      this.status = 'failed';
      this.failReason = 'time';
    }
  }
}
