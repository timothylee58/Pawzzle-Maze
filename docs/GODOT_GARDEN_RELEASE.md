# Mocha's Garden: Godot release

The dedicated garden game at `games/godot/garden/main.tscn` ports the team's
`web-prototype/public/pawzzle-garden.html` to native Godot controls and GDScript.
The earlier princess-delivery campaign remains in its original scene.

## Gameplay

Random 5x5 through 14x14 mazes, three bones, a permanent golden key, and home.
Drag Mocha with touch or mouse along open paths; adjacent-tile taps, direction
buttons and arrow keys/WASD also work. Hedges stop a drag without teleporting.
Restart resets the current puzzle and timer; New puzzle creates a random one.
The timer starts on the first valid move, pauses with help/platform pause, and
stops on completion. The seed field, Undo and Hint controls have been removed.
There is no server, login requirement, leaderboard, or automatically requested ad.

## Reproduce

Use Godot 4.7.2 with matching web export templates and Python 3.

```text
node tools/garden-fixtures.mjs
godot --headless --path games/godot --script garden/rules_test.gd
godot --headless --path games/godot --script garden/integration_test.gd
node --test tests/gamepix-platform.test.mjs
python tools/build-garden.py --godot <path-to-godot-console-executable>
node tools/serve-gamepix.mjs dist/garden-gamepix
```

The builder stages only garden runtime files, textures, audio, and the GamePix
bridge. MCP tooling, parity fixtures, marketing scenes and tests are not shipped.
ZIP entries use forward slashes and `index.html` is at the root. Output:
`dist/pawzzle-mochas-garden-gamepix.zip`.

## Validation on 7 November 2026

- 300 JS-reference puzzles: 18,100 parity/rules checks, zero failures.
- 47 Godot integration checks: undo/inventory, assisted runs, best persistence,
  win/restart, pause overlap, mute preservation; zero failures.
- Eight GamePix bridge tests pass, including early pause and storage failure.
- Godlink used to create scripts/scenes, validate, run, send input, inspect live
  state, retrieve errors, and capture desktop/portrait screenshots.
- Exported browser game completed the default 6x6 seed in 36 optimal moves.
- Standalone browser reload retained the 36-move best score.
- 390x844 native layout inspected with board-first stacking and direction pad.
- Physical iOS/Android, Safari, actual ad playback remain unverified.

## Submission

New GamePix game: `AE5L7D`, slug `pawzzle-maze-mocha-s-garden`.
Title: Pawzzle Maze - Mocha's Garden.
Jam: Xsolla Game Jam (7 Nov), code `xsolla-game-jam-7-nov`.
Engine: Godot; SDK integration enabled; desktop enabled, physical mobile pending.
Icon and cover are rendered by the Godot marketing scene from repository art.
Publication status is tracked in the final delivery; a draft alone is not approval.

## Mobile controls and simplified UI revision

- Top-right timer and How to play dialog; help scrolls within short screens.
- Removed the above-board stats panel, seed field, Royal Errand copy and tagline.
- Board target is 125% of its previous size, capped by available phone width;
  board sprites scale with the cells. Garden sizes include every size 5-14.
- 109 integration checks pass, including native touch press/drag/release, fast
  multi-cell gestures, wall blocking, timer lifecycle and 80 solvable puzzles
  spanning every size. The 18,100 original parity checks still pass.
- Web export visually checked at desktop and in a 390x844 iframe; browser mouse
  dragging, help, timer, and the 14x14 selector confirmed. Physical iOS/Android
  and Safari remain untested. Headless teardown retains the known resource warning.

The user-confirmed deadline is 8 November 2026 at 1 PM Malaysia time.
Root-domain ads.txt verification remains separate from this game submission.

## Submitted build

GamePix confirmed SUBMITTED to Xsolla Game Jam (7 Nov) on 7 November 2026.
Build version: 3LmJY6AY01QEVXg8Boo9SvdXyP4.
The hosted preview completed all objectives in 36 moves. The final export also
completed in a 640x480 iframe. Public listing propagation and platform review
are separate from submission. The release ZIP is checked into releases/.
Dashboard: https://my.gamepix.com/games/pawzzle-maze-mocha-s-garden


