// לולאת המשחק: פתיחת משחק, הרצת שבוע, וסוף עונה.
import { aiPlanShow, pleWeeks } from './ai.ts';
import { CONFIG } from './config.ts';
import { runDraft } from './draft.ts';
import { rateMatch, rateShow } from './rating.ts';
import { Rng } from './rng.ts';
import type { Brand, Content, GameState, MatchResult, Settings, ShowPlan, ShowResult, Title, Wrestler } from './types.ts';

export function newGame(settings: Settings, content: Content): { state: GameState; rng: Rng } {
  const rng = new Rng(settings.seed);
  const wrestlers: Record<string, Wrestler> = {};
  for (const d of content.roster) {
    wrestlers[d.id] = { ...d, maxStamina: d.stamina, brand: null, injuredWeeks: 0, weeksSinceBooked: 0, wins: 0, losses: 0 };
  }
  const brands: Brand[] = settings.brands.map((b) => ({
    ...b,
    cash: settings.budget,
    fans: CONFIG.economy.startFans,
    roster: [],
    titles: [],
    rivalries: [],
    showRatings: [],
    trophies: 0,
  }));
  const state: GameState = { settings, week: 1, season: 1, wrestlers, brands, history: [] };
  runDraft(state, rng, 'snake');
  for (const b of brands) assignTitles(b, state);
  return { state, rng };
}

/** תארים התחלתיים: עולמי ומשני לגברים ולנשים, למחזיקים החזקים ברוסטר */
function assignTitles(brand: Brand, state: GameState): void {
  const roster = brand.roster.map((id) => state.wrestlers[id]).sort((a, b) => b.popularity + b.ringLevel - (a.popularity + a.ringLevel));
  const make = (kind: Title['kind'], gender: 'M' | 'F', rank: number): Title => {
    const holder = roster.filter((w) => w.gender === gender)[rank];
    if (holder) holder.popularity = Math.min(CONFIG.popularity.max, holder.popularity + CONFIG.popularity.championBonus);
    const label = kind === 'world' ? 'World' : 'Secondary';
    return { id: `${brand.id}-${kind}-${gender}`, name: `${brand.name} ${gender === 'F' ? "Women's " : ''}${label} Championship`, gender, kind, holder: holder?.id ?? null, weeksHeld: 0 };
  };
  brand.titles = [make('world', 'M', 0), make('secondary', 'M', 2), make('world', 'F', 0), make('secondary', 'F', 2)];
}

function rivalryLevel(brand: Brand, a: string, b: string): number {
  return brand.rivalries.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))?.level ?? 0;
}

function bumpRivalry(brand: Brand, a: string, b: string, rng: Rng, ends: boolean): void {
  let r = brand.rivalries.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (!r) {
    r = { a, b, level: 1 };
    brand.rivalries.push(r);
    return;
  }
  if (r.level < CONFIG.rivalry.maxLevel && rng.chance(CONFIG.rivalry.levelUpChance)) r.level++;
  if (ends) brand.rivalries.splice(brand.rivalries.indexOf(r), 1);
}

