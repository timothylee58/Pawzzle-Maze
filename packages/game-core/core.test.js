import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, solve, alternate, move, valid, Round, ranks, crossed } from './core.js';
test('generated layouts are deterministic, connected and have alternate goal routes', () => {
  for (const n of [6, 8, 9, 12])
    for (let seed = 0; seed < 25; seed++) {
      const m = generate(n, seed);
      assert.deepEqual(m, generate(n, seed));
      for (let i = 0; i < n * n; i++) assert.ok(solve(m.g, 0, i).length);
      assert.ok(alternate(m.g));
      assert.equal((m.optimal.length - 1) % 2, 0);
    }
});
const g = [
    [1, 2],
    [0, 3],
    [0, 3],
    [1, 2],
  ],
  m = { g, optimal: [0, 1, 3] };
test('BFS and equally optimal routes', () => {
  assert.equal(solve(g).length, 3);
  for (const p of [
    [0, 1, 3],
    [0, 2, 3],
  ]) {
    const r = new Round(m, 0);
    assert.equal(r.submit(p, 20).extra, 0);
    assert.equal(r.status, 'finished');
    assert.equal(r.submit(p, 21), null);
  }
});
test('cycle away from goal is insufficient', () =>
  assert.equal(alternate([[1, 2, 4], [0, 3], [0, 3], [1, 2], [0, 5], [4]]), false));
test('retraction, walls, repeats and edge counts', () => {
  assert.deepEqual(move([0, 1, 3], 1, g), [0, 1]);
  const p = [0];
  assert.equal(move(p, 3, g), p);
  assert.equal(valid([0, 1, 0, 2, 3], g), false);
  assert.equal(new Round(m).submit([0, 2, 3], 1).moves, 2);
});
test('strict deadline', () => {
  assert.ok(new Round(m).submit([0, 1, 3], 59999));
  assert.equal(new Round(m).submit([0, 1, 3], 60000), null);
  assert.equal(new Round(m).submit([0, 1, 3], 60001), null);
});
test('best keeps original time for equal and worse routes', () => {
  const maze = generate(8, 'best');
  const paths = [];
  function dfs(p) {
    if (paths.length > 30) return;
    if (p.at(-1) === 63) {
      paths.push(p);
      return;
    }
    for (const v of maze.g[p.at(-1)]) if (!p.includes(v)) dfs([...p, v]);
  }
  dfs([0]);
  const longer = paths
    .filter((p) => p.length > maze.optimal.length)
    .sort((a, b) => a.length - b.length);
  assert.ok(longer.length);
  const r = new Round(maze);
  r.submit(longer[0], 10);
  r.submit(longer[0], 20);
  r.submit(longer.at(-1), 30);
  assert.equal(r.best.elapsed, 10);
  assert.equal(r.attempts, 3);
});
test('ranking quality before time and shared ties', () =>
  assert.deepEqual(
    ranks([
      { extra: 2, elapsed: 1 },
      { extra: 0, elapsed: 30 },
      { extra: 0, elapsed: 30 },
    ]).map((x) => x.rank),
    [1, 1, 3],
  ));
test('segment traversal and ambiguous corners', () => {
  assert.deepEqual(crossed({ x: 0.5, y: 0.5 }, { x: 3.5, y: 0.5 }, 6), [1, 2, 3]);
  assert.deepEqual(crossed({ x: 0.5, y: 0.5 }, { x: 2.5, y: 2.5 }, 6), []);
});
