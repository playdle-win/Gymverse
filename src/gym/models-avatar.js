// Avatar cosmetics: which shape each catalog cosmetic uses, and the shape builders for the head.
// Head shapes are built in the head frame H: H.at(side, front, up) -> room point, H.ax(side, front, up) -> room vector,
// H.r = head radius in avatar units, H.R the same in tiles, H.k = tiles per avatar unit (scale radii with it). A builder returns { caps: [prims drawn right on the head], extra: [prims sorted on their own] }.
import { ball, cap, rod, poly } from './kit.js';
import { mix } from './color.js';

export const SKIN = { s1: '#fbe4d4', s2: '#f4d2b8', s3: '#dcac86', s4: '#a97851', s5: '#744b33' };
export const HAIR = { h1: '#2b221d', h2: '#5e3d24', h3: '#cfa24f', h4: '#b74c2c', h5: '#d5d6da' };

export const DEFAULT_AVATAR = {
  skin: 's2', hair: 'hair-buzz', hairColor: 'h2', beard: 'beard-none', top: 'top-tank-grey',
  bottom: 'bottom-shorts-black', shoes: 'shoes-trainers-white', accessory: 'acc-none',
};

// catalog id -> shape. Colours come from the catalog `tint` (clothes, accessories) or the avatar's hairColor.
export const COSMETICS = {
  'hair-buzz': 'buzz', 'hair-crop': 'crop', 'hair-bun': 'bun', 'hair-curls': 'curls',
  'beard-none': null, 'beard-stubble': 'stubble', 'beard-full': 'full',
  'top-tank-grey': 'tank', 'top-tee-white': 'tee', 'top-tee-team': 'tee', 'top-hoodie-black': 'hoodie',
  'bottom-shorts-black': 'shorts', 'bottom-shorts-blue': 'shorts', 'bottom-joggers-grey': 'joggers',
  'shoes-trainers-white': 'low', 'shoes-hightops-red': 'high',
  'acc-none': null, 'acc-headband': 'headband', 'acc-cap': 'cap', 'acc-headphones': 'headphones',
};

const dome = (H, k, tilt, a0, a1, c) => cap(...H.c, H.R * k, H.ax(0, -tilt, 1), a0, a1, c);
const puff = (H, s, f, u, r, c) => ball(...H.at(s, f, u), r * H.k, c);

export const HAIR_SHAPES = {
  buzz: (H, c, skin) => ({ caps: [dome(H, 1.02, 0.34, 0, 1.2, mix(c, skin, 0.3))], extra: [] }),
  crop: (H, c) => ({
    caps: [dome(H, 1.05, 0.34, 0, 1.3, c)],
    extra: [puff(H, 0, 0.02, 0.2, 0.17, c), puff(H, -0.07, 0.15, 0.2, 0.1, c), puff(H, 0.07, 0.14, 0.21, 0.1, c)],
  }),
  bun: (H, c) => ({ caps: [dome(H, 1.045, 0.42, 0, 1.42, c)], extra: [puff(H, 0, -0.1, 0.29, 0.11, c)] }),
  curls: (H, c) => ({
    caps: [dome(H, 1.04, 0.3, 0, 1.25, c)],
    extra: [[0, 0, 0.23, 0.15], [-0.16, 0.02, 0.17, 0.13], [0.16, 0.02, 0.17, 0.13], [-0.23, -0.05, 0.03, 0.12], [0.23, -0.05, 0.03, 0.12],
      [0, -0.2, 0.12, 0.15], [-0.13, -0.18, -0.02, 0.12], [0.13, -0.18, -0.02, 0.12], [-0.09, 0.15, 0.2, 0.1], [0.09, 0.15, 0.2, 0.1]]
      .map(([s, f, u, r]) => puff(H, s, f, u, r, c)),
  }),
};

export const BEARD_SHAPES = {
  stubble: (H, c, skin) => ({ caps: [cap(...H.c, H.R * 1.02, H.ax(0, 0.55, -0.85), 0, 0.98, mix(skin, c, 0.38))], extra: [] }),
  full: (H, c) => ({ caps: [cap(...H.c, H.R * 1.07, H.ax(0, 0.5, -0.87), 0, 1.08, c)], extra: [puff(H, 0, 0.13, -0.22, 0.1, c)] }),
};

function visor(H, c) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -0.85 + (1.7 * i) / 6; pts.push(H.at(Math.sin(a) * H.r * 1.02, Math.cos(a) * H.r * 1.02, 0.09)); }
  for (let i = 6; i >= 0; i--) { const a = -0.7 + (1.4 * i) / 6; pts.push(H.at(Math.sin(a) * H.r * 1.5, Math.cos(a) * H.r * 1.62, 0.05)); }
  return poly(pts, c, { b: 0.7 });
}

export const ACC_SHAPES = {
  headband: (H, c) => ({ caps: [cap(...H.c, H.R * 1.07, H.ax(0, -0.22, 1), 0.82, 1.14, c)], extra: [] }),
  cap: (H, c) => ({ caps: [dome(H, 1.09, 0.16, 0, 1.2, c), visor(H, c)], extra: [], hidesHair: true }),
  headphones: (H, c) => {
    const band = [];
    for (let i = 0; i < 6; i++) {
      const a0 = -1.35 + (2.7 * i) / 6, a1 = -1.35 + (2.7 * (i + 1)) / 6, R = H.r * 1.12;
      band.push(rod(H.at(Math.sin(a0) * R, -0.02, Math.cos(a0) * R), H.at(Math.sin(a1) * R, -0.02, Math.cos(a1) * R), 0.024 * H.k, c));
    }
    return { caps: [], extra: [...band, puff(H, -H.r * 1.02, -0.02, -0.03, 0.095, c), puff(H, H.r * 1.02, -0.02, -0.03, 0.095, c)] };
  },
};
