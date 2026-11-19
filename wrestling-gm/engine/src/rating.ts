// ציון קרב ותוכנית (מודל עבודה, ראו config.ts).
import { CONFIG } from './config.ts';
import type { Rng } from './rng.ts';
import type { ClassName, Stipulation, Wrestler } from './types.ts';

const R = CONFIG.rating;

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

export function isGoodMatchup(a: ClassName, b: ClassName): boolean {
  if (a === 'Specialist' || b === 'Specialist') return true;
  return CONFIG.goodMatchups.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** בונוס/קנס על התאמת הסגנונות והצדדים בין שני צדדים של קרב */
export function chemistry(sideA: Wrestler[], sideB: Wrestler[]): number {
  let score = 0;
  let pairs = 0;
  for (const a of sideA) {
    for (const b of sideB) {
      pairs++;
      if (isGoodMatchup(a.class, b.class)) score += R.goodMatchup;
      else if (a.class === b.class) score += R.badMatchup;
      score += a.role !== b.role ? R.faceVsHeel : R.sameRole;
    }
  }
  return pairs ? score / pairs : 0;
}

export interface RateInput {
  sides: Wrestler[][];
  stip: Stipulation;
  rivalryLevel: number;
  isTitle: boolean;
  rng: Rng;
}

/** ציון קרב בכוכבים, 0.5–5, ברבעים */
export function rateMatch({ sides, stip, rivalryLevel, isTitle, rng }: RateInput): number {
  const all = sides.flat();
  let stars = R.base + R.popWeight * (avg(all.map((w) => w.popularity)) / 100) + R.ringWeight * (avg(all.map((w) => w.ringLevel)) / 30);
  // התאמות: ממוצע על כל זוגות הצדדים
  let chem = 0;
  let n = 0;
  for (let i = 0; i < sides.length; i++) {
    for (let j = i + 1; j < sides.length; j++) {
      chem += chemistry(sides[i], sides[j]);
      n++;
    }
  }
  stars += n ? chem / n : 0;
  stars += stip.starBonus;
  stars += R.rivalryPerLevel * rivalryLevel;
  if (isTitle) stars += R.titleBonus;
  for (const side of sides) {
    if (side.length === 2 && side[0].tagTeam && side[0].tagTeam === side[1].tagTeam) stars += R.tagTeamBonus;
  }
  const lowStamina = avg(all.map((w) => Math.max(0, R.staminaFloor - w.stamina))) / R.staminaFloor;
  stars -= R.staminaPenalty * lowStamina;
  stars += rng.range(-R.noise, R.noise);
  const clamped = Math.min(R.max, Math.max(R.min, stars));
  return Math.round(clamped / R.step) * R.step;
}

/** ציון התוכנית: הפותח והראשי קובעים את רוב הציון, ועוד בונוס איכות של האולם */
export function rateShow(opener: number, mids: number[], main: number, venueQuality: number): number {
  const S = CONFIG.show;
  const mid = mids.length ? avg(mids) : (opener + main) / 2;
  const raw = S.openerWeight * opener + S.midWeight * mid + S.mainWeight * main;
  return Math.min(5, Math.round(raw * (1 + venueQuality / 100) * 100) / 100);
}
