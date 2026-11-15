// Art directions, colour themes, root attributes, and resolved token colours for canvas/SVG code.
import { useEffect, useState } from 'preact/hooks';

export const STYLES = [
  { id: 'studio', name: 'Studio', blurb: 'System type, soft depth, glass tab bar' },
  { id: 'arcade', name: 'Arcade', blurb: 'Pixel type, 2px edges, stepped motion' },
  { id: 'varsity', name: 'Varsity', blurb: 'Condensed italics, pills, bold blocks' },
];
export const THEMES = [
  { id: 'ember', name: 'Ember' },
  { id: 'cobalt', name: 'Cobalt' },
  { id: 'pine', name: 'Pine' },
  { id: 'berry', name: 'Berry' },
  { id: 'graphite', name: 'Graphite' },
];
export const APPEARANCES = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
export const DEFAULT_STYLE = 'studio';
export const DEFAULT_THEME = 'ember';

const root = () => document.documentElement;
const known = (list, id, fallback) => (list.some((x) => x.id === id) ? id : fallback);

// data-theme may belong to the artifact host. We only write it when the user forces light or dark,
// and give the host's value back when they return to auto.
let forced = false;
let hostTheme = null;

export function applyRootAttributes({ style, theme, appearance }) {
  const el = root();
  el.setAttribute('data-style', known(STYLES, style, DEFAULT_STYLE));
  el.setAttribute('data-gbtheme', known(THEMES, theme, DEFAULT_THEME));
  const force = appearance === 'light' || appearance === 'dark';
  if (force) {
    if (!forced) hostTheme = el.getAttribute('data-theme');
    el.setAttribute('data-theme', appearance);
  } else if (forced) {
    if (hostTheme) el.setAttribute('data-theme', hostTheme); else el.removeAttribute('data-theme');
  }
  forced = force;
  watch();
}

// ---- resolved colours -------------------------------------------------------------------------
const COLOR_TOKENS = {
  bg: '--bg', bgRaised: '--bg-raised', bgSunken: '--bg-sunken', bgInverse: '--bg-inverse',
  fill: '--fill', fillStrong: '--fill-strong',
  ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', inkInverse: '--ink-inverse',
  line: '--line', lineStrong: '--line-strong',
  accent: '--accent', accentInk: '--accent-ink', accentSoft: '--accent-soft', accentText: '--accent-text',
  good: '--good', warn: '--warn', bad: '--bad',
  points: '--points', pointsEdge: '--points-edge', pointsInk: '--points-ink', pointsText: '--points-text',
  chartGrid: '--chart-grid', chartAxis: '--chart-axis', chartLine: '--chart-line', chartArea: '--chart-area', chartMuted: '--chart-muted',
  fontUi: '--font-ui', fontDisplay: '--font-display', fontNum: '--font-num',
};

let cache = null;
let watching = false;
const subscribers = new Set();

function readColors() {
  const el = root(), cs = getComputedStyle(el);
  const out = {};
  for (const key in COLOR_TOKENS) out[key] = cs.getPropertyValue(COLOR_TOKENS[key]).trim();
  out.dark = cs.getPropertyValue('--is-dark').trim() === '1';
  out.style = el.getAttribute('data-style') || DEFAULT_STYLE;
  out.theme = el.getAttribute('data-gbtheme') || DEFAULT_THEME;
  return out;
}

function syncThemeColorMeta(bg) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  if (meta.content !== bg) meta.content = bg;
}

function invalidate() {
  cache = null;
  syncThemeColorMeta(getThemeColors().bg);
  subscribers.forEach((fn) => fn());
}

function watch() {
  if (watching) return;
  watching = true;
  new MutationObserver(invalidate).observe(root(), { attributes: true, attributeFilter: ['data-style', 'data-gbtheme', 'data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', invalidate);
  syncThemeColorMeta(getThemeColors().bg);
}

/** Current resolved tokens as plain strings (hex or rgb()), safe for canvas fillStyle and SVG attributes. */
export function getThemeColors() {
  return cache || (cache = readColors());
}

/** Hook: resolved tokens that update when style, theme or appearance change.
 *  Keys: bg, bgRaised, bgSunken, bgInverse, fill, fillStrong, ink, ink2, ink3, inkInverse, line, lineStrong,
 *  accent, accentInk, accentSoft, accentText, good, warn, bad, points, pointsEdge, pointsInk, pointsText,
 *  chartGrid, chartAxis, chartLine, chartArea, chartMuted, fontUi, fontDisplay, fontNum, dark, style, theme. */
export function useThemeColors() {
  const [, bump] = useState(0);
  useEffect(() => {
    watch();
    const update = () => bump((n) => n + 1);
    subscribers.add(update);
    update();
    return () => subscribers.delete(update);
  }, []);
  return getThemeColors();
}

/** Non-hook subscription for the gym renderer: returns an unsubscribe function. */
export function onThemeChange(listener) {
  watch();
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