## Checklist and movement clarity update

Objective rows now display bone, key and doghouse sprites beside drawn checkbox
icons, with green completed states. Movement buttons use drawn arrows and
Up/Left/Down/Right labels in a directional pad, avoiding missing font glyphs.
Validated in the web export: direction-button click moves Mocha; collecting two
bones and the key checks and highlights their matching rows. All 47 existing
integration assertions pass. Godot's headless teardown reports a resource-in-use
warning; the browser game renders and runs correctly.


Updated GamePix build: 3LmXi8UmuUqJ2cLMFcszAtkLdRI. Resubmission confirmed.


Mobile/layout build 3LmcphowGN4CUB1eCEtV0lygONI was processed and resubmitted
to the same jam entry. GamePix mobile-friendly flag and player instructions
were updated for drag controls and sizes 5-14.


## Hard mode, tutorial and focused controls revision

- Added Normal/Hard selection. Hard mode leaves the key uncollected until all
  three bones are collected; crossing its tile early is allowed.
- Arrow buttons only attempt movement. Blocked attempts leave game state,
  timer, focus and page unchanged.
- Added a dedicated How to play page with a 1x10 sprite strip: Mocha at 0,
  bones at 2/4/5, key at 7, doghouse at 9, plus mode and control instructions.
- Pausing blurs the board; resuming restores it. Settings sit left of the board
  on desktop and stack on narrow screens. Restart is top-left; a paw and
  centered title head the screen. Timer displays only elapsed time.
- Removed move/bone-count status and the repeated objective sentence.
- Validation: 205 integration checks and 18,100 legacy parity checks pass;
  80 hard gardens spanning sizes 5-14 are solvable with the required pickup order.
  Native and exported browser checks confirm tutorial navigation, board blur,
  blocked arrows and one-tile movement. Physical mobile/Safari remain untested.
- Latest headless integration run completed without the earlier teardown warning.

Evidence: garden-paused-blur.jpg and garden-tutorial.jpg.

GamePix build 3LmgamJYNBc8c9GlhQMzXSEhmAb processed successfully and was
resubmitted to the existing AE5L7D jam entry on 7 November 2026.
The 390x844 browser iframe also renders the complete 1x10 tutorial correctly.

## Verified gardens and compact controls

- Fixed completion popup input: the board is locked while the win overlay is
  visible, so it cannot consume clicks intended for either completion button.
  Invisible boards also ignore input. Both buttons are exercised with real
  mouse events in integration tests and completed web playthroughs.
- New generation places three bones followed by the key on a simple path from
  Mocha to home. A validator replays legal moves, checks bone-before-key order,
  rejects repeated cells, and requires completion before accepting the puzzle.
  Invalid candidates are retried; the legacy generator remains only as a
  graph source and parity-test reference. Backtracking by the player is still
  allowed; every accepted puzzle has a route that requires none.
- Sidebars now shrink to content height. Hard mode is a visible ON/OFF toggle.
- Restart, help, sound and pause use drawn SVG icons. Pause toggles to play;
  the board blurs without covering the toolbar, so the same button resumes.
- 2,213 integration checks pass, including 2,000 independently replayed routes
  across all ten sizes and both modes, invalid-route rejection, actual popup
  clicks and pause/resume clicks. 18,100 legacy parity checks also pass.
- Godot MCP native runtime reported no errors. Final headless integration run
  completed without resource warnings. Web playthrough verified both popup
  buttons; physical mobile/Safari remain untested.

Release build: 3LmjSHCv1KSkiFlfoUCH4kMb0im (12,880,572-byte ZIP).
Web evidence: garden-compact-controls.jpg.

## Fixed tiles, checklist and automatic timer

- Checklist now has three sprite rows: X/3 bones collected, Key collected,
  Return home. Bone count updates for each collected bone.
- Every garden uses 96-unit tiles, with fixed sprite proportions. Smaller
  gardens are centered; larger gardens scroll without shrinking sprites.
  The view follows Mocha, and clipped areas do not intercept outside clicks.
- The tutorial return control is a minimalist left-arrow icon.
- Generation and restart immediately start the timer. Help/pause still freeze
  it, and completion stops it. Instructions updated accordingly.
