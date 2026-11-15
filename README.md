# תאומים · TWINLOCK

A 3D sliding-block puzzle for mobile and web. Every colored block has a **twin**:
drag one and its twin moves the same distance — mirrored (⇄) or in parallel (⇉).
Free the gold block through the exit, within each level's move limit.

Hebrew-first (English available in Settings), built with TypeScript + Three.js, packaged for iOS/Android with Capacitor.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (add --host to test on a phone on the same Wi-Fi)
npm run build      # production build into dist/
npm test           # engine unit tests + re-solves every shipped level
```

Dev shortcuts: `?lv=w5:12` opens world 5 level 12, `?ch=fog:3` / `?ch=rush` / `?ch=daily` open challenges.

## Content

| Pack | Levels | What it adds |
|---|---|---|
| World 1 · First Light | 20 | sliding basics, gold block, exits |
| World 2 · Mirror | 20 | mirror twins ⇄ |
| World 3 · Parallel | 20 | parallel twins ⇉ |
| World 4 · Stone | 20 | stone pillars, 1- and 3-long blocks |
| World 5 · Crosswind | 20 | perpendicular twins (horizontal ↔ vertical) |
| World 6 · Glacier | 20 | ice blocks (always slide to the end) |
| World 7 · Gates | 20 | color gates (only the matching group passes) |
| World 8 · Polarity | 20 | pads that flip every link mirror ↔ parallel |
| World 9 · Trinity | 20 | three-block chains |
| World 10 · One Way | 20 | one-way arrow tiles |
| World 11 · Double | 20 | two gold blocks, two exits, linked gold |
| World 12 · Master | 20 | 7×7 board, everything combined |
| Beat the Clock | 60 | time limit per level |
| Perfect Path | 60 | move limit equals the optimum |
| Fog | 40 | link identities hidden until moved |
| Rush | 120 pool | as many puzzles as possible in 3 minutes |
| Daily | 90 pool | one puzzle per day, streak rewards |

**Every level is generated and verified by the solver**: optimal move count is exact, the move limit is
`optimal + slack` (slack shrinks as the game progresses), stars are awarded for solving at par / near par / within the limit.

### How levels are generated (`tools/`)

1. Build a random board for a world's mechanics (`gen-core.ts: buildSeed`).
2. Explore the full reachable state graph and reverse-BFS from winning states → exact distance-to-win for every state.
3. Hill-climb (mutate pieces, keep changes that don't reduce the hardest distance) until the target difficulty exists.
4. Pick a start state at exactly the target distance, require the world's mechanic to appear on the optimal path,
   and reject boring starts.
5. Sort each world's levels by optimal length so difficulty climbs smoothly.

```bash
npm run gen -- w3 clock     # rebuild some packs into tools/out/
npm run gen -- --merge      # merge tools/out/*.json into src/data/levels.json
npm run verify              # independent re-solve of every level
```

## Code map

```
src/engine/      rules (puzzle.ts), BFS solver, level types — no DOM, shared with tools
src/game/        session (moves, undo, limits, timer), content metadata (worlds, challenges, stars)
src/render/      Three.js scene: PBR blocks, bloom, shadows, link arcs, drag input, particles; skins/themes
src/ui/          screens, HUD, modals (vanilla TS), RTL aware
src/services/    SaveStore (local now, cloud later), Backend interface (leaderboards, IAP) — offline stub
src/hint.worker  solver in a Web Worker for paid hints
tools/           generator, verifier, engine tests
```

## Economy (prepared for release)

- Coins: earned per new star, daily puzzle (+streak bonus), rush score.
- Spend: hints (25), +5 moves after failing (40), block skins (300–1500), board themes (400–500).
- Premium tab (coin packs, remove ads, TWINLOCK Pass) is in place and marked *coming soon* until the online
  service and store integration exist. Every level is solvable without buying anything.

## Mobile builds (Capacitor)

```bash
npm i @capacitor/android @capacitor/ios
npx cap add android      # requires Android Studio
npx cap add ios          # requires Xcode on macOS
npm run cap:sync
```

## Online roadmap

`src/services/backend.ts` defines what the server will provide: accounts + cloud save, leaderboards
(rush, clock, daily), daily puzzle global stats, and purchase receipt validation.
