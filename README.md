# Pawzzle Maze

Backend, frontend, and UI foundations for Pawzzle Maze, with a playable Three.js demo and a separate Godot project.

**Current team direction:** `DISCUSSION_SUMMARY.md` describes a dog adventure with treat collection, a guarding princess dog, and a win/retry loop. That brief was added while this scaffold was being built and is preserved unchanged.

**Implemented demo:** the earlier shortest-route game from `GAME_DESIGN_DEVELOPMENT.md`, including generated practice and server-scored daily rounds. This legacy demo does not use the new V3 simulator or story interactions. The renderer, app structure, persistence, API, and shared-rule package are the foundation for that next gameplay pass; daily rankings are optional infrastructure, not a requirement of the newer brief.

## V3 backend behavior

`GAME_DESIGN_DEVELOPMENT_V3.md` is the current consolidated target. The shared `@pawzzle/game-core/v3` package and `/api/v3/*` adapter now implement action-plan validation, golden-treat pickup/delivery to Mocha, permanent princess-gate approval, full-state optimal solving, campaign progress, and pausable local timed replay. The included Royal Garden level and two onboarding boards have verified optima. Shared simulation/campaign logic runs offline without the API.

See [V3 behavior and API integration](docs/V3_BACKEND.md) for the comparison, schemas, events, endpoints, pause policy, and tests. The existing browser UI still uses the V1 demo; dog/Mocha presentation, Go/Undo wiring and GamePix lifecycle integration remain separate frontend work. V1 saves and scores are not migrated or mixed with V3.

## Quick start

Requires Node.js 22.13+ (Node 24 recommended). SQLite is included with Node; no separate database service is needed.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The web dev server forwards `/api` to the API at `127.0.0.1:3001`. Use the same hostname consistently so the anonymous session cookie is retained.

- **Practice:** generated mazes, local scores, adjustable difficulty, 60-second rounds, drawing and keyboard input.
- **Daily:** fixed daily layout issued only when the round starts, anonymous HTTP-only cookie identity, server receipt timing, canonical route validation, SQLite persistence, one round per identity/challenge, idempotent submissions, reload resume, end-of-round solution, and same-challenge leaderboard.
- **Godot:** import `games/godot/project.godot` into Godot 4.5+ and run with F5. It has its own local generator and local scores, separate from browser daily play.

## Workspace

```text
apps/web/              Vite frontend and Three.js scene
  src/api/             API fetch client
  src/ui/              Shared board markup and DOM helpers
  src/app.js           Local practice controller
  src/daily.js         Server-backed daily controller
  src/scene.js         Orthographic 3D board renderer
  src/style.css        Responsive UI and visual tokens
apps/api/src/          Fastify HTTP API, game service, SQLite store
packages/game-core/    Seeded generation, BFS, route rules, scoring, tests
games/godot/           Separate playable Godot 4 project
```

## Commands

| Command         | Purpose                                       |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Run web and API together                      |
| `npm test`      | API integration and shared-rule tests         |
| `npm run build` | Build both browser entry points               |
| `npm run check` | Run tests and production build                |
| `npm start`     | Serve the API and built frontend on port 3001 |

To run the production-shaped local app: `npm run build && npm start`, then open http://127.0.0.1:3001. `NODE_ENV=production` enables Secure cookies and requires HTTPS; leave it unset for local HTTP.

Copy `apps/api/.env.example` to `apps/api/.env` for custom API settings. Paths in this file are relative to `apps/api`. The default database is `apps/api/data/pawzzle.sqlite`; database files, cookies, environment secrets, build output and dependencies are ignored by Git.

## API

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

Board-first neutral UI with a restrained green route. Three.js renders beveled walls, directional shadows and a raised route under an overhead orthographic camera. A semantic SVG provides the input layer and a flat fallback. Rendering stays separate from maze rules; all tied shortest routes are accepted.