- 2,245 integration checks pass, covering all grid sizes, touch input, checklist
  masks, automatic timing, pause/resume, popup clicks and large-grid following.
- The minimum-step solver and scoring behavior are unchanged. A proposal to
  validate/expose the existing state-space BFS is pending user approval.

## Fit-screen layout revision

- Moved the four direction buttons above the grid and removed the control tip.
- Settings and the three-row checklist share a single left sidebar, which
  scrolls independently on short screens.
- Removed fixed tile sizes and board scrolling. The entire garden scales to
  the largest square that fits right of the sidebar and under the title and
  direction controls. Sprites scale with the cells.
- 2,254 integration checks pass, including full-grid fit at 1280x900,
  640x480, 390x844 and 320x640, all grid sizes, touch input and popup controls.
- Godot MCP native run reports no errors. Minimum-step solver is unchanged.

Final fit-screen build: 3Lmnnedz4yWPw96t7BHSUA5MS3t (12,881,091 bytes).
GamePix confirmed resubmission on 8 November 2026. The public jam page is
available again. Mobile refinement aligns the board directly below arrows
and uses compact checklist padding with readable text.

## Bush perimeter and control clarity

- Every maze and the tutorial now has a continuous wall-bush perimeter.
- Movement arrows use larger minimalist stroked icons and reduced vertical padding.
- Timer sits directly to the right of Restart; removed Difficulty heading and
  made the Garden size selector fit its contents.
- All 2,254 integration checks pass. Native runtime reports no errors; desktop,
  320x640 browser layout and tutorial perimeter visually checked.
- Minimum-step BFS unchanged: uniform move costs and at most 3,136 states make
  it suitable here. A* is possible with an admissible objective-aware heuristic;
  Kruskal alone solves a spanning-tree problem, not the required shortest route.
- GamePix build: 3LmphiOxd27mLee2HQLnOusnSSP (12,882,313-byte ZIP).

## Exact minimum-step BFS (approved implementation)

- Exposed `solve_result(level, start)` with solvable, minimum_steps, route and
  states_visited. It shares gameplay transitions and searches position, three
  bone bits and key possession; each state is visited once. Maximum 3,136 states
  on a 14x14 grid. Blocked moves cost nothing; legal moves cost one step.
- A completed start returns zero remaining steps; unreachable objectives return
  solvable=false and minimum_steps=-1. Prior moves do not inflate remaining cost.
  The route-only solve API remains compatible with existing replay fixtures.
- Sidebar shows the exact start-to-finish minimum for the selected mode, computed
  once per generated puzzle. Restart preserves that target. Completion compares
  actual steps with the target and marks a matching run as Perfect route.
- Validation: 2,629 solver assertions (independent Dijkstra oracle, early key,
  inventory-dependent revisits, solved/unreachable/partial starts, all sizes and
  both modes), 2,256 gameplay assertions, and 18,100 legacy parity assertions.
  All pass. Slowest measured generated search: 13.39 ms on this workstation.
- Native Godot reports zero errors. Exported browser puzzle completed in exactly
  12 steps, matching its displayed minimum and showing Perfect route.
- Export archive: 12,882,965 bytes. Evidence: garden-bfs-success.jpg.
- GamePix release build: 3LmrHMZwlr2Wz34YGvAwcAPmKBL.
- Public jam player verified serving this build with Minimum steps visible.

## Undo toolbar and quadrant placement

- Toolbar order is timer, four movement arrows, Undo, Restart. Desktop controls
  sit above the grid; narrow screens keep a compact single row. Title and paw
  sit at the top left. Garden size label and selector share one horizontal row.
- Undo restores previous position, inventory and move count. It does not rewind
  elapsed time and is disabled with no history, during pause/help or after win.
- Added the same paw artwork as inline SVG to the HTML loading screen.
- Generator carves a randomized simple route into the base maze and places one
  collectible in each quadrant. Middle rows/columns of odd sizes belong to the
  bottom/right halves. A bounded constructive fallback preserves guarantees.
- A bone must be strictly closer to home than the key by both shortest open-path
  distance and Manhattan grid distance. Every accepted route is replayed with
  hard-mode rules to prove all bones precede key and no tile is revisited.
