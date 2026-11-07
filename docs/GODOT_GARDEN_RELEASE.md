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
