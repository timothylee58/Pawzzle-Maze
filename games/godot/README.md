# Pawzzle Maze — Godot V3 / GamePix edition

The default Godot 4.7.2 project ports the current V3 opening campaign: **First steps home**, **A royal request**, and **The Royal Garden**. It uses the supplied sprite atlas for the player, crowned Princess Mocha, golden treat, doghouse, and hedge walls.

## Play

Import `project.godot` and press F5. Plan with arrow keys, direction buttons, adjacent tile taps, or dragging. Revisits append moves. Undo and Clear reconstruct inventory and gate state from the plan. Collect the treat, enter Mocha's crown tile to deliver it, and reach home. **Go** plays and scores a completed plan. Complete each lesson to unlock the next adventure. Results show moves, the proven optimum, extra moves, and your best. Clear starts a fresh attempt; use the level selector to revisit lessons.

Campaign play is untimed, as in the V3 browser UI. Pause/Resume and reduced-motion playback are available. SDK and visibility pauses block input and playback, mute audio, and preserve overlapping pause reasons. The player has a blue position ring and warm tint; Mocha has a crown. Small screens scroll vertically to controls and results.

## Rules and saves

`packages/game-core/v3/levels.js` remains the level source of truth. Run `node tools/sync-godot-campaign.mjs` from the repository root after changing levels. It generates `campaign_levels.gd` and exhaustive reference transitions. The build refuses stale generated data.

`campaign_rules.gd` implements the opening chapter's movement, discoveries, carried inventory, delivery, gates, completion, and tutorial requirements. Its independent full-state BFS verifies optimal move counts (4, 6, 10). All 352 reachable directional transitions are checked against JavaScript, including blocked moves and exact event/state results. Future keys, levers, ordered collectibles, and portals are rejected explicitly until ported; no such mechanics occur in this chapter. Timed replay, ranked/API modes, extra chapters, and new audio are outside this campaign port. Legacy V1 rule helpers/tests remain for regression coverage.

Web progress uses GamePix localStorage key `pawzzle:godot-campaign:rules-3.0`; native progress uses `user://campaign-v3.json`. Records include level version, best plan, and attempts. Saved plans are resimulated before accepting unlocks. Progress is local to this edition, separate from V1 and Three.js saves. `--test-mode` skips storage. Storage failures leave the current visit playable.

## GamePix export

The official GamePix Godot plugin 1.2r remains enabled with documented SDK-v3 adaptations in [PAWZZLE_CHANGES.md](addons/gpx-godot-plugin/PAWZZLE_CHANGES.md). Loading/readiness, first Go, completed-playback happy moments, pause/audio, and browser storage are connected. No ads are requested automatically; SDK ad failure/reward handling has mock coverage.

Install Godot 4.7.2 and matching export templates, then run from the repository root:

```powershell
./tools/test-godot-campaign.ps1 -GodotExecutable 'C:/path/to/Godot_console.exe'
./tools/build-gamepix.ps1 -GodotExecutable 'C:/path/to/Godot_console.exe' -PackagePath releases/pawzzle-maze-gamepix.zip
node tools/serve-gamepix.mjs
```

Open `http://127.0.0.1:8067/`, or `/iframe-test?width=640&height=480`. The ZIP contains `index.html` at root, with relative assets and a single-threaded Compatibility/WebGL 2 build. It needs no backend, cross-origin isolation headers, or MCP plugin. GamePix's SDK is the sole remote script.

The test script runs generated-data checks, JavaScript V3/SDK bridge tests, Godot rules parity, and campaign integration. See [verification evidence](../../docs/GAMEPIX_WEB_VERIFICATION.md) for browser results and remaining hosted-platform checks.
