// דראפט: כל המתאבקים הפעילים, לפי סדר בחירה, בתקציב של כל מותג.
import type { Rng } from './rng.ts';
import type { Brand, GameState, Wrestler } from './types.ts';

export type DraftOrder = 'default' | 'snake' | 'roundRobin' | 'reverseRank' | 'random';

/** הערך של מתאבק בעיני המחשב: פופולריות, ניסיון ומיקרופון, ביחס למשכורת */
export function draftValue(w: Wrestler): number {
  return w.popularity * 1.0 + w.ringLevel * 1.5 + w.mic * 2 - w.salary / 20000;
}

export function pickOrder(brands: Brand[], round: number, order: DraftOrder, rng: Rng): Brand[] {
  const list = [...brands];
  if (order === 'snake' && round % 2 === 1) return list.reverse();
  if (order === 'roundRobin') return list.map((_, i) => list[(i + round) % list.length]);
  if (order === 'reverseRank') return list.sort((a, b) => a.fans - b.fans);
  if (order === 'random') return rng.shuffle(list);
  return list;
}

/** בחירה של המחשב: הערך הכי גבוה שעדיין משאיר תקציב, עם איזון בין גברים לנשים */
export function aiPick(brand: Brand, pool: Wrestler[], state: GameState, slotsLeft: number): Wrestler | null {
  const roster = brand.roster.map((id) => state.wrestlers[id]);
  const women = roster.filter((w) => w.gender === 'F').length;
  const wantWoman = women < Math.round(state.settings.rosterTarget * 0.35) && women / Math.max(1, roster.length) < 0.35;
  // לשמור כסף לשאר הבחירות: לפחות 40 אלף לבחירה
  const reserve = Math.max(0, slotsLeft - 1) * 40000;
  const affordable = pool.filter((w) => w.salary <= brand.cash - reserve);
  if (!affordable.length) return null;
  const preferred = affordable.filter((w) => (wantWoman ? w.gender === 'F' : true));
  const choices = preferred.length ? preferred : affordable;
  return choices.reduce((best, w) => (draftValue(w) > draftValue(best) ? w : best));
}

export function runDraft(state: GameState, rng: Rng, order: DraftOrder = 'snake', choose = aiPick): void {
  const pool = Object.values(state.wrestlers).filter((w) => w.pool === 'active' && !w.brand);
  const target = state.settings.rosterTarget;
  for (let round = 0; round < target; round++) {
    for (const brand of pickOrder(state.brands, round, order, rng)) {
      if (brand.roster.length >= target) continue;
      const w = choose(brand, pool, state, target - brand.roster.length);
      if (!w) continue;
      brand.roster.push(w.id);
      brand.cash -= w.salary;
      w.brand = brand.id;
      pool.splice(pool.indexOf(w), 1);
    }
  }
}

/** סדר הבחירות המלא: רשימת מזהי מותגים, בחירה אחרי בחירה (לדראפט צעד-אחר-צעד בממשק) */
export function draftSequence(state: GameState, rng: Rng, order: DraftOrder = 'snake'): string[] {
  const seq: string[] = [];
  for (let round = 0; round < state.settings.rosterTarget; round++) {
    for (const b of pickOrder(state.brands, round, order, rng)) seq.push(b.id);
  }
  return seq;
}

/** בחירה אחת: מוסיף את המתאבק לרוסטר ומוריד את המשכורת מהתקציב */
export function applyPick(state: GameState, brandId: string, wrestlerId: string): void {
  const brand = state.brands.find((b) => b.id === brandId)!;
  const w = state.wrestlers[wrestlerId];
  if (w.brand) throw new Error(`${wrestlerId} already drafted`);
  brand.roster.push(w.id);
  brand.cash -= w.salary;
  w.brand = brand.id;
}

/** מי עדיין פנוי לבחירה */
export function draftPool(state: GameState): Wrestler[] {
  return Object.values(state.wrestlers).filter((w) => w.pool === 'active' && !w.brand);
}
