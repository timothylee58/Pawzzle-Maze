# V3 backend and shared behavior

Implementation target: `GAME_DESIGN_DEVELOPMENT_V3.md`. This change implements deterministic game behavior and optional HTTP persistence, not the new visual story experience or GamePix integration. V1 browser routes and scores remain separate and compatible.

## Comparison with the previous backend

| Concern                    | Existing V1                        | Implemented V3                                                                                                       |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Submitted plan             | Unique cell IDs; revisits rejected | Versioned Move / ActivateLever actions; revisits cost moves                                                          |
| Completion                 | Reach the bottom-right cell        | Reach home with retained objectives collected and royal requests fulfilled                                           |
| Mocha / golden treat       | Absent                             | Collect once, carry, deliver on interaction-tile entry, open linked gate permanently for that plan                   |
| Preview / playback         | UI-specific route geometry         | Shared transitions and per-action state/event trace                                                                  |
| Undo / Clear               | Revisiting retracts                | Explicit PlanEditor Undo/Clear/scrub re-simulate from canonical start                                                |
| Optimal score              | BFS over cells                     | 0–1 BFS over full objective, inventory, switch and delivery state                                                    |
| Campaign                   | Absent                             | Untimed Go submissions, unlimited improvements, personal bests, tutorial unlocks                                     |
| Timing                     | Server wall-clock daily round      | Local active-play budget with nested pause reasons; optional persisted local replay endpoints                        |
| Future ranked interruption | Resume daily deadline              | Shared policy irreversibly ends ranked eligibility, preserves accepted best, requires explicit practice continuation |
| Saves                      | V1 local/SQLite tables             | Separate `rules-3.0` save keys and `v3_*` tables                                                                     |

V1 `/api/daily` and `/api/rounds` remain V1 behavior. They are not relabeled as V3 ranked play. V3 has no daily scheduler or public ranking endpoint, and the API refuses a client-supplied ranked mode.

## Package and offline operation

`@pawzzle/game-core/v3` imports no Node APIs, browser globals, network service, or storage provider. Its simulation, editor, solver, Campaign, and PuzzleRun can run inside a self-contained browser build without an account or API.

```js
import { createCatalog, Campaign, PlanEditor } from '@pawzzle/game-core/v3';

const catalog = createCatalog(); // refuses unsolvable or budget-cut-off official levels
const campaign = new Campaign(catalog, savedCampaign); // omit savedCampaign for a fresh game
const level = catalog.get('first-steps');
const editor = new PlanEditor(level.compiled);
editor.append({ type: 'move', direction: 'right' });
editor.undo();
editor.clear();
// Use editor.preview.complete to enable Go. It is a preview, not an attempt.
const result = campaign.submit('first-steps', {
  submissionId: crypto.randomUUID(),
  levelVersion: 1,
  rulesVersion: '3.0',
  planActions: completedPlanActions,
});
// Persist campaign.snapshot() with the platform's permitted local save mechanism.
```

Local snapshots are trusted local state, not proof of competitive integrity. No HTTP route accepts a client snapshot or client-provided inventory. Save active editor actions separately if restoring an unfinished plan is required; reconstruct their preview with `simulate` on load. `PuzzleRun.restore(entry, snapshot, {now, reload:true})` restores a local run paused with its saved active-time budget and no invented completion. Use a monotonic local clock; `resume('reload', now)` continues it.

## Level schema

The initial shipped definitions are two onboarding microboards and one 5 × 5 Royal Garden puzzle. Their proven optima are 4, 6 and 10 moves respectively. Royal Garden has alternate routes before the princess gate, and every route home crosses that gate. The golden treat and interaction tile are reachable without approval.

V3 adds concrete discovery records to the GDD's abstract data model:

```js
{
  levelId: 'royal-garden', levelVersion: 1, rulesVersion: '3.0',
  width: 5, height: 5, startCell: 0, goalCell: 24,
  staticEdges: [[0, 1]], // abbreviated: use the official level definition
  discoveries: [{ id: 'golden-treat', cell: 4, kind: 'golden-treat' }],
  royalRequests: [{ id: 'mocha', discoveryId: 'golden-treat' }],
  interactionCells: [{ requestId: 'mocha', cell: 18 }],
  princessGateEdges: [{ cells: [19, 24], requestId: 'mocha' }],
  requiredItems: [], collectionMode: 'unordered', orderedItemIds: [],
  levers: [], controlledEdges: [], initialSwitchMask: 0,
  keys: [], keyGates: [], portalPairs: []
}
```

Edges use `[cellA, cellB]`. A controlled edge uses `{cells, leverId, openWhen: 0|1}`; a key gate uses `{cells, keyId}`. Lever bits follow the `levers` array. Every edge has exactly one owner. Special-object tiles are disjoint; a royal discovery cannot share an interaction/lever/portal tile or the doghouse. The loader rejects bypassable princess gates, discoveries behind their own gate, missing identities, invalid masks, diagonal/wrapped edges, and conflicting edge ownership. All discoveries belong to required royal requests; there are no optional score pickups.

Retained/ordered items, persistent keys and reusable levers are implemented and tested in the shared simulator, but are not silently added to the first chapter. They need their own tutorial content before inclusion in timed play. Nonempty portal definitions explicitly fail as unsupported. New official level geometry or rules require a version increment.

## Simulation contract

Actions:

```json
{"type":"move","direction":"right"}
{"type":"activateLever","leverId":"switch-a"}
```

A movement checks the edge against the pre-move state, enters the destination, collects eligible objects, fulfills a matching carried royal request, and checks completion. Delivery consumes only the carried flag; collected history and fulfilled-request flags stay set. Arrival without the item emits a request event and leaves the gate shut. Approval affects subsequent moves, never retroactively authorizes a blocked crossing.