- Passed 6,267 integration, 2,629 BFS and 18,100 parity checks (26,996 total).
  Includes 2,000 generated puzzles across sizes/modes and Undo inventory tests.
  Native runtime has no errors; desktop and 320x640 exported layouts checked.
- Fonts unchanged pending user choice. Suggested Fredoka (first choice), Baloo 2
  or Bubblegum Sans. Release ZIP: 12,886,695 bytes.
- GamePix build: 3LnwXQ5jNxH9v3MnrldYCJiGTjw.
- Public player verified live; evidence: garden-quadrants-live.jpg.

## Brutal mode and circular controls

- Added Classic / Hard / Brutal selection. Brutal requires all bones before key
  and blocks revisiting any cell in the current path. Undo restores visited cells
  along with inventory and position; Restart clears the path.
- Generated Brutal puzzles have an exact optimal route certified with no repeated
  cells. A Hard-mode BFS optimum that is legal under Brutal rules proves both
  solvability and optimality. A bounded constructive fallback preserves quadrant
  placement and a bone nearer home than the key. General Brutal BFS includes
  visited-cell history; unlike Classic/Hard it is not bounded to 3,136 states.
- Aligned timer, spaced arrow group, Undo, Restart and help/sound/pause on one row.
  All icon controls are circular, including tutorial arrows and Back. Narrow
  screens scroll this toolbar horizontally. Garden size text is centered.
- Removed checklist, replaced trail dots with pawprints, bundled Fredoka and its
  OFL license in both the Godot game and HTML loading screen.
- Tutorial is independently playable with arrows and Restart, with descriptions
  of all three modes. Opening it pauses and preserves the main puzzle.
- Validation: 6,291 integration, 12,574 Brutal, 2,629 solver and 18,100 legacy
  checks passed (39,594 total). Brutal tests include independent exhaustive small
  graph comparisons, 100 generated puzzles and forced constructive fallbacks.
  Maximum observed generation time: 2.043 seconds in the native test suite.
- Export is 13,121,149 bytes. Native runtime had no errors. Desktop and 320x640
  iframe layouts visually checked; physical phones and Safari were not tested.
- GamePix accepted build 3Lo0L6aHbGxvSosTL2RzxUfjfwB; entry resubmitted.
- Public jam player verified serving the new build; evidence: garden-brutal-live.jpg.

## Single-row header and checkerboard update

- Logo/title, timer and movement controls, and help/sound/pause share one row.
  Undo and Restart remain available beside movement controls.
- Sidebar sections have additional vertical separation. All sidebar text and
  dropdown entries are enlarged by approximately 25%, rounded up to whole pixels.
- Tile colors alternate by row-plus-column parity, including even-sized grids.
- Timer displays total elapsed whole seconds as `(X seconds)`.
- Credits name Frankie, Timothy, Han and Colin in How to play and the GamePix
  description editor. Updated listing instructions reflect all three modes.
- All 6,291 integration checks pass. Exported desktop layout visually verified.
  Release ZIP: 13,121,654 bytes.
- GamePix build: 3Lo1i9OqztFOtaSocBG48ETPHxG. Public listing description still serves older copy; credits are also included directly in the game.

## Spaced objectives, radio modes and structured guide

- Every pair among the three bones, key and house must be at least three
  Manhattan grid steps apart. This also lower-bounds open-path distance.
  The player is not included in the five-object spacing constraint.
- Placement filters candidate bones against the key, house and prior bones.
  All modes retain quadrant distribution, a bone nearer home than the key,
  and a verified simple winning route. Reworked bounded fallback for 5x5–14x14;
  its near-home bone is now three steps away rather than adjacent.
- Difficulty mode is a labelled, mutually exclusive radio group. Selected labels
  retain dark contrast and custom ring/dot icons clearly show the selection.
- Sidebar and How to play use the same mode descriptions. The guide now uses
  sentence-case headings and indented paragraphs, grouped by goal, mode and
  controls. Tutorial extended to 14 cells so its five objects are also spaced
  three steps apart while remaining playable in every mode.
