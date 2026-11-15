import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core/index.js';
import * as economy from '../src/core/economy.js';
import * as stats from '../src/core/stats.js';
import * as actions from '../src/core/actions.js';
import * as seed from '../src/core/seed.js';
import * as store from '../src/core/store.js';
import * as time from '../src/core/time.js';

const KEY = 'gymbros.state.v1';

// A stand-in for the browser: store.js only touches window.localStorage and window.claude.
function fakeWindow({ stored, boot } = {}) {
  const items = new Map(stored ? [[KEY, JSON.stringify(stored)]] : []);
  globalThis.window = {
    __GB_BOOT__: boot,
    localStorage: {
      getItem: (k) => (items.has(k) ? items.get(k) : null),
      setItem: (k, v) => items.set(k, v),
      removeItem: (k) => items.delete(k),
    },
  };
  return items;
}

afterEach(() => { delete globalThis.window; });

test('the entry point keeps the names other areas already import', () => {
  for (const name of ['bootStore', 'setStyle', 'setTheme', 'setAppearance', 'setUnlimited', 'skipTime', 'resetAll',
    'getState', 'setState', 'subscribe', 'useStore', 'initStore', 'loadPersisted', 'clearPersisted', 'now']) {
    assert.equal(typeof core[name], 'function', name);
  }
  assert.equal(core.HOUR, 3600e3);
  assert.equal(core.DAY, 24 * 3600e3);
  assert.equal(core.WEEK, 7 * 24 * 3600e3);
});

test('the entry point re-exports every module completely, with no name clashes', () => {
  // `export *` silently drops a name that two modules both export, so check each one made it through.
  for (const [label, module] of Object.entries({ economy, stats, actions, seed, store, time })) {
    for (const name of Object.keys(module)) {
      assert.ok(name in core, `${label}.${name} is exported`);
      assert.equal(core[name], module[name], `${label}.${name} is the same binding`);
    }
  }
  assert.ok(Object.values(core).every((value) => value !== undefined));
});

test('bootStore without a browser seeds the day-one state', () => {
  const state = core.bootStore();
  assert.equal(state, core.getState());
  assert.equal(state.v, core.STATE_VERSION);
  assert.equal(state.gym.rooms.length, 1);
  assert.ok(state.workouts.length > 20);
  assert.equal(state.settings.timeOffsetMs, 0);
  assert.ok(Math.abs(core.now() - Date.now()) < 1000);
});

test('bootStore applies the style, theme and appearance overrides of __GB_BOOT__', () => {
  fakeWindow({ boot: { style: 'arcade', theme: 'cobalt', appearance: 'dark', unlimited: false } });
  const { settings } = core.bootStore();
  assert.deepEqual([settings.style, settings.theme, settings.appearance], ['arcade', 'cobalt', 'dark']);
  assert.equal(settings.unlimited, true, 'only the look can be overridden');
});

test('bootStore ignores empty overrides', () => {
  fakeWindow({ boot: { style: '', theme: undefined } });
  const { settings } = core.bootStore();
  assert.deepEqual([settings.style, settings.theme, settings.appearance], ['studio', 'ember', 'auto']);
});

test('bootStore restores a persisted state of the same version', () => {
  const saved = core.createInitialState(Date.now() - 3 * core.DAY);
  saved.settings.style = 'varsity';
  saved.settings.timeOffsetMs = 5 * core.DAY;
  saved.wallet.points = 123456;
  saved.owned['bench-worn'] = 2;
  fakeWindow({ stored: saved, boot: { theme: 'pine' } });
  const state = core.bootStore();
  assert.equal(state.wallet.points, 123456);
  assert.equal(state.owned['bench-worn'], 2);
  assert.equal(state.settings.style, 'varsity');
  assert.equal(state.settings.theme, 'pine', 'boot overrides still apply');
  assert.deepEqual(state.workouts, saved.workouts);
  assert.ok(core.now() - Date.now() > 4 * core.DAY, 'skipped time is kept');
  core.setState((s) => ({ ...s, settings: { ...s.settings, timeOffsetMs: 0 } }));
});

test('bootStore discards a persisted state of another version or a broken one', () => {
  const good = core.createInitialState(Date.now());
  const rejects = [
    { ...good, v: 2, wallet: { ...good.wallet, points: 999999 } },
    { ...good, v: undefined, wallet: { ...good.wallet, points: 999999 } },
    { v: 1, settings: good.settings, wallet: { points: 999999, lifetime: 0, passiveSince: 0 }, avatar: {}, owned: {}, gym: { rooms: [], active: 0, expansions: 0 },
      workouts: [], active: null, routines: [], friends: [], strangers: [], feed: [] },
    { v: 1, wallet: { points: 999999 } },
    'not a state',
  ];
  for (const stored of rejects) {
    fakeWindow({ stored });
    const state = core.bootStore();
    assert.notEqual(state.wallet.points, 999999);
    assert.equal(state.gym.rooms.length, 1);
    assert.ok(state.workouts.length > 20);
    delete globalThis.window;
  }
});

test('bootStore survives storage that throws', () => {
  globalThis.window = { localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} } };
  const state = core.bootStore();
  assert.equal(state.gym.rooms.length, 1);
  assert.ok(core.setStyle('arcade') === undefined);
  assert.equal(core.getState().settings.style, 'arcade');
});

test('resetAll clears what was persisted', () => {
  const saved = core.createInitialState(Date.now());
  const items = fakeWindow({ stored: saved });
  core.bootStore();
  assert.ok(items.has(KEY));
  core.resetAll();
  assert.ok(!items.has(KEY));
  assert.equal(core.getState().gym.expansions, 0);
});

test('selectors read the live store through the entry point', () => {
  core.bootStore();
  assert.equal(core.selDust(), 0);
  assert.ok(core.selConsistency().level >= 2);
  assert.ok(core.selFocusOffer());
  assert.ok(core.selPassive().active);
  assert.equal(core.selUnplaced('bench-worn'), 0);
  assert.ok(core.selMultipliers().average >= 1);
  assert.ok(core.selLastTime('bench-press').sets.length > 0);
});
