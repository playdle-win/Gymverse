// Core entry point: boots the store and re-exports the whole core API.
//   store.js    getState, setState, subscribe, useStore
//   time.js     now, HOUR, DAY, WEEK
//   economy.js  pure rules: TUNING, workoutPoints, gymMultipliers, consistency, dustLevel, passive, focusOffer,
//               expansionCost, extraFloorCost, finishCost, canPlace, footprint, gymValue, est1RM, setLoad, ...
//   stats.js    pure Progress numbers: exerciseSeries, bestSet, prList, weeklyStats, muscleBalance, totals, ...
//   actions.js  mutations returning { ok, reason? } and live selectors (sel*)
//   seed.js     createInitialState, STATE_VERSION, SKIN_KEYS, HAIR_COLOR_KEYS, AVATAR_SLOTS
import { initStore, loadPersisted } from './store.js';
import { createInitialState, STATE_VERSION } from './seed.js';

export * from './store.js';
export * from './time.js';
export * from './economy.js';
export * from './stats.js';
export * from './actions.js';
export * from './seed.js';

const BOOT_KEYS = ['style', 'theme', 'appearance'];

// A stored state is only reused when it has this build's version and the parts every screen relies on.
function isUsable(state) {
  return Boolean(state) && state.v === STATE_VERSION
    && Boolean(state.settings && state.wallet && state.avatar && state.owned)
    && Boolean(state.gym && Array.isArray(state.gym.rooms) && state.gym.rooms.length > 0)
    && [state.workouts, state.routines, state.friends, state.strangers, state.feed].every(Array.isArray);
}

/**
 * Boot the store: the persisted state when it is usable, otherwise the seeded day-one state.
 * window.__GB_BOOT__ = { style, theme, appearance } overrides those settings (used by screenshots).
 * @returns {object} the initial state
 */
export function bootStore() {
  const persisted = loadPersisted();
  const state = isUsable(persisted) ? persisted : createInitialState(Date.now());
  const boot = (typeof window !== 'undefined' && window.__GB_BOOT__) || {};
  const settings = { ...state.settings };
  for (const key of BOOT_KEYS) if (boot[key]) settings[key] = boot[key];
  return initStore({ ...state, settings });
}
