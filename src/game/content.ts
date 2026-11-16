import levelsJson from '../data/levels.json';
import type { LevelDef } from '../engine/types';

export const PACKS = levelsJson as unknown as Record<string, LevelDef[]>;

type L = { he: string; en: string };

export interface WorldMeta {
  id: string;
  name: L;
  /** Accent color for UI + board rim. */
  color: string;
  intro: { title: L; body: L; icon: string };
  /** Animated mini-diagram shown in the intro card. */
  demo?: 'mirror' | 'parallel' | 'cross' | 'pad' | 'triple' | 'echo';
}

export const WORLDS: WorldMeta[] = [
  {
    id: 'w1', name: { he: 'אור ראשון', en: 'First Light' }, color: '#ffc845',
    intro: {
      icon: '◆',
      title: { he: 'ברוכים הבאים לתאומים', en: 'Welcome to TWINLOCK' },
      body: {
        he: 'החלק את בלוק הזהב אל היציאה הזוהרת. בלוקים זזים רק לאורכם. לכל שלב יש מגבלת מהלכים — פתור במינימום כדי לקבל 3 כוכבים.',
        en: 'Slide the gold block out through the glowing exit. Blocks only move along their length. Every level has a move limit — solve at par for 3 stars.',
      },
    },
  },
  {
    id: 'w2', name: { he: 'מראה', en: 'Mirror' }, color: '#3ee8ff',
    intro: {
      icon: '⇄',
      title: { he: 'עולם המראות', en: 'World of mirrors' },
      body: {
        he: 'מכאן והלאה יש שני זוגות של תאומי מראה על אותו לוח. זכור: כל זוג מזוהה בצבע ובסמל משלו, ותאום חסום עוצר גם את בן הזוג שלו.',
        en: 'From here on there are two pairs of mirror twins on the same board. Each pair has its own color and symbol, and a blocked twin stops its partner too.',
      },
    },
    demo: 'mirror',
  },
  {
    id: 'w3', name: { he: 'מקביל', en: 'Parallel' }, color: '#7cff6b',
    intro: {
      icon: '⇉',
      title: { he: 'מקביל ומראה יחד', en: 'Parallel meets mirror' },
      body: {
        he: 'בעולם הזה זוג מקביל וזוג מראה חולקים את אותו לוח. לפני כל מהלך בדוק את הסמל על הקשת: ⇉ זז איתך, ⇄ זז נגדך.',
        en: 'Here a parallel pair and a mirror pair share the board. Check the arc symbol before each move: ⇉ moves with you, ⇄ moves against you.',
      },
    },
    demo: 'parallel',
  },
  {
    id: 'w4', name: { he: 'אבן', en: 'Stone' }, color: '#c9a27a',
    intro: {
      icon: '▣',
      title: { he: 'עמודי אבן וגדלים', en: 'Stone pillars & sizes' },
      body: { he: 'עמודי אבן לא זזים לעולם. מעכשיו יש גם בלוקים קטנים וארוכים.', en: 'Stone pillars never move. Tiny and long blocks join the board.' },
    },
  },
  {
    id: 'w5', name: { he: 'רוח צולבת', en: 'Crosswind' }, color: '#ff6bd6',
    intro: {
      icon: '⤡',
      title: { he: 'תאומים ניצבים', en: 'Cross twins' },
      body: { he: 'תאום אופקי יכול להיות מחובר לתאום אנכי: ימינה כאן — למטה (או למעלה) שם.', en: 'A horizontal twin can be linked to a vertical one: right here means down (or up) there.' },
    },
    demo: 'cross',
  },
  {
    id: 'w6', name: { he: 'קרחון', en: 'Glacier' }, color: '#9fdcff',
    intro: {
      icon: '❄',
      title: { he: 'בלוקי קרח', en: 'Ice blocks' },
      body: { he: 'בלוק קרח מחליק עד הסוף — אי אפשר לעצור אותו באמצע.', en: 'Ice blocks slide all the way — you cannot stop them halfway.' },
    },
  },
  {
    id: 'w7', name: { he: 'שערים', en: 'Gates' }, color: '#ff9a3c',
    intro: {
      icon: '⛩',
      title: { he: 'שערי צבע', en: 'Color gates' },
      body: { he: 'רק בלוק בצבע של השער יכול לעבור דרכו. לכל השאר זה קיר.', en: 'Only blocks matching a gate’s color may pass. For everyone else it is a wall.' },
    },
  },
  {
    id: 'w8', name: { he: 'קוטביות', en: 'Polarity' }, color: '#b46bff',
    intro: {
      icon: '◎',
      title: { he: 'משטחי קוטביות', en: 'Polarity pads' },
      body: { he: 'כשבלוק עולה על משטח קוטביות — כל החיבורים מתהפכים: מראה הופך למקביל ולהפך.', en: 'When a block steps onto a polarity pad every link flips: mirror becomes parallel and back.' },
    },
    demo: 'pad',
  },
  {
    id: 'w9', name: { he: 'שילוש', en: 'Trinity' }, color: '#ff5470',
    intro: {
      icon: '△',
      title: { he: 'שלישיות', en: 'Triplets' },
      body: { he: 'שלושה בלוקים בשרשרת אחת. כל אחד מושך את שני האחרים.', en: 'Three blocks on one chain. Each one drags the other two.' },
    },
    demo: 'triple',
  },
  {
    id: 'w10', name: { he: 'חד־סטרי', en: 'One Way' }, color: '#45ffb5',
    intro: {
      icon: '➜',
      title: { he: 'משבצות חד־סטריות', en: 'One-way tiles' },
      body: { he: 'אפשר להיכנס למשבצת עם חץ רק בכיוון החץ.', en: 'You may only enter an arrow tile moving in the arrow’s direction.' },
    },
  },
  {
    id: 'w11', name: { he: 'כפול', en: 'Double' }, color: '#ffe066',
    intro: {
      icon: '◆◆',
      title: { he: 'שני בלוקי זהב', en: 'Two gold blocks' },
      body: { he: 'שתי יציאות, שני בלוקי זהב. שניהם חייבים לצאת — ולפעמים הזהב עצמו מחובר לתאום.', en: 'Two exits, two gold blocks. Both must escape — and sometimes gold has a twin.' },
    },
  },
  {
    id: 'w12', name: { he: 'מאסטר', en: 'Master' }, color: '#ffffff',
    intro: {
      icon: '✦',
      title: { he: 'המאסטר', en: 'The Master' },
      body: { he: 'לוח 7×7 וכל המכניקות ביחד. בהצלחה.', en: 'A 7×7 board and every mechanic at once. Good luck.' },
    },
  },
  {
    id: 'w13', name: { he: 'מומחה · הד', en: 'Expert · Echo' }, color: '#8fb8ff',
    intro: {
      icon: '⧖',
      title: { he: 'תאומי הד', en: 'Echo twins' },
      body: {
        he: 'תאום הד לא זז מיד — הוא חוזר על המהלך שלך בתור הבא, אחרי המהלך שאתה עושה. רוח רפאים מראה לאן הוא ינסה להגיע. אם משהו חוסם אותו, הוא נעצר כמה שהוא יכול. ואם תזיז אותו בעצמך לפני — ההד מתבטל. חיבור הד מסומן בעיגול מקווקו.',
        en: 'An echo twin doesn’t move right away — it repeats your move on the next turn, after the move you make then. A ghost shows where it will try to go. If something blocks it, it goes as far as it can. Move it yourself first and the echo is cancelled. Echo links have a dashed ring.',
      },
    },
    demo: 'echo',
  },
];

