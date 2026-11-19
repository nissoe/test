import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/rng.ts';
import { loadContent } from '../src/content.ts';
import { rateMatch } from '../src/rating.ts';
import { advanceWeek, endSeason, isSeasonOver, newGame } from '../src/game.ts';
import { defaultSettings } from '../src/setup.ts';
import { slotsFor } from '../src/ai.ts';

const content = loadContent();

test('RNG is deterministic per seed', () => {
  const a = new Rng(42), b = new Rng(42), c = new Rng(43);
  const sa = Array.from({ length: 10 }, () => a.next());
  assert.deepEqual(sa, Array.from({ length: 10 }, () => b.next()));
  assert.notDeepEqual(sa, Array.from({ length: 10 }, () => c.next()));
});

test('content loads', () => {
  assert.equal(content.roster.length, 300);
  assert.ok(content.stipulations.find((s) => s.name === 'Standard'));
  assert.equal(content.venues.length, 6);
  assert.equal(content.difficulty.length, 5);
});

test('match rating stays in 0.5–5 and in quarter steps', () => {
  const { state } = newGame(defaultSettings(7), content);
  const rng = new Rng(9);
  const ws = Object.values(state.wrestlers);
  for (let i = 0; i < 500; i++) {
    const a = rng.pick(ws), b = rng.pick(ws);
    const s = rateMatch({ sides: [[a], [b]], stip: rng.pick(content.stipulations), rivalryLevel: rng.int(0, 4), isTitle: rng.chance(0.3), rng });
    assert.ok(s >= 0.5 && s <= 5, `rating ${s}`);
    assert.equal(s * 4, Math.round(s * 4));
  }
});

test('draft fills every roster and respects budget', () => {
  const { state } = newGame(defaultSettings(3), content);
  const seen = new Set<string>();
  for (const b of state.brands) {
    assert.equal(b.roster.length, 20);
    assert.ok(b.cash >= 0, `${b.id} cash ${b.cash}`);
    for (const id of b.roster) {
      assert.ok(!seen.has(id));
      seen.add(id);
      assert.equal(state.wrestlers[id].pool, 'active');
    }
    assert.equal(b.titles.length, 4);
  }
});

test('go-home show gets +1 slot', () => {
  const { state } = newGame(defaultSettings(1), content);
  assert.equal(slotsFor(state, content, 1).matches, 4); // Normal
  assert.equal(slotsFor(state, content, 2).matches, 5); // before PLE week 3
});

test('full 50-week season runs with 16 PLEs, same seed = same result', () => {
  const run = (seed: number) => {
    const { state, rng } = newGame(defaultSettings(seed), content);
    while (!isSeasonOver(state)) advanceWeek(state, content, rng);
    return { state, standings: endSeason(state) };
  };
  const { state, standings } = run(11);
  assert.equal(state.history.length, 50 * 4);
  assert.equal(new Set(state.history.filter((h) => h.isPle).map((h) => h.week)).size, 16);
  assert.equal(standings[0].trophies, 1);
  for (const h of state.history) assert.ok(h.rating >= 0 && h.rating <= 5);
  const again = run(11);
  assert.deepEqual(again.standings.map((b) => [b.id, b.fans]), standings.map((b) => [b.id, b.fans]));
});

test('25-week season has 6 PLEs', () => {
  const { state, rng } = newGame(defaultSettings(5, { seasonWeeks: 25 }), content);
  while (!isSeasonOver(state)) advanceWeek(state, content, rng);
  assert.equal(state.history.filter((h) => h.isPle).length / 4, 6);
});
