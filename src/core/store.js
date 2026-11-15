// Tiny global store. FROZEN API (owned by the manager) - add nothing here, build on top of it.
//   getState()                      current state object (treat as immutable)
//   setState(fn | patch)            fn(state) -> new state, or a shallow patch object
//   subscribe(listener) -> unsub
//   useStore(selector?)             Preact hook; re-renders when the selected value changes (Object.is)
//   initStore(initialState, opts)   called once at boot by src/core/index.js
// Persistence: localStorage (best effort, try/catch) + claude.hot snapshot so a republish keeps the session.
import { useState, useEffect, useRef } from 'preact/hooks';

const KEY = 'gymbros.state.v1';
let state = {};
const listeners = new Set();

export const getState = () => state;

export function setState(update) {
  const next = typeof update === 'function' ? update(state) : { ...state, ...update };
  if (next === state || next == null) return;
  state = next;
  listeners.forEach((l) => l(state));
  schedulePersist();
}

export function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

export function useStore(selector = (s) => s) {
  const sel = useRef(selector); sel.current = selector;
  const [val, setVal] = useState(() => selector(state));
  useEffect(() => {
    const check = () => setVal(() => sel.current(state));
    check();
    return subscribe(check);
  }, []);
  return val;
}

let persistTimer = null;
function schedulePersist() {
  if (typeof window === 'undefined' || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: run in memory */ }
  }, 400);
}

export function loadPersisted() {
  if (typeof window === 'undefined') return null;
  try {
    const hot = window.claude && window.claude.hot && window.claude.hot.data;
    if (hot && hot.v) return hot;
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function clearPersisted() {
  try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function initStore(initial) {
  state = initial;
  listeners.forEach((l) => l(state));
  if (typeof window !== 'undefined') {
    try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => state); } catch (e) { /* ignore */ }
  }
  return state;
}
