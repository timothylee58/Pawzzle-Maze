import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const shell = readFileSync(new URL('../games/godot/addons/gpx-godot-plugin/index.html', import.meta.url), 'utf8');
const source = shell.match(/<script id="platform-bridge">([\s\S]*?)<\/script>/)[1];
function fixture(overrides = {}) {
  const calls = [], events = {}, domEvents = {}, store = new Map();
  const sdk = {
    events: { on: (name, fn) => { events[name] = fn; } },
    lifecycle: {
      loading: value => calls.push(['loading', value]),
      loaded: async () => { calls.push(['loaded']); },
      gameStart: () => calls.push(['start']),
    },
    ads: { interstitial: async () => ({ success: false }), reward: async () => ({ success: false }) },
    ...overrides,
  };
  const context = {
    window: { GamePix: sdk },
    document: { hidden: false, addEventListener: (name, fn) => { domEvents[name] = fn; } },
    localStorage: { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null },
    console: { warn() {} },
  };
  vm.runInNewContext(source, context);
  return { api: context.window.PawzzlePlatform, context, calls, events, domEvents, sdk };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('SDK is loaded after body exists and before the engine; shell has no system alerts', () => {
  assert(shell.indexOf('<body>') < shell.indexOf('src="https://integration.gamepix.com'));
  assert(shell.indexOf('src="https://integration.gamepix.com') < shell.indexOf('src="$GODOT_URL"'));
  assert(!/\balert\s*\(/.test(shell));
});
test('manual readiness and gameplay start are idempotent and ordered', async () => {
  const { api, calls } = fixture();
  api.loading(-10); api.loading(150);
  await Promise.all([api.loaded(), api.loaded()]);
  api.gameStart(); api.gameStart(); await flush();
  assert.deepEqual(calls, [['loading', 0], ['loading', 100], ['loaded'], ['start']]);
});
test('SDK resume does not override a hidden-document pause', () => {
  const { api, context, events, domEvents } = fixture();
  const pauses = [];
  api.registerPause(value => pauses.push(value));
  events.pause();
  context.document.hidden = true; domEvents.visibilitychange();
  events.resume();
  assert.equal(pauses.at(-1), true);
  context.document.hidden = false; domEvents.visibilitychange();
  assert.equal(pauses.at(-1), false);
  assert(!('blur' in domEvents), 'Clicking outside the iframe must not pause');
});
test('an early pause is delivered when Godot attaches its callback', () => {
  const { api, events } = fixture();
  events.pause();
  let paused = false; api.registerPause(value => { paused = value; });
  assert(paused);
});
test('rejected ad resumes gameplay and never awards a reward', async () => {
  const { api, sdk } = fixture();
  sdk.ads.reward = async () => { throw new Error('network failure'); };
  const pauses = []; api.registerPause(value => pauses.push(value));
  const result = await new Promise(resolve => api.reward(resolve));
  assert.equal(result, false);
  assert.deepEqual(pauses, [false, true, false]);
});
test('only confirmed reward success grants a reward', async () => {
  const { api, sdk } = fixture();
  for (const result of [{ success: false }, {}, { success: true }]) {
    sdk.ads.reward = async () => result;
    assert.equal(await new Promise(resolve => api.reward(resolve)), result.success === true);
  }
});
test('concurrent ads are rejected without unpausing an active ad', async () => {
  const { api, sdk } = fixture();
  let resolveAd;
  sdk.ads.interstitial = () => new Promise(resolve => { resolveAd = resolve; });
  let paused; api.registerPause(value => { paused = value; });
  const first = new Promise(resolve => api.interstitial(resolve));
  await flush();
  assert.equal(await new Promise(resolve => api.reward(resolve)), false);
  assert.equal(paused, true);
  resolveAd({ success: true });
  assert.equal(await first, true);
  assert.equal(paused, false);
});
test('storage round trip and unavailable storage are safe', () => {
  const { api, context } = fixture();
  api.save('pawzzle-maze-results-v1', '{"scores":[]}');
  assert.equal(api.read('pawzzle-maze-results-v1'), '{"scores":[]}');
  context.localStorage.setItem = () => { throw new Error('denied'); };
  context.localStorage.getItem = () => { throw new Error('denied'); };
  assert.doesNotThrow(() => api.save('key', 'value'));
  assert.equal(api.read('key'), null);
});
