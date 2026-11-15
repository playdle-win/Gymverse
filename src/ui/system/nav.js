// Navigation: five tabs (hash routed), one push/pop stack per tab, one full-screen cover over everything.
//   nav.select('gym')                 switch tab (reselecting the active tab pops to its root, then scrolls to top)
//   nav.push(Component, props)        push a page on the current tab's stack (slides in; back button is automatic)
//   nav.pop() / nav.popToRoot()
//   nav.present(Component, props)     full-screen cover above the tab bar (the workout session uses this)
//   nav.dismiss()
//   nav.setTabBarHidden(true)         hide the tab bar without a cover
//   useNav()                          reactive snapshot { tab, stacks, cover, ... }
//   usePage()                         inside a page: { tabId, depth, active, pop }
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

export const TABS = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'train', label: 'Train', icon: 'barbell' },
  { id: 'gym', label: 'Gym', icon: 'storefront' },
  { id: 'progress', label: 'Progress', icon: 'chart-bar' },
  { id: 'exercises', label: 'Exercises', icon: 'books' },
];
const isTab = (id) => TABS.some((t) => t.id === id);
const tabFromHash = () => {
  const id = (window.location.hash || '').replace(/^#\/?/, '').split('/')[0];
  return isTab(id) ? id : null;
};

const SETTLE_MS = 700; // safety net if an animationend never arrives
let seq = 0;
let state = {
  tab: 'home',
  stacks: Object.fromEntries(TABS.map((t) => [t.id, []])),
  // per tab: { type: 'push' | 'pop', leaving?: entry } while a transition runs
  transitions: {},
  cover: null,
  coverLeaving: false,
  tabBarHidden: false,
};
const listeners = new Set();
const reselectListeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l(state)); };
const entry = (Component, props) => ({ key: 'p' + (++seq), Component, props: props || {} });

function writeHash(tab) {
  if (tabFromHash() === tab) return;
  try { window.history.replaceState(null, '', '#' + tab); } catch (e) { /* sandboxed frame: routing stays in memory */ }
}

function settle(tab, type) {
  const current = state.transitions[tab];
  if (!current || (type && current.type !== type)) return;
  const transitions = { ...state.transitions };
  delete transitions[tab];
  set({ transitions });
}
function transition(tab, value) {
  set({ transitions: { ...state.transitions, [tab]: value } });
  setTimeout(() => { if (state.transitions[tab] === value) settle(tab); }, SETTLE_MS);
}

export const nav = {
  getState: () => state,
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  /** Called once by the shell: reads the hash and follows later changes. */
  start() {
    const initial = tabFromHash();
    if (initial) state = { ...state, tab: initial };
    window.addEventListener('hashchange', () => { const t = tabFromHash(); if (t && t !== state.tab) set({ tab: t }); });
  },
  select(tab) {
    if (!isTab(tab)) return;
    if (tab !== state.tab) { set({ tab }); writeHash(tab); return; }
    if (state.stacks[tab].length) nav.popToRoot();
    else reselectListeners.forEach((l) => l(tab));
  },
  onReselect(l) { reselectListeners.add(l); return () => reselectListeners.delete(l); },
  push(Component, props) {
    const tab = state.tab;
    set({ stacks: { ...state.stacks, [tab]: [...state.stacks[tab], entry(Component, props)] } });
    transition(tab, { type: 'push' });
  },
  pop() {
    const tab = state.tab, stack = state.stacks[tab];
    if (!stack.length) return;
    set({ stacks: { ...state.stacks, [tab]: stack.slice(0, -1) } });
    transition(tab, { type: 'pop', leaving: stack[stack.length - 1] });
  },
  popToRoot() {
    const tab = state.tab, stack = state.stacks[tab];
    if (!stack.length) return;
    set({ stacks: { ...state.stacks, [tab]: [] } });
    transition(tab, { type: 'pop', leaving: stack[stack.length - 1] });
  },
  settle,
  present(Component, props) { set({ cover: entry(Component, props), coverLeaving: false }); },
  dismiss() {
    if (!state.cover || state.coverLeaving) return;
    set({ coverLeaving: true });
    setTimeout(() => { if (state.coverLeaving) nav.finishDismiss(); }, SETTLE_MS);
  },
  finishDismiss() { if (state.coverLeaving) set({ cover: null, coverLeaving: false }); },
  setTabBarHidden(hidden) { if (hidden !== state.tabBarHidden) set({ tabBarHidden: !!hidden }); },
};

export function useNav() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => { setSnapshot(state); return nav.subscribe(setSnapshot); }, []);
  return snapshot;
}

/** Hides the tab bar while the calling component is mounted. */
export function useHideTabBar(hidden = true) {
  useEffect(() => {
    if (!hidden) return undefined;
    nav.setTabBarHidden(true);
    return () => nav.setTabBarHidden(false);
  }, [hidden]);
}

const ROOT_PAGE = { tabId: null, depth: 0, active: true, cover: false, pop: () => {} };
export const PageContext = createContext(ROOT_PAGE);
export const usePage = () => useContext(PageContext);