State contains `dogCell`, `collectedRequiredMask`, `nextRequiredIndex`, `collectedKeyMask`, `switchMask`, `collectedDiscoveryMask`, `carriedDiscoveryMask`, and `fulfilledRequestMask`. `requestProgress()` derives `find`, `carry`, or `delivered`; do not store contradictory `hasDiscovery` or `princessApproved` copies.

`simulate()` returns move count, lever-action count, completion, final state, events and frame-by-frame snapshots. Event names include `moved`, `collected`, `outOfOrder`, `keyCollected`, `gateCrossed`, `leverActivated`, `controlledPassageCrossed`, `discoveryCollected`, `requestMissingItem`, `requestFulfilled`, `princessGateCrossed`, `homeEarly`, and `home`.

Each Go replays from the initial level state. Only a complete valid plan increments attempts. Reusing a submission ID with the same payload returns its accepted result; changing that payload is a conflict. Equal/worse plans preserve the first best time. Campaign perfection does not end editing. Accepted scoring does not wait for animation.

The solver uses complete state keys and strictly improving relaxations, so zero-cost switch cycles terminate. Budgets default to 200,000 states / 2,000,000 transitions. A cutoff yields `unverified` with no optimal distance; exhausted unsolvable search yields `unsolvable`. Catalog creation verifies every official optimum before exposing any level.

## Optional HTTP adapter

Run `npm run dev`, then create/resume an anonymous session using `POST /api/session`. These cookies are development identities, not authenticated player accounts. Campaign gameplay can instead use the offline package above.

| Method | Route                                | Behavior                                                                                          |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/v3/campaign`                   | Versioned progress, personal bests, tutorial completion, learned mechanics                        |
| GET    | `/api/v3/levels/:id`                 | Canonical unlocked level, no solution                                                             |
| POST   | `/api/v3/levels/:id/preview`         | `{levelVersion,rulesVersion,planActions}`; valid/canGo, state and events; never counts an attempt |
| POST   | `/api/v3/levels/:id/submissions`     | Versions + `submissionId` + `planActions`; authoritative Go validation                            |
| POST   | `/api/v3/levels/:id/solution`        | Versions + `assistance`; explicit opt-in before first completion; labels future results assisted  |
| POST   | `/api/v3/timed-runs`                 | `{levelId,levelVersion,rulesVersion,startId}`; verifies tutorials, starts/resumes idempotently    |
| GET    | `/api/v3/timed-runs/:id`             | Owner-only persisted run state                                                                    |
| POST   | `/api/v3/timed-runs/:id/preview`     | Versions + plan; refuses planning while paused/finished                                           |
| POST   | `/api/v3/timed-runs/:id/submissions` | Same Go contract; active-time deadline enforced                                                   |
| POST   | `/api/v3/timed-runs/:id/pause`       | `{reason:"explicit"                                                                               | "platform"                                     | "hidden" | "reload"}` |
| POST   | `/api/v3/timed-runs/:id/resume`      | Remove one pause reason; other reasons still block play                                           |
| POST   | `/api/v3/timed-runs/:id/mute`        | `{muted:true                                                                                      | false}`; pause/resume never unmutes implicitly |
| POST   | `/api/v3/timed-runs/:id/finish`      | Available after an accepted result; expiry needs no result                                        |
| GET    | `/api/v3/timed-runs/:id/solution`    | One optimal action plan after the timed run finishes                                              |

Unknown fields, forged masks/counts/optima, invalid actions and version mismatches are rejected. Requests are capped at 256 KiB and plans at 4,096 actions. Submission receipt is recorded after the complete request body has arrived and passed schema validation. A result at the active-time deadline is rejected; a pre-deadline accepted result is unaffected by later playback.

`v3_campaign_saves` stores versioned campaign snapshots; `v3_timed_runs` stores immutable level and proven-solution snapshots with mutable run state. Old V1 tables are untouched. Restart restores accepted results, tutorial progress and pause budgets. A saved active HTTP run continues to consume time unless paused; the client must send lifecycle events. Offline mode does not require this round trip.

## Pause and future ranking boundaries

Local `PuzzleRun.pause()` freezes active-time accounting and exposes `boardCovered`, `inputEnabled`, `playbackEnabled`, and `audioEnabled`. The UI/platform adapter must actually apply those flags to pointer input, rendering, animations and sound; this backend change does not register GamePix handlers. Multiple pause reasons compose, so SDK resume cannot override a hidden document. Mute is independent.

The shared future-ranked policy preserves accepted results but ends eligibility on explicit/platform/hidden/reload interruption. `continueAsPractice()` is explicit and never restores ranked eligibility. Ranking helpers compare only the same challenge, level version and rules version; assisted and local results are excluded, and exact ties share rank. This policy has tests but is **not an enabled online ranked service**. No V3 account system, daily scheduling, client-interruption detection guarantee, global leaderboard or anti-cheat claim is included.

## Verification and remaining integration

Run `npm test` or `npm run check`. Tests cover royal delivery and consumption, gate reachability, canonical replay, Undo/Clear, ordered pickups, keys, zero-cost lever cycles, necessary revisits, tied optima, budget cutoffs, idempotency, assistance, owner isolation, progression, time limits, nested pauses, muted resume, ranked interruption and SQLite restart recovery.

Still separate work: connect the V3 frontend Go/Undo/lever controls, dog/Mocha art and playback, lifecycle event wiring, GamePix SDK and static packaging checks, physical touch testing, and optional later-level tutorial content. Godot is unchanged. The existing browser UI continues to use V1 until migrated explicitly.
