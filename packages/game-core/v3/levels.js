import { compileLevel } from './rules.js';
import { solveLevel } from './solver.js';
const base = (id, title, n, edges, extra = {}) => ({
  levelId: id,
  title,
  levelVersion: 1,
  rulesVersion: '3.0',
  width: n,
  height: n,
  startCell: 0,
  goalCell: n * n - 1,
  staticEdges: edges,
  controlledEdges: [],
  initialSwitchMask: 0,
  requiredItems: [],
  collectionMode: 'unordered',
  orderedItemIds: [],
  keys: [],
  keyGates: [],
  levers: [],
  portalPairs: [],
  discoveries: [],
  royalRequests: [],
  princessGateEdges: [],
  interactionCells: [],
  ...extra,
});
export const LEVELS = [
  base(
    'first-steps',
    'First steps home',
    3,
    [
      [0, 1],
      [1, 2],
      [2, 5],
      [5, 8],
    ],
    {
      tutorial: { teaches: ['movement'], require: [] },
      instruction: 'Plan a route to the doghouse, then press Go.',
      prerequisites: [],
    },
  ),
  base(
    'a-royal-request',
    'A royal request',
    3,
    [
      [0, 1],
      [1, 2],
      [1, 4],
      [5, 8],
    ],
    {
      discoveries: [{ id: 'treat', cell: 2, kind: 'golden-treat' }],
      royalRequests: [{ id: 'mocha', discoveryId: 'treat' }],
      interactionCells: [{ requestId: 'mocha', cell: 4 }],
      princessGateEdges: [{ cells: [4, 5], requestId: 'mocha' }],
      tutorial: {
        teaches: ['royal-delivery'],
        require: ['discoveryCollected', 'requestFulfilled', 'princessGateCrossed'],
      },
      instruction: 'Fetch the golden treat, enter Mocha’s marked tile, then head home.',
      prerequisites: ['first-steps'],
    },
  ),
  base(
    'royal-garden',
    'The Royal Garden',
    5,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [4, 9],
      [5, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [9, 14],
      [10, 15],
      [15, 16],
      [16, 17],
      [17, 18],
      [18, 19],
      [14, 19],
      [15, 20],
      [20, 21],
      [21, 22],
      [22, 23],
    ],
    {
      chapter: 'The Princess’s Kingdom',
      discoveries: [{ id: 'golden-treat', cell: 4, kind: 'golden-treat' }],
      royalRequests: [{ id: 'mocha', discoveryId: 'golden-treat' }],
      interactionCells: [{ requestId: 'mocha', cell: 18 }],
      princessGateEdges: [{ cells: [19, 24], requestId: 'mocha' }],
      prerequisites: ['a-royal-request'],
      modeConfig: {
        timed: true,
        timeLimitMs: 60000,
        requiresMechanics: ['movement', 'royal-delivery'],
      },
      ending: 'Her Majesty approves!',
    },
  ),
];
// Roadmap mechanics live in test fixtures, not silently added to the opening chapter.
export function demonstratesTutorial(level, simulation) {
  const lesson = level.definition.tutorial;
  if (!lesson) return true;
  const performed = new Set(simulation.events.map((e) => e.type));
  if (simulation.revisited) performed.add('revisited');
  return (
    simulation.complete &&
    (lesson.require ?? []).every((e) => performed.has(e)) &&
    simulation.leverActionCount >= (lesson.minimumActivations ?? 0)
  );
}
export function createCatalog(definitions = LEVELS, solverOptions) {
  const catalog = new Map();
  for (const definition of definitions) {
    const compiled = compileLevel(definition);
    if (catalog.has(definition.levelId)) throw new Error('Duplicate official level ID.');
    const solution = solveLevel(compiled, solverOptions);
    if (solution.status !== 'proven')
      throw new Error(
        `Refusing unverified official level ${definition.levelId}: ${solution.status}`,
      );
    catalog.set(definition.levelId, { compiled, solution });
  }
  for (const { compiled } of catalog.values())
    for (const id of compiled.definition.prerequisites ?? [])
      if (!catalog.has(id)) throw new Error(`Missing prerequisite ${id}`);
  return catalog;
}
