# Pawzzle Maze — Game Design and Development Document

Version: 2.0  
Date: 2026-11-07  
Status: Approved design direction; implementation has not started through this document.

## 1. Purpose and relationship to existing documents

This document refines the creator's approved direction: a dog-themed, single-player route-planning puzzle with required collectibles, changeable walls, tutorials, and optional future portals. It replaces version 1's rules where explicitly changed below. The original `GAME_DESIGN_DEVELOPMENT.md` remains historical reference.

The repository also contains `DISCUSSION_SUMMARY.md`, titled **Pawsome**, describing a timed, single-level story involving a princess dog and a treat. That separate brief is preserved. Its story, direct-control assumptions, and production scope are not silently incorporated here. This V2 records the latest instructions in this design conversation; the team should reconcile the two briefs before implementing conflicting features. A compact vertical slice is proposed below to make this direction practical to prototype.

## 2. High concept

**Plan the paws. Fetch the goodies. Find the fewest moves home.**

Guide a dog from the top-left of a fully visible square-grid maze, collect every required item, and reach its doghouse at the bottom-right. Draw a plan, decide when to use levers, then press **Go** to watch the dog carry it out. The best solution fulfills every objective using the fewest grid moves.

The game is single player. Optional leaderboards compare independently completed timed challenges; there is no live multiplayer.

### Design pillars

- Readable puzzles: every wall, objective, and mechanism is visible from the start.
- Thoughtful routing: collection order and maze changes create meaningful choices.
- Friendly presentation: a cheerful dog, familiar toys, clear feedback, and forgiving editing.
- Fair mastery: any valid solution completes a campaign puzzle; fewer moves improve the result.
- Teach before testing: each new mechanic has a short, untimed playable tutorial before independent use.

## 3. Approved direction and implementation defaults

The creator accepted the recommendations discussed before this document. Details needed to make those recommendations implementable are marked here as defaults and may be tuned after playtesting.

| Area | V2 direction |
| --- | --- |
| Title | Pawzzle Maze |
| Hero and destination | Dog starts top-left; doghouse is bottom-right |
| Main objective | Collect all required items and reach home |
| Optimization | Fewest grid moves, including necessary backtracking |
| Visibility | Entire maze and its objects visible |
| Input | Draw a plan, then press Go for execution |
| Collection | Any order first; numbered-order puzzles introduced later |
| Item identity | Bones first; toys added when their role is clear |
| Tools | Keys/gates introduced separately from collectible objectives |
| Levers | Explicit activation; reusable switches |
| Wall changes | Open one passage while closing another; no rotating-wall physics initially |
| Main mode | Untimed puzzle campaign |
| Challenge mode | Timed puzzles; optional competitive leaderboard |
| Tutorials | Small playable lessons, followed by easy independent puzzles |
| Portals | Lower-priority expansion; clearly paired and reusable |

Initial defaults: 60-second timed challenges, small handcrafted boards, automatic collection on entry, persistent key unlocks, and zero-move lever actions. These are starting rules for testing, not claims of finalized balance.

## 4. Objects and their purposes

| Object | Role | Initial behavior | Priority |
| --- | --- | --- | --- |
| Bone | Required collectible | Automatically collected when entered | Core |
| Tennis ball | Later collectible variety | Same collection rule unless an ordered level labels it | Later content |
| Frisbee / squeaky toy | Later collectible variety | Cosmetic variety or a clearly numbered objective | Later content |
| Key | Tool | Automatically collected; permanently unlocks its matching gate | After core levers |
| Doghouse | Finish | Wins only after all required collection objectives are fulfilled | Core |
| Lever | Maze control | Explicit planned action switches linked passages | Core mechanic |
| Portal pair | Transportation | Automatic transfer on entry, with paired markings | Optional expansion |

Do not introduce several collectible icons as if they have different powers when they do not. Start with bones. Toys can later support themed or ordered puzzles, but should not create unexplained rules. Required collectibles, keys, and scenery must look distinct. No optional score pickups in the initial version: they would obscure the fewest-moves objective.

### Collection order

- Standard levels allow required items in any order.
- Ordered levels number their required items `1, 2, 3…` on both the board and objective strip.
- Entering an out-of-order item's cell is allowed, but does not collect it. The player must return when it becomes the next required item.
- An item is collected once and remains collected for the rest of that attempted plan.
- The finish condition checks collected objectives, not just whether their cells were visited.
- Keys are separate tools; a numbered bone order does not implicitly restrict key collection.
- Do not mix ordered and unordered required items in the first ordered levels. More complex objective groups are outside the first release.

