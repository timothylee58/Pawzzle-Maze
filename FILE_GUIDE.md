# Pawzzle Maze — file guide and appendix

Start here if you are new to this repository. All paths below are relative to the repository root (the first page you see when opening the repo on GitHub).

## Choose the project before editing

| Area                         | Location                                  | What it is                                                                                                                         |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| V3 browser adventure         | [apps/web](apps/web/)                     | The main browser workspace: tutorials, Royal Garden and dog/Mocha playback.                                                        |
| Shared browser/backend rules | [packages/game-core](packages/game-core/) | JavaScript game rules; V3 code is in its `v3/` folder.                                                                             |
| HTTP backend                 | [apps/api](apps/api/)                     | Fastify API and SQLite storage. V3 browser simulation can run locally without it.                                                  |
| Standalone Maze Lab          | [web-prototype](web-prototype/)           | Separate React/TypeScript prototype with its own install/build commands. This is the source selected by the GitHub Pages workflow. |
| Godot demo                   | [games/godot](games/godot/)               | Separate V1 game. Open `project.godot` in Godot; it does not yet implement the V3 adventure.                                       |
| Frankie's workspace          | [Frankie](Frankie/)                       | Personal task notes, drafts and handoff checklist. Start with its README.                                                          |

These implementations do not automatically synchronize. Editing Maze Lab does not change the V3 browser adventure, Godot project or separately hosted original Site. Root npm workspaces cover `apps/*` and `packages/*`; `web-prototype` has a separate package and lockfile.

## Shared art assets

[assets/replicate](assets/replicate/README.md) holds the imported game and marketing PNG originals. See its manifest for source links and checksums. These assets are not automatically loaded by any of the three game projects.

## Where to start

- **Understand the current target:** [V3 design](GAME_DESIGN_DEVELOPMENT_V3.md), then [root README](README.md) for what is actually implemented.
- **Change V3 screens or controls:** `apps/web/src/adventure.js` and `adventure.css`.
- **Change V3 levels or rules:** `packages/game-core/v3/levels.js` and `rules.js`; consult [V3 backend documentation](docs/V3_BACKEND.md).
- **Change Maze Lab:** `web-prototype/src/App.tsx` for UI, `puzzle.ts` for logic, `styles.css` for appearance.
- **Work in Godot:** [Godot README](games/godot/README.md), [action plan](GODOT_FOUR_HOUR_ACTION_PLAN.md), and [porting guide](web-prototype/GODOT_PORTING.md).
- **Find older demos:** `apps/web/legacy.html` (practice) and `apps/web/daily.html` (daily challenge).

## Run the correct project

Use Node.js 24 for the JavaScript projects. In a terminal opened at the repository root:

```sh
# Main browser + API workspace
npm ci
npm run dev
```

For the separate Maze Lab prototype, use a terminal in its folder:

```sh
cd web-prototype
npm ci
npm run dev
```

Open the URL printed by the development server. For Godot, import `games/godot/project.godot` in Godot 4.5+ and press F5.

Checks from the root: `npm run check`; browser checks: `npm run test:browser` after the browser installation described in the root README. Checks from `web-prototype/`: `npm test`, `npm run typecheck`, `npm run build`. Godot test commands are in its README.

## Complete tracked-file appendix

Inventory checked against `main` commit `c9721b558dbe35b32827ff2e91204335e1d97229` on 7 November 2026, plus the two documentation files introduced with this guide. Generated and local-only files are excluded. Keep this table updated when adding, moving or deleting tracked files.

