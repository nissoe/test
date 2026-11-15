/**
 * Player profile persistence. The game only talks to `SaveStore`, so a cloud
 * implementation (accounts, cross-device sync) can replace LocalSaveStore later
 * without touching gameplay code.
 */
import type { Lang } from '../i18n';

export interface Settings {
  lang: Lang;
  sound: boolean;
  haptics: boolean;
  quality: 'high' | 'low';
}

export interface Profile {
  version: 1;
  /** levelId -> best stars (1..3) */
  stars: Record<string, number>;
  /** levelId -> fewest moves */
  bestMoves: Record<string, number>;
  coins: number;
  owned: string[];
  equippedSkin: string;
  equippedTheme: string;
  seenIntros: string[];
  rushBest: number;
  dailyLastDay: number;
  dailyStreak: number;
  settings: Settings;
}

export interface SaveStore {
  load(): Profile;
  save(p: Profile): void;
}

export function defaultProfile(): Profile {
  const lang: Lang = (navigator.language || '').startsWith('he') ? 'he' : 'en';
  return {
    version: 1,
    stars: {},
    bestMoves: {},
    coins: 150,
    owned: ['skin:prism', 'theme:nebula'],
    equippedSkin: 'prism',
    equippedTheme: 'nebula',
    seenIntros: [],
    rushBest: 0,
    dailyLastDay: -1,
    dailyStreak: 0,
    settings: { lang, sound: true, haptics: true, quality: 'high' },
  };
}

const KEY = 'twinlock.profile.v1';

export class LocalSaveStore implements SaveStore {
  load(): Profile {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
    } catch {
      /* storage unavailable (private mode) — play with an in-memory profile */
    }
    return defaultProfile();
  }
  save(p: Profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }
}
