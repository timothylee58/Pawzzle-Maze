# GamePix Submission — Pawzzle Maze

> Working submission notes for **Pawzzle Maze: The Princess's Kingdom**.
> Source of truth: [GAME_DESIGN_DEVELOPMENT_V3.md](GAME_DESIGN_DEVELOPMENT_V3.md).
> **Artwork is intentionally deferred.** Do not use placeholder photos or generated images as final art.

## Game listing (draft)

**Title:** Pawzzle Maze: The Princess's Kingdom

**Short description:** Plan the paws, earn royal approval, and find the fewest moves home.

**Description:** Every neighbourhood is her kingdom. Guide a dog through Princess Mocha's garden maze by drawing a route, collecting the royal golden treat, and delivering it to the princess to open the way home. Press Go to watch your plan unfold. Complete the puzzle, then improve your route to use fewer moves.

**How to play:**
1. Study the maze, dog, golden treat, Princess Mocha, and doghouse.
2. Draw a route through open passages. Revisit cells when needed to reach objectives.
3. Collect the golden treat and plan a visit to Mocha's marked interaction tile. Delivering it opens her passage automatically.
4. Continue your route to the doghouse. Use **Undo** or **Clear plan** to change your route.
5. Press **Go** once all required objectives are fulfilled and your plan reaches home.
6. Replay and try to complete the puzzle with fewer moves.

**Orientation:** Landscape (proposed; test responsive layout before enabling).

**Tags (proposed, confirm available GamePix tag vocabulary):** Puzzle, Maze, Animals, Casual, Strategy.

**Supported devices:** Desktop first; enable mobile only after testing real touch controls and responsive iframe layouts.

**Game mode for first release:** Untimed single-player story puzzle. Optional timed replay, daily challenge, global rankings, advanced mechanics and further levels are not required for the initial GamePix build.

## Required submission fields and assets

| Requirement | GamePix condition | Current status |
| --- | --- | --- |
| Title | Required | Draft above |
| Description | Required | Draft above |
| How to play | Required | Draft above; verify matches implemented gameplay |
| Orientation | Required | Landscape proposed |
| Tags | 1–5 | Five proposed; confirm platform's actual choices |
| Icon | PNG/JPG; square, at least 256 × 256 px; max 1 MB | **Not created — visual work deferred** |
| Cover | PNG/JPG; 16:10, at least 1360 × 850 px; max 1.5 MB | **Not created — visual work deferred** |
| Game build | ZIP, max 2 GB, with `index.html` at ZIP root | **Not prepared/verified** |
| Build processed | Must finish GamePix processing | **Not uploaded** |
| Icon/cover processed | Must finish processing | **Not uploaded** |
| Device switch | Desktop and/or mobile enabled | **Not configured** |
| Jam code | Enter when creating the GamePix game | **Not verified** |

**Jam code warning:** If the required jam code was omitted at creation, create the game again with a new title rather than assuming it can be added later.

## Required build work before upload

The existing README describes a playable **earlier shortest-route prototype**, not the V3 princess delivery game. Do not submit it as though it implements V3.

- [ ] Implement V3 plan → preview → Go workflow with a visible controllable dog character on execution.
- [ ] Add one golden treat with automatic pickup and Princess Mocha's marked interaction tile.
- [ ] Delivering the treat opens her linked passage; entering without it shows clear feedback.
- [ ] End at doghouse only after objectives are complete; show results and replay.
- [ ] Confirm Undo/Clear restore preview and objective state correctly; count actual moves, including planned backtracking.
- [ ] Keep first release self-contained: no local Node API, SQLite or backend dependency inside the static ZIP.
- [ ] Add GamePix SDK lifecycle handling: loading/ready/start, pause/resume, audio and visibility/focus behavior.
- [ ] Test at 640 × 480, keyboard, mouse, and physical touch if mobile is enabled.
- [ ] Use relative asset paths and verify that `index.html` is at the top level of the ZIP.
- [ ] Run the packaged game in a browser and make an early GamePix test upload.
- [ ] Design final icon and cover later, then upload and verify processing before submission.

## Priorities for the team

1. **Gameplay integration:** One complete V3 story level, not several incomplete levels.
2. **UX and testing:** Clear start, objectives, how to play, valid/invalid plan feedback, win and replay.
3. **Platform integration:** Self-contained browser ZIP, GamePix lifecycle, test upload.
4. **Visuals (later):** Final icon and cover at exact specifications, and polished in-game art.

## Status

This file is **submission preparation**, not proof of GamePix acceptance. No artwork or final build accompanies this document. The team must confirm that the published game matches the listing before submitting.

Sources: [V3 game design](GAME_DESIGN_DEVELOPMENT_V3.md), [GamePix JavaScript SDK](https://partners.gamepix.com/sdk/doc/javascript), [GamePix submission guidelines](https://partners.gamepix.com/guidelines/submission), and supplied jam checklist.
