# Pawzzle Maze Lab — portable web prototype

Runnable source for [the Maze Lab Site](https://pawzzle-maze-lab.gohpihan.chatgpt.site), packaged as a standalone React/Vite app. The puzzle engine and UI are copied from the published prototype; only the hosting/bootstrap layer and import paths differ. No ChatGPT account, Sites credentials, backend, or Godot installation is needed to run this copy locally.

Design references: [V3 GDD](../GAME_DESIGN_DEVELOPMENT_V3.md) and [Godot action plan](../GODOT_FOUR_HOUR_ACTION_PLAN.md). This folder supplements the existing browser and Godot projects; it does not replace them.

## Run locally

Install Node.js 24 or newer. From the repository root:

```sh
cd web-prototype
npm ci
npm run dev
```

Open the local URL printed by Vite. Run commands from this folder so they use this prototype's package and lockfile rather than the repository root package.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

The production build is in `dist/`. Serve it over HTTP; do not open `index.html` directly with a file URL. The current app uses browser-local storage, so saves belong to the browser and origin. Saves from the private Site will not automatically appear on localhost.

## Play and test

1. Select size, collectibles, key/delivery rules, and an optional seed; press **Generate puzzle**.
2. Start at the green ring. Click neighboring cells, drag through corridors, or focus the board and use arrow keys.
3. Collect diamonds and the key; carry the purple parcel to D if delivery is enabled.
4. Finish at the bottom-right house and press **Go**. Undo removes a move; retracing a corridor adds a move.
5. Compare your move count with the proven optimum. **Show one optimal solution** loads an assisted plan.
6. **Timed · 60s** offers local challenges; pause hides the board. **Export level JSON** downloads the generated level and verified solution.

The default PAW-1024 puzzle (6×6, three items, key and delivery enabled, unordered) has a 26-move optimum. Tests cover 128 generated combinations plus detour, ordering, delivery, and search-budget fixtures.

## Source map

| File | Purpose |
| --- | --- |
| `src/puzzle.ts` | Pure generation, transition, replay, win predicate, and full-state BFS solver; no React or browser dependency. |
| `src/App.tsx` | Planner, SVG board, playback, objectives, local saves, timer, and JSON export. |
| `src/styles.css` | Minimal responsive layout. |
| `scripts/test-puzzle.mjs` | Determinism, solvability, gate constraints, immutable transitions, and objective-aware optimum tests. |
| `GODOT_PORTING.md` | Data mapping and behavioral requirements for the Godot port. |

## Scope

Implemented: procedural loops, collectibles, optional ordering, persistent key gate, delivery gate, route planning and replay, local completion history, best scores, and timed play. Generation uses a deliberately simple two-cell exit corridor to keep gates unavoidable. It is not an arbitrary mission-dependency generator.

Not implemented: levers, portals, online rankings, cloud saves, GamePix SDK integration, or a Godot runtime. No V3 completion claim is implied. The original private Site remains independently hosted; updating this folder does not automatically update it.