| File                                                                             | Purpose                                                               |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml)                           | Automated continuous-integration checks.                              |
| [`.github/workflows/maze-pages.yml`](.github/workflows/maze-pages.yml)           | Tests, builds and deploys web-prototype to GitHub Pages.              |
| [`.gitignore`](.gitignore)                                                       | Files Git should ignore, such as dependencies and local data.         |
| [`.nvmrc`](.nvmrc)                                                               | Node.js version selection for compatible version managers.            |
| [`.prettierignore`](.prettierignore)                                             | Files excluded from automatic formatting.                             |
| [`.prettierrc.json`](.prettierrc.json)                                           | Shared formatting preferences.                                        |
| [`DISCUSSION_SUMMARY.md`](DISCUSSION_SUMMARY.md)                                 | Team discussion and dog-adventure direction.                          |
| [`FILE_GUIDE.md`](FILE_GUIDE.md)                                                 | This repository map and complete tracked-file appendix.               |
| [`Frankie/README.md`](Frankie/README.md)                                         | Frankie's workspace, starting points and task checklist.              |
| [`GAMEPIX_SUBMISSION.md`](GAMEPIX_SUBMISSION.md)                                 | GamePix submission guidance.                                          |
| [`GAME_DESIGN_DEVELOPMENT.md`](GAME_DESIGN_DEVELOPMENT.md)                       | Original game design; historical V1 reference.                        |
| [`GAME_DESIGN_DEVELOPMENT_V2.md`](GAME_DESIGN_DEVELOPMENT_V2.md)                 | Second design revision; historical reference.                         |
| [`GAME_DESIGN_DEVELOPMENT_V3.md`](GAME_DESIGN_DEVELOPMENT_V3.md)                 | Current consolidated design target; not a list of completed features. |
| [`GODOT_FOUR_HOUR_ACTION_PLAN.md`](GODOT_FOUR_HOUR_ACTION_PLAN.md)               | Proposed Godot implementation plan.                                   |
| [`README.md`](README.md)                                                         | Project overview, setup, commands and implementation status.          |
| [`apps/api/.env.example`](apps/api/.env.example)                                 | Example local API environment configuration.                          |
| [`apps/api/package.json`](apps/api/package.json)                                 | API package dependencies and commands.                                |
| [`apps/api/src/app.js`](apps/api/src/app.js)                                     | Fastify application and HTTP endpoint wiring.                         |
| [`apps/api/src/app.test.js`](apps/api/src/app.test.js)                           | API integration tests.                                                |
| [`apps/api/src/index.js`](apps/api/src/index.js)                                 | API server startup.                                                   |
| [`apps/api/src/service.js`](apps/api/src/service.js)                             | Original daily-round game service.                                    |
| [`apps/api/src/store.js`](apps/api/src/store.js)                                 | SQLite persistence.                                                   |
| [`apps/api/src/v3.test.js`](apps/api/src/v3.test.js)                             | V3 API integration tests.                                             |
| [`apps/api/src/v3/routes.js`](apps/api/src/v3/routes.js)                         | V3 HTTP route adapter.                                                |
| [`apps/api/src/v3/service.js`](apps/api/src/v3/service.js)                       | V3 backend service.                                                   |
| [`apps/web/daily.html`](apps/web/daily.html)                                     | Original daily challenge browser entry.                               |
| [`apps/web/index.html`](apps/web/index.html)                                     | Default V3 adventure browser entry.                                   |
| [`apps/web/legacy.html`](apps/web/legacy.html)                                   | Original practice demo browser entry.                                 |
| [`apps/web/package.json`](apps/web/package.json)                                 | Browser workspace dependencies and commands.                          |
| [`apps/web/src/adventure.css`](apps/web/src/adventure.css)                       | V3 adventure styling.                                                 |
| [`apps/web/src/adventure.js`](apps/web/src/adventure.js)                         | V3 adventure controls, presentation and playback.                     |
| [`apps/web/src/api/client.js`](apps/web/src/api/client.js)                       | Browser HTTP client for the API.                                      |
| [`apps/web/src/app.js`](apps/web/src/app.js)                                     | Original local practice controller.                                   |
| [`apps/web/src/daily.js`](apps/web/src/daily.js)                                 | Original server-backed daily controller.                              |
| [`apps/web/src/scene.js`](apps/web/src/scene.js)                                 | Three.js board renderer.                                              |
| [`apps/web/src/style.css`](apps/web/src/style.css)                               | Original browser demo styling.                                        |
| [`apps/web/src/ui/board.js`](apps/web/src/ui/board.js)                           | Shared board markup and UI helpers.                                   |
| [`apps/web/vite.config.js`](apps/web/vite.config.js)                             | Browser build and development-server configuration.                   |
| [`docs/V3_BACKEND.md`](docs/V3_BACKEND.md)                                       | V3 rules, API integration, behavior and test documentation.           |
| [`games/godot/README.md`](games/godot/README.md)                                 | Godot import, play and test instructions.                             |
| [`games/godot/board.gd`](games/godot/board.gd)                                   | Godot board rendering and pointer input.                              |
| [`games/godot/integration_test.gd`](games/godot/integration_test.gd)             | Godot full-round integration test.                                    |
| [`games/godot/main.gd`](games/godot/main.gd)                                     | Godot UI, game flow and local persistence.                            |
| [`games/godot/main.tscn`](games/godot/main.tscn)                                 | Main Godot scene.                                                     |
| [`games/godot/project.godot`](games/godot/project.godot)                         | Godot project file to import in the editor.                           |
| [`games/godot/round.gd`](games/godot/round.gd)                                   | Godot round scoring and deadlines.                                    |
| [`games/godot/rules.gd`](games/godot/rules.gd)                                   | Godot maze generation and route rules.                                |
| [`games/godot/tests.gd`](games/godot/tests.gd)                                   | Godot rule tests.                                                     |
| [`package-lock.json`](package-lock.json)                                         | Exact root dependency versions; maintained by npm.                    |
| [`package.json`](package.json)                                                   | Root npm workspaces, dependencies and commands.                       |
| [`packages/game-core/core.js`](packages/game-core/core.js)                       | Original seeded maze generation, pathfinding and scoring.             |
| [`packages/game-core/core.test.js`](packages/game-core/core.test.js)             | Original shared-rule tests.                                           |
| [`packages/game-core/package.json`](packages/game-core/package.json)             | Shared rules package metadata and exports.                            |
| [`packages/game-core/v3/index.js`](packages/game-core/v3/index.js)               | V3 shared package entry and exports.                                  |
| [`packages/game-core/v3/levels.js`](packages/game-core/v3/levels.js)             | V3 level definitions.                                                 |
| [`packages/game-core/v3/rules.js`](packages/game-core/v3/rules.js)               | V3 simulation and action-plan rules.                                  |
| [`packages/game-core/v3/rules.test.js`](packages/game-core/v3/rules.test.js)     | V3 shared behavior tests.                                             |
| [`packages/game-core/v3/run.js`](packages/game-core/v3/run.js)                   | V3 run, campaign and timed-replay logic.                              |
| [`packages/game-core/v3/solver.js`](packages/game-core/v3/solver.js)             | V3 full-state optimal solver.                                         |
| [`playwright.config.js`](playwright.config.js)                                   | Browser-test configuration.                                           |
| [`tests/browser/adventure.spec.js`](tests/browser/adventure.spec.js)             | Browser regression tests for the V3 adventure.                        |
| [`the-princesss-kingdom-game-brief.md`](the-princesss-kingdom-game-brief.md)     | Princess's Kingdom game brief and design reference.                   |
| [`web-prototype/.gitignore`](web-prototype/.gitignore)                           | Prototype-specific ignored files.                                     |
| [`web-prototype/GODOT_PORTING.md`](web-prototype/GODOT_PORTING.md)               | Guidance for porting Maze Lab behavior to Godot.                      |
| [`web-prototype/PROTOTYPE_NOTES.md`](web-prototype/PROTOTYPE_NOTES.md)           | Prototype notes and context.                                          |
| [`web-prototype/README.md`](web-prototype/README.md)                             | Standalone Maze Lab setup, scope and deployment guide.                |
| [`web-prototype/index.html`](web-prototype/index.html)                           | Standalone prototype HTML entry.                                      |
| [`web-prototype/package-lock.json`](web-prototype/package-lock.json)             | Exact prototype dependency versions; maintained by npm.               |
| [`web-prototype/package.json`](web-prototype/package.json)                       | Independent prototype dependencies and commands.                      |
| [`web-prototype/postcss.config.mjs`](web-prototype/postcss.config.mjs)           | Prototype CSS processing configuration.                               |
| [`web-prototype/scripts/test-puzzle.mjs`](web-prototype/scripts/test-puzzle.mjs) | Prototype puzzle-engine tests.                                        |
| [`web-prototype/src/App.tsx`](web-prototype/src/App.tsx)                         | React planner, board, playback, saves, timer and export UI.           |
| [`web-prototype/src/main.tsx`](web-prototype/src/main.tsx)                       | React application bootstrap.                                          |
| [`web-prototype/src/puzzle.ts`](web-prototype/src/puzzle.ts)                     | Standalone generation, transitions, replay and optimal solver.        |
| [`web-prototype/src/styles.css`](web-prototype/src/styles.css)                   | Standalone prototype layout and styling.                              |
| [`web-prototype/tsconfig.json`](web-prototype/tsconfig.json)                     | Prototype TypeScript configuration.                                   |
| [`web-prototype/vite.config.ts`](web-prototype/vite.config.ts)                   | Prototype Vite configuration.                                         |

