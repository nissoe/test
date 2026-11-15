/** Coordinates: x grows right, y grows down. (0,0) is the top-left cell. */
export type Axis = 'h' | 'v';
/** Board edge an exit sits on. */
export type Side = 'r' | 'l' | 't' | 'b';
/** Direction a one-way arrow tile allows entry from. */
export type Dir = 'r' | 'l' | 'u' | 'd';

export interface BlockDef {
  x: number;
  y: number;
  len: number;
  axis: Axis;
  /** The key block(s) that must leave through an exit. */
  gold?: boolean;
  /** Link group id. Blocks sharing a group move together. */
  group?: number;
  /** Link polarity inside the group. Two members with equal sign move the same way, opposite signs mirror. */
  sign?: 1 | -1;
  /** Ice blocks always slide as far as they can. */
  ice?: boolean;
}

export interface LevelDef {
  id: string;
  w: number;
  h: number;
  blocks: BlockDef[];
  exits: { x: number; y: number; side: Side }[];
  walls?: [number, number][];
  /** Color gate: only members of group `g` may occupy this cell. */
  gates?: { x: number; y: number; g: number }[];
  /** Polarity pads: whenever a block newly covers a pad, every link flips mirror <-> parallel. */
  pads?: [number, number][];
  /** One-way tiles: a block may only enter the tile while moving in direction `d`. */
  arrows?: { x: number; y: number; d: Dir }[];
  /** Starting polarity (1 = links begin inverted). */
  pol?: 0 | 1;
  /** Optimal solution length (solver verified). */
  opt: number;
  /** Move limit for this level. */
  max: number;
  /** Time limit in seconds (clock mode only). */
  time?: number;
  /** Mechanics present, used for intros/analytics. */
  mech?: string[];
}

/** A move: drag block `b` by `d` cells along its axis (d != 0). */
export interface Move {
  b: number;
  d: number;
}