- Validation: 26,306 integration checks, including independent pairwise spacing
  checks over 2,000 generated Classic/Hard puzzles and real radio clicks;
  13,614 Brutal checks including forced fallbacks; 2,629 exact-solver checks.
  All 42,549 checks passed. Slowest measured Brutal generation: 510.11 ms.
- Export: 13,122,560 bytes. Browser verified radio contrast and help layout.
- GamePix editorial text was saved again with current rules and all four names.
  The public description remains stale despite saved metadata and resubmissions.
  Public jam and Games screens expose no alternate description editor. Support
  directs users to support@gamepix.com; an unsent message is prepared in
  dist/gamepix-description-support.eml. Do not claim public text is corrected
  until verified on the public page.
- GamePix processed build: 3Lo3g7sRWS8afJlc3ybXcuw7b6K.
- Public player verified serving the new build; evidence: garden-spaced-live.jpg and garden-structured-help.jpg. Editorial description persisted after reload, but public description still remained unchanged.

## Same-maze modes, five bones and timer fixes

- Default garden is 7x7. Sizes 9x9–14x14 now require five bones plus the key;
  smaller gardens require three bones. All collectibles retain pairwise spacing
  of at least three grid steps, and each quadrant has at least one bone or key.
- Rules, key gating, victory and BFS use the level's actual bone count. State
  packing supports all 32 five-bone masks without position collisions.
- Every new UI puzzle is certified for Brutal mode before display. Changing mode
  resets the run on the exact same maze, preserving seed, edges, bone positions,
  key and house. The optimum is recalculated for the selected mode.
- Restart responds while manually paused, clears that pause and resets elapsed
  time. Timer reads X seconds without parentheses at the upper-right of the grid.
- Sidebar descriptions occupy fixed height so switching modes cannot resize the
  panel. Added a horizontal divider after New puzzle.
- Tutorial cells accept adjacent mouse/touch taps through the shared movement
  rules. Removed the Brutal Undo sentence and Moving Mocha, Puzzle controls,
  Timing and practice sections. Goal text explains the size-based bone count.
- Validation: 41,521 integration, 14,486 Brutal, 2,674 solver and 18,100 legacy
  parity checks passed (76,781 total). Real clicks verify Restart while paused,
  tutorial cell input, unchanged mode layouts and stable sidebar dimensions.
  Independent solver checks cover five-bone inventory and reject three-bone wins.
- Exported browser checks confirmed Restart displaying 0 seconds, default 7x7,
  five bones on 9x9, the same maze after mode switching, and clickable tutorial.
- Final release archive: 13,124,021 bytes.
- GamePix release build: 3Lo6vDPPqp1om1a5rlBmdx1hlMV; entry resubmitted successfully.
- Public player verified with the new build ID; evidence: garden-timer-modes-live.jpg and garden-five-bones-preview.jpg.

## Contributor credits and text refinements

- Created by now credits Frankie for developing/refining the reference web app
  prototype, Timothy for infrastructure and maze APIs, Han for Godot asset
  integration, penetration testing and debugging, and Colin for Figma sprites
  and visual assets.
- Removed the mode/direction prompt above the tutorial controls. The completion
  message still appears after solving the tutorial.
- Sidebar now reads Minimum steps to win: X.
- Godot export succeeded (13,124,240-byte ZIP). Browser visual checks confirm
  the sidebar label, removed prompt, and all four credit paragraphs.
- GamePix accepted and resubmitted build 3Lo7vW4v5aVTOPKqLT7Ljmwo2oO.
- Public player verified serving the new build. Evidence: garden-contributor-credits.jpg and garden-credits-release-live.jpg.

## Garden size cap and support request

- Removed 11x11 through 14x14 from the garden selector; available sizes are
  5x5 through 10x10, with 7x7 still the default.
- Updated the guide to describe five bones on 9x9 through 10x10.
- Godot web export succeeded (13,124,251-byte ZIP). Browser inspection verified
  all six size options and the 7x7 default; evidence: garden-size-options.jpg.
- Sent the public-description correction request to support@gamepix.com on
  8 November 2026 with current rules and Frankie, Timothy, Han and Colin credited.
  Public-description synchronization remains pending GamePix support.
- GamePix accepted build 3Lo9eclQK2QqKqoIj92erlt1Huw; submitted the size-cap update.
