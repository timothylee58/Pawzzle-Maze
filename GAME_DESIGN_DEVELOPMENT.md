# Minimalist Maze — Game Design and Development Specification

Version: 0.1  
Date: 2026-11-07  
Status: Initial implementation specification

## 1. Game concept

A minimalist 2D square-grid maze puzzle in which players draw a route from the top-left cell to the bottom-right cell. The entire maze is visible. Multiple routes reach the destination, but the objective is to find a route with the fewest grid moves before time expires.

The challenge comes from comparing plausible routes under time pressure. Reaching the exit is achievable; discovering the shortest route is the mastery goal. Any route tied for the shortest possible length is perfect.

## 2. Confirmed requirements and design decisions

### Confirmed by the creator

- Optimize for the fewest grid moves.
- Show the entire maze from the start.
- Players draw their paths.
- A completed route counts as an attempt.
- Use a timed mode.
- Report how many moves a route exceeds the optimum, such as “5 more moves than optimal.”
- Accept multiple equally optimal solutions.
- Increase difficulty through junctions and similar-length alternatives.
- Support competitive scores.

### Initial decisions to validate through playtesting

- One maze per round, initially with a 60-second time limit.
- Allow unlimited completed attempts during the round; do not reset or extend the timer on submission.
- Reaching the goal automatically submits the route.
- Retain the best submitted route, so experimenting cannot erase a better result.
- Rank route quality first and time to achieve that result second.
- Use a shared daily maze for ranked competition, with one ranked run per account per daily challenge.
- Provide unlimited unranked practice and post-round replay.
- Target a responsive browser game for mouse and touch input. Hosting, engine, account provider, and leaderboard service remain implementation choices.

These are proposed defaults, not additional creator requirements. Tune numerical values after testing.

## 3. Core loop

1. Choose the daily ranked challenge or practice.
2. Read a short instruction screen. Do not reveal the maze yet.
3. Select **Start**. Reveal the maze and start the timer together.
4. Draw from the start cell to the goal while comparing possible routes.
5. Receive immediate feedback for each completed route.
6. Revise or redraw while time remains.
7. End the round when the player finds a perfect route, the timer expires, or the player selects **Finish** after a valid submission.
8. Show the best result, its distance from optimal, and leaderboard placement when available.

## 4. Maze and movement rules

- The board is an `N × N` grid of traversable cells separated by walls.
- Start: `(0, 0)`. Goal: `(N - 1, N - 1)`.
- Each legal move crosses one open edge into an orthogonally adjacent cell and costs one move.
- No diagonal movement, jumping, wall crossing, wraparound, weighted tiles, or special abilities in the first version.
- Route length is the number of traversed edges, not the number of cells. A route containing 19 cells has 18 moves.
- All cells are connected, and at least two distinct simple start-to-goal paths must exist.
- There may be one or several shortest paths. Accept all shortest paths equally.
- Drawn routes cannot contain loops. Revisiting a cell already in the active route retracts the route to that cell.
- Retraction and editing do not add moves to the submitted path. The score measures the final route geometry, not pointer travel or editing effort.

### Important grid constraint

An orthogonal grid is bipartite: all routes between the same two endpoints have the same length parity. Therefore, the excess over the shortest route will always be even under these rules. Use dynamic messages such as “4 more moves than optimal”; the creator’s “5 more” example expresses the desired feedback style, but cannot occur in this ruleset.

## 5. Drawing and submission

### Pointer and touch behavior

- Begin a route by pressing the start cell.
- Drag through cells connected by open edges. Highlight the active endpoint and path.
- Releasing before the goal preserves the unfinished route; resume by pressing its endpoint.
- Dragging back into an existing route cell retracts the path to that cell when the movement is through a legal adjacent edge.
- **Clear path** removes the unfinished route without counting an attempt. The timer continues.
- An illegal transition leaves the route unchanged and provides subtle visual feedback.
- Leaving the board preserves the route and ends the current drag.
- Reaching the goal submits exactly once and ends that drag. Further pointer events cannot submit the same completion again.
- After a non-perfect submission, retain the submitted route for review. The player can press the start to draw anew, or press a cell on the submitted route to retain its prefix and revise the remainder. Editing alone never resubmits a route; the player must leave and enter the goal again.

### Input accuracy

