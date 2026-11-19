// המחשב כיריב (החלטה 58): אותם חוקים כמו השחקן, בלי מידע נסתר.
// גרסה ראשונה: בניית תוכנית ובחירת אולם. קלפים, גיוס וטריידים יבואו בהמשך.
import { CONFIG } from './config.ts';
import { isGoodMatchup } from './rating.ts';
import type { Rng } from './rng.ts';
import type { Brand, BookedMatch, BookedPromo, Content, GameState, ShowPlan, Slot, Wrestler } from './types.ts';

export function slotsFor(state: GameState, content: Content, week: number): { matches: number; promos: number } {
  const d = content.difficulty.find((x) => x.name === state.settings.difficulty) ?? content.difficulty[1];
  const ples = pleWeeks(state);
  let extra = 0;
  if (ples.includes(week + 1)) extra += CONFIG.pleExtraSlots; // מאומת: תוכנית לפני אירוע שיא
  if (ples.includes(week)) extra += 2; // מודל עבודה: אירוע השיא עצמו
  return { matches: d.matches + extra, promos: d.promos };
}

/** האם התנאי פתוח השבוע: מההתחלה, משבוע מסוים, או רק באירועי שיא */
export function isStipUnlocked(stip: { unlock: string }, week: number, isPle: boolean): boolean {
  if (stip.unlock === 'מההתחלה') return true;
  if (stip.unlock === 'אירועי שיא') return isPle;
  const m = stip.unlock.match(/\d+/);
  return m ? week >= Number(m[0]) : true;
}

export function pleWeeks(state: GameState): number[] {
  return state.settings.seasonWeeks === 50 ? CONFIG.pleWeeks50 : CONFIG.pleWeeks25;
}

function value(w: Wrestler): number {
  return w.popularity + w.ringLevel * 1.5;
}

/** בוחר יריב משלים: צד הפוך, סגנון מתאים, והכי חזק שנשאר */
function bestOpponent(a: Wrestler, pool: Wrestler[]): Wrestler | undefined {
  const scored = pool
    .filter((b) => b.gender === a.gender)
    .map((b) => ({ b, s: value(b) + (b.role !== a.role ? 30 : 0) + (isGoodMatchup(a.class, b.class) ? 15 : 0) }));
  scored.sort((x, y) => y.s - x.s);
  return scored[0]?.b;
}

export function aiPlanShow(brand: Brand, state: GameState, content: Content, rng: Rng): ShowPlan {
  const week = state.week;
  const isPle = pleWeeks(state).includes(week);
  const { matches: nMatches, promos: nPromos } = slotsFor(state, content, week);

  // זמינים: לא פצועים, ועם מספיק סיבולת
  const available = brand.roster
    .map((id) => state.wrestlers[id])
    .filter((w) => w.injuredWeeks === 0 && w.stamina >= 35)
    .sort((a, b) => value(b) - value(a));
  const pool = [...available];
  const take = (w: Wrestler) => pool.splice(pool.indexOf(w), 1);

  const matches: BookedMatch[] = [];
  const order: Slot[] = ['main', 'opener', ...Array<Slot>(Math.max(0, nMatches - 2)).fill('midcard')];
  const world = brand.titles.find((t) => t.kind === 'world' && t.gender === 'M');

  for (const slot of order.slice(0, nMatches)) {
    // קרב ראשי באירוע שיא = קרב על התואר העולמי
    let a: Wrestler | undefined;
    let titleId: string | null = null;
    if (slot === 'main' && isPle && world?.holder && pool.some((w) => w.id === world.holder)) {
      a = state.wrestlers[world.holder];
      titleId = world.id;
    } else {
      a = pool[0];
    }
    if (!a) break;
    take(a);
    const b = bestOpponent(a, pool);
    if (!b) break;
    take(b);
    // באירועי שיא: תנאי מיוחד לקרב הראשי, אם יש תקציב
    let stipulation = 'Standard';
    if (isPle && slot === 'main' && brand.cash > 300000) {
      const opts = content.stipulations.filter((s) => ['No Disqualification', 'Steel Cage', 'Ladder', 'Last Man Standing'].includes(s.name) && isStipUnlocked(s, week, isPle));
      if (opts.length) stipulation = rng.pick(opts).name;
    }
    matches.push({ slot, sides: [[a.id], [b.id]], stipulation, titleId });
  }

  // פרומואים: מי שמדבר טוב מהשאר, ואימון לצעירים
  const promos: BookedPromo[] = [];
  const talkers = [...pool].sort((x, y) => y.mic - x.mic);
  for (let i = 0; i < nPromos && talkers.length; i++) {
    const w = talkers.shift()!;
    const kind: BookedPromo['kind'] = w.mic >= 3 ? 'Self-Promo' : 'Training';
    promos.push({ kind, wrestlers: [w.id] });
  }

  // אולם: הגדול ביותר שהמותג יכול להרשות לעצמו ושיתמלא בערך
  const avgPop = available.slice(0, 6).reduce((s, w) => s + w.popularity, 0) / Math.max(1, Math.min(6, available.length));
  const demand = brand.fans * CONFIG.economy.demandFromFans + avgPop * CONFIG.economy.demandPerPopularity;
  // אולם: הרווח הצפוי מכרטיסים, ועוד ערך לאיכות, בלי לסכן את הקופה
  let venue = content.venues[0];
  let best = -Infinity;
  for (const v of content.venues) {
    if (v.cost > brand.cash * 0.25) continue;
    const cap = v.capacity + (isPle ? 5000 : 0);
    const ticket = v.ticket + (isPle ? 2 : 0);
    const score = Math.min(cap, demand) * ticket * CONFIG.economy.ticketMultiplier - v.cost + v.quality * CONFIG.economy.qualityValue * (isPle ? 3 : 1);
    if (score > best) { best = score; venue = v; }
  }
  return { venueTier: venue.tier, matches, promos };
}
