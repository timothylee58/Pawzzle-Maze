# Pawzzle Maze — Godot Four-Hour Execution Plan

Date: 2026-11-07  
Status: Action plan; implementation remains paused.  
Target: Godot web export for GamePix only.  
Team: Two people; roles below can be swapped.

## 1. Source of truth and agreed direction

Use [GAME_DESIGN_DEVELOPMENT_V3.md](GAME_DESIGN_DEVELOPMENT_V3.md) as the sole game-design reference. Do not derive gameplay requirements from V1, V2, or earlier briefs.

The user's latest instructions override V3 in two areas:

- Build in **Godot using a Godot MCP**, replacing the previously discussed Unity implementation and V3's Vite/Three.js delivery recommendation.
- Prioritize **procedural generation**, replacing V3's initial handcrafted-level approach.

Preserve V3's route planning, full-board visibility, orthogonal moves, required objectives, valid backtracking, fewest-moves scoring, deterministic simulation, and local pause behavior.

Confirmed feature priorities:

- Required collectibles.
- Keys and matching gates.
- Guest-only play with local campaign saves.
- Local timed challenges.
- Procedurally generated, verified puzzles.
- GamePix delivery.

The four-hour schedule is a timebox, not a guarantee of completion. Use elapsed working time from the team's agreed start; paused discussion does not silently reset a deadline.

## 2. Godot MCP choices

These choices come from the companion chat **Find practical Godot MCPs**. Its comparison was based on project documentation, not hands-on reliability testing.

