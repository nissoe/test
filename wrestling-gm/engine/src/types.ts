// סוגי הנתונים של המנוע. שמות השדות תואמים לקבצים ב-content/.

export type ClassName = 'Giant' | 'Cruiser' | 'Bruiser' | 'Fighter' | 'Specialist';
export type Role = 'Face' | 'Heel';
export type Pool = 'active' | 'legend' | 'former' | 'free' | 'local';

/** מתאבק כפי שהוא בקובץ roster.json */
export interface WrestlerData {
  id: string;
  name: string;
  nameHe: string;
  gender: 'M' | 'F';
  tier: string;
  pool: Pool;
  class: ClassName;
  role: Role;
  popularity: number;
  ringLevel: number;
  mic: number;
  micGrowth: number;
  stamina: number;
  morale: number;
  salary: number;
  finisher: string;
  tagTeam: string | null;
}

/** מתאבק במשחק: הנתונים, ועוד המצב שמשתנה לאורך העונה */
export interface Wrestler extends WrestlerData {
  maxStamina: number;
  brand: string | null;
  injuredWeeks: number;
  weeksSinceBooked: number;
  wins: number;
  losses: number;
}

export interface Stipulation {
  name: string;
  costTier: number;
  stamina: string;
  starBonus: number;
  rivalry: string;
  unlock: string;
}

export interface VenueTier {
  tier: string;
  cost: number;
  capacity: number;
  ticket: number;
  quality: number;
}

export interface DifficultyLevel {
  name: string;
  matches: number;
  promos: number;
}

export interface Content {
  roster: WrestlerData[];
  stipulations: Stipulation[];
  venues: VenueTier[];
  difficulty: DifficultyLevel[];
}

export interface Title {
  id: string;
  name: string;
  gender: 'M' | 'F';
  kind: 'world' | 'secondary';
  holder: string | null;
  weeksHeld: number;
}

export interface Rivalry {
  a: string;
  b: string;
  level: number;
}

export interface Brand {
  id: string;
  name: string;
  controller: 'ai' | 'local' | 'remote';
  cash: number;
  fans: number;
  roster: string[];
  titles: Title[];
  rivalries: Rivalry[];
  showRatings: number[];
  trophies: number;
}

export type Slot = 'opener' | 'midcard' | 'main';

export interface BookedMatch {
  slot: Slot;
  sides: string[][];
  stipulation: string;
  titleId: string | null;
}

export interface BookedPromo {
  kind: 'Self-Promo' | 'Call-Out' | 'Training';
  wrestlers: string[];
}

export interface ShowPlan {
  venueTier: string;
  matches: BookedMatch[];
  promos: BookedPromo[];
}

export interface MatchResult {
  match: BookedMatch;
  stars: number;
  winnerSide: number;
  winners: string[];
  finisher: string;
  newChampion: string | null;
}

export interface ShowResult {
  brand: string;
  week: number;
  isPle: boolean;
  pleName: string | null;
  matches: MatchResult[];
  rating: number;
  attendance: number;
  revenue: number;
  costs: number;
  fansGained: number;
  injuries: string[];
}

export interface Settings {
  seed: number;
  seasonWeeks: 50 | 25;
  difficulty: string;
  budget: number;
  brands: { id: string; name: string; controller: Brand['controller'] }[];
  rosterTarget: number;
}

export interface GameState {
  settings: Settings;
  week: number;
  season: number;
  wrestlers: Record<string, Wrestler>;
  brands: Brand[];
  history: ShowResult[];
}
