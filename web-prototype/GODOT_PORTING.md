# Reusing the prototype in Godot

Start with `src/puzzle.ts`, not the UI. It is a dependency-free TypeScript reference implementation of the selected V3 rules. Port its behavior into GDScript and use the fixtures below to check parity. A TypeScript file is not directly executable as a Godot script.

## Data and transition mapping

- Cell IDs are row-major: `x = cell % n`, `y = floor(cell / n)`. Start is 0; home is `n * n - 1`.
- `edges[cell]` lists orthogonally adjacent cells connected by passages. Links are symmetric.
- A gate owns an undirected edge `(a, b)` and a `key` or `delivery` condition.
- `State` holds `cell`, collectible bitmask `mask`, persistent `key`, and `discovery` (0 = not collected, 1 = carried, 2 = delivered).
- Check edge and gate legality using the pre-move state. After crossing: collect an eligible diamond, collect a key, pick up the parcel, resolve delivery, then evaluate completion.
- In ordered mode, a diamond only collects after all lower-index diamonds are collected. Crossing it too early is legal but requires a later visit.
- Completion requires home, all diamonds, and delivery when enabled. Keys are tools, not collection objectives; the generated exit corridor makes its key necessary.

## Public engine functions

| TypeScript function | Godot responsibility |
| --- | --- |
| `generate(seed, config)` | Create a deterministic candidate and verify it before presenting it. |
| `initial()` | Canonical attempt state. |
| `transition(level, state, to)` | Return a new legal state or reject; never mutate the input state. |
| `replay(level, path)` | Rebuild preview/Undo/execution from canonical state. |
| `won(level, state)` | Shared goal predicate for UI, validator, and solver. |
| `solve(level, budget)` | BFS over the complete state, not just position; return path or an unverified/null result. |

Current movement actions all cost one. Automatic effects are part of movement. Switch to 0–1 BFS before adding V3's explicit zero-cost lever actions, and include switch state in the search key.

## Importing exported levels first

Use the app's **Export level JSON** button to get a concrete solved fixture. Import adjacency, object cells, gates, and config before attempting to reproduce the generator in GDScript. The export includes versions, seed, optimal move count, and `optimalActions` with `MoveTo` cell IDs. Convert each adjacent pair into your directional `Move` action. Adapt the export to V3's final `LevelDefinition`; it is a prototype interchange format.

For the default `PAW-1024` configuration, the optimal destination-cell sequence is:

```json
[1,2,8,7,13,14,13,7,6,12,18,24,25,24,30,31,32,33,34,28,27,21,22,23,29,35]
```

Do not use Godot's default seeded RNG and expect identical JavaScript output. The current engine uses 32-bit hashing and a custom PRNG. Match JavaScript unsigned overflow, bit shifts, and string iteration semantics explicitly, or import resolved JSON levels instead. Keep generator and rules versions with every saved puzzle.

## Port acceptance checks

1. Replay the exported optimal route; every transition succeeds, all objectives complete, and the score equals the exported optimum.
2. Remove a required-item detour; the bare exit route must not count as a win.
3. Cross a gate before its prerequisite; reject the move.
4. Undo pickup/delivery; inventory and gate state must return to the earlier state.
5. Revisit a cell; append and charge a new movement rather than retracting the route.
6. Replay every attempt from `initial()`, not the previous final state.
7. Re-run the same seed/config/version or imported fixture; get the same puzzle.
8. Stop a solver at its budget; label it unverified rather than optimal.

The existing `games/godot/` project remains the integration target after a separate audit. This source upload does not change that project or its gameplay.