- Capture the pointer during drawing to avoid accidental loss of input.
- Process the cells crossed by the pointer segment in order so fast drags can traverse several legal cells.
- Never infer a route around a wall or choose a branch on the player's behalf.
- Treat ambiguous diagonal/corner movement as invalid until the pointer clearly enters an orthogonally adjacent cell.
- Keep touch targets large enough to draw reliably. Start with a target of at least 32 CSS pixels per cell; reduce board dimensions on small screens rather than shrinking cells indefinitely.
- Provide keyboard input using arrow keys with the same wall, retraction, and submission rules.

### Attempt definition

A valid route reaching the goal counts as one attempt. Partial paths, clears, wall collisions, and retractions are not attempts. Completing an identical route again still counts as an attempt, but does not improve the best result or its timestamp.

## 6. Timer and round lifecycle

States: `ready → active → finished`.

- Start the timer when the board first becomes visible and interactive.
- Use elapsed time from a monotonic clock; do not decrement a counter once per animation frame.
- A completion is eligible only when its timestamp is strictly before the round deadline. At or after the deadline, reject the completion and finish the round.
- Timer expiration preserves the best completed route. An unfinished route is never scored.
- If no route was completed, show **No completed route** and do not assign a ranked score.
- A perfect submission finishes the round immediately because route quality cannot improve further.
- Ranked play cannot pause. Switching tabs, opening a menu, or backgrounding the app does not extend the deadline.
- Quitting a ranked round consumes that daily ranked opportunity. Retain any already accepted best submission.
- A reload may resume the same server-issued round before its original deadline; it never starts a new timer.

## 7. Feedback and results

### During play

Display only the information needed for decisions:

- Remaining time.
- Current route length.
- Best submitted length, once available.
- Completed attempt count.

After a valid submission:

- Non-perfect: **“24 moves — 4 more moves than optimal.”**
- Perfect: **“Perfect! 20 moves.”**
- Improvement: briefly mark **“New best.”**
- Worse or equal route: show its result while keeping the existing best result.

Keep feedback nonmodal so it does not obstruct the board or halt input. Do not reveal a recommended next move or solution during a ranked round. Reporting the gap intentionally allows players to infer the target length after their first completed route.

### End-of-round screen

- Best route length.
- Optimal route length.
- Extra moves above optimal.
- Time elapsed when the best route was first achieved.
- Number of completed attempts.
- Ranked placement, pending validation status, or practice label.
- **View optimal route**, **Replay in practice**, and **Leaderboard** actions.

Only reveal an example optimal path after the round. Label it **“One optimal route”** because other tied solutions may exist. When no route was completed, omit improvement-gap and best-time values rather than displaying misleading zeroes.

## 8. Competitive scoring

### Ranking rule

Within the same challenge and rules version, order eligible results by:

1. Fewest extra moves above optimal, ascending.
2. Elapsed time when that route length was first achieved, ascending.

Use milliseconds internally and display seconds to two decimal places. Exact ties share a rank. Completed attempts are informational and are not a tiebreaker in timed mode.

Example for a maze whose optimal length is 30 moves:

| Player | Best moves | Extra moves | Time best achieved | Placement |
| --- | ---: | ---: | ---: | ---: |
| A | 30 | 0 | 18.20 s | 1 |
| B | 30 | 0 | 24.50 s | 2 |
| C | 32 | 2 | 10.00 s | 3 |
| D | 34 | 4 | 8.00 s | 4 |

A longer route never outranks a shorter route because it was found faster. Avoid an opaque combined points formula in the first version.

### Ranked challenge policy

- Publish one shared maze daily, with a challenge ID, fixed rules version, fixed time limit, and fixed layout.
- Use a clearly displayed reset schedule; initial proposal: 00:00 UTC, displayed in the player's local time.
- Allow one ranked run per account per challenge. Further runs are practice.
- Only compare players solving the same maze under the same rules. Keep practice and historical challenge boards separate.
- Do not offer practice access to the current daily maze before a player's ranked run. Reveal it for practice after that run, or after the player explicitly forfeits ranked participation for that challenge.
- Let a round started before daily rollover finish against its original challenge and deadline.

### Integrity and persistence

- A local prototype may use local storage and a device-only leaderboard, clearly labeled as local.
- A public leaderboard requires an authoritative backend; do not present local scores as verified global rankings.
- The backend issues a round ID and start/deadline timestamps, reconstructs the maze, and validates each submitted route, move count, and challenge eligibility.
- Never trust client-reported optimal lengths or move counts. Recompute them on the server.
- Use idempotent submission IDs so network retries do not count additional attempts.
- For the first online version, use server receipt time for ranked timing and deadline enforcement. Show local feedback immediately, but mark results pending until accepted. Network latency therefore affects competitive timing and must be tested.
- Preserve the best accepted result even if the connection later fails. Provide clear rejected/pending states; do not silently promise an offline ranked submission.
- Full board visibility and shortest-path rules make automated solving possible. Server validation prevents invalid routes and forged scores, but does not prove human play or prevent advance knowledge from other accounts. Treat initial competition as casual; higher-stakes competition would need a separate integrity design.

