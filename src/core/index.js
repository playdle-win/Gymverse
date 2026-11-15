// STUB written by the manager so other areas can build. The systems agent replaces this file
// but MUST keep these export names and signatures: bootStore, setStyle, setTheme, setAppearance,
// setUnlimited, skipTime, resetAll (plus re-exports of store.js and time.js).
import { initStore, setState, loadPersisted, clearPersisted } from './store.js';
export * from './store.js';
export * from './time.js';

const freshState = () => ({
  v: 1,
  settings: { style: 'studio', theme: 'ember', appearance: 'auto', unlimited: true, timeOffsetMs: 0, bodyKg: 78 },
  profile: { id: 'me', name: 'Victor', handle: 'victor' },
  wallet: { points: 1240, lifetime: 1240, passiveSince: Date.now() },
  avatar: {}, owned: {}, gym: { rooms: [], active: 0, expansions: 0 },
  workouts: [], active: null, routines: [], friends: [], strangers: [], feed: [],
});

export function bootStore() {
  const s = loadPersisted() || freshState();
  const boot = (typeof window !== 'undefined' && window.__GB_BOOT__) || {};
  const settings = { ...s.settings };
  for (const k of ['style', 'theme', 'appearance']) if (boot[k]) settings[k] = boot[k];
  return initStore({ ...s, settings });
}

const patchSettings = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
export const setStyle = (style) => patchSettings({ style });
export const setTheme = (theme) => patchSettings({ theme });
export const setAppearance = (appearance) => patchSettings({ appearance });
export const setUnlimited = (unlimited) => patchSettings({ unlimited });
export const skipTime = (ms) => setState((s) => ({ ...s, settings: { ...s.settings, timeOffsetMs: s.settings.timeOffsetMs + ms } }));
export function resetAll() { clearPersisted(); initStore(freshState()); }