## Local/generated files you may see

- `node_modules/`: downloaded dependencies, recreated by `npm ci`.
- `dist/`: built web output, recreated by the relevant build command.
- `apps/api/.env`: local configuration copied from `.env.example`; keep secrets out of Git.
- `apps/api/data/pawzzle.sqlite`: local API database.
- `games/godot/.godot/`: Godot editor cache.
- `.git/`: Git's internal history and metadata; do not edit manually.

A local checkout can also contain uncommitted scripts, plugins or editor files that are not on GitHub. This appendix describes the tracked repository snapshot above.

## GitHub basics

A folder groups files; a branch is a separate line of changes; a commit records a saved change; a pull request lets teammates review changes before merging. Use a branch for each task, review the changed files before committing, and include only files related to that task. Git tracks files rather than empty folders, so `Frankie/README.md` keeps Frankie's folder visible.

Keep working game code in its existing project folders so imports and builds continue to work. Use `Frankie/` for task notes and drafts, and link to the real source files. No files were moved as part of this guide.

### Asset import appendix — November 7, 2026

| File                                                                                | Purpose                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| [assets/replicate/README.md](assets/replicate/README.md)                            | Inventory, integration notes and provenance.    |
| [assets/replicate/manifest.json](assets/replicate/manifest.json)                    | Per-file source, dimensions, size and checksum. |
| [Bone.png](assets/replicate/game/Bone.png)                                          | Original game image, 280 × 280.                 |
| [Dog House.png](assets/replicate/game/Dog%20House.png)                              | Original game image, 280 × 280.                 |
| [Frisbee.png](assets/replicate/game/Frisbee.png)                                    | Original game image, 280 × 280.                 |
| [Golden Treat.png](assets/replicate/game/Golden%20Treat.png)                        | Original game image, 280 × 280.                 |
| [Key.png](assets/replicate/game/Key.png)                                            | Original game image, 280 × 280.                 |
| [Lever.png](assets/replicate/game/Lever.png)                                        | Original game image, 280 × 280.                 |
| [Portal Pair.png](assets/replicate/game/Portal%20Pair.png)                          | Original game image, 280 × 280.                 |
| [Princess Mocha.png](assets/replicate/game/Princess%20Mocha.png)                    | Original game image, 256 × 256.                 |
| [Royal Discovery.png](assets/replicate/game/Royal%20Discovery.png)                  | Original game image, 280 × 280.                 |
| [Tennis Ball.png](assets/replicate/game/Tennis%20Ball.png)                          | Original game image, 280 × 280.                 |
| [Wall Bush.png](assets/replicate/game/Wall%20Bush.png)                              | Original game image, 256 × 256.                 |
| [Wall.png](assets/replicate/game/Wall.png)                                          | Original game image, 256 × 256.                 |
| [Logo.png](assets/replicate/marketing/Logo.png)                                     | Original marketing image, 1360 × 850.           |
| [Marketing_1080x1350_01.png](assets/replicate/marketing/Marketing_1080x1350_01.png) | Original marketing image, 1080 × 1350.          |
| [Marketing_1080x1350_02.png](assets/replicate/marketing/Marketing_1080x1350_02.png) | Original marketing image, 1080 × 1350.          |
| [Marketing_1360x850_01.png](assets/replicate/marketing/Marketing_1360x850_01.png)   | Original marketing image, 1360 × 850.           |

### Opening audio import — November 7, 2026

| File | Purpose |
| --- | --- |
| [Assets/Mocha-Opening-Gameplay-Preview.mp3](Assets/Mocha-Opening-Gameplay-Preview.mp3) | Original opening/gameplay audio, referenced by the garden HTML demo. |
| [docs/AUDIO_ASSETS.md](docs/AUDIO_ASSETS.md) | Audio metadata, checksum and current integration scope. |
