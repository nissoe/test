// הגדרות ברירת מחדל למשחק חדש: 4 מותגים, עונה של 50 שבועות.
import type { Settings } from './types.ts';

export function defaultSettings(seed = 1, overrides: Partial<Settings> = {}): Settings {
  return {
    seed,
    seasonWeeks: 50,
    difficulty: 'Normal',
    budget: 5_000_000, // ברירת המחדל במקור
    rosterTarget: 20, // המינימום במקור לכל תוכנית
    brands: [
      { id: 'b1', name: 'Brand 1', controller: 'ai' },
      { id: 'b2', name: 'Brand 2', controller: 'ai' },
      { id: 'b3', name: 'Brand 3', controller: 'ai' },
      { id: 'b4', name: 'Brand 4', controller: 'ai' },
    ],
    ...overrides,
  };
}
