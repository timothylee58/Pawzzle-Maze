import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compileLevel,
  initialState,
  transition,
  simulate,
  stateKey,
  PlanEditor,
  requestProgress,
  solveLevel,
  createCatalog,
  LEVELS,
  PuzzleRun,
  Campaign,
  saveKey,
  rankResults,
} from './index.js';
const move = (direction) => ({ type: 'move', direction });
const moves = (...directions) => directions.map(move);
const activate = { type: 'activateLever', leverId: 'a' };
const level = (extra = {}) => ({
  levelId: 'fixture',
  levelVersion: 1,
  rulesVersion: '3.0',
  width: 3,
  height: 3,
  startCell: 0,
  goalCell: 8,
  staticEdges: [
    [0, 1],
    [1, 2],
    [2, 5],
    [5, 8],
    [1, 4],
  ],
  collectionMode: 'unordered',
  ...extra,
});
const entry = (d) => {
  const compiled = compileLevel(d);
  return { compiled, solution: solveLevel(compiled) };
};
const body = (actions, id = 'submission-0001') => ({
  submissionId: id,
  levelVersion: 1,
  rulesVersion: '3.0',
  planActions: actions,
});
const royal = createCatalog().get('a-royal-request');
const royalActions = moves('right', 'right', 'left', 'down', 'right', 'down');
const bone = entry(level({ requiredItems: [{ id: 'bone', cell: 4, kind: 'bone' }] }));
const boneActions = moves('right', 'down', 'up', 'right', 'down', 'down');