### Keys and gates

Use a visibly matched symbol and color on each key/gate pair. On collection, the key opens all gates bearing that key ID for the remainder of the plan. The key is not consumed per crossing. This deliberately simple rule avoids inventory-spending ambiguity. Explain it in its own tutorial.

## 5. Grid and action rules

- Boards use `N × N` cells and orthogonal movement across open edges.
- Each move into an adjacent cell costs one grid move. No diagonal moves, wall crossing, or wraparound.
- All required items must be collected before entering the doghouse can finish the puzzle.
- Entering the doghouse early is legal but does not win; the dog can leave and return.
- Revisiting cells and edges is allowed and may be necessary. Every actual traversal costs a move.
- Editing a proposed plan costs no moves; only the submitted action sequence is scored.
- A lever activation is an action but costs zero grid moves. Track it separately if useful for analytics; do not secretly add it to the score.
- Equivalent minimum-move solutions are equally perfect, even if they use different items orders or lever actions.
- Static mazes should offer alternate routes. Dynamic puzzles should offer meaningful routing choices across puzzle states; requiring multiple static start-to-exit paths is no longer sufficient or mandatory for every tutorial.

Without portals, an orthogonal grid's route-length parity still applies: valid start-to-finish routes differ by even numbers of moves. Required detours and levers do not change that. Portals may break this property; feedback must always calculate the actual gap rather than assume even values.

## 6. Planning, editing, and execution

### Plan first, then Go

1. Show the full board, required objects, dog, and doghouse.
2. The player draws from the dog's start cell, extending the planned path through legal adjacent cells.
3. Simulate the plan as it is drawn: preview collected items, unlocked gates, and lever-controlled walls.
4. At a lever, the player may choose **Activate lever**, adding an explicit action at the current endpoint. Simply passing through does not activate it.
5. Resume drawing under the resulting maze state.
6. Enable **Go** only when the plan is valid and ends at the doghouse with all required objectives satisfied.
7. On Go, validate and score the complete plan instantly, then animate the dog following it.

The preview dog is visually distinct from the execution dog. Clearly label preview state so the player understands that drawing has not committed a run. Collected-item previews must reverse correctly during editing.

### Backtracking versus undo

V1 retracted the route whenever an existing cell was revisited. V2 must not do this: moving back over a path can be essential to collect objects or revisit a lever.

- Drawing into a previously visited cell appends a new move, including when moving immediately backward.
- **Undo** removes the last planned action; **Clear plan** resets the entire plan.
- Releasing the pointer preserves the plan. Resume from its current endpoint.
- Show route direction arrows and a step scrubber when repeated visits make the path ambiguous.
- Undo and scrubbing rebuild the preview from the starting state or a validated checkpoint. Never leave collected items or gate states from a discarded suffix behind.
- Initial implementation may use Undo/Clear only; arbitrary insertion into the middle of a plan is not required.
- Following execution, retain the last plan for editing. Every new submission is replayed from the original level state, not from the previous run's final position or inventory.

### Input behavior

- Support mouse and touch drawing, with keyboard arrow movement and an explicit lever action button.
- Interpolate fast pointer segments through crossed adjacent cells; never route around a wall automatically.
- Ambiguous diagonal corner crossings do not add a move until a legal adjacent cell is clearly entered.
- Pointer release, cancellation, or leaving the board preserves the current plan.
- Target at least 32 CSS pixels per cell; choose board sizes that remain usable on the minimum supported screen.
- After a planned portal transfer, end the current drag and visibly highlight the remote endpoint. Resume drawing there, avoiding an unintended pointer jump across the board.

### Attempts and playback

A completed, valid plan submitted with Go counts as one attempt. Its completion is determined by deterministic validation, so the player need not wait for animation to finish to receive a result. Partial plans, invalid plans, Undo, and Clear do not count as attempts. Prevent duplicate submissions from double-clicks.

Playback is presentation, not an additional scoring challenge. Allow skip or instant playback. In timed mode the clock continues during playback; selecting **Edit plan** immediately cancels playback and resumes planning. A submission accepted before the deadline remains valid even if its animation finishes later.

## 7. Reusable levers and changing walls

Each lever controls one binary switch state. Linked passages visibly show which state makes them open. A typical switch opens passage A and closes passage B; activating it again restores the previous arrangement.

