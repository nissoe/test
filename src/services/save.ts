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
  /** Ambient music; undefined in older saves means on. */
  music?: boolean;
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
  /** True once the player picked a language in Settings; otherwise the game stays in Hebrew. */
  langChosen?: boolean;
}

export interface SaveStore {
  load(): Profile;
  save(p: Profile): void;
}

export function defaultProfile(): Profile {
  // Hebrew-first game: Hebrew is the default; English stays available in Settings.
  const lang: Lang = 'he';
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
    settings: { lang, sound: true, haptics: true, music: true, quality: 'high' },
  };
}

// v2: progress was wiped for a clean start after the world 1 redesign. Older keys are deleted on load.
const KEY = 'twinlock.profile.v2';
const OLD_KEYS = ['twinlock.profile.v1'];

export class LocalSaveStore implements SaveStore {
  load(): Profile {
    try {
      for (const k of OLD_KEYS) localStorage.removeItem(k);
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p: Profile = { ...defaultProfile(), ...JSON.parse(raw) };
        if (!p.langChosen) p.settings.lang = 'he';
        return p;
      }
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
