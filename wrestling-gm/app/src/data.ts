// התוכן של המשחק והמותגים, לשימוש האפליקציה.
import roster from '../../content/roster.json';
import matchTypes from '../../content/match_types.json';
import venues from '../../content/venues.json';
import difficulty from '../../content/difficulty.json';
import { parseContent } from '../../engine/src/parse.ts';

export const content = parseContent({ roster: roster as any[], matchTypes, venues, difficulty });

export interface BrandInfo {
  id: string;
  name: string;
  nameHe: string;
  color: string;
  accent: string;
  tagline: string;
  taglineHe: string;
}

// החלטות 31 ו-35: שמות, אופי וצבעים
export const BRANDS: BrandInfo[] = [
  { id: 'rage', name: 'Rage', nameHe: 'רייג׳', color: '#C8102E', accent: '#2B2B2B', tagline: 'Raw and aggressive', taglineHe: 'גולמי ואגרסיבי' },
  { id: 'throwdown', name: 'Throwdown', nameHe: 'ת׳רודאון', color: '#6B2FA0', accent: '#C0C3CC', tagline: 'Polished, star-studded', taglineHe: 'מלוטש ומלא כוכבים' },
  { id: 'ignite', name: 'Ignite', nameHe: 'איגנייט', color: '#FF6A13', accent: '#111111', tagline: 'Fast and high-flying', taglineHe: 'מהיר ואווירי' },
  { id: 'breakout', name: 'Breakout', nameHe: 'ברייקאאוט', color: '#00C2C7', accent: '#FFFFFF', tagline: 'Young and hungry', taglineHe: 'צעיר ורעב' },
  { id: 'uproar', name: 'Uproar', nameHe: 'אפרור', color: '#FFC72C', accent: '#7A7A7A', tagline: 'Chaotic and brutal', taglineHe: 'כאוטי ואכזרי' },
];

export const brandInfo = (id: string) => BRANDS.find((b) => b.id === id)!;

// תנאים שמתאימים לקרב יחיד (בגרסה הזו המחשב והשחקן קובעים רק קרבות אחד על אחד)
const MULTI_ONLY = ['Battle Royal', 'Gauntlet', 'Gauntlet Eliminator', 'Legends Rush', 'Title vs Title', 'Golden Ticket Ladder', 'Rookie Gauntlet', 'Tag Turmoil'];
export const singlesStips = content.stipulations.filter((s) => !MULTI_ONLY.includes(s.name));
