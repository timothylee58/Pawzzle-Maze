# Replicate asset drop

Original PNG files imported from the [team’s Google Drive folder](https://drive.google.com/drive/folders/12e0fr2BlqVaUUZkeNlQAJ74n0J40VNfZ) on November 7, 2026. Names and image bytes are preserved; the Drive Marketing folder is stored as `marketing/`, and root game images as `game/`.

This drop contains 12 game images and 4 marketing images (5,335,548 bytes total). These are source assets, not yet connected to the browser, Maze Lab or Godot renderers. In particular, the supplied `Princess Mocha.png` depicts a dark-coated dog; its name is preserved rather than recoloring it to match the current GDD’s white-dog description.

## Inventory

| Original file                                                      | Category  | Dimensions  | Alpha channel |
| ------------------------------------------------------------------ | --------- | ----------- | ------------- |
| [Bone.png](game/Bone.png)                                          | game      | 280 × 280   | Yes           |
| [Dog House.png](game/Dog%20House.png)                              | game      | 280 × 280   | Yes           |
| [Frisbee.png](game/Frisbee.png)                                    | game      | 280 × 280   | Yes           |
| [Golden Treat.png](game/Golden%20Treat.png)                        | game      | 280 × 280   | Yes           |
| [Key.png](game/Key.png)                                            | game      | 280 × 280   | Yes           |
| [Lever.png](game/Lever.png)                                        | game      | 280 × 280   | Yes           |
| [Portal Pair.png](game/Portal%20Pair.png)                          | game      | 280 × 280   | Yes           |
| [Princess Mocha.png](game/Princess%20Mocha.png)                    | game      | 256 × 256   | Yes           |
| [Royal Discovery.png](game/Royal%20Discovery.png)                  | game      | 280 × 280   | Yes           |
| [Tennis Ball.png](game/Tennis%20Ball.png)                          | game      | 280 × 280   | Yes           |
| [Wall Bush.png](game/Wall%20Bush.png)                              | game      | 256 × 256   | Yes           |
| [Wall.png](game/Wall.png)                                          | game      | 256 × 256   | Yes           |
| [Logo.png](marketing/Logo.png)                                     | marketing | 1360 × 850  | Yes           |
| [Marketing_1080x1350_01.png](marketing/Marketing_1080x1350_01.png) | marketing | 1080 × 1350 | Yes           |
| [Marketing_1080x1350_02.png](marketing/Marketing_1080x1350_02.png) | marketing | 1080 × 1350 | Yes           |
| [Marketing_1360x850_01.png](marketing/Marketing_1360x850_01.png)   | marketing | 1360 × 850  | Yes           |

## Source and integrity

[manifest.json](manifest.json) records each original filename, Drive file URL, dimensions, alpha-channel presence, byte count and SHA-256 checksum. “Replicate” is the user-provided asset label; generation model, prompts and license terms were not supplied in this folder and are not inferred here. An alpha channel does not imply every background pixel is transparent.

## Using these assets

- **V3 browser:** select and copy runtime images into `apps/web/public/assets/` (or import them from the source tree), then replace the corresponding procedural SVG artwork in `apps/web/src/adventure.js`.
- **Godot:** copy the selected game images into `games/godot/assets/`, let Godot import them, then assign their textures to the appropriate nodes.
- **Maze Lab:** integrate selected images within `web-prototype` separately; it does not automatically share the V3 renderer.
- **Marketing:** use the provided original sizes; retain these source files when exporting derivatives.

The import does not introduce portal, lever or other gameplay behavior. Asset availability and implemented mechanics are separate.
