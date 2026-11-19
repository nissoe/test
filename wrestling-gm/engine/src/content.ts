// טעינת התוכן מתיקיית content/ (ב-Node). באפליקציה התוכן ייטען כ-JSON רגיל.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseContent } from './parse.ts';
import type { Content } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = join(here, '..', '..', 'content');

function read(name: string): any {
  return JSON.parse(readFileSync(join(CONTENT_DIR, name), 'utf8'));
}

export function loadContent(): Content {
  return parseContent({
    roster: read('roster.json'),
    matchTypes: read('match_types.json'),
    venues: read('venues.json'),
    difficulty: read('difficulty.json'),
  });
}