## 9. Maze generation and difficulty

### Representation and baseline algorithm

Represent the board as an undirected graph: one vertex per cell and one edge per open wall.

1. Use a seeded pseudorandom generator and a versioned generation algorithm.
2. Generate a connected maze with a spanning-tree algorithm, such as randomized depth-first search.
3. Open selected additional internal walls to create cycles and alternate routes.
4. Verify that at least two distinct simple paths connect start and goal. A cycle elsewhere in the maze is not sufficient.
5. Use breadth-first search (BFS) from the start to compute the shortest distance and reconstruct one optimal route.
6. Evaluate candidate difficulty and reject layouts that are trivial, visually confusing, or outside the intended band.
7. Store the accepted layout, seed, generator version, shortest distance, and challenge metadata.

For a simple alternate-path check, reconstruct one start-to-goal path, then temporarily remove each edge of that path in turn and test reachability. If at least one removal still permits a start-to-goal path, an alternative exists. Restore each edge after its test.

Do not enumerate all simple routes: their number can grow exponentially. BFS is sufficient for scoring. Use bounded candidate-route sampling or a capped k-shortest-simple-path method only when assessing generation quality.

### Difficulty principles

- Begin with smaller grids and a few clearly readable decisions.
- Add meaningful junctions and competing routes with similar lengths.
- Prefer a few plausible alternatives over a board packed with open cells.
- Reject layouts where a nearly straight, visually obvious route trivializes the puzzle.
- Increase grid size only while preserving reliable drawing on the target device.
- Dead ends may exist, but alternate start-to-goal routes are the defining mechanic.
- Do not require a unique shortest route.
- Start all difficulty bands at 60 seconds so early tests isolate maze complexity. Tune the timer separately later.

Provisional practice bands:

| Band | Starting grid range | Intended challenge |
| --- | --- | --- |
| Introductory | 6 × 6 to 8 × 8 | Learn drawing and compare a few alternatives |
| Standard | 9 × 9 to 10 × 10 | Several meaningful junctions and similar-length options |
| Advanced | 11 × 11 to 12 × 12, where screen space permits | Longer comparisons and more competing branches |

Daily ranked challenges use one fixed layout across devices. Choose a daily grid size that meets the minimum supported mobile viewport; do not substitute easier boards per device.

## 10. Visual and audio direction

- Flat 2D presentation with a neutral background, clear walls, and generous space around the board.
- Use a restrained accent color for the active route.
- Mark start and goal with distinct symbols and labels, not color alone.
- Show a small endpoint marker to make editing predictable.
- Keep wall/path contrast sufficient in both light and dark themes if both are implemented.
- Use a subtle time warning near expiration; avoid flashing or disruptive animation.
- Optional short sounds for submission, improvement, and perfection; provide mute.
- Respect reduced-motion preferences. Make controls keyboard accessible and expose timer/result changes as text without announcing every timer tick.

## 11. Technical structure

Keep core rules independent of rendering and backend integration.

| Module | Responsibility |
| --- | --- |
| Maze model | Cells, walls, adjacency, stable layout serialization |
| Generator | Seeded layouts, cycles, candidate validation |
| Solver | BFS distance and one example optimal route |
| Route controller | Drawing, interpolation, retraction, wall checks |
| Round controller | State transitions, deadline, submission lifecycle |
| Scoring | Best-route selection, gap calculation, ranking tuple |
| Renderer and UI | Board, pointer/keyboard input, HUD, feedback, results |
| Persistence | Settings, practice history, local prototype scores |
| Ranked API | Round issuance, authoritative validation, leaderboard |

### Minimum data contracts

```text
MazeDefinition
  challengeId, generatorVersion, rulesVersion, seed
  width, height, openEdges, startCell, goalCell
  optimalMoves, timeLimitMs

Round
  roundId, challengeId, playerId, mode
  status, startedAt, deadlineAt
  acceptedAttemptCount, bestSubmissionId

Submission
  submissionId, roundId, orderedCellIds
  receivedAt, validatedMoves, extraMoves
  elapsedMs, validationStatus
```

