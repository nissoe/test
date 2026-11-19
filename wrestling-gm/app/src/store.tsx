// מצב המשחק באפליקציה. המנוע משנה את האובייקט עצמו, ואנחנו מרעננים את המסך אחרי כל פעולה.
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { newGame } from '../../engine/src/game.ts';
import { draftSequence } from '../../engine/src/draft.ts';
import type { GameState, ShowResult, Settings } from '../../engine/src/types.ts';
import type { Rng } from '../../engine/src/rng.ts';
import { BRANDS, content } from './data.ts';
import { translator, type Lang } from './i18n.ts';
import { setUiLang } from './ui.tsx';

export type Phase = 'setup' | 'draft' | 'hub' | 'results' | 'seasonEnd';

export interface Game {
  state: GameState;
  rng: Rng;
  playerId: string;
  draftSeq: string[];
  draftIdx: number;
  draftFeed: { brand: string; wrestler: string; no: number }[];
  lastResults: ShowResult[];
}

export interface StartOptions {
  brandId: string;
  rivals: number;
  difficulty: string;
  seasonWeeks: 50 | 25;
}

interface Store {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: ReturnType<typeof translator>;
  phase: Phase;
  setPhase: (p: Phase) => void;
  game: Game | null;
  start: (o: StartOptions) => void;
  refresh: () => void;
}

const Ctx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [phase, setPhase] = useState<Phase>('setup');
  const [, setTick] = useState(0);
  const gameRef = useRef<Game | null>(null);

  const setLang = (l: Lang) => {
    setUiLang(l);
    setLangState(l);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
      document.documentElement.lang = l;
    }
  };

  const start = (o: StartOptions) => {
    const others = BRANDS.filter((b) => b.id !== o.brandId).slice(0, o.rivals);
    const player = BRANDS.find((b) => b.id === o.brandId)!;
    // מיקום אקראי בסדר הדראפט, כמו הגרלה
    const order = [player, ...others];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const settings: Settings = {
      seed: Date.now() % 1_000_000,
      seasonWeeks: o.seasonWeeks,
      difficulty: o.difficulty,
      budget: 5_000_000,
      rosterTarget: 20,
      brands: order.map((b) => ({ id: b.id, name: b.name, controller: b.id === o.brandId ? 'local' : 'ai' })),
    };
    const { state, rng } = newGame(settings, content, { draft: false });
    gameRef.current = { state, rng, playerId: o.brandId, draftSeq: draftSequence(state, rng), draftIdx: 0, draftFeed: [], lastResults: [] };
    setPhase('draft');
  };

  const value: Store = { lang, setLang, t: translator(lang), phase, setPhase, game: gameRef.current, start, refresh: () => setTick((x) => x + 1) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('no store');
  return s;
}
