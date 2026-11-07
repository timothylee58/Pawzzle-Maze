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