- The dog must be on the lever's cell to add an activation action.
- Activation is explicit, allowing the dog to walk past without changing the maze.
- Show linked passages with matching symbols, connection highlights, and an A/B state indicator. Do not rely on color alone.
- Animate changed edges briefly in preview and execution without hiding the underlying rule.
- Walls occupy cell edges, never cell interiors. Changes cannot crush a dog standing in a cell.
- Apply activation atomically between movement actions. A wall cannot change halfway through a crossing.
- Each controlled edge has exactly one controlling switch or one key gate in the initial implementation. Avoid conflicting ownership rules.
- A lever's tile remains traversable and its action remains available in either state.
- Consecutive activations that restore the same state provide no scoring advantage. The solver must safely handle these zero-cost cycles.
- Trapping the dog may be a legal planning mistake, but never a permanent player failure: Undo and Clear are always available outside committed playback.

Literal 90-degree rotating walls are deferred. They introduce pivot geometry and collision questions beyond the intended first version. The passage-swap behavior delivers the intended maze-altering puzzle in a more readable form.

## 8. Portals — optional later expansion

Implement only after collection and levers are enjoyable and stable.

- Use clearly labeled pairs such as A–A and B–B; each pair is two-way and reusable.
- Walking into a portal costs the usual one grid move and automatically transfers the dog to its partner at zero additional movement cost.
- Arrival does not immediately teleport the dog back. It must leave and re-enter a portal to trigger another transfer.
- Portal tiles cannot also hold collectibles, keys, levers, or the doghouse in the first portal implementation.
- Preview the destination before entry and mark the jump distinctly in the route display.
- Each pair requires a playable tutorial before appearing in a challenge for that player.
- Include portal topology and exact movement cost in the rules version and optimal-solution calculation.

## 9. Modes and progression

### Campaign: learn and solve

- Untimed handcrafted puzzles with increasing complexity.
- Any valid completion unlocks progression; perfection is optional mastery.
- Unlimited editing and retries, with personal bests per level.
- After completion, show best moves, optimal moves, and the difference.
- Let players select **Keep improving** or **Next puzzle**, rather than force an exit on a perfect result.
- An explicit **Show a solution** action may reveal one optimal plan after completion or after the player chooses assistance. Label assisted results and keep them out of ranked play.

### Timed challenges: optimize under pressure

- Initial time limit: 60 seconds, tuned independently from campaign difficulty.
- Reveal the board and start the clock together. No pre-start maze inspection.
- Unlimited valid submissions while time remains; retain the best one.
- Finish on perfection, expiration, or explicit Finish after a valid result.
- A submission must be accepted strictly before the deadline. Incomplete plans never score.
- No valid submission produces **No completed route**, not a zero-move score.
- Challenge timers continue during editing, feedback, playback, tab backgrounding, and menus.
- Only include mechanics the player has learned. Offer the relevant separate tutorial before starting the ranked clock; do not give in-round tutorial hints.

Daily shared challenges and global rankings are a later online milestone. A local timed challenge mode can validate the format first. Campaign progress never depends on online connectivity.

## 10. Feedback and competitive scoring

### Clear results

Examples:

- **“All bones collected! 24 moves — 4 more moves than optimal.”**
- **“Perfect fetch! 20 moves.”**
- **“Find bone 2 next.”** when entering an out-of-order collectible.
- **“Collect the remaining bone before heading home.”** when a plan ends too early.

The optimum must include all objectives and mechanism constraints. The shortest bare start-to-doghouse path is not a valid benchmark.

Show current planned moves, collectible progress, lever state, best submitted result, and remaining time where applicable. Keep feedback nonmodal. Post-round solution playback is labeled **One optimal solution**, since several may exist.

### Leaderboard order

Within the same challenge and rules version:

1. Fewest moves above the optimal solution.
2. Earliest elapsed time at which that best route was accepted.

Exact ties share a rank. Attempt count and lever-action count are informational, not additional penalties. A longer route never beats a shorter one by being faster. Do not compare raw path lengths between different levels.

### Online rules

- One ranked run per account per daily challenge; subsequent runs are practice.
- Proposed daily reset: 00:00 UTC, displayed in local time.
- Keep the current daily maze out of practice until the ranked run is completed or explicitly forfeited.
- The server issues the challenge, round ID, start time, and deadline; reload cannot restart the timer.
- Validate action sequences against authoritative level data. Do not trust client move counts, inventories, switch states, or optimal distances.
- Use server receipt time for the initial ranked protocol. State clearly that latency affects timing; tune this before treating rankings as high stakes.
- Use idempotent submission IDs and preserve the best accepted result through disconnects.
- Display pending, accepted, and rejected states accurately. Offline results remain local practice results.
- A round begun before daily rollover finishes against its original challenge and deadline.
- Full board visibility allows external solving and advance knowledge. Validation prevents forged results, but cannot prove unaided human play. Initial leaderboards are casual competition.

