# Pawzzle Maze — Godot edition

A separate playable Godot 4 project with a native 3D board and the same route-scoring rules as the browser edition. Tested with official Godot 4.5.1 on macOS.

## Open and play

In Godot 4.5 or newer, select **Import**, choose this folder's `project.godot`, then press **F6** on `main.tscn` or **F5** to run the project. Alternatively use `godot --path .` from this directory.

Press Start, then drag from S to G or use the arrow keys. Release and resume at the endpoint. Backtrack to retract; after submitting, click a route cell to edit its prefix. The 60-second timer continues during edits. A perfect route ends the round. Results offer an optimal-route overlay and practice replay.

The viewport uses actual 3D wall meshes, directional lighting, a raised green route, and an orthographic overhead camera. The interface is aimed at desktop windows of 900 pixels or wider. Touch events are mapped to pointer input, but physical touch-device verification is still needed. Use the responsive Three.js edition for small phones.

## Features and limitations

Includes generated practice at three sizes, meaningful alternate-route validation, BFS scoring, strict monotonic deadline, best-result retention, completed attempts, saved local results, exact-tie local rankings, one device-only daily run, post-round review, and practice replay. The daily best is saved on acceptance; reloading consumes the local run without extending it.

This is a local prototype. No accounts, server-authoritative scoring, verified global leaderboard, public hosting, or active-round resume. The Godot generator has its own `godot-1` version and differs from the browser's `maze-1` generator. Daily layouts and score histories are separate between editions.

Saves live in Godot's normal `user://maze-results.json` directory. Integration tests with `--test-mode` do not read or write the player's scores.

## Tests

- `godot --headless --path . --script tests.gd`: 8,438 assertions covering 100 generated mazes, connectivity, alternate routes, determinism, BFS, tied optima, retraction, illegal moves, strict deadlines and pointer-segment rules.
- `godot --headless --path . --script integration_test.gd -- --test-mode`: drives a full round and checks perfect scoring, results, and editing lockout.
- Add `--capture` and omit `--headless` to render a preview image into the parent directory using the native renderer.

`rules.gd` owns maze and route logic, `round.gd` owns scoring/deadlines, `board.gd` renders and interprets pointer segments, and `main.gd` owns the UI and local persistence.
