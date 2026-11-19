// המרת קובצי התוכן למבנה של המנוע. בלי תלות ב-Node, כדי שגם האפליקציה תשתמש בזה.
import type { Content } from './types.ts';

/** ממיר את קובצי התוכן למבנה שהמנוע צריך */
export function parseContent(raw: { roster: any[]; matchTypes: any; venues: any; difficulty: any }): Content {
  return {
    roster: raw.roster,
    stipulations: raw.matchTypes.stipulations,
    venues: raw.venues.tiers.map((t: any) => ({ tier: t.tier, tierHe: t.tierHe, cost: t.cost, capacity: t.capacity, ticket: t.ticket, quality: t.quality })),
    difficulty: raw.difficulty.levels.map((l: any) => ({ name: l.name, nameHe: l.nameHe, matches: l.matches, promos: l.promos })),
  };
}