test('official levels have proven optima and all solution steps replay identically', () => {
  const expected = { 'first-steps': 4, 'a-royal-request': 6, 'royal-garden': 10 };
  for (const [id, e] of createCatalog()) {
    assert.equal(e.solution.status, 'proven');
    assert.equal(e.solution.optimalMoveCount, expected[id]);
    const result = simulate(e.compiled, e.solution.actions);
    assert.equal(result.moveCount, expected[id]);
    assert.equal(result.complete, true);
    let state = initialState(e.compiled);
    for (let i = 0; i < e.solution.actions.length; i++) {
      state = transition(e.compiled, state, e.solution.actions[i]).state;
      assert.deepEqual(state, result.frames[i + 1].state);
    }
  }
});
test('Mocha requests before pickup, delivers once, consumes carried item, retains history and opens gate', () => {
  const before = simulate(royal.compiled, moves('right', 'down'));
  assert.equal(before.state.fulfilledRequestMask, 0);
  assert.ok(before.events.some((e) => e.type === 'requestMissingItem'));
  assert.throws(() => transition(royal.compiled, before.state, move('right')), /closed/);
  const delivery = simulate(royal.compiled, royalActions.slice(0, 4));
  assert.equal(delivery.moveCount, 4);
  assert.equal(delivery.state.collectedDiscoveryMask, 1);
  assert.equal(delivery.state.carriedDiscoveryMask, 0);
  assert.equal(delivery.state.fulfilledRequestMask, 1);
  assert.equal(requestProgress(royal.compiled, delivery.state)[0].status, 'delivered');
  const repeated = simulate(royal.compiled, [
    ...royalActions.slice(0, 4),
    ...moves('up', 'right', 'left', 'down', 'right', 'down'),
  ]);
  assert.equal(repeated.complete, true);
  assert.equal(repeated.events.filter((e) => e.type === 'requestFulfilled').length, 1);
  assert.equal(repeated.events.filter((e) => e.type === 'discoveryCollected').length, 1);
});
test('Undo across delivery restores the carried item and closed gate; Clear resets all state', () => {
  const editor = new PlanEditor(royal.compiled);
  royalActions.slice(0, 4).forEach((a) => editor.append(a));
  assert.equal(editor.preview.state.fulfilledRequestMask, 1);
  const undo = editor.undo();
  assert.equal(undo.state.carriedDiscoveryMask, 1);
  assert.equal(undo.state.fulfilledRequestMask, 0);
  assert.equal(requestProgress(royal.compiled, undo.state)[0].status, 'carry');
  editor.append(move('down'));
  const before = editor.scrub(2);
  assert.equal(before.state.carriedDiscoveryMask, 1);
  assert.equal(editor.actions.length, 4);
  editor.truncate(1);
  assert.equal(editor.preview.state.collectedDiscoveryMask, 0);
  assert.deepEqual(editor.clear().state, initialState(royal.compiled));
});
test('revisits append and cost moves; a bare doghouse route missing a bone cannot complete', () => {
  const bare = simulate(bone.compiled, moves('right', 'right', 'down', 'down'));
  assert.equal(bare.moveCount, 4);
  assert.equal(bare.complete, false);
  assert.ok(bare.events.some((e) => e.type === 'homeEarly'));
  assert.equal(bone.solution.optimalMoveCount, 6);
  const editor = new PlanEditor(bone.compiled);
  editor.append(move('right'));
  editor.append(move('down'));
  editor.append(move('up'));
  assert.equal(editor.actions.length, 3);
  assert.equal(editor.preview.moveCount, 3);
  assert.equal(editor.preview.state.collectedRequiredMask, 1);
  assert.equal(editor.undo().state.dogCell, 4);
  const afterEarly = simulate(
    bone.compiled,
    moves(
      'right',
      'right',
      'down',
      'down',
      'up',
      'up',
      'left',
      'down',
      'up',
      'right',
      'down',
      'down',
    ),
  );
  assert.equal(afterEarly.complete, true);
});
test('ordered items require re-entry, keys remain independent and persistent across gates', () => {
  const ordered = entry(
    level({
      requiredItems: [
        { id: 'one', cell: 4, kind: 'bone' },
        { id: 'two', cell: 1, kind: 'bone' },
      ],
      collectionMode: 'ordered',
      orderedItemIds: ['one', 'two'],
    }),
  );
  const outOfOrder = simulate(ordered.compiled, moves('right'));
  assert.equal(outOfOrder.state.collectedRequiredMask, 0);
  assert.ok(outOfOrder.events.some((e) => e.type === 'outOfOrder'));
  const result = simulate(ordered.compiled, boneActions);
  assert.equal(result.complete, true);
  assert.equal(result.state.nextRequiredIndex, 2);
  const keyed = entry(
    level({
      staticEdges: [
        [0, 1],
        [1, 4],
        [2, 5],
      ],
      keys: [{ id: 'sun', cell: 4 }],
      keyGates: [
        { cells: [1, 2], keyId: 'sun' },
        { cells: [5, 8], keyId: 'sun' },
      ],
    }),
  );
  assert.throws(() => simulate(keyed.compiled, moves('right', 'right')), /closed/);
  assert.equal(simulate(keyed.compiled, boneActions).complete, true);
  assert.equal(simulate(keyed.compiled, boneActions).state.collectedKeyMask, 1);
});
test('lever activation is explicit, atomic and reusable; zero-cost cycles terminate', () => {
  const switched = entry(
    level({
      staticEdges: [
        [0, 1],
        [1, 4],
        [2, 5],
        [3, 6],
        [6, 7],
        [7, 8],
      ],
      levers: [{ id: 'a', cell: 4 }],
      controlledEdges: [
        { cells: [4, 5], leverId: 'a', openWhen: 1 },
        { cells: [3, 4], leverId: 'a', openWhen: 0 },
      ],
      requiredItems: [{ id: 'bone', cell: 2, kind: 'bone' }],
    }),
  );
  const before = simulate(switched.compiled, moves('right', 'down'));
  assert.equal(before.state.switchMask, 0);
  assert.throws(() => transition(switched.compiled, before.state, move('right')), /closed/);
  assert.throws(
    () => transition(switched.compiled, initialState(switched.compiled), activate),
    /stand on/,
  );
  const actions = [
    ...moves('right', 'down'),
    activate,
    ...moves('right', 'up', 'down', 'left'),
    activate,
    ...moves('left', 'down', 'right', 'right'),
  ];
  const result = simulate(switched.compiled, actions);
  assert.equal(result.complete, true);
  assert.equal(result.moveCount, 10);
  assert.equal(result.leverActionCount, 2);
  assert.equal(result.state.switchMask, 0);
  assert.equal(switched.solution.optimalMoveCount, 10);
  assert.equal(
    simulate(switched.compiled, [...moves('right', 'down'), activate, activate]).state.switchMask,
    0,
  );
  assert.ok(switched.solution.visitedStates < 1000);
});
test('full state key separates delivery, inventories, collection order and switches', () => {
  const s = initialState(royal.compiled);
  for (const key of [
    'collectedDiscoveryMask',
    'carriedDiscoveryMask',
    'fulfilledRequestMask',
    'collectedRequiredMask',
    'nextRequiredIndex',
    'collectedKeyMask',
    'switchMask',
  ])
    assert.notEqual(stateKey(s), stateKey({ ...s, [key]: 1 }));
});
test('invalid topology, ambiguous ownership and deferred portals are rejected', () => {
  assert.throws(() => compileLevel(level({ staticEdges: [[2, 3]] })), /orthogonal/);
  assert.throws(
    () =>
      compileLevel(
        level({
          levers: [{ id: 'a', cell: 4 }],
          controlledEdges: [{ cells: [0, 1], leverId: 'a', openWhen: 1 }],
        }),
      ),
    /one owner/,
  );
  const d = structuredClone(royal.compiled.definition);
  d.staticEdges.push([2, 5]);
  assert.throws(() => compileLevel(d), /bypass/);
  const trapped = structuredClone(royal.compiled.definition);
  trapped.discoveries[0].cell = 5;
  assert.throws(() => compileLevel(trapped), /before royal approval/);
  const overlap = structuredClone(royal.compiled.definition);
  overlap.discoveries[0].cell = 4;
  assert.throws(() => compileLevel(overlap), /disjoint/);
  assert.throws(() => compileLevel(level({ portalPairs: [[1, 5]] })), /deferred/);
});
test('solver budgets never label cut-off search optimal; unsolvable official levels are refused', () => {
  const limited = solveLevel(bone.compiled, { maxStates: 1 });
  assert.equal(limited.status, 'unverified');
  assert.equal(limited.optimalMoveCount, undefined);
  assert.equal(solveLevel(bone.compiled, { maxTransitions: 1 }).status, 'unverified');
  const blocked = level({ staticEdges: [[0, 1]] });
  assert.equal(solveLevel(compileLevel(blocked)).status, 'unsolvable');
  assert.throws(() => createCatalog([blocked]), /Refusing unverified/);
});
test('campaign Go validation, retries, assistance, bests and fresh-state replay', () => {
  const run = new PuzzleRun(bone);
  assert.throws(() => run.submit(body(moves('right')), 0), /Collect required/);
  assert.equal(run.attempts, 0);
  const longer = [...moves('right', 'left'), ...boneActions];
  const first = run.submit(body(longer), 1);
  assert.equal(first.moveCount, 8);
  assert.equal(run.submit(body(longer), 2).completedAttempts, 1);
  assert.equal(run.attempts, 1);
  assert.throws(() => run.submit(body(boneActions), 2), /another plan/);
  run.submit(body(boneActions, 'submission-0002'), 3);
  assert.equal(run.status, 'active');
  assert.equal(run.attempts, 2);
  run.submit(body(longer, 'submission-0003'), 4);
  assert.equal(run.best.moveCount, 6);
  const royalRun = new PuzzleRun(royal);
  royalRun.submit(body(royalActions), 0);
  assert.throws(
    () => royalRun.submit(body(moves('right', 'down', 'right', 'down'), 'submission-0002'), 1),
    /closed/,
  );
  const fresh = new PuzzleRun(bone);
  assert.throws(() => fresh.solution(), /assistance/);
  fresh.solution({ assistance: true });
  assert.equal(fresh.submit(body(boneActions), 0).assisted, true);
  assert.equal(fresh.bestUnassisted, null);
});
test('equally optimal plans accepted; later equal results keep original best timestamp', () => {
  const d = level({
    staticEdges: [
      [0, 1],
      [1, 2],
      [2, 5],
      [5, 8],
      [0, 3],
      [3, 6],
      [6, 7],
      [7, 8],
    ],
  });
  const e = entry(d);
  const a = new PuzzleRun(e),
    b = new PuzzleRun(e);
  assert.equal(a.submit(body(moves('right', 'right', 'down', 'down')), 0).extraMoves, 0);
  assert.equal(b.submit(body(moves('down', 'down', 'right', 'right')), 0).extraMoves, 0);
  const r = new PuzzleRun(bone, { mode: 'localTimed' }),
    longer = [...moves('right', 'left'), ...boneActions];
  r.submit(body(longer), 100);
  r.submit(body(longer, 'submission-0002'), 200);
  assert.equal(r.attempts, 2);
  assert.equal(r.best.acceptedElapsedMs, 100);
});
test('local active-play clock pauses for overlapping reasons, freezes input/playback/audio, respects mute', () => {
  const run = new PuzzleRun(bone, { mode: 'localTimed' });
  run.setMuted(true);
  run.pause('platform', 10000);
  run.pause('hidden', 20000);
  assert.equal(run.view(90000).remainingMs, 50000);
  assert.equal(run.view(90000).inputEnabled, false);
  assert.equal(run.view(90000).playbackEnabled, false);
  assert.throws(() => run.submit(body(boneActions), 90000), /cannot accept/);
  run.resume('platform', 100000);
  assert.equal(run.view(100000).boardCovered, true);
  run.resume('hidden', 110000);
  assert.equal(run.view(111000).remainingMs, 49000);
  assert.equal(run.view(111000).audioEnabled, false);
  assert.equal(run.view(111000).inputEnabled, true);
  const result = run.submit(body(boneActions), 112000);
  assert.equal(result.acceptedElapsedMs, 12000);
});
test('strict deadline, timeout best retention, instant acceptance independent of playback', () => {
  const before = new PuzzleRun(bone, { mode: 'localTimed' });
  assert.equal(before.submit(body(boneActions), 59999).extraMoves, 0);
  assert.equal(before.view(100000).status, 'finished');
  const at = new PuzzleRun(bone, { mode: 'localTimed' });
  assert.throws(() => at.submit(body(boneActions), 60000), /cannot accept/);
  assert.equal(at.best, null);
  const r = new PuzzleRun(bone, { mode: 'localTimed' });
  r.submit(body([...moves('right', 'left'), ...boneActions]), 100);
  assert.equal(r.view(60000).best.moveCount, 8);
  assert.equal(r.view(60000).status, 'finished');
  assert.throws(() => new PuzzleRun(bone, { mode: 'localTimed' }).finish(0), /after a valid/);
});
test('ranked interruption preserves accepted best and only permits explicit practice continuation', () => {
  const run = new PuzzleRun(bone, { mode: 'ranked', challengeId: 'test-challenge' });
  run.submit(body([...moves('right', 'left'), ...boneActions]), 1000);
  run.pause('hidden', 2000);
  assert.equal(run.status, 'interrupted');
  assert.equal(run.best.moveCount, 8);
  assert.equal(run.rankedEligible, false);
  run.resume('hidden', 90000);
  assert.throws(() => run.submit(body(boneActions, 'submission-0002'), 90000), /cannot accept/);
  run.continueAsPractice(90000);
  const result = run.submit(body(boneActions, 'submission-0002'), 90001);
  assert.equal(result.mode, 'localTimed');
  assert.equal(run.rankedEligible, false);
});
test('offline campaign saves, unlocks and learned mechanics do not need an API', () => {
  const catalog = createCatalog(),
    campaign = new Campaign(catalog);
  assert.throws(() => campaign.startTimed('royal-garden'), /previous puzzle/);
  campaign.submit('first-steps', body(catalog.get('first-steps').solution.actions));
  assert.ok(campaign.unlocked('a-royal-request'));
  campaign.submit('a-royal-request', body(royalActions));
  assert.deepEqual(campaign.learnedMechanics(), ['movement', 'royal-delivery']);
  const timed = campaign.startTimed('royal-garden', 200);
  assert.equal(timed.view(200).remainingMs, 60000);
  const copy = new Campaign(catalog, JSON.parse(JSON.stringify(campaign.snapshot())));
  assert.equal(copy.unlocked('royal-garden'), true);
  assert.equal(copy.progress()[1].completedAttempts, 1);
  assert.ok(Object.keys(copy.snapshot().runs).every((k) => k.includes('rules-3.0')));
});
test('local reload restores paused state without fabricating a result, version mismatch fails closed', () => {
  const run = new PuzzleRun(bone, { mode: 'localTimed' });
  const restored = PuzzleRun.restore(bone, JSON.parse(JSON.stringify(run.snapshot(10000))), {
    now: 0,
    reload: true,
  });
  assert.equal(restored.view(0).remainingMs, 50000);
  assert.equal(restored.best, null);
  assert.equal(restored.view(0).boardCovered, true);
  restored.resume('reload', 2000);
  assert.equal(restored.view(3000).remainingMs, 49000);
  assert.throws(
    () => PuzzleRun.restore(bone, { ...run.snapshot(10000), saveKey: 'v1' }),
    /another level/,
  );
  assert.equal(saveKey(bone.compiled.definition), 'pawzzle:rules-3.0:fixture@1');
  assert.throws(() => run.submit({ ...body(boneActions), rulesVersion: '1' }, 10000), /version/);
});
test('rank order is move gap then time, exact ties share rank and scopes cannot mix', () => {
  const r = {
    challengeId: 'test-challenge',
    levelId: 'fixture',
    levelVersion: 1,
    rulesVersion: '3.0',
    mode: 'ranked',
    assisted: false,
    validationStatus: 'accepted',
  };
  assert.deepEqual(
    rankResults([
      { ...r, extraMoves: 2, acceptedElapsedMs: 1 },
      { ...r, extraMoves: 0, acceptedElapsedMs: 50 },
      { ...r, extraMoves: 0, acceptedElapsedMs: 50 },
      { ...r, extraMoves: 0, acceptedElapsedMs: 2, assisted: true },
    ]).map((x) => x.rank),
    [1, 1, 3],
  );
  assert.throws(() => rankResults([{ ...r }, { ...r, rulesVersion: '1' }]), /same level/);
});

