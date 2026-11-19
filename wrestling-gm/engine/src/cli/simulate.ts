// סימולציה של עונה שלמה עם 4 מותגים של המחשב. שימוש: npm run sim -- [seed] [weeks]
import { advanceWeek, endSeason, isSeasonOver, newGame } from '../game.ts';
import { loadContent } from '../content.ts';
import { defaultSettings } from '../setup.ts';

const seed = Number(process.argv[2] ?? 1);
const weeks = Number(process.argv[3] ?? 50) === 25 ? 25 : 50;
const content = loadContent();
const { state, rng } = newGame(defaultSettings(seed, { seasonWeeks: weeks }), content);

const name = (id: string) => state.wrestlers[id]?.name ?? id;
console.log(`LWF GM — season simulation (seed ${seed}, ${weeks} weeks)\n`);
for (const b of state.brands) {
  const champs = b.titles.map((t) => `${t.kind}/${t.gender}: ${t.holder ? name(t.holder) : '-'}`).join(', ');
  console.log(`${b.name}: ${b.roster.length} wrestlers, cash after draft $${b.cash.toLocaleString()} | ${champs}`);
}
console.log('');

let ples = 0;
let injuries = 0;
while (!isSeasonOver(state)) {
  const res = advanceWeek(state, content, rng);
  injuries += res.reduce((s, r) => s + r.injuries.length, 0);
  if (res[0].isPle) {
    ples++;
    const best = [...res].sort((a, b) => b.rating - a.rating)[0];
    const main = best.matches.find((m) => m.match.slot === 'main');
    const mainTxt = main ? `${main.match.sides.map((s) => s.map(name).join(' & ')).join(' vs ')} (${main.stars}★, ${name(main.winners[0])} wins)` : '';
    console.log(`Week ${String(res[0].week).padStart(2)} PLE ${res[0].pleName}: best ${best.brand} ${best.rating.toFixed(2)}★ — ${mainTxt}`);
  }
}

const standings = endSeason(state);
console.log(`\nPLEs: ${ples} | injuries: ${injuries}\n\nFinal standings:`);
standings.forEach((b, i) => {
  const avg = b.showRatings.reduce((a, x) => a + x, 0) / b.showRatings.length;
  console.log(`${i + 1}. ${b.name}  fans ${b.fans.toLocaleString()}  cash $${Math.round(b.cash).toLocaleString()}  avg ${avg.toFixed(2)}★  trophies ${b.trophies}`);
});