## 11. Tutorial plan

Every distinct mechanic gets a safe, untimed playable lesson, followed by an easy puzzle using it without coaching. Allow tutorial replay from a help menu. Skipping instruction should not prevent access to it later.

| Tutorial | Teaches | Demonstrated success |
| --- | --- | --- |
| First steps home | Draw, Undo, Clear, Go, doghouse | Submit and watch a short valid route |
| Fetch a bone | Required collection | Collect a bone before reaching home |
| A better fetch | Fewest-moves goal and valid backtracking | Compare two valid routes and improve one |
| Flip the passage | Explicit lever action and linked edges | Activate a lever and use the opened passage |
| Switch it back | Reusable lever | Revisit and restore a switch to finish |
| Fetch in order | Numbered collection | Collect items in their displayed order |
| Key to the gate | Tool versus collectible, persistent unlock | Collect a key and cross its matching gate |
| Portal paws | Paired transfer, cost, no immediate bounce | Enter a portal, exit its partner, finish |

Use small boards, one new rule at a time, a single contextual instruction, and a visible response to the player's action. A tutorial is complete only after the player performs the taught mechanic and completes its puzzle. Do not introduce levers, keys, and ordered collection simultaneously.

## 12. Level design and production scope

### Difficulty progression

Increase meaningful decisions before increasing board size. Begin around 5 × 5 to 7 × 7, then test 8 × 8 to 10 × 10 layouts where touch targets remain usable. Challenge layouts remain identical across devices.

- Early: one bone, obvious doghouse, two plausible routes.
- Next: several bones with unrestricted collection; teach efficient ordering.
- Then: one lever changing two passages, followed by a reusable-lever puzzle.
- Later: numbered collection or a key, taught separately.
- Advanced: combine previously learned mechanics with similar-length alternatives.
- Expansion: portals only after the main loop is proven.

Avoid unavoidable deadlocks, visually hidden dependencies, excessive switch combinations, and long mandatory walking without decisions. Handcrafted levels come first. Procedural generation is deferred until a solver can validate the richer rules and designers can measure puzzle quality.

### Smallest useful vertical slice

Build a brief movement/collection tutorial, a lever tutorial, and one replayable untimed puzzle combining bones with one reusable lever. Include route planning, Go playback, Undo/Clear, state-aware scoring, and results. This is a prototype scope, not a commitment to a large campaign.

Do not add portals, keys, global rankings, or a full daily-content pipeline to the vertical slice. Add a local timed version only after the planning interaction works reliably.

## 13. Visual, sound, and accessibility direction

- Minimalist top-down 2D grid, friendly dog silhouette, cozy doghouse, and uncluttered props.
- Clear wall and path contrast; collectible silhouettes remain readable at small sizes.
- Distinguish real state, planned state, and executed state through labels and outline treatment.
- Number ordered collectibles and symbol-match levers/gates/portals; color alone is insufficient.
- Use short walking, pickup, lever, and celebration animations with optional sounds and mute.
- Offer reduced motion and instant playback. Never make animation speed affect route quality.
- Keep input consistent across mouse, touch, and keyboard. Label interactive controls for assistive technology and announce meaningful results without continuously reading timer ticks.
- For overlapping route visits, expose step numbers and a scrubber rather than relying on a single thick line.

## 14. Technical architecture and solver

### Shared deterministic rules

Separate simulation from rendering. Use the same transition rules for planning previews, execution, validation, and solving. The backend must use an equivalent versioned implementation for ranked results.

```text
LevelDefinition
  levelId, levelVersion, rulesVersion
  width, height, startCell, goalCell
  staticEdges, controlledEdges, initialSwitchMask
  requiredItems, collectionMode, orderedItemIds
  keys, keyGates, levers, portalPairs
  taughtMechanics, modeConfig

PuzzleState
  dogCell
  collectedRequiredMask
  nextRequiredIndex
  collectedKeyMask
  switchMask

PlanAction
  Move(direction)
  ActivateLever(leverId)

Result
  levelId, levelVersion, rulesVersion
  planActions, moveCount, optimalMoveCount, extraMoves
  completedAttempts, assisted, mode
  acceptedElapsedMs, validationStatus
```

For unordered levels use the collectible mask; for ordered levels use the next-required index, with any redundant state derived consistently. Portal transfer is resolved atomically as part of an entry move, so merely occupying a destination portal does not retrigger it.

