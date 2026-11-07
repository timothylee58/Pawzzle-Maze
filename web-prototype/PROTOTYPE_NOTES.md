# Pawzzle Maze Lab

Minimal browser rules prototype based on GAME_DESIGN_DEVELOPMENT_V3.md and GODOT_FOUR_HOUR_ACTION_PLAN.md in timothylee58/Pawzzle-Maze. This web app proves the mechanics before a Godot implementation; it is not a Godot export or a GamePix-integrated release.

## Implemented

- Seeded 5–8 square-grid maze generation with loops and bounded, full-state BFS verification.
- One to four required collectibles, optional ordered collection, persistent key gate, and optional parcel delivery gate.
- Route drawing, adjacent-cell clicking, keyboard movement, backtracking, Undo/Clear, and Go playback.
- Completion requires all objectives and home; scoring uses the complete-state optimum.
- Campaign progress and best results in versioned local browser storage.
- Local 60-second challenges with repeated valid submissions, deadline validation, best result retention, and hidden-board pause on tab visibility loss.
- Assisted optimal-route display and level JSON export.

## Architecture

src/puzzle.ts owns pure deterministic generation, transitions, replay, goal checks, and solving. src/App.tsx consumes those functions for UI previews and execution. Generation reserves a two-cell exit corridor so key/delivery gates cannot be bypassed, while all prerequisites are placed in the connected region before them. This is a deliberate simple topology for the skeleton; it does not yet generate arbitrary interdependent gate networks.

All current player actions cost one movement. Collection and delivery are atomic move-entry effects. BFS therefore proves the minimum movement count. Extend to 0–1 BFS before adding explicit zero-cost reusable levers.

The generator explores at most 150,000 states and retains the previous playable puzzle if generation fails. The supported parameter range is intentionally bounded. Exported JSON includes rules/generator versions, seed, adjacency, objects, gate conditions, and a verified optimal route. Adapt this data to Godot's final LevelDefinition contract.

## Verification

Run npm test for seeded-generation and rules tests, npm run typecheck for type checking, and npm run build for the standalone Vite build.

## Explicit limits

No levers, portals, online accounts, server-validated rankings, cloud saves, GamePix SDK, or Godot runtime integration. Local data can be lost when browser storage is cleared. No game theme or artwork is required to use the prototype. Timing is local, not suitable for ranked play. Campaign progression is a collection of completed generated puzzles, not a handcrafted story campaign.

Sources: https://github.com/timothylee58/Pawzzle-Maze/blob/main/GAME_DESIGN_DEVELOPMENT_V3.md and https://github.com/timothylee58/Pawzzle-Maze/blob/main/GODOT_FOUR_HOUR_ACTION_PLAN.md

