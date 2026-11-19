// טעינת התוכן מתיקיית content/ (ב-Node). באפליקציה התוכן ייטען כ-JSON רגיל.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Content } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = join(here, '..', '..', 'content');

function read(name: string): any {
  return JSON.parse(readFileSync(join(CONTENT_DIR, name), 'utf8'));
}

/** ממיר את קובצי התוכן למבנה שהמנוע צריך */
export function parseContent(raw: { roster: any[]; matchTypes: any; venues: any; difficulty: any }): Content {
  return {
    roster: raw.roster,
    stipulations: raw.matchTypes.stipulations,
    venues: raw.venues.tiers.map((t: any) => ({ tier: t.tier, cost: t.cost, capacity: t.capacity, ticket: t.ticket, quality: t.quality })),
    difficulty: raw.difficulty.levels.map((l: any) => ({ name: l.name, matches: l.matches, promos: l.promos })),
  };
}

export function loadContent(): Content {
  return parseContent({
    roster: read('roster.json'),
    matchTypes: read('match_types.json'),
    venues: read('venues.json'),
    difficulty: read('difficulty.json'),
  });
}
