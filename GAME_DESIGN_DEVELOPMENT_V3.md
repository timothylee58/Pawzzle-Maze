# Pawzzle Maze — Game Design and Development Document

Version: 3.0  
Date: 2026-11-07  
Status: Consolidated design proposal based on V2 and both team briefs; existing implementation requires a separate gameplay update.

## 1. Sources and merge decisions

This is a standalone consolidated GDD. V2 is the design foundation; compatible story, scope, production, and platform ideas from both friends' briefs are incorporated below. Existing source files remain unchanged. The resolutions are editorial design decisions for team review, not a claim that every contributor has approved them.

Sources read from the repository on 2026-11-07:

- [V2 GDD](GAME_DESIGN_DEVELOPMENT_V2.md): route planning, dog protagonist, optimal moves, mechanisms, tutorials, and modes.
- [Team discussion summary](DISCUSSION_SUMMARY.md): one complete level first, treat delivery to a guarding princess dog, simple obstacle, clear retry loop.
- [The Princess's Kingdom](the-princesss-kingdom-game-brief.md): Princess Mocha, royal discoveries, dry humor, garden settings, short reactions, GamePix target, and integration workflow.
- [Repository README](README.md): reported implementation baseline, used for migration planning rather than proof that features have been independently tested.

| Difference | V3 resolution | Reason |
| --- | --- | --- |
| Pawzzle Maze / Pawsome / The Princess's Kingdom | Product title stays **Pawzzle Maze**; **The Princess's Kingdom** names its opening chapter | Preserves the creator's title and gives the story a home |
| Playable dog versus human companion | Playable dog; Princess Mocha is a separate stationary dog NPC | Retains V2's protagonist without losing the princess |
| Direct walking versus route drawing | Draw, preview, then Go; keyboard/directional controls edit the plan | One consistent interaction model |
| Fewest moves versus fastest completion | Fewest valid moves first; elapsed planning time breaks timed ties | Preserves the core optimization objective |
| Always timed versus untimed campaign | Untimed story puzzles; optional timed challenge replay | Keeps tutorials and learning approachable |
| 60 / 90 / 120 / 150 seconds | Start timed tests at V2's 60 seconds; test 90 if needed; larger values are tuning candidates | No untested timer schedule becomes a requirement |
| One level versus three levels versus campaign | One complete level is the first deliverable; two additional layouts are stretch content | Avoids making a full campaign the prototype requirement |
| Bones versus royal discovery | Opening level uses one required golden treat, collected then delivered; later bones are retained collection objectives | Merges the story into the objective system |
| Lever versus movable block | One reusable lever is the next mechanic; pushing blocks is deferred | Avoids a second movement/physics system |
| Optional bonus balls | Later balls are required discoveries or themed collectibles, not bonus-score detours | Keeps shortest-route rankings interpretable |
| Minimalist 2D versus isometric 3D | 2D grid rules; fixed overhead presentation may reuse existing Three.js rendering | Visual depth must not obscure route drawing |
| Unpausable clock versus platform pause | GamePix build pauses local play; future ranked interruption invalidates ranked eligibility and offers practice | Honors platform lifecycle without granting ranked thinking time |

V3 describes the merged target. It does not change code, deploy a game, overwrite source briefs, or imply that existing V1 scores are compatible with the new rules.

## 2. High concept

**Plan the paws. Earn royal approval. Find the fewest moves home.**

Guide a dog from the top-left of a fully visible square-grid maze through Princess Mocha's neighborhood kingdom. Collect required objects, deliver her royal discovery when requested, and reach the doghouse at the bottom-right. Draw a plan, decide when to use levers, then press **Go** to watch the dog carry it out. The best solution fulfills every objective using the fewest grid moves.

The game is single player. Optional leaderboards compare independently completed timed challenges; there is no live multiplayer.

### Design pillars

- Readable puzzles: every wall, objective, and mechanism is visible from the start.
- Thoughtful routing: collection order and maze changes create meaningful choices.
- Friendly presentation: a cheerful dog, familiar toys, clear feedback, and forgiving editing.
- Fair mastery: any valid solution completes a campaign puzzle; fewer moves improve the result.
- Teach before testing: each new mechanic has a short, untimed playable tutorial before independent use.

## 3. Consolidated direction and implementation defaults

V2's approved recommendations form the foundation. The princess integration and scope resolutions below are the merged specification; numerical defaults remain subject to playtesting.

| Area | V3 direction |
| --- | --- |
| Title | Pawzzle Maze |
| Hero and destination | Dog starts top-left; doghouse is bottom-right |
| Main objective | Collect required items, fulfill any royal delivery, and reach home |
| Optimization | Fewest grid moves, including necessary backtracking |
| Visibility | Entire maze and its objects visible |
| Input | Draw a plan, then press Go for execution |
| Collection | Any order first; numbered-order puzzles introduced later |
| Item identity | Golden treat first; bones and themed discoveries added later |
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
| Golden treat / royal discovery | Required delivery item | Collect on entry; automatically offer at Mocha's marked interaction tile | First level |
| Princess Mocha | Friendly passage guardian | Opens her linked passage after delivery; remains approved for that plan | First level |
| Bone | Required retained collectible | Automatically collected when entered; no delivery unless explicitly defined | Later content |
| Tennis ball | Later collectible variety | Same collection rule unless an ordered level labels it | Later content |
| Frisbee / squeaky toy | Later collectible variety | Cosmetic variety or a clearly numbered objective | Later content |
| Key | Tool | Automatically collected; permanently unlocks its matching gate | After core levers |
| Doghouse | Finish | Wins only after all required collection objectives are fulfilled | Core |
| Lever | Maze control | Explicit planned action switches linked passages | Core mechanic |
| Portal pair | Transportation | Automatic transfer on entry, with paired markings | Optional expansion |

Do not introduce several collectible icons as if they have different powers when they do not. Start with one golden treat and one royal request. Toys can later support themed or ordered puzzles, but should not create unexplained rules. Required collectibles, keys, and scenery must look distinct. No optional score pickups in the initial version: they would obscure the fewest-moves objective.

### Collection order

- Standard levels allow required items in any order.
- Ordered levels number their required items `1, 2, 3…` on both the board and objective strip.
- Entering an out-of-order item's cell is allowed, but does not collect it. The player must return when it becomes the next required item.
- An item is collected once and remains collected for the rest of that attempted plan.
- The finish condition checks collected objectives and completed deliveries, not just whether their cells were visited.
- Keys are separate tools; a numbered bone order does not implicitly restrict key collection.
- Do not mix ordered and unordered required items in the first ordered levels. More complex objective groups are outside the first release.

### Keys and gates

Use a visibly matched symbol and color on each key/gate pair. On collection, the key opens all gates bearing that key ID for the remainder of the plan. The key is not consumed per crossing. This deliberately simple rule avoids inventory-spending ambiguity. Explain it in its own tutorial.

## 5. Grid and action rules

- Boards use `N × N` cells and orthogonal movement across open edges.
- Each move into an adjacent cell costs one grid move. No diagonal moves, wall crossing, or wraparound.
- All required items must be collected and all required royal deliveries fulfilled before entering the doghouse can finish the puzzle.
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
3. Simulate the plan as it is drawn: preview collected items, royal deliveries, unlocked passages, and lever-controlled walls.
4. At a lever, the player may choose **Activate lever**, adding an explicit action at the current endpoint. Simply passing through does not activate it.
5. Resume drawing under the resulting maze state.
6. Enable **Go** only when the plan is valid and ends at the doghouse with all required objectives and royal deliveries satisfied.
7. On Go, validate and score the complete plan instantly, then animate the dog following it.

The preview dog is visually distinct from the execution dog. Clearly label preview state so the player understands that drawing has not committed a run. Collected-item previews must reverse correctly during editing.

### Backtracking versus undo

V1 retracted the route whenever an existing cell was revisited. V3 retains V2's explicit backtracking: moving back over a path can be essential to collect objects, deliver a discovery, or revisit a lever.

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
- Each controlled edge has exactly one controlling switch, one princess gate, or one key gate in the initial implementation. Avoid conflicting ownership rules.
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
- A local submission must arrive before its active-play budget expires; a future ranked submission must be accepted strictly before its server deadline. Incomplete plans never score.
- No valid submission produces **No completed route**, not a zero-move score.
- Local challenge timers continue during ordinary editing, feedback, and playback. Explicit pause, platform pause, or document hiding freezes local play and covers the board. See Section 19 for the separate future ranked interruption policy.
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
- The server issues the challenge, round ID, start time, and deadline; reload cannot restart the timer. An interrupted round cannot resume ranked eligibility; it may continue as practice under Section 19.
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
| A royal request | Pickup, return, automatic delivery | Fetch the treat, return to Mocha, and use her opened passage |
| Fetch a bone | Retained collection versus delivery | Collect a bone without offering it |
| A better fetch | Fewest-moves goal and valid backtracking | Compare two valid routes and improve one |
| Flip the passage | Explicit lever action and linked edges | Activate a lever and use the opened passage |
| Switch it back | Reusable lever | Revisit and restore a switch to finish |
| Fetch in order | Numbered collection | Collect items in their displayed order |
| Key to the gate | Tool versus collectible, persistent unlock | Collect a key and cross its matching gate |
| Portal paws | Paired transfer, cost, no immediate bounce | Enter a portal, exit its partner, finish |

Use small boards, one new rule at a time, a single contextual instruction, and a visible response to the player's action. A tutorial is complete only after the player performs the taught mechanic and completes its puzzle. Do not introduce levers, keys, and ordered collection simultaneously.

## 12. Level design and production scope

### One finished level first

The first deliverable is **The Royal Garden**: one small handcrafted, replayable puzzle with a short guided introduction, playable dog, golden treat, Princess Mocha, doghouse, complete plan/Go loop, optimal-move results, and retry. Build this complete loop before introducing the lever. Tutorials may use isolated microboards or resettable guided phases; they do not imply a multi-level campaign commitment.

Add one reusable lever only after the royal-delivery loop is stable, and teach it before combining it with the main puzzle. If time is tight, ship the complete royal-request puzzle and defer the lever as an explicitly unfinished roadmap item. Do not quietly remove its tutorial to fit it in.

### Opening chapter and stretch content

| Level | Setting and personality | Required discovery | Layout goal | Scope |
| --- | --- | --- | --- | --- |
| The Royal Garden | Suspicious bush and a princess refusing to leave | Golden treat | Small loop with two plausible collection-and-return routes | First complete level |
| The Royal Inspection | A bench requiring royal investigation | Royal ball | More forks and similar-length alternatives | Stretch |
| Her Majesty's Final Walk | Fountain and one final inspection | Golden leaf | Larger but readable loops; optional previously taught lever | Stretch |

Treat, ball, and leaf are the same delivery-item behavior with different art and text. One request per level initially. Completing one layout unlocks the next only if that content ships. A one-level release goes directly to the ending and replay screen.

### Difficulty and later growth

Start around 5 × 5 to 7 × 7; test larger layouts only while maintaining usable touch targets. Increase meaningful route choices before board size. Later add retained bones, collection ordering, keys, and portals through separate tutorials. Preserve V2's broader puzzle campaign as a roadmap, not a launch commitment.

Place Mocha's gate on every path to the doghouse in royal-request levels so her request cannot be bypassed. Provide alternate routes before the gate, with a reachable request item and reachable interaction tile. The solver must prove the delivery and exit are possible. Never put the only requested item behind its own locked gate.

Handcraft the first levels. No chase AI, pushing physics, branching dialogue, large inventory screen, or procedural state-puzzle generator is required. New mechanism combinations need validation; more objects do not automatically make better puzzles.

## 13. Visual, sound, and accessibility direction

- Minimalist top-down grid with soft pastel garden colors, low-detail hedges, benches, bushes, and a fountain outside the walkable route.
- A fixed overhead Three.js view may add shallow visual depth while keeping 2D grid input exact. Avoid camera rotation and scenery occlusion.
- Distinct playable-dog and Princess Mocha silhouettes; Mocha is a small white dog with a crown or royal collar. Use simple sprites/meshes before commissioning complex animation.
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
  royalRequests, princessGateEdges, interactionCells
  taughtMechanics, modeConfig

PuzzleState
  dogCell
  collectedRequiredMask
  nextRequiredIndex
  collectedKeyMask
  switchMask
  collectedDiscoveryMask, carriedDiscoveryMask, fulfilledRequestMask

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

V1's BFS over cells alone is insufficient. The search node is the complete puzzle state: position, collection progress, keys, switches, carried discoveries, and fulfilled requests. Revisiting the same cell with a different inventory, delivery status, or switch state is a different node.

- Legal movement edges have cost 1.
- Lever activations have cost 0.
- Use 0–1 BFS, or Dijkstra if later rules introduce other nonnegative costs.
- Apply automatic collection, royal delivery, key unlocks, and optional portal transfer according to the same transition function used by gameplay.
- The goal predicate requires the doghouse, all required items collected, and all required royal requests fulfilled.
- Store the lowest cost seen for each complete state. Relax only when cost strictly improves, preventing zero-cost lever cycles from looping forever.
- Reconstruct one optimal action sequence, including lever actions, for post-puzzle playback.
- Treat all matching minimum-move completions as perfect; do not compare against one canonical path.

State space grows roughly with cells multiplied by collection, key, and switch combinations. Limit mechanics per level; set solver budgets and report **unverified**, never **optimal**, when a search is cut short. Precompute and verify official level optima before publishing. Do not publish ranked levels without a proven optimum and at least one valid completion.

### Suggested modules

Level schema/loader, transition simulator, plan editor, playback renderer, state-space solver, round/scoring controller, tutorial progression, local persistence, and later ranked API. Keep art and UI independent of the puzzle rules.

## 15. Development milestones and current-code migration

The repository README reports an existing Vite/Three.js browser frontend, shared game-core rules, Fastify/SQLite API, generated practice, server-scored daily rounds, and a separate Godot demo. This document review did not run or audit that code. The README says dog movement, treats, princess interactions, and levers are not implemented.

Reuse the browser foundation as the primary GamePix path; do not start an engine rewrite merely to match a brief. Keep Godot separate from this delivery scope. Existing online infrastructure is optional reuse, not a reason to delay the story puzzle.

1. **Rules migration:** introduce versioned state simulation and action plans; allow revisits; add royal delivery and the state-space solver. Replace assumptions that a path is only a list of unique cells.
2. **Complete Royal Garden loop:** drawing, preview, Go, dog playback, treat pickup, delivery, Mocha's reaction, doghouse, scoring, ending, retry, and short playable onboarding.
3. **Early platform test:** produce a local browser build and test in GamePix's development environment before polish. No public publishing is authorized by this documentation task.
4. **One lever:** add explicit reusable activation and tutorial, then one suitable combined puzzle. Defer if it jeopardizes the complete first level.
5. **Polish and optional local challenge:** responsive input, sound/mute, pause/resume, timing, best result, and physical touch testing.
6. **Stretch maps:** reuse the same royal-request behavior for ball/leaf levels; add no new rules merely to produce three maps.
7. **Later features:** retained/ordered collectibles, keys, richer campaign, upgraded online competition, and finally portals.

Migration checks: V1 repeat-rejection must change; submissions must carry validated actions rather than only cell IDs; the solver must include objective state; local/server validation must agree. Namespace saves, challenge IDs, and scores by rules version so old bare-maze optima and rankings never mix with V3.

### Team workstreams

| Workstream | Responsibility | Integration output |
| --- | --- | --- |
| Story and level design | Mocha's quips, maps, placements, tutorial copy, first-time playtests | Validated level definitions and short text |
| Core gameplay | Simulator, plan editor, solver, collisions, reusable lever | Deterministic action transitions and fixtures |
| Character and presentation | Dog playback, Mocha states, item feedback, readable walls | Visuals driven by simulation events |
| UI and platform | Menus, progress, timer, lifecycle, input scaling, package checks | Runnable browser build with full retry loop |

These are workstreams, not assignments to named people; the three friends can combine responsibilities. Agree on schemas and event names before integration. Keep commits small and the shared build runnable. Test after each integration.

The source brief's three-hour schedule is an aspiration, not an estimate for this richer V3 design. Use the milestone gates above and cut optional maps/features first. No implementation or deployment is part of this GDD task.

## 16. Acceptance criteria

### Gameplay and planning

- A plan cannot finish without all required objectives and deliveries, even if it reaches the doghouse.
- The royal item is reachable before approval; the doghouse cannot bypass Mocha's gate.
- Approaching without the item does not unlock the gate; entering the interaction tile with it delivers once.
- Undo across delivery restores the carried item and closed gate; replay starts with Mocha unapproved.
- A required backtrack is retained and charged as movement; Undo removes an action instead.
- Out-of-order items remain uncollected until re-entered at the correct stage.
- Passing a lever does nothing; explicit activation changes exactly its linked edges.
- Repeated lever use restores the prior state and permits valid return routes.
- Undo/Clear correctly restore inventory, deliveries, order progress, walls, and dog position.
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
- SDK pause/document hiding freezes local timers, input, playback, and sound. Resume cannot unmute a muted game.
- A future ranked interruption preserves accepted results but prevents additional ranked submissions; continuation is practice.

### Tutorials and optional features

- Each introduced mechanic has a playable lesson and an independent follow-up puzzle.
- Timed challenges cannot surprise players with an unintroduced mechanic.
- Portal entry costs one move, transfer costs zero, arrival never bounces back automatically, and reuse works after leaving/re-entering.
- Ranked validation rejects forged state, invalid actions, version mismatches, and unauthorized additional daily runs.

## 17. Playtesting and unresolved production choices

Measure whether players understand plan versus execution, distinguish backtracking from Undo, see which walls a lever changes, understand ordered pickups, and choose to improve a successful solution. Track completion rate, extra moves, time to first valid plan, edits, attempts, and input errors.

Adjust tutorial pacing, item counts, switch counts, board size, and timed-mode duration based on observed confusion and enjoyment. The priorities are readable decisions and satisfying optimization, not maximum maze complexity.

Still to choose: art/audio assets, minimum supported viewport, whether stretch maps fit, local timer tuning, and the future ranked-hosting plan. The browser scaffold is the reuse baseline, not a requirement to maintain both browser and Godot feature parity. V3 resolves the source-brief conflicts for this consolidated proposal; the team can review its merge table before coding.

## 18. Princess Mocha: story and exact interaction rules

### Character and tone

Opening chapter: **The Princess's Kingdom**. Story hook: **The Princess Refuses to Go Home**. Chapter tagline: **Every neighbourhood is her kingdom.**

Mocha is a curious, stubborn little ruler, not an enemy. The playable dog is her fellow canine companion trying to get home. A bush, bench, or fountain becomes a matter of royal importance. Her personality changes the presentation of one simple request; it does not introduce negotiation systems or autonomous AI.

Use elegant, lightly dry humor, brief speech bubbles, and small expressions:

- Before delivery: “Home? We have barely begun our inspection.”
- Request: “That bush requires a royal snack.”
- Missing item: “Not yet. I have a request.”
- Delivery: “You may proceed. I shall allow it.”
- Completion: “Her Majesty approves!”
- Timeout without a solution: “Her Majesty has extended the walk.”

Keep lines short and dismissible. The required item's icon and name must state the goal directly; flavor text is not a cryptic clue the player must decode.

### Deterministic delivery model

Use one princess, one requested discovery, one approach/interaction cell, and one princess-controlled edge in the first level. The NPC is visually beside that cell/edge; she does not occupy a traversable cell whose collision behavior changes ambiguously.

1. At level start, Mocha's linked passage is closed and her request is visible.
2. Entering the discovery cell automatically collects the item once. Mark it collected and carried.
3. Entering the marked interaction cell while carrying the requested item automatically delivers it, consumes the carried item, marks the request fulfilled, and permanently opens her passage for that plan.
4. Entering without the item triggers only the short request feedback; the passage remains closed.
5. Repeat visits after approval do not consume another item or close the passage.
6. Completing the plan still requires the doghouse and any other required objectives.

Automatic delivery costs zero extra grid moves and is part of the entry transition. There is no extra interaction button, proximity radius, or new action type. “Return to the princess” therefore means routing through the marked interaction cell after pickup. Do not place the discovery on that cell, behind its own gate, or on a portal/lever tile in initial content.

The simulation order for a legal move is: cross an edge allowed by the pre-move state; resolve any atomic portal transfer; collect eligible destination items; resolve delivery on the destination interaction cell; then evaluate completion. In initial content those special tiles are disjoint. Gate opening affects subsequent moves, not a crossing that was already blocked.

Retain collected-history and fulfilled-request flags after consumption, so “all objects obtained” does not become false when an item is offered. The HUD shows **Find → Carry → Delivered**, rather than dropping a collected counter back to zero without explanation.

For the first level, the familiar state names can be derived as follows:

- `hasDiscovery`: carried discovery flag.
- `princessApproved`: fulfilled request flag.
- `exitUnlocked`: princess gate open, not permission to ignore other objectives.
- `timeRemaining`: local active-time budget where a timer is used.

Do not store contradictory independent copies of these derived values.

### Preview, animation, and undo

Planning previews delivery and the opened gate immediately; it does not wait for Mocha's animation. Execution replays the same events. Mocha needs only sitting/requesting, accepting, and stepped-aside/approved visuals. She never follows or chases the player.

Undo rebuilds the state at the previous step, restoring the item and closed gate when necessary. Clear resets all request state. Accepted results are independent of playback interruptions. The solution solver must include collection history, carried items, and fulfilled requests in its state key; revisiting the same cell before and after approval is not the same state.

### Screens and first-time flow

```text
Loading → Pawzzle Maze title → Play / How to Play
→ Short playable onboarding → Royal Garden planning → Go playback
→ Results → Improve / Replay / Next (only if another map exists)
→ Chapter ending: “Her Majesty approves!” → Play again
```

A timed replay adds countdown and timeout states. If at least one valid plan was accepted before expiration, show that best result; do not label the whole round a failure. If none was accepted, show the extended-walk line and Retry.

Within the first few seconds, show the dog, request icon, Mocha's blocked passage, doghouse, and how to draw. Do not open with a cutscene. Teach each new mechanic through a safe playable action before asking for an independent solution. Royal-delivery onboarding precedes the first main puzzle; lever onboarding comes only when a lever is introduced.

## 19. Browser delivery, GamePix, and pause reconciliation

### Platform and packaging

Target an HTML5 browser build for GamePix using the existing Vite/Three.js foundation. Preserve a fixed, legible grid and touch-friendly input; shallow 3D rendering does not change movement rules. Build the initial story experience without an account or backend dependency.

GamePix's current SDK guidance requires SDK loading before game startup and pause/resume handlers that suspend gameplay and audio. Its manual lifecycle option separates loading progress, readiness, and gameplay start. Recheck the official integration guide during implementation. [Official SDK guide](https://partners.gamepix.com/sdk/doc/javascript) (checked 2026-11-07).

Use relative asset paths, a loading screen, consistent title/cover/icon, and responsive iframe layouts, including a 640 × 480 test. Handle visibility changes and both orientations. Avoid external links, analytics, and unapproved SDKs in the platform build. If ads are added, place them between levels rather than during puzzles. [Official submission guidelines](https://partners.gamepix.com/guidelines/submission) (checked 2026-11-07).

Project packaging target: ZIP the browser build contents so `index.html` is at the root alongside assets; verify the current upload workflow at integration time. A Node API and SQLite database cannot run inside that static ZIP. Make the story build self-contained; any future hosted leaderboard needs a separately deployed service and platform-compatible authentication/network behavior.

### Local versus ranked pause policy

This resolves an actual conflict between V2's wall-clock challenge and the friends' platform pause requirements.

| Situation | Campaign / local timed mode | Future ranked mode |
| --- | --- | --- |
| SDK pause or document hidden | Freeze input, preview/execution, timer, and audio; cover board | Perform the same local pause and immediately end eligibility for further ranked submissions |
| Resume | Restore previous state and remaining active time; respect mute | Show interruption notice; offer continuation as unranked practice |
| Ordinary drawing / Go playback | Local timed clock continues | Server deadline continues |
| Optional explicit pause | Freeze local play and cover board | Treat as ranked interruption |
| Reload | Restore supported local progress without fabricating completion | Never reset a round or grant a second ranked start |

Preserve results already accepted before a ranked interruption. Do not submit paused thinking time as a fresh ranked result. A client cannot prove that a player never paused or studied the board elsewhere; this remains casual competition. No ranked pause protocol is claimed to be implemented or cheat-proof.

This policy is a V3 design choice, not a statement that GamePix requires disqualification. It honors local pause behavior while avoiding an automatic competitive advantage from a paused countdown. The first GamePix release has local results only; revisit online hosting and interruption UX before enabling rankings.

### Delivery checks

- Test the complete start → plan → collect → deliver → exit → results → retry flow locally and in the platform test environment.
- Confirm no hidden dependency on a local API for campaign play.
- Exercise pause during drawing, after pickup, after delivery, and during playback; state must resume consistently.
- Test pointer, keyboard, and physical touch input; ensure small screens do not hide the Go/Undo controls.
- Verify asset paths and sound behavior in the packaged build, not just the development server.
- Use appropriately licensed art/audio and matching Pawzzle Maze metadata.
- Submit a complete playable experience when publishing; development test uploads are for integration checks, not a claim of release readiness.

## 20. V3 completion checklist for design review

- V2 remains the basis for route planning, full visibility, fewest moves, revisits, tutorials, and later mechanics.
- Both friends' princess/treat loop is integrated as a precise required-delivery objective.
- Mocha's name, personality, garden settings, reaction text, and three-map theme are preserved without adopting a different protagonist or control scheme.
- One finished level is the initial scope; additional maps and mechanisms have explicit gates.
- Solver, HUD, undo, and validation include delivery and gate state.
- Timed scoring and platform pause behavior no longer contradict each other.
- Existing code is a migration baseline, not evidence that V3 is already built.
- Older GDDs and source briefs remain unchanged for traceability.

