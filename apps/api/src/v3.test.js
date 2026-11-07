import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from './app.js';
import { createCatalog } from '@pawzzle/game-core/v3';
const catalog = createCatalog();
const actions = (id) => catalog.get(id).solution.actions;
const versions = { levelVersion: 1, rulesVersion: '3.0' };
const submission = (id, submissionId = 'submission-0001') => ({
  ...versions,
  submissionId,
  planActions: actions(id),
});
async function fixture(t, { database = ':memory:' } = {}) {
  let now = 100000;
  let app = await buildApp({ database, clock: () => now });
  t.after(() => app.close());
  const session = await app.inject({ method: 'POST', url: '/api/session' });
  const cookie = session.headers['set-cookie'].split(';')[0];
  const call = (method, url, payload) => app.inject({ method, url, payload, headers: { cookie } });
  const unlock = async () => {
    for (const id of ['first-steps', 'a-royal-request']) {
      const r = await call('POST', `/api/v3/levels/${id}/submissions`, submission(id));
      assert.equal(r.statusCode, 200, r.body);
    }
  };
  return {
    get app() {
      return app;
    },
    call,
    unlock,
    advance: (ms) => (now += ms),
    restart: async () => {
      await app.close();
      app = await buildApp({ database, clock: () => now });
    },
  };
}
test('V3 campaign exposes onboarding, unlocks from valid Go, and does not mix V1 scores', async (t) => {
  const f = await fixture(t);
  let r = await f.call('GET', '/api/v3/campaign');
  assert.equal(r.json().rulesVersion, '3.0');
  assert.equal(r.json().levels.find((l) => l.levelId === 'royal-garden').unlocked, false);
  assert.equal((await f.call('GET', '/api/v3/levels/royal-garden')).statusCode, 403);
  await f.unlock();
  r = await f.call('GET', '/api/v3/levels/royal-garden');
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().optimalMoveCount, undefined);
  assert.equal(r.json().royalRequests[0].id, 'mocha');
  const done = (
    await f.call('POST', '/api/v3/levels/royal-garden/submissions', submission('royal-garden'))
  ).json();
  assert.equal(done.result.moveCount, 10);
  assert.equal(done.result.extraMoves, 0);
  assert.equal(done.result.mode, 'campaign');
  assert.equal(done.result.finalState.fulfilledRequestMask, 1);
  assert.equal(done.result.finalState.carriedDiscoveryMask, 0);
  assert.equal(
    (
      await f.call(
        'POST',
        '/api/v3/levels/royal-garden/submissions',
        submission('royal-garden', 'submission-0002'),
      )
    ).json().result.completedAttempts,
    2,
  );
  assert.equal((await f.call('GET', '/api/daily')).json().roundId, null);
});
test('preview returns deterministic playback and invalid plan feedback without counting attempts', async (t) => {
  const f = await fixture(t);
  await f.unlock();
  const r = await f.call('POST', '/api/v3/levels/royal-garden/preview', {
    ...versions,
    planActions: actions('royal-garden'),
  });
  assert.equal(r.json().canGo, true);
  assert.equal(r.json().requests[0].status, 'delivered');
  assert.ok(
    r.json().frames.some((frame) => frame.events.some((e) => e.type === 'requestFulfilled')),
  );
  const bad = await f.call('POST', '/api/v3/levels/royal-garden/preview', {
    ...versions,
    planActions: [{ type: 'move', direction: 'up' }],
  });
  assert.equal(bad.statusCode, 200);
  assert.equal(bad.json().valid, false);
  assert.equal(bad.json().error.actionIndex, 0);
  assert.equal(
    (await f.call('GET', '/api/v3/campaign'))
      .json()
      .levels.find((l) => l.levelId === 'royal-garden').completedAttempts,
    0,
  );
});
test('forged state, counts, action fields, versions and incomplete plans are rejected', async (t) => {
  const f = await fixture(t);
  const url = '/api/v3/levels/first-steps/submissions',
    valid = submission('first-steps');
  for (const patch of [
    { moveCount: 1 },
    { switchMask: 3 },
    { fulfilledRequestMask: 1 },
    { optimalMoveCount: 1 },
    { assisted: false },
  ])
    assert.equal((await f.call('POST', url, { ...valid, ...patch })).statusCode, 400);
  assert.equal((await f.call('POST', url, { ...valid, rulesVersion: '1' })).statusCode, 400);
  assert.equal((await f.call('POST', url, { ...valid, levelVersion: 2 })).statusCode, 409);
  assert.equal(
    (
      await f.call('POST', url, {
        ...valid,
        planActions: [{ type: 'move', direction: 'right', state: {} }],
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await f.call('POST', url, {
        ...valid,
        planActions: [{ type: 'move', direction: 'diagonal' }],
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (await f.call('POST', url, { ...valid, planActions: [{ type: 'move', direction: 'right' }] }))
      .statusCode,
    422,
  );
  assert.equal((await f.call('GET', '/api/v3/campaign')).json().levels[0].completedAttempts, 0);
});
test('campaign submissions are idempotent; solution assistance is sticky and server-owned', async (t) => {
  const f = await fixture(t);
  const url = '/api/v3/levels/first-steps';
  assert.equal(
    (await f.call('POST', `${url}/solution`, { ...versions, assistance: false })).statusCode,
    409,
  );
  assert.equal(
    (await f.call('POST', `${url}/solution`, { ...versions, assistance: true })).json().label,
    'One optimal solution',
  );
  const body = submission('first-steps');
  assert.equal((await f.call('POST', `${url}/submissions`, body)).json().result.assisted, true);
  assert.equal(
    (await f.call('POST', `${url}/submissions`, body)).json().result.completedAttempts,
    1,
  );
  assert.equal(
    (
      await f.call('POST', `${url}/submissions`, {
        ...body,
        planActions: [{ type: 'move', direction: 'right' }],
      })
    ).statusCode,
    409,
  );
  assert.equal((await f.call('GET', '/api/v3/campaign')).json().levels[0].bestUnassisted, null);
});
test('timed replay requires lessons, starts idempotently and resumes without a fresh clock', async (t) => {
  const f = await fixture(t),
    body = { ...versions, levelId: 'royal-garden', startId: 'start-000001' };
  assert.equal((await f.call('POST', '/api/v3/timed-runs', body)).statusCode, 403);
  await f.unlock();
  const r = (await f.call('POST', '/api/v3/timed-runs', body)).json();
  assert.equal(r.mode, 'localTimed');
  assert.equal(r.remainingMs, 60000);
  assert.equal(r.rankedEligible, false);
  f.advance(1000);
  const retry = (await f.call('POST', '/api/v3/timed-runs', body)).json();
  assert.equal(retry.id, r.id);
  assert.equal(retry.remainingMs, 59000);
  assert.equal(
    (await f.call('POST', '/api/v3/timed-runs', { ...body, levelId: 'first-steps' })).statusCode,
    409,
  );
  assert.equal(
    (await f.call('POST', '/api/v3/timed-runs', { ...body, mode: 'ranked' })).statusCode,
    400,
  );
});
test('pause persists, blocks input/scoring, covers board and preserves muted state on resume', async (t) => {
  const f = await fixture(t);
  await f.unlock();
  const r = (
      await f.call('POST', '/api/v3/timed-runs', {
        ...versions,
        levelId: 'royal-garden',
        startId: 'start-000001',
      })
    ).json(),
    url = `/api/v3/timed-runs/${r.id}`;
  f.advance(10000);
  await f.call('POST', `${url}/mute`, { muted: true });
  const paused = (await f.call('POST', `${url}/pause`, { reason: 'hidden' })).json();
  assert.equal(paused.level, undefined);
  assert.equal(paused.boardCovered, true);
  f.advance(100000);
  assert.equal((await f.call('GET', url)).json().remainingMs, 50000);
  assert.equal(
    (await f.call('POST', `${url}/submissions`, submission('royal-garden'))).statusCode,
    409,
  );
  const resumed = (await f.call('POST', `${url}/resume`, { reason: 'hidden' })).json();
  assert.equal(resumed.muted, true);
  assert.equal(resumed.audioEnabled, false);
  assert.equal(resumed.inputEnabled, true);
  f.advance(50);
  const accepted = (await f.call('POST', `${url}/submissions`, submission('royal-garden'))).json();
  assert.equal(accepted.result.acceptedElapsedMs, 10050);
  assert.equal(accepted.run.status, 'finished');
  assert.equal((await f.call('GET', `${url}/solution`)).json().label, 'One optimal solution');
});
test('timed deadline is strict, retains earlier best/time, and double Go is idempotent', async (t) => {
  const f = await fixture(t);
  await f.unlock();
  const r = (
      await f.call('POST', '/api/v3/timed-runs', {
        ...versions,
        levelId: 'royal-garden',
        startId: 'start-000001',
      })
    ).json(),
    url = `/api/v3/timed-runs/${r.id}`;
  assert.equal((await f.call('POST', `${url}/finish`)).statusCode, 409);
  assert.equal((await f.call('GET', `${url}/solution`)).statusCode, 409);
  const longer = [
    { type: 'move', direction: 'right' },
    { type: 'move', direction: 'left' },
    ...actions('royal-garden'),
  ];
  f.advance(1000);
  const first = { ...submission('royal-garden'), planActions: longer };
  const accepted = (await f.call('POST', `${url}/submissions`, first)).json();
  assert.equal(accepted.result.extraMoves, 2);
  assert.equal((await f.call('POST', `${url}/submissions`, first)).json().run.completedAttempts, 1);
  f.advance(1000);
  const equal = (
    await f.call('POST', `${url}/submissions`, { ...first, submissionId: 'submission-0002' })
  ).json();
  assert.equal(equal.run.best.acceptedElapsedMs, 1000);
  f.advance(58000);
  assert.equal(
    (await f.call('POST', `${url}/submissions`, submission('royal-garden', 'submission-late')))
      .statusCode,
    409,
  );
  const expired = (await f.call('GET', url)).json();
  assert.equal(expired.status, 'finished');
  assert.equal(expired.best.moveCount, 12);
  assert.equal(expired.completedAttempts, 2);
  assert.equal((await f.call('POST', `${url}/submissions`, first)).json().run.completedAttempts, 2);
});
test('campaign and timed ownership are isolated by session', async (t) => {
  const f = await fixture(t);
  await f.unlock();
  const r = (
    await f.call('POST', '/api/v3/timed-runs', {
      ...versions,
      levelId: 'royal-garden',
      startId: 'start-000001',
    })
  ).json();
  assert.equal((await f.app.inject({ url: '/api/v3/campaign' })).statusCode, 401);
  const second = await f.app.inject({ method: 'POST', url: '/api/session' }),
    headers = { cookie: second.headers['set-cookie'].split(';')[0] };
  assert.equal(
    (await f.app.inject({ url: `/api/v3/timed-runs/${r.id}`, headers })).statusCode,
    404,
  );
  assert.equal(
    (await f.app.inject({ url: '/api/v3/campaign', headers })).json().levels[0].completed,
    false,
  );
});
test('SQLite survives restart with tutorial progress, pause budget and accepted results', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pawzzle-v3-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const f = await fixture(t, { database: join(dir, 'test.sqlite') });
  await f.unlock();
  const r = (
      await f.call('POST', '/api/v3/timed-runs', {
        ...versions,
        levelId: 'royal-garden',
        startId: 'start-000001',
      })
    ).json(),
    url = `/api/v3/timed-runs/${r.id}`;
  f.advance(10000);
  await f.call('POST', `${url}/pause`, { reason: 'platform' });
  f.advance(50000);
  await f.restart();
  assert.equal((await f.call('GET', url)).json().remainingMs, 50000);
  assert.ok(
    (await f.call('GET', '/api/v3/campaign')).json().learnedMechanics.includes('royal-delivery'),
  );
  await f.call('POST', `${url}/resume`, { reason: 'platform' });
  await f.call('POST', `${url}/submissions`, submission('royal-garden'));
  await f.restart();
  assert.equal((await f.call('GET', url)).json().best.moveCount, 10);
});

test('solution reveal after timed start marks subsequent results assisted', async (t) => {
  const f = await fixture(t);
  await f.unlock();
  const run = (
    await f.call('POST', '/api/v3/timed-runs', {
      ...versions,
      levelId: 'royal-garden',
      startId: 'start-assist-001',
    })
  ).json();
  const solution = await f.call('POST', '/api/v3/levels/royal-garden/solution', {
    ...versions,
    assistance: true,
  });
  assert.equal(solution.statusCode, 200);
  const result = (
    await f.call('POST', `/api/v3/timed-runs/${run.id}/submissions`, submission('royal-garden'))
  ).json();
  assert.equal(result.result.assisted, true);
  assert.equal(result.run.bestUnassisted, null);
});
