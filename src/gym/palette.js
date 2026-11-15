// The palette the host passes to the gym renderer. All values are '#rrggbb'.
// { bg, bgSunken, ink, accent, accentInk, accentSoft, good, bad, dark }
import { cssToHex, luma } from './color.js';

export const DEFAULT_PALETTES = {
  light: { bg: '#f4f2ee', bgSunken: '#e7e4dc', ink: '#1d1e24', accent: '#f2542d', accentInk: '#ffffff', accentSoft: '#fde0d6', good: '#2e9e5b', bad: '#e5484d', dark: false },
  dark: { bg: '#17181c', bgSunken: '#0e0f12', ink: '#f2f1ee', accent: '#ff6b45', accentInk: '#1b0c07', accentSoft: '#3b2119', good: '#46c07a', bad: '#ff6369', dark: true },
};

// Read the design tokens (docs/SPEC.md section 6) from an element so the room follows the app theme.
export function paletteFromCSS(el = document.documentElement) {
  const cs = getComputedStyle(el), d = DEFAULT_PALETTES.light;
  const get = (name, fallback) => cssToHex(cs.getPropertyValue(name), fallback);
  const bg = get('--bg', d.bg);
  return {
    bg, bgSunken: get('--bg-sunken', d.bgSunken), ink: get('--ink', d.ink), accent: get('--accent', d.accent), accentInk: get('--accent-ink', d.accentInk),
    accentSoft: get('--accent-soft', d.accentSoft), good: get('--good', d.good), bad: get('--bad', d.bad), dark: luma(bg) < 0.4,
  };
}

export const paletteKey = (p) => [p.bg, p.bgSunken, p.ink, p.accent, p.accentInk, p.accentSoft, p.good, p.bad].join('');
