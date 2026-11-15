// Shaders: turn a model colour + surface brightness into a fill for one of the three art directions.
// A model colour is '#hex', a material name from MAT, or a palette token ('$accent', '$ink', ...).
import { tone, mix, desat } from './color.js';

export const STYLES = ['studio', 'arcade', 'varsity'];

// name: [colour, kind]. kind: 'glow' is unshaded (screens, lamps), 'metal' gets a touch more contrast.
export const MAT = {
  steel: ['#98a2ae', 'metal'], chrome: ['#cfd6dd', 'metal'], iron: ['#3b3e47', 'metal'], gunmetal: ['#5d6470', 'metal'],
  rubber: ['#2b2d33'], black: ['#24252a'], charcoal: ['#3d4047'], grey: ['#8a8d93'], silver: ['#b9bec6', 'metal'],
  white: ['#f3f1ea'], cream: ['#e9e1cf'], paper: ['#f6f2e6'],
  wood: ['#bd8c56'], woodDark: ['#8b6238'], woodPale: ['#dcbc8c'], woodGrey: ['#a08f78'],
  pad: ['#30323a'], padRed: ['#b3402f'], tape: ['#cdc6b2'], rust: ['#8f4f2c'],
  leaf: ['#4d9b58'], leafDark: ['#34774a'], leafLight: ['#7cc06a'], pot: ['#c8704a'], soil: ['#4b3628'],
  glass: ['#bfe2ee'], mirror: ['#cfe6ee'], water: ['#7fc6ea'], bottle: ['#a9dcf2'],
  screen: ['#152434', 'glow'], lamp: ['#fff1c2', 'glow'], led: ['#7dffb0', 'glow'],
  red: ['#d8483a'], blue: ['#3f78d6'], yellow: ['#f0bf3a'], green: ['#3fae6b'], orange: ['#ee8a3a'],
};

const DUST = '#b4ad9d';
export const INK = '#1c1b26';

const LOOK = {
  studio: { shift: 0.35, sat: 1, cel: false, ink: null, levels: null },
  arcade: { shift: 0.6, sat: 1.04, cel: true, ink: INK, levels: [1.14, 0.93, 0.68], soft: 0.8 },
  varsity: { shift: 0.45, sat: 1.12, cel: true, ink: '#15151b', levels: [1.07, 0.97, 0.66], soft: 0.84 },
};

export function makeShader(style, palette, dust = 0) {
  const look = LOOK[style] || LOOK.studio;
  const tokens = {
    $accent: palette.accent, $accentInk: palette.accentInk, $accentSoft: palette.accentSoft, $ink: palette.ink, $bg: palette.bg,
    $accentDeep: tone(palette.accent, 0.72, 0.6), $accentPale: mix(palette.accent, '#ffffff', 0.55),
  };
  const base = new Map();
  const resolve = (c) => {
    let v = base.get(c);
    if (v) return v;
    const m = MAT[c];
    let col = m ? m[0] : c[0] === '$' ? tokens[c] || palette.accent : c;
    if (dust) col = mix(desat(col, dust * 0.4), DUST, dust * 0.1);
    v = { col, kind: m ? m[1] : null };
    base.set(c, v);
    return v;
  };
  const kindOf = (c, m) => m || resolve(c).kind;
  const level = (b) => (b >= 0.85 ? look.levels[0] : b >= 0.5 ? look.levels[1] : look.levels[2]);
  const shadeAt = (col, f) => tone(col, f, look.shift, look.sat);

  return {
    style, cel: look.cel, ink: look.ink, dust, palette,
    resolve: (c) => resolve(c).col,
    // k is an explicit multiplier: finishes shade their own surfaces.
    flat: (c, k = 1) => shadeAt(resolve(c).col, k),
    face(c, m, b, film, vspan) {
      let { col } = resolve(c);
      const kind = kindOf(c, m);
      if (kind === 'glow') return col;
      if (film && dust) col = mix(col, DUST, dust * 0.5);
      if (look.levels) return shadeAt(col, level(b));
      const f = (kind === 'metal' ? 0.5 : 0.58) + (kind === 'metal' ? 0.58 : 0.46) * b;
      if (vspan && vspan[1] - vspan[0] > 0.12) return { lin: [0, vspan[0], 0, vspan[1]], a: shadeAt(col, f * 1.05), b: shadeAt(col, f * 0.9) };
      return shadeAt(col, f);
    },
    // The shaded half of rods and balls in the cel styles: softer than a full shadow face.
    soft(c, m) { const { col } = resolve(c); return kindOf(c, m) === 'glow' ? col : shadeAt(col, look.soft || 0.8); },
    // Rods and balls: span is the light-to-dark axis; disc = [cx, cy, R] for spheres.
    round(c, m, span, disc) {
      const { col } = resolve(c);
      if (kindOf(c, m) === 'glow') return col;
      if (look.levels) return shadeAt(col, look.levels[1] * 1.06);
      if (disc) {
        const [cx, cy, R] = disc;
        return { rad: [cx - R * 0.32, cy - R * 0.38, R * 0.15, cx, cy, R * 1.12], a: shadeAt(col, 1.06), b: shadeAt(col, 0.82) };
      }
      return { lin: span, a: shadeAt(col, 1.05), b: shadeAt(col, 0.8) };
    },
  };
}
