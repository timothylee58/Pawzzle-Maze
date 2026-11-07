# Pawzzle Maze — Godot / GamePix edition

This Godot 4.7.2 project preserves the timed shortest-route game and now uses the generated 2D sprite atlas. It is separate from the repository's V3 browser adventure: princess delivery, gates, Go/playback and campaign onboarding are not ported to Godot by this change.

## Play

Import `project.godot` and press F5. Start a round, then drag from the dog at the top left to the house at the bottom right, or use the arrow keys. Backtrack to revise. A perfect route ends the round; otherwise keep improving it within 60 seconds. Results offer the optimal route and practice replay.

The board renders the supplied dog, doghouse, bush and wall artwork. Completed rounds show the golden-treat trophy. The remaining sprites are available for future mechanics. The full root `Sprites/` pack is copied under this project as `res://Sprites/`.

The interface adapts to landscape and portrait widths. On small screens, scroll vertically to secondary instructions and result controls. Keyboard and pointer dragging have been tested in the exported browser build; physical mobile-device testing remains pending.

## GamePix integration

The official GamePix Godot plugin 1.2r is enabled. Its bridge and HTML shell have documented SDK-v3 adaptations in [PAWZZLE_CHANGES.md](addons/gpx-godot-plugin/PAWZZLE_CHANGES.md). Loading, readiness, first gameplay start, round-complete moments, visibility/SDK pause, audio mute restoration, and browser localStorage are connected.

Pauses stop input and preserve the remaining wall-clock round time. Clicking outside the iframe does not itself pause; hiding the page does. Ad APIs handle unavailable/rejected requests without granting rewards. This game does not automatically request ads or introduce rewarded features.

Desktop saves use `user://maze-results.json`; web saves use the known localStorage key `pawzzle-maze-results-v1`, allowing GamePix synchronization. `--test-mode` skips player storage. Scores remain local/unverified, and the Godot generator differs from the V3 web game's generator.

## Export

Install Godot 4.7.2's matching export templates. Select the **GamePix** Web preset and export to `index.html`, or run from the repository root:

```powershell
./tools/build-gamepix.ps1 -GodotExecutable 'C:/path/to/Godot_console.exe'
```

The script imports the project, exports the single-threaded Compatibility/WebGL 2 build, and creates `dist/pawzzle-maze-gamepix.zip` with `index.html` at the archive root. No cross-origin isolation headers, backend server or MCP plugin are needed. The GamePix SDK is the only remote script. A tested packaged snapshot is checked in under `releases/`.

```sh
node tools/serve-gamepix.mjs
```

Open `http://127.0.0.1:8067/` or `/iframe-test?width=640&height=480`. The HTTP server is local test tooling, not part of the exported game.

## Tests

Run from the repository root:

```sh
node --test tests/gamepix-platform.test.mjs
godot --headless --path games/godot --script tests.gd
godot --headless --path games/godot --script integration_test.gd -- --test-mode
```

The rules suite covers 8,438 assertions. Integration checks cover a complete round, results, input lockout, overlapping pause reasons, clock compensation and audio restoration. SDK bridge tests use mocks; actual GamePix-hosted ad delivery and platform acceptance require a GamePix test upload.

See [verification report](../../docs/GAMEPIX_WEB_VERIFICATION.md) for browser evidence and remaining platform checks.