/** Intros shown before a specific level (mechanics introduced mid-world). */
export const LEVEL_INTROS: Record<string, { icon: string; color: string; title: L; body: L; demo: WorldMeta['demo']; guide: boolean }> = {
  'w1-004': {
    icon: '⇄', color: '#3ee8ff', demo: 'mirror', guide: true,
    title: { he: 'הכירו את התאומים', en: 'Meet the twins' },
    body: {
      he: 'שני בלוקים באותו צבע ועם אותו סמל הם תאומים. הזז אחד — התאום שלו זז אותו מרחק בכיוון ההפוך, כמו במראה ⇄. בלוקים אפורים זזים לבד. אם אחד התאומים חסום, שניהם נעצרים.',
      en: 'Two blocks with the same color and symbol are twins. Move one and its twin moves the same distance the opposite way, like a mirror ⇄. Gray blocks move alone. If either twin is blocked, both stop.',
    },
  },
  'w1-010': {
    icon: '⇉', color: '#7cff6b', demo: 'parallel', guide: true,
    title: { he: 'תאומים מקבילים', en: 'Parallel twins' },
    body: {
      he: 'יש גם תאומים שזזים יחד באותו כיוון ובאותו מרחק. על הקשת שמחברת ביניהם מופיע ⇉ (מקביל) במקום ⇄ (מראה).',
      en: 'Some twins move together, the same way and the same distance. The arc between them shows ⇉ (parallel) instead of ⇄ (mirror).',
    },
  },
  'w1-015': {
    icon: '⇄⇉', color: '#ffc845', demo: 'parallel', guide: false,
    title: { he: 'שני זוגות', en: 'Two pairs' },
    body: {
      he: 'עכשיו יש על הלוח זוג מראה וזוג מקביל. כל זוג בצבע ובסמל משלו — בדוק את הסמל על הקשת לפני שאתה גורר.',
      en: 'Now a mirror pair and a parallel pair share the board. Each pair has its own color and symbol — check the arc symbol before you drag.',
    },
  },
};