Validate that the submitted route starts and ends correctly, each transition is orthogonal and open, no cell repeats, and the round is eligible and within its deadline. Keep canonical challenge data on the server even if the client receives a display copy.

## 12. Development milestones

### Milestone 1 — Playable local prototype

- Render a small collection of fixed multi-route mazes.
- Implement mouse/touch drawing, keyboard movement, retraction, and clear.
- Add BFS scoring, a 60-second round, completed-attempt counting, and best-result retention.
- Add results and one optimal-route overlay after completion.
- Verify that drawing and repeated improvement are enjoyable before expanding content.

### Milestone 2 — Generated practice

- Add seeded maze generation and alternate-route validation.
- Introduce difficulty bands and responsive layouts.
- Store settings and local results.
- Playtest route ambiguity, input errors, timer length, and how often players improve after feedback.

### Milestone 3 — Competitive MVP

- Add accounts or a stable authenticated player identity.
- Add daily challenges, one ranked run per challenge, and server-authoritative submissions.
- Add leaderboard, exact-tie handling, pending-result UX, reconnect behavior, and daily rollover handling.
- Label practice clearly and restrict current daily practice before ranked participation.

### Milestone 4 — Tuning and release readiness

- Tune generation using observed completion and perfect-solution rates.
- Test target mouse/touch devices and keyboard accessibility.
- Validate leaderboard ordering, network failure states, and cross-device challenge consistency.
- Freeze and version launch rules so historical scores remain interpretable.

## 13. Acceptance criteria and meaningful tests

### Maze correctness

- Every generated board is connected and has at least two simple start-to-goal routes.
- The same seed and generator version yield the same layout.
- BFS finds known shortest distances on hand-authored fixtures.
- A fixture with multiple shortest routes accepts each as perfect.
- A maze with a cycle that does not create an alternate start-to-goal route is rejected.

### Input and route correctness

- Walls and diagonals cannot be crossed, including during fast drags.
- Retraction produces the expected route without extra move cost.
- A path of `k` cells scores `k - 1` moves.
- Goal entry triggers one submission per completion gesture.
- Partial routes, clearing, and wall collisions do not increment attempts.
- Pointer release, board exit, and touch interruption preserve a consistent route state.

### Round and scoring correctness

- Submissions just before the deadline are eligible; submissions at or after it are rejected.
- A worse route cannot overwrite a better result.
- An equal-length later route cannot replace the earlier best-achieved time.
- No completed route produces an unranked result, not a zero-move score.
- A perfect route ends the round and disables further editing.
- Backgrounding and reloading cannot extend a ranked deadline.
- Ranking always prioritizes route length over speed; exact ties share a rank.

### Online correctness

- The server rejects forged route lengths, illegal paths, repeated cells, and mismatched challenge IDs.
- Duplicate submission requests are idempotent.
- A second ranked round for the same account and challenge is denied.
- A valid active round survives daily rollover with its original maze and deadline.
- Connection failure never silently converts an unaccepted submission into a verified score.

## 14. Playtest questions and measures

- Can a new player understand drawing and submission without verbal coaching?
- How often do players reach the exit, improve a route, or find perfection within 60 seconds?
- Do players understand that fewer moves outrank faster completion?
- Does exact gap feedback encourage another attempt without making puzzles too easy?
- How often do input errors interrupt intended paths, especially at corners on touchscreens?
- Are alternate routes visually plausible, or is the best route obvious immediately?
- Is time-based tiebreaking satisfying when many players find perfect routes?

Record completion rate, perfect-route rate, best extra moves, time to first completion, time to best route, completed attempts, and invalid input events. Use these measures to tune difficulty; do not assume that larger boards are automatically better puzzles.

## 15. Out of scope for the first release

- Hidden maze areas or exploration mechanics.
- Moving hazards, enemies, keys, teleports, weighted terrain, and power-ups.
- Attempt-limited mode.
- Live head-to-head multiplayer.
- Paid advantages or purchasable hints in ranked play.
- A single aggregate ranking that compares raw route lengths across different mazes.

## 16. Decisions to revisit after the prototype

- Final title and visual identity.
- Whether 60 seconds produces the intended pace.
- Daily maze size and minimum supported viewport.
- Whether daily challenges alone provide enough competitive replay value.
- Whether timing precision and network latency require a more sophisticated ranked protocol.
- Hosting, account system, leaderboard provider, and any publishing-platform integration.

The prototype can proceed with the stated defaults; these choices do not block the core game implementation.

