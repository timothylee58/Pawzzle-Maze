# Maze Lab visual update

The game board is the main task. The supporting controls should be readable without making the puzzle feel like a dashboard.

## Mobbin references

- [NYT Games puzzle screen](https://mobbin.com/screens/f233a707-425b-4c02-9282-b983cef8e42b): observed a clearly separated play area, nearby actions and progress alongside the puzzle. Applied that hierarchy to the board, Go/Undo controls and objective checklist.
- [Duolingo chess screen](https://mobbin.com/screens/335a0619-0706-46bb-86fa-497b8b00577c): observed a compact status strip, a dominant board and characters framing play. Applied a compact move/best/objective strip and a distinct playable dog plus Mocha’s reaction panel.

References informed structure, not copied layouts or artwork. All shipped raster artwork comes from the supplied Pawzzle assets.

## Implementation

Use the official shadcn/ui components with a sage, pale-gold and rose theme. Gold identifies key gates and the main Go action; rose identifies the delivery gate. Diamond shapes, key symbols, Mocha’s D tile and text labels keep objectives distinguishable beyond color.

Motion for React provides short entry and feedback transitions, plus 110ms dog interpolation between deterministic playback positions. Reduced-motion preferences remove spatial transitions. Do not animate board geometry or change the simulation to match presentation.

The help dialog pauses active play and requires an explicit Resume after closing. The checklist follows the replayed state during playback and the planned state during editing. Rules, seed generation, scoring, local-save identity and export schema are unchanged.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build` and `npm run test:browser` from `web-prototype`. Check desktop, tablet and phone layouts; include keyboard-only dialog navigation and reduced motion. GitHub Pages continues to serve the static build using relative asset paths.

Library references: [shadcn/ui](https://ui.shadcn.com/docs), [Motion installation](https://motion.dev/docs/react-installation).