test('invalid level identities and unlearned timed mechanics fail closed', () => {
  const invalid = level();
  delete invalid.levelId;
  assert.throws(() => compileLevel(invalid), /identity/);
  assert.throws(() => compileLevel(level({ requiredItems: [{ cell: 4, kind: 'bone' }] })), /IDs/);
  const defs = structuredClone(LEVELS);
  defs.find((d) => d.levelId === 'royal-garden').modeConfig.requiresMechanics.push('levers');
  const catalog = createCatalog(defs),
    campaign = new Campaign(catalog);
  campaign.submit('first-steps', body(catalog.get('first-steps').solution.actions));
  campaign.submit('a-royal-request', body(royalActions));
  assert.throws(() => campaign.startTimed('royal-garden'), /tutorials/);
});
test('ranked reload irreversibly ends eligibility and cross-challenge ranks cannot mix', () => {
  const run = new PuzzleRun(bone, { mode: 'ranked', challengeId: 'daily-one' });
  run.submit(body([...moves('right', 'left'), ...boneActions]), 1000);
  const restored = PuzzleRun.restore(bone, run.snapshot(2000), { now: 3000, reload: true });
  assert.equal(restored.status, 'interrupted');
  assert.equal(restored.rankedEligible, false);
  assert.equal(restored.best.moveCount, 8);
  assert.throws(
    () => rankResults([run.best, { ...run.best, challengeId: 'daily-two' }]),
    /same level/,
  );
});
