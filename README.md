# Pawzzle Maze

**New to the repository?** Read the [file guide and complete appendix](FILE_GUIDE.md). Frankie's task notes and starting points are in [Frankie/README.md](Frankie/README.md).

A route-planning dog adventure built with Three.js, a shared deterministic game core, and an optional Fastify/SQLite API. A separate Godot project contains the earlier maze demo.

**Godot GamePix export:** the timed Godot game now uses the sprite pack, includes the official GamePix plugin with SDK-v3 lifecycle/pause integration, and exports as a single-threaded browser build. See [setup and build instructions](games/godot/README.md), [verification evidence](docs/GAMEPIX_WEB_VERIFICATION.md), and the [packaged ZIP](releases/pawzzle-maze-gamepix.zip). This does not port the V3 campaign to Godot or add GamePix to the Three.js app.

## Recent update — V3 adventure

[PR #3: Make the V3 Royal Garden adventure playable in the browser](https://github.com/timothylee58/Pawzzle-Maze/pull/3) was merged on November 7, 2026. It connects the [V3 backend and shared rules from PR #2](https://github.com/timothylee58/Pawzzle-Maze/pull/2) to the browser experience.

- **Playable onboarding:** First steps home → A royal request → The Royal Garden. Complete each lesson to unlock the next puzzle.
- **Route planning:** drag from the preview dog, tap adjacent cells, use arrow keys or on-screen direction buttons. Revisits add moves; Undo and Clear restore objective and gate state.
- **Go and playback:** submit a complete plan, then watch the dog collect the golden treat, deliver it on Mocha’s marked tile, open her gate and reach the doghouse.
- **Feedback and progress:** request reactions, objective checklist, optimal-move comparison, retries, completed attempts and persistent personal bests.
- **Accessibility and interruptions:** keyboard controls, phone-width layout, reduced-motion playback, explicit pause/resume and automatic background-tab pause.
- **Verification:** 42 API/shared-core tests, two browser regression tests and the production build passed for the implementation. Browser regression tests now run in CI.

**Implemented demo:** the default browser entry is the V3 story adventure. Complete two short playable lessons, then explore The Royal Garden: draw or tap a route, Undo/Clear, press Go, watch treat pickup and delivery to Princess Mocha, and reach the doghouse. Results, tutorial unlocks and personal bests persist on this device. The original practice and daily demos remain at `/legacy.html` and `/daily.html`.

The V3 browser uses the shared simulator locally and does not require the API. It includes keyboard and touch-friendly directional controls, reversible preview objectives, dog playback, automatic gate opening, pause/resume, background-tab pause, and reduced-motion playback. The Godot project remains a separate V1 demo.

## V3 backend behavior

`GAME_DESIGN_DEVELOPMENT_V3.md` is the current consolidated target. The shared `@pawzzle/game-core/v3` package and `/api/v3/*` adapter now implement action-plan validation, golden-treat pickup/delivery to Mocha, permanent princess-gate approval, full-state optimal solving, campaign progress, and pausable local timed replay. The included Royal Garden level and two onboarding boards have verified optima. Shared simulation/campaign logic runs offline without the API.

See [V3 behavior and API integration](docs/V3_BACKEND.md) for the comparison, schemas, events, endpoints, pause policy, and tests. The V3 browser now connects the Royal Garden controls, dog/Mocha presentation and playback. Timed-mode UI, lever tutorial content, audio and GamePix SDK integration remain future work. V1 saves and scores are not migrated or mixed with V3.

## Quick start

Requires Node.js 22.13+ (Node 24 recommended). SQLite is included with Node; no separate database service is needed.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The web dev server forwards `/api` to the API at `127.0.0.1:3001`. Use the same hostname consistently so the anonymous session cookie is retained.

- **V3 story (`/`):** the default adventure, with two lessons and Royal Garden. Runs locally without an API connection; progress is saved in browser storage.
- **Legacy practice (`/legacy.html`):** generated mazes, local scores, adjustable difficulty, 60-second rounds, drawing and keyboard input.
- **Legacy daily (`/daily.html`):** fixed daily layout issued only when the round starts, anonymous HTTP-only cookie identity, server receipt timing, canonical route validation, SQLite persistence, one round per identity/challenge, idempotent submissions, reload resume, end-of-round solution, and same-challenge leaderboard.
- **Godot:** import `games/godot/project.godot` into Godot 4.7.2 and run with F5. It has its own local generator and local scores, separate from browser daily play. The GamePix Web preset and sprite integration are included.

### Browser-only development

After `npm ci`, run `npm run dev -w @pawzzle/web` to play the V3 story without starting the API. Legacy daily play still requires the API.

### How to play V3

1. Plan from the ghost dog through open passages. Backtracking adds a step rather than erasing the route.
2. Fetch the golden treat and enter Mocha’s crown-marked interaction tile. Delivery is automatic; the gate opens for subsequent moves.
3. End at the doghouse with every objective satisfied. **Go** becomes available only for a complete plan.
4. Press **Go** to score and animate the route. Compare your move count with the optimum, then edit or retry to improve.

**Keyboard:** arrow keys extend the route while the board is focused; Backspace undoes a step; Enter runs a complete plan. Pause stops playback, and returning from a background tab requires Resume.

## Workspace

```text
apps/web/              Vite browser app: V3 story, legacy practice and daily
  src/adventure.js     V3 campaign, plan controls, feedback and playback
  src/adventure.css    Responsive adventure presentation
  src/api/             API fetch client for legacy daily play
  src/ui/              Legacy board markup and DOM helpers
  src/app.js           Legacy local practice controller
  src/daily.js         Legacy server-backed daily controller
  src/scene.js         Shared orthographic Three.js board renderer
  src/style.css        Legacy demo styles
apps/api/src/          Fastify HTTP API, services and SQLite persistence
  v3/                  V3 campaign and timed-run adapters
packages/game-core/    Legacy generation, route rules and scoring
  v3/                  V3 simulation, plan editor, solver and campaign lifecycle
tests/browser/         Playwright adventure regression tests
games/godot/           Separate playable Godot 4 project (earlier mechanics)
```

## Commands

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Run web and API together                       |
| `npm run test:browser` | Run Playwright adventure regression tests      |
| `npm test`             | API integration and shared-rule tests          |
| `npm run build`        | Build story, legacy practice and daily entries |
| `npm run check`        | Run tests and production build                 |
| `npm start`            | Serve the API and built frontend on port 3001  |

To run the production-shaped local app: `npm run build && npm start`, then open http://127.0.0.1:3001. `NODE_ENV=production` enables Secure cookies and requires HTTPS; leave it unset for local HTTP.

Copy `apps/api/.env.example` to `apps/api/.env` for custom API settings. Paths in this file are relative to `apps/api`. The default database is `apps/api/data/pawzzle.sqlite`; database files, cookies, environment secrets, build output and dependencies are ignored by Git.

## Legacy daily API

For the V3 campaign and timed-run endpoints, see [V3 behavior and API integration](docs/V3_BACKEND.md). The current V3 browser uses the shared core locally rather than these HTTP endpoints.

All daily round endpoints require the cookie set by `POST /api/session`.

| Method | Path                             | Purpose                                                          |
| ------ | -------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/health`                    | Readiness check                                                  |
| POST   | `/api/session`                   | Resume/create anonymous identity                                 |
| GET    | `/api/daily`                     | Metadata only; does not reveal the maze                          |
| POST   | `/api/rounds`                    | Start or resume this identity's daily round                      |
| GET    | `/api/rounds/:id`                | Owner-only state; solution only after finish                     |
| POST   | `/api/rounds/:id/submissions`    | `{submissionId, orderedCellIds}`; lengths recomputed server-side |
| POST   | `/api/rounds/:id/finish`         | Finish while preserving the accepted best                        |
| GET    | `/api/leaderboard?challengeId=…` | Same-challenge ordering, shared exact ranks                      |

The server rejects illegal routes, repeats, forged extra fields, late submissions and attempts to access another identity's round. Retrying the same submission ID and path is idempotent; using that ID for a different path is rejected. A round crossing midnight keeps its original challenge and deadline.

## Scope

This is a development scaffold, not a production competition service. Anonymous identities are not accounts: clearing cookies creates another identity. Server validation prevents malformed scores, but does not prevent automated solving or advance knowledge. Network receipt time affects ranking. Authentication, rate limits, session expiration/cleanup, account recovery, migrations beyond the initial schema, telemetry, deployment and production abuse protection are follow-up work. Do not use it for prizes or claim verified human rankings.

Practice local scores and daily server scores are deliberately separate. Godot is independently playable and has not been connected to this API. Mouse/keyboard logic and responsive browser layouts were tested in the prototype; physical touch playtesting remains needed.

## Visual direction

Board-first neutral UI with a restrained green route. Three.js renders beveled walls and directional shadows under an overhead orthographic camera. The V3 SVG layer supplies the route preview, animated dog, crowned Mocha, treat, gate and doghouse, plus a flat fallback when WebGL is unavailable. Rendering stays separate from maze rules; all tied shortest routes are accepted.

## Browser regression tests

Run `npx playwright install chromium --only-shell` once, then `npm run test:browser`. Tests cover tutorial progression, revisits, delivery undo, playback pause, personal-best persistence, pointer routes and phone-width layout. Run `npm run check` for the API/shared rules and production build.

## Next mechanics and integration

The current target is [GAME_DESIGN_DEVELOPMENT_V3.md](GAME_DESIGN_DEVELOPMENT_V3.md). The team’s original discussion and briefs remain available as design context.

- Add a separate lever lesson and explicit lever controls before introducing combined puzzles.
- Connect the existing local timed-run rules to a timed replay screen.
- Add sound and mute controls, GamePix lifecycle integration and release packaging checks.
- Playtest on physical touch devices; add more royal requests and puzzle layouts afterward.
- Port the V3 rules and adventure presentation to Godot as a separate workstream. Importing the current Godot project does not enable the browser’s V3 mechanics.

Retained/ordered items, keys and levers are implemented in the shared rules but are not part of the opening browser chapter. Portals remain deferred. Claude-powered hints and dialogue are not integrated, and no Claude API key is required to play.

## Art and marketing assets

The [Replicate asset drop](assets/replicate/README.md) contains 12 game PNGs and 4 marketing PNGs imported from the team’s Drive folder. Originals are organized under `assets/replicate/game/` and `assets/replicate/marketing/`, with source links and checksums in the manifest. These files are available for integration; they are not yet wired into any game renderer.