| Priority | MCP | Intended use |
| --- | --- | --- |
| Primary | [Godlink — tomyud1/godot-mcp](https://github.com/tomyud1/godot-mcp) | Scene/node editing, script validation, screenshots, input simulation, runtime inspection, and error logs. |
| Fallback | [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) | Lighter launch/run/stop, error capture, scene/node creation, and sprite-loading workflow when direct script editing is sufficient. |
| Optional later | [Godotwright](https://github.com/laaielichter/Godotwright) | Additional script, scene, headless-test, and export validation if its engine requirements match the project. |
| Optional paid alternative | [Godot MCP Pro](https://github.com/youichi-uda/godot-mcp-pro) | Consider only if already owned or a specific missing capability justifies setup time. The prior review identified its required server as paid. |

Start with **Godlink alone**. The prior review identified Node.js plus a Godot addon, Godot 4.4+ support, one editor instance at a time, and an MCP-specific undo command. Verify current compatibility and installation instructions before setup. Do not install every alternative.

The MCP assists development; it does not supply the puzzle generator, objective rules, or solver.

## 3. First actions: agree and prove the foundations

### Person A — Godot, interface, and GamePix

- [ ] Audit the existing `games/godot/` project and reuse working parts. Its presence is verified; V3 feature completeness is not.
- [ ] Confirm the Godot version and matching web export templates.
- [ ] Connect Godlink and verify that it can inspect the intended project, run it, and retrieve errors.
- [ ] Export a minimal Godot web build and run it through a local web server.
- [ ] Check the current GamePix integration requirements and test the export in the platform environment as early as access permits.

### Person B — rules, generation, and validation

- [ ] Audit existing rules and tests against V3; do not assume earlier maze behavior is compatible.
- [ ] Define the shared level/state/action interfaces before building the UI around them.
- [ ] Implement required collection and persistent key unlocks.
- [ ] Generate one seeded candidate maze and prove a complete objective-aware solution.
- [ ] Provide the same level fixture and expected solution to Person A.

**First checkpoint:** a Godot web build runs in a browser, and a generated puzzle has a verified full solution. Establish both before art polish or hosting work.

## 4. Four-hour task split

| Elapsed time | Person A: Godot and platform | Person B: rules and content | Integration checkpoint |
| --- | --- | --- | --- |
| 0–30 min | Audit project, connect MCP, prove minimal web export. | Agree data contracts; audit rules; create a small objective fixture. | Browser build works; both use the same level format. |
| 30–90 min | Render readable board; add drawing/keyboard planning, Undo, Clear, and Go. | Implement seeded generation, collection/key transitions, and objective-aware solver. | A generated board can be planned and legally completed. |
| 90–150 min | Connect preview, dog playback, objective HUD, and results. | Validate placement, gates, necessary revisits, and optimal moves; add controlled loops. | Preview, validation, playback, and solver agree. |
| 150–210 min | Add campaign saves, best results, local timed mode, and pause/resume. | Test replay, Undo, seed reproducibility, save identity, and timer/result edge cases with Person A. | Full replay loop works and saves survive reload. |
| 210–240 min | Package and test GamePix web export; fix blocking input/layout issues. | Run acceptance checks and document remaining defects. | Deliver a tested build artifact and an honest feature checklist. |

Integrate at every checkpoint. Assign one owner per script/scene to avoid conflicting edits. Keep the main build runnable and use small commits.

## 5. Shared implementation contract

Suggested responsibilities, independent of final filenames:

- **Level definition:** level ID/version, rules version, generator version, seed, dimensions, start/goal, static passages, required items, keys, and key-controlled edges.
- **Puzzle state:** dog position, collected-required mask, collected-key mask, and any enabled royal-delivery state.
- **Action plan:** ordered moves; retain V3's ability to extend this later with explicit lever actions.
- **Transition simulator:** the single source of movement legality, automatic collection, unlocks, and completion.
- **Solver:** search complete puzzle states and reconstruct an optimal valid plan.
- **Presentation:** board, preview, playback, HUD, and controls consume simulation results.
- **Persistence/round controller:** campaign progression, saved level identity, best results, timer, pause, and retry.

Rules to implement consistently:

1. Each legal orthogonal traversal costs one move; diagonal moves and wall crossing are forbidden.
2. Revisiting a cell appends a move. Only Undo removes an action.
3. Collectibles are collected automatically on entry.
4. A key permanently opens every matching gate for that attempt; it is not consumed per crossing.
5. Reaching home early is legal but does not win. Completion requires every required objective.
6. Go accepts only a complete valid plan. Validate and score before animation.
7. Every submission starts from the canonical initial state.
8. Undo/Clear rebuild inventory and gate state from the retained action prefix.
9. Best-move scoring must include all objectives, not merely the shortest bare exit route.

For the initial movement-only action set, BFS over full states is sufficient because each action costs one. Use V3's 0–1 BFS when zero-cost lever actions are introduced. Automatic pickup/delivery stays part of the entry transition.

## 6. Procedural generation and verification

Implement the generator inside the Godot project; the previously discussed JavaScript maze libraries are not required dependencies.

Pipeline:

1. Generate seeded corridors on a small board.
2. Add alternate routes deliberately.
3. Place required collectibles, keys, and gates.
4. Solve using exactly the gameplay transition rules.
5. Reject impossible candidates or candidates that exceed the validation budget.
6. Save a verified level definition and proven optimal move count.

Check that keys are reachable before their own gates, every required item can be obtained, and a complete route reaches home. Do not assume a connected bare maze remains solvable after adding objectives.

Bound retries and solver work so generation does not freeze the browser. Keep a bundled verified fallback puzzle. Never label a budget-limited search result “optimal.”

Use fixed verified seeds for early campaign progression and fresh verified candidates for local challenges. A saved campaign puzzle must not change after reload: persist the resolved level definition, or retain the exact generator/rules versions needed to reproduce it.

## 7. Saves, timers, and infrastructure

The first playable build needs no deployed application backend, accounts, or cloud database.

- Persist campaign progress, level identity, personal bests, and preferences locally.
- Namespace saves by schema and rules version; handle incompatible or corrupt saves safely.
- Verify persistence in the actual GamePix iframe/browser environment.
- Local saves are device/browser-specific; clearing browser data can remove them.
- Start local challenge timing when the board is revealed.
- Keep timing active during ordinary planning and playback.
- Platform pause or page hiding freezes timer, input, playback, and sound and covers the board.
- Resume preserves state and mute preferences.
- Preserve valid submissions accepted before timeout; incomplete plans do not score.

Use source control, repeatable export steps, a development test build, and a release artifact. Verify current [GamePix SDK guidance](https://partners.gamepix.com/sdk/doc/javascript) and [submission requirements](https://partners.gamepix.com/guidelines/submission) during integration. Bridge lifecycle events into Godot and test the exported game, not only the editor.

Package the web export with relative assets and the expected entry HTML at the package root. Verify exact upload requirements before submission.

## 8. Scope decisions and later work

### Royal delivery

V3 makes treat pickup → Mocha delivery → opened passage → doghouse the opening story loop. The user's latest feature list did not explicitly include delivery.

**Recommendation:** retain one simple royal-delivery puzzle if feasible, before extra mechanics or visual polish. This is a scope recommendation, not a newly confirmed requirement. If omitted from the timebox, record it as an incomplete V3 feature.

If included, the treat and interaction tile must be reachable before approval, Mocha's gate must be unavoidable on the way home, and Undo must restore the carried item and closed gate.

### Online competition

The user selected casual server-validated competition as the desired direction. **Proposed sequencing:** implement it after the local build, rather than dropping it from the roadmap.

A later milestone needs server-issued daily levels, authoritative action validation, proven optima, deadlines, and one-ranked-run enforcement. Guest-only local identity cannot reliably enforce one run per person across devices or cleared storage; choose an appropriate platform identity or explicit anonymous-device limitation before launch.

Retain V3's ranked interruption policy unless changed: pause/hide/reload ends eligibility for further ranked submissions, while accepted results remain and practice can continue.

Low-cost development/production hosting, automated checks, backups, and error monitoring belong to that hosted milestone. No numeric monthly budget has been confirmed.

### Defer from this four-hour plan

- Levers and ordered collection.
- Portals and a visual level editor.
- Cloud saves and accounts.
- Online daily rankings and hosted infrastructure.
- Additional MCP tools unless a concrete blocker warrants them.

If time runs short, cut polish and extra content before correctness. Record any unfinished selected feature explicitly.

## 9. Acceptance checklist

- [ ] Draw/keyboard → preview → Go → collect → unlock → home → results → retry works.
- [ ] Going home without required items cannot complete the puzzle.
- [ ] A key cannot be trapped behind its own only locked route.
- [ ] Backtracking counts as movement; Undo restores the prior state.
- [ ] Submitted plans always replay from the original level state.
- [ ] Solver optimum includes collection and key constraints.
- [ ] Generated puzzles are verified; failed generation has a safe fallback.
- [ ] Reload restores campaign progress and the same saved puzzle.
- [ ] Local timer and pause behavior match V3.
- [ ] Mouse, keyboard, and physical touch input are checked.
- [ ] Exported layout remains usable at the target GamePix sizes, including 640 × 480.
- [ ] Packaged assets load and campaign play has no local-API dependency.
- [ ] Remaining V3 gaps and platform-test limitations are listed alongside the build.

This document schedules future work. Creating it does not resume implementation, install MCPs, deploy a service, or publish the game.
