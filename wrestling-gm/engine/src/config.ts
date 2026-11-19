// כל המספרים שמכיילים את המשחק, במקום אחד.
// "מודל עבודה" = יכויל במחקר המספרים (החלטה 23) ובסימולטור האיזון.
import type { ClassName } from './types.ts';

export const CONFIG = {
  // ---- ציון קרב (מודל עבודה) ----
  rating: {
    base: 0.75,
    popWeight: 1.8, // לפי פופולריות ממוצעת / 100
    ringWeight: 1.0, // לפי רמת ניסיון ממוצעת / 30
    goodMatchup: 0.4, // ענק–קל-משקל, לוחם–מכתש, מומחה–כולם
    badMatchup: -0.2, // אותו סגנון (לא מומחה)
    faceVsHeel: 0.3,
    sameRole: -0.5,
    rivalryPerLevel: 0.15,
    titleBonus: 0.25,
    tagTeamBonus: 0.2, // צמד אמיתי
    staminaFloor: 50, // מתחת לזה הביצוע נפגע
    staminaPenalty: 1.0,
    noise: 0.4,
    min: 0.5,
    max: 5,
    step: 0.25,
  },
  // ---- ציון התוכנית ----
  show: {
    openerWeight: 0.3,
    mainWeight: 0.4,
    midWeight: 0.3,
  },
  // ---- סיבולת ----
  stamina: {
    cost: { 'נמוכה': 6, 'רגילה': 10, 'משתנה': 12, 'גבוהה': 15, 'גבוהה מאוד': 20, 'קיצונית': 25 } as Record<string, number>,
    titleExtra: 5,
    restRecovery: 12,
    promoRecovery: 6,
    injuryBelow: 40, // מאומת: מתחת ל-40 סיכון הפציעה עולה
    injuryMaxChance: 0.25,
    injuryWeeks: [1, 4] as [number, number],
  },
  // ---- מורל ----
  morale: {
    idleWeeksBeforeDrop: 3,
    idleDrop: 5,
    mainEventGain: 3,
    winGain: 2,
    lossDrop: 1,
  },
  // ---- פופולריות ----
  popularity: {
    winBase: 0.5,
    winPerStar: 0.4, // לכל כוכב מעל 2.5
    badLossBelowStars: 2.5,
    badLoss: 0.5,
    max: 100,
    championBonus: 10,
  },
  // ---- יריבויות ----
  rivalry: {
    levelUpChance: 0.5,
    maxLevel: 4,
  },
  // ---- כלכלה (מודל עבודה) ----
  economy: {
    startFans: 50000,
    ticketMultiplier: 5, // הכנסה = קהל × מחיר כרטיס × מכפיל
    merchPerFan: 0.5, // מרצ'נדייז ושידור: מעריצים × סכום × (ציון / 2.5)
    qualityValue: 3000, // כמה שווה למחשב נקודת איכות של אולם
    demandFromFans: 0.05,
    demandPerPopularity: 150,
    fansPerStarAboveAvg: 400,
    avgStars: 2.5,
    stipCostPerTier: 5000,
    promoCost: { 'Self-Promo': 2500, 'Call-Out': 3000, 'Training': 5000 } as Record<string, number>, // מאומת (2K26)
    trainingXp: 1,
  },
  // ---- התאמות סגנון ----
  goodMatchups: [
    ['Giant', 'Cruiser'],
    ['Fighter', 'Bruiser'],
  ] as [ClassName, ClassName][],
  // ---- אירועי שיא: 16 בעונה של 50 שבועות ----
  pleWeeks50: [3, 6, 9, 12, 15, 18, 21, 25, 28, 31, 34, 37, 40, 43, 46, 50],
  pleWeeks25: [4, 8, 12, 16, 20, 25],
  pleNames: [
    'Rise of Legends', 'Warpath', 'Iron Will', 'Vendetta', 'Blood & Glory', 'Steel Storm', 'Throne Wars', 'Hostile Takeover',
    'Wildfire', 'Winter Wars', 'Full Throttle', 'Supremacy', 'Ironclad', 'Night of Legends', 'Last Legend Standing', 'Legends Forever',
  ],
  pleExtraSlots: 1, // מאומת: משבצת נוספת בתוכנית שלפני אירוע שיא
};