### Optimal-solution calculation

V1's BFS over cells alone is insufficient. The search node is the complete puzzle state: position, collection progress, keys, and switches. Revisiting the same cell with a different inventory or switch state is a different node.

- Legal movement edges have cost 1.
- Lever activations have cost 0.
- Use 0–1 BFS, or Dijkstra if later rules introduce other nonnegative costs.
- Apply automatic collection, key unlocks, and optional portal transfer according to the same transition function used by gameplay.
- The goal predicate requires the doghouse and all required items collected.
- Store the lowest cost seen for each complete state. Relax only when cost strictly improves, preventing zero-cost lever cycles from looping forever.
- Reconstruct one optimal action sequence, including lever actions, for post-puzzle playback.
- Treat all matching minimum-move completions as perfect; do not compare against one canonical path.

State space grows roughly with cells multiplied by collection, key, and switch combinations. Limit mechanics per level; set solver budgets and report **unverified**, never **optimal**, when a search is cut short. Precompute and verify official level optima before publishing. Do not publish ranked levels without a proven optimum and at least one valid completion.

### Suggested modules

Level schema/loader, transition simulator, plan editor, playback renderer, state-space solver, round/scoring controller, tutorial progression, local persistence, and later ranked API. Keep art and UI independent of the puzzle rules.

## 15. Development milestones

1. **Rules prototype:** fixed level, state simulator, collection, revisits, and exact solver. Establish known-answer fixtures before visual complexity.
2. **Playable vertical slice:** drawing, Undo/Clear, Go, explicit reusable lever, dog animation, tutorial lessons, and result screen.
3. **Campaign foundation:** save progress, personal bests, a small handcrafted set, ordered collection, and separate key/gate tutorials.
4. **Timed mode:** local challenges, best-result retention, timer lifecycle, and timing-independent playback.
5. **Online competition:** identity, authoritative validation, daily challenge scheduling, leaderboard, retry/disconnect handling.
6. **Optional portal expansion:** tutorial, simulator/solver support, input handoff, and dedicated levels. Ship only if it improves the puzzles.

Do not start implementation merely because this document is uploaded. The current task is design documentation; final stack, assets, level count, and delivery schedule remain team planning decisions.

## 16. Acceptance criteria

### Gameplay and planning

- A plan cannot finish without all required objectives, even if it reaches the doghouse.
- A required backtrack is retained and charged as movement; Undo removes an action instead.
- Out-of-order items remain uncollected until re-entered at the correct stage.
- Passing a lever does nothing; explicit activation changes exactly its linked edges.
- Repeated lever use restores the prior state and permits valid return routes.
- Undo/Clear correctly restore inventory, order progress, walls, and dog position.
- Every submitted plan starts from the canonical initial level state.
- Preview, validator, playback, and solver agree on every action and resulting state.
- Fast drags and keyboard input cannot cross blocked edges or add diagonal moves.

### Scoring and solver

- Known fixtures cover unordered collection, ordered collection, keys, switch reuse, and necessary revisits.
- A fixture whose shortest bare exit path misses a bone cannot be scored as optimal.
- Zero-cost switch cycles terminate in the solver; distinct optimal solutions are accepted.
- Invalid plans do not count as completed attempts; double submission is idempotent.
- Worse or equal later results cannot replace the earlier best result/time.
- Timeout preserves already accepted results and rejects late completions.
- Playback duration does not delay acceptance or change scored moves.

### Tutorials and optional features

- Each introduced mechanic has a playable lesson and an independent follow-up puzzle.
- Timed challenges cannot surprise players with an unintroduced mechanic.
- Portal entry costs one move, transfer costs zero, arrival never bounces back automatically, and reuse works after leaving/re-entering.
- Ranked validation rejects forged state, invalid actions, version mismatches, and unauthorized additional daily runs.

## 17. Playtesting and unresolved production choices

Measure whether players understand plan versus execution, distinguish backtracking from Undo, see which walls a lever changes, understand ordered pickups, and choose to improve a successful solution. Track completion rate, extra moves, time to first valid plan, edits, attempts, and input errors.

Adjust tutorial pacing, item counts, switch counts, board size, and timed-mode duration based on observed confusion and enjoyment. The priorities are readable decisions and satisfying optimization, not maximum maze complexity.

Still to choose before production: implementation stack, art/audio sources, initial campaign length, supported viewport range, online service provider, and reconciliation with the separate Pawsome team brief. These do not prevent using this V2 document to discuss and prototype the approved mechanics.