export type ChallengeId = 'clock' | 'exact' | 'fog' | 'rush' | 'daily';
export interface ChallengeMeta {
  id: ChallengeId;
  name: L;
  desc: L;
  icon: string;
  color: string;
  /** World that must be completed first. */
  unlockAfter: string;
}
export const CHALLENGES: ChallengeMeta[] = [
  { id: 'clock', icon: '⏱', color: '#ff6b6b', unlockAfter: 'w6', name: { he: 'נצח את השעון', en: 'Beat the Clock' }, desc: { he: '60 שלבים נגד הזמן', en: '60 levels against the timer' } },
  { id: 'exact', icon: '🎯', color: '#3ee8ff', unlockAfter: 'w8', name: { he: 'מהלך מושלם', en: 'Perfect Path' }, desc: { he: '60 שלבים — מגבלת המהלכים היא המינימום', en: '60 levels — the move limit is par' } },
  { id: 'fog', icon: '🌫', color: '#b46bff', unlockAfter: 'w5', name: { he: 'ערפל', en: 'Fog' }, desc: { he: '40 שלבים — התאומים מוסתרים', en: '40 levels — twins are hidden' } },
  { id: 'rush', icon: '⚡', color: '#ffc845', unlockAfter: 'w4', name: { he: 'ריצה', en: 'Rush' }, desc: { he: 'כמה פאזלים תפתור ב־3 דקות?', en: 'How many puzzles in 3 minutes?' } },
];

export const RUSH_SECONDS = 180;

export function packLevels(pack: string): LevelDef[] {
  return PACKS[pack] ?? [];
}

export function starsFor(lv: LevelDef, moves: number): number {
  if (moves <= lv.opt) return 3;
  if (moves <= lv.opt + Math.ceil((lv.max - lv.opt) / 2)) return 2;
  return 1;
}

/** Day index used for the daily puzzle (local midnight). */
export function dayIndex(d = new Date()): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}
export function dailyLevel(day = dayIndex()): LevelDef {
  const pool = packLevels('daily');
  return pool[((day % pool.length) + pool.length) % pool.length];
}
