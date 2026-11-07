# GamePix plugin provenance and local changes

Source: official [Godot plugin instructions](https://partners.gamepix.com/sdk/doc/godot-plugin), archive [gpx-godot-plugin-1.2r.zip](https://integration.gamepix.com/sdk/plugins/godot/2025/gpx-godot-plugin-1.2r.zip), downloaded 7 November 2026.

Archive SHA-256: `078913166acb44a46f2944a88c725f95e89af35cbeb2229888a367d37ee605dd`.

`plugin.gd`, `plugin.cfg`, and the upstream README are preserved apart from trailing-whitespace cleanup. `gpx.gd` and `index.html` are adapted to the current [GamePix SDK v3 documentation](https://partners.gamepix.com/sdk/doc/javascript):

- Load the official SDK after the body exists, before engine startup or storage access.
- Report manual loading, ready, and first gameplay-start lifecycle events.
- Register SDK pause/resume and Page Visibility handlers, preserving overlapping pause reasons.
- Mute the master audio bus while paused, then restore its prior mute state. The game compensates its wall-clock deadline for paused time.
- Handle ad promise rejection/no-fill and absent callbacks; award rewards only on confirmed success. No ads are automatically requested by this game.
- Back `GPX.setItem`/`getItem` with the browser's localStorage for SDK synchronization and tolerate denied storage.
- Replace system alerts with an in-page loading/error UI and a retry button.
- Use relative game-resource URLs; the official GamePix SDK is the sole remote script.

The desktop MCP plugin is not part of this project or its web export. There are no telemetry SDKs or backend requirements in the exported game.
