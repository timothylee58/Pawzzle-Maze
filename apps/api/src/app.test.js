import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';
import { solve } from '@pawzzle/game-core';
async function fixture(t) {
  let now = Date.parse('2026-11-07T12:00:00Z');
  const app = await buildApp({ clock: () => now });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/session' });
  const cookie = response.headers['set-cookie'].split(';')[0];
  const call = (method, url, payload) => app.inject({ method, url, payload, headers: { cookie } });
  return { app, call, advance: (ms) => (now += ms) };
}
test('daily lifecycle: layout hidden before start, canonical scoring, idempotent retries, one run', async (t) => {
  const { call, advance } = await fixture(t);
  const meta = (await call('GET', '/api/daily')).json();
  assert.equal(meta.maze, undefined);
  const r = (await call('POST', '/api/rounds')).json();
  assert.equal(r.optimal, undefined);
  assert.equal(r.maze.optimal, undefined);
  const path = solve(r.maze.g);
  advance(1234);
  const body = { submissionId: 'attempt-1234', orderedCellIds: path };
  const response = await call('POST', `/api/rounds/${r.id}/submissions`, body);
  assert.equal(response.statusCode, 200);
  const accepted = response.json();
  assert.equal(accepted.moves, path.length - 1);
  assert.equal(accepted.extra, 0);
  assert.equal(accepted.elapsed, 1234);
  assert.equal(accepted.round.status, 'finished');
  const retry = (await call('POST', `/api/rounds/${r.id}/submissions`, body)).json();
  assert.equal(retry.round.attempts, 1);
  assert.equal((await call('POST', '/api/rounds')).json().id, r.id);
  assert.equal(
    (await call('GET', `/api/leaderboard?challengeId=${meta.id}`)).json().entries[0].rank,
    1,
  );
});
test('server rejects illegal routes and forged fields without counting attempts', async (t) => {
  const { call } = await fixture(t);
  const r = (await call('POST', '/api/rounds')).json();
  const url = `/api/rounds/${r.id}/submissions`;
  assert.equal(
    (await call('POST', url, { submissionId: 'invalid-01', orderedCellIds: [0, 63] })).statusCode,
    422,
  );
  assert.equal(
    (
      await call('POST', url, {
        submissionId: 'forged-01',
        orderedCellIds: solve(r.maze.g),
        moves: 1,
      })
    ).statusCode,
    400,
  );
  assert.equal((await call('GET', `/api/rounds/${r.id}`)).json().attempts, 0);
});
test('deadline is strict and resume does not extend it', async (t) => {
  const { call, advance } = await fixture(t);
  const r = (await call('POST', '/api/rounds')).json();
  advance(20000);
  assert.equal((await call('POST', '/api/rounds')).json().deadlineAt, r.deadlineAt);
  advance(40000);
  assert.equal(
    (
      await call('POST', `/api/rounds/${r.id}/submissions`, {
        submissionId: 'late-0001',
        orderedCellIds: solve(r.maze.g),
      })
    ).statusCode,
    409,
  );
  const done = (await call('GET', `/api/rounds/${r.id}`)).json();
  assert.equal(done.best, null);
  assert.equal(done.status, 'finished');
});
test('owner isolation, authentication and origin checks', async (t) => {
  const { app, call } = await fixture(t);
  const r = (await call('POST', '/api/rounds')).json();
  assert.equal((await app.inject({ url: `/api/rounds/${r.id}` })).statusCode, 401);
  const other = await app.inject({ method: 'POST', url: '/api/session' });
  assert.equal(
    (
      await app.inject({
        url: `/api/rounds/${r.id}`,
        headers: { cookie: other.headers['set-cookie'].split(';')[0] },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/session',
        headers: { origin: 'https://untrusted.example' },
      })
    ).statusCode,
    403,
  );
});
test('daily rollover preserves the original active round', async (t) => {
  let now = Date.parse('2026-11-07T23:59:40Z');
  const app = await buildApp({ clock: () => now });
  t.after(() => app.close());
  const session = await app.inject({ method: 'POST', url: '/api/session' });
  const headers = { cookie: session.headers['set-cookie'].split(';')[0] };
  const r = (await app.inject({ method: 'POST', url: '/api/rounds', headers })).json();
  now += 30000;
  const result = await app.inject({
    method: 'POST',
    url: `/api/rounds/${r.id}/submissions`,
    headers,
    payload: { submissionId: 'rollover-01', orderedCellIds: solve(r.maze.g) },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().round.challengeId, r.challengeId);
});