/** מריץ תוכנית של מותג אחד */
export function runShow(brand: Brand, plan: ShowPlan, state: GameState, content: Content, rng: Rng): ShowResult {
  const isPle = pleWeeks(state).includes(state.week);
  const pleIdx = pleWeeks(state).indexOf(state.week);
  const venue = content.venues.find((v) => v.tier === plan.venueTier) ?? content.venues[0];
  let costs = venue.cost;
  const results: MatchResult[] = [];
  const injuries: string[] = [];
  const booked = new Set<string>();

  for (const m of plan.matches) {
    const stip = content.stipulations.find((s) => s.name === m.stipulation) ?? content.stipulations[0];
    costs += (stip.costTier - 1) * CONFIG.economy.stipCostPerTier;
    const sides = m.sides.map((ids) => ids.map((id) => state.wrestlers[id]));
    const flat = sides.flat();
    const level = flat.length === 2 ? rivalryLevel(brand, flat[0].id, flat[1].id) : 0;
    const stars = rateMatch({ sides, stip, rivalryLevel: level, isTitle: !!m.titleId, rng });
    // מנצח: לפי כוח הצד ועוד מזל
    const power = sides.map((s) => s.reduce((t, w) => t + w.popularity + w.ringLevel * 2 + w.stamina / 5, 0) / s.length + rng.range(0, 40));
    const winnerSide = power.indexOf(Math.max(...power));
    const winners = m.sides[winnerSide];
    const finisher = state.wrestlers[winners[0]].finisher;
    let newChampion: string | null = null;
    if (m.titleId) {
      const title = brand.titles.find((t) => t.id === m.titleId);
      if (title && title.holder && !winners.includes(title.holder)) {
        state.wrestlers[title.holder].popularity -= CONFIG.popularity.championBonus;
        title.holder = winners[0];
        title.weeksHeld = 0;
        state.wrestlers[winners[0]].popularity = Math.min(CONFIG.popularity.max, state.wrestlers[winners[0]].popularity + CONFIG.popularity.championBonus);
        newChampion = winners[0];
      }
    }
    // השפעות על המתאבקים
    const staminaCost = (CONFIG.stamina.cost[stip.stamina] ?? 10) + (m.titleId ? CONFIG.stamina.titleExtra : 0);
    sides.forEach((side, i) => {
      for (const w of side) {
        booked.add(w.id);
        w.stamina = Math.max(0, w.stamina - staminaCost);
        if (i === winnerSide) {
          w.wins++;
          w.popularity = Math.min(CONFIG.popularity.max, w.popularity + CONFIG.popularity.winBase + CONFIG.popularity.winPerStar * Math.max(0, stars - 2.5));
          w.morale = Math.min(100, w.morale + CONFIG.morale.winGain);
        } else {
          w.losses++;
          if (stars < CONFIG.popularity.badLossBelowStars) w.popularity = Math.max(1, w.popularity - CONFIG.popularity.badLoss);
          w.morale = Math.max(0, w.morale - CONFIG.morale.lossDrop);
        }
        if (m.slot === 'main') w.morale = Math.min(100, w.morale + CONFIG.morale.mainEventGain);
        // פציעה: מתחת ל-40 סיבולת (מאומת), סיכוי עולה ככל שהיא נמוכה
        if (w.stamina < CONFIG.stamina.injuryBelow && rng.chance(((CONFIG.stamina.injuryBelow - w.stamina) / CONFIG.stamina.injuryBelow) * CONFIG.stamina.injuryMaxChance)) {
          w.injuredWeeks = rng.int(...CONFIG.stamina.injuryWeeks);
          injuries.push(w.id);
        }
      }
    });
    if (flat.length === 2) bumpRivalry(brand, flat[0].id, flat[1].id, rng, stip.rivalry === 'מסיים יריבות');
    results.push({ match: m, stars, winnerSide, winners, finisher, newChampion });
  }

  // פרומואים
  for (const p of plan.promos) {
    costs += CONFIG.economy.promoCost[p.kind] ?? 0;
    for (const id of p.wrestlers) {
      const w = state.wrestlers[id];
      booked.add(id);
      w.stamina = Math.min(w.maxStamina, w.stamina + CONFIG.stamina.promoRecovery);
      if (p.kind === 'Self-Promo') w.popularity = Math.max(1, Math.min(CONFIG.popularity.max, w.popularity + (w.mic - 2.5) * 1.2));
      if (p.kind === 'Training') w.ringLevel = Math.min(30, w.ringLevel + CONFIG.economy.trainingXp * 0.25);
    }
  }

  // ציון התוכנית, קהל וכסף
  const opener = results.find((r) => r.match.slot === 'opener')?.stars ?? 0;
  const main = results.find((r) => r.match.slot === 'main')?.stars ?? 0;
  const mids = results.filter((r) => r.match.slot === 'midcard').map((r) => r.stars);
  const quality = venue.quality + (isPle ? 5 : 0);
  const rating = rateShow(opener, mids, main, quality);
  const cardPop = results.flatMap((r) => r.match.sides.flat()).map((id) => state.wrestlers[id].popularity);
  const avgPop = cardPop.reduce((a, b) => a + b, 0) / Math.max(1, cardPop.length);
  const capacity = venue.capacity + (isPle ? 5000 : 0);
  const ticket = venue.ticket + (isPle ? 2 : 0);
  const demand = brand.fans * CONFIG.economy.demandFromFans + avgPop * CONFIG.economy.demandPerPopularity;
  const attendance = Math.round(Math.min(capacity, demand));
  const revenue = Math.round(attendance * ticket * CONFIG.economy.ticketMultiplier + brand.fans * CONFIG.economy.merchPerFan * (rating / CONFIG.economy.avgStars));
  const fansGained = Math.round((rating - CONFIG.economy.avgStars) * CONFIG.economy.fansPerStarAboveAvg * (isPle ? 2 : 1));
  if (isPle) costs += 50000;
  brand.cash += revenue - costs;
  brand.fans = Math.max(1000, brand.fans + fansGained);
  brand.showRatings.push(rating);

  // מנוחה ומורל למי שלא הופיע
  for (const id of brand.roster) {
    const w = state.wrestlers[id];
    if (w.injuredWeeks > 0 && !injuries.includes(id)) w.injuredWeeks--;
    if (!booked.has(id)) {
      w.stamina = Math.min(w.maxStamina, w.stamina + CONFIG.stamina.restRecovery);
      w.weeksSinceBooked++;
      if (w.weeksSinceBooked > CONFIG.morale.idleWeeksBeforeDrop) w.morale = Math.max(0, w.morale - CONFIG.morale.idleDrop);
    } else {
      w.weeksSinceBooked = 0;
    }
  }
  for (const t of brand.titles) if (t.holder) t.weeksHeld++;

  return {
    brand: brand.id, week: state.week, isPle, pleName: isPle ? CONFIG.pleNames[pleIdx] ?? null : null,
    matches: results, rating, attendance, revenue, costs, fansGained, injuries,
  };
}

/** שבוע אחד לכל המותגים. plans: תוכניות של שחקנים אנושיים; למחשב המנוע מתכנן לבד */
export function advanceWeek(state: GameState, content: Content, rng: Rng, plans: Record<string, ShowPlan> = {}): ShowResult[] {
  const results = state.brands.map((b) => {
    const plan = plans[b.id] ?? aiPlanShow(b, state, content, rng);
    return runShow(b, plan, state, content, rng);
  });
  state.history.push(...results);
  state.week++;
  return results;
}

/** סוף עונה: דירוג לפי מעריצים, וגביע למקום הראשון */
export function endSeason(state: GameState): Brand[] {
  const standings = [...state.brands].sort((a, b) => b.fans - a.fans);
  standings[0].trophies++;
  return standings;
}

export function isSeasonOver(state: GameState): boolean {
  return state.week > state.settings.seasonWeeks;
}
