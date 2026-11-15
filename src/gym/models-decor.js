// Decor models, keyed by catalog id. Same format as models.js.
// Wall-mounted models are authored against the back-right wall: x along the wall, y = distance out of the wall.
import { box, cyl, rod, cap, poly, line } from './kit.js';

const TAU = Math.PI * 2;
const discY = (cx, y, cz, r, n = 14) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * r, y, cz + Math.sin((i / n) * TAU) * r]);
const discZ = (cx, cy, z, r, n = 18) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * r, z]);
const rectY = (x0, x1, y, z0, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];

const LEAF = [[0, 0], [0.12, 0.4], [0.42, 0.52], [0.78, 0.34], [1, 0], [0.78, -0.34], [0.42, -0.52], [0.12, -0.4]];
// A stem from the pot with one broad leaf; az = compass angle, tilt = how far the leaf points upward.
function leaf(az, tilt, reach, height, size, c) {
  const ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
  const b = [0.5 + ca * reach, 0.5 + sa * reach, height];
  const at = (u, v) => [b[0] + ca * ct * u * size - sa * v * size * 0.8, b[1] + sa * ct * u * size + ca * v * size * 0.8, b[2] + st * u * size];
  return [
    rod([0.5 + ca * 0.05, 0.5 + sa * 0.05, 0.33], b, 0.014, 'leafDark', { shadow: false }),
    poly(LEAF.map(([u, v]) => at(u, v)), c),
    line([at(0, 0), at(0.85, 0)], 'leafDark', 0.012),
  ];
}

const plant = [
  cyl(0.5, 0.5, 0, 0.16, 0.3, 'pot', { r2: 0.22 }),
  cyl(0.5, 0.5, 0.3, 0.235, 0.045, 'pot', { cap: 'soil' }),
  ...leaf(3.6, 0.9, 0.1, 0.78, 0.42, 'leafDark'),
  ...leaf(5.2, 0.5, 0.14, 0.62, 0.4, 'leaf'),
  ...leaf(4.3, 1.15, 0.04, 1.02, 0.44, 'leaf'),
  ...leaf(2.5, 0.35, 0.16, 0.66, 0.42, 'leaf'),
  ...leaf(0.2, 0.4, 0.15, 0.7, 0.44, 'leafLight'),
  ...leaf(1.5, 0.3, 0.17, 0.58, 0.46, 'leaf'),
  ...leaf(0.9, 0.95, 0.08, 0.92, 0.4, 'leafLight'),
];

const mirror = [
  box(0.12, 0, 0.5, 1.76, 0.05, 1.62, 'woodDark'),
  poly(rectY(0.19, 1.81, 0.051, 0.57, 2.05), 'mirror', { b: 1 }),
  poly(rectY(0.19, 1.81, 0.052, 0.57, 0.95), '#a9c9d6', { b: 1, al: 0.5 }),
  poly([[0.42, 0.053, 0.57], [0.66, 0.053, 0.57], [1.2, 0.053, 2.05], [0.96, 0.053, 2.05]], '#ffffff', { b: 1, al: 0.5 }),
  poly([[0.78, 0.053, 0.57], [0.86, 0.053, 0.57], [1.4, 0.053, 2.05], [1.32, 0.053, 2.05]], '#ffffff', { b: 1, al: 0.4 }),
];

const poster = [
  box(0.18, 0, 0.92, 0.64, 0.012, 0.9, 'paper'),
  poly(rectY(0.22, 0.78, 0.013, 1.3, 1.78), '$accent', { b: 0.8 }),
  line([[0.3, 0.014, 1.54], [0.7, 0.014, 1.54]], '#ffffff', 0.022),
  poly(rectY(0.33, 0.37, 0.014, 1.42, 1.66), '#ffffff', { b: 1 }), poly(rectY(0.63, 0.67, 0.014, 1.42, 1.66), '#ffffff', { b: 1 }),
  poly(rectY(0.385, 0.41, 0.014, 1.46, 1.62), '#ffffff', { b: 1 }), poly(rectY(0.59, 0.615, 0.014, 1.46, 1.62), '#ffffff', { b: 1 }),
  poly(rectY(0.24, 0.76, 0.014, 1.14, 1.23), '#2a2b33', { b: 1 }),
  poly(rectY(0.24, 0.6, 0.014, 1.03, 1.08), '#8d8a82', { b: 1 }),
  poly(rectY(0.16, 0.24, 0.015, 1.76, 1.84), 'tape', { b: 0.9 }), poly(rectY(0.76, 0.84, 0.015, 1.76, 1.84), 'tape', { b: 0.9 }),
];

const cooler = [
  box(0.3, 0.3, 0, 0.4, 0.4, 0.78, 'white'),
  poly(rectY(0.35, 0.65, 0.701, 0.34, 0.64), '#cfd5db', { b: 0.62 }),
  poly(rectY(0.35, 0.65, 0.701, 0.06, 0.24), '#dfe3e6', { b: 0.62 }),
  box(0.36, 0.7, 0.3, 0.28, 0.07, 0.02, 'grey'),
  box(0.4, 0.7, 0.5, 0.06, 0.04, 0.06, 'blue'), box(0.54, 0.7, 0.5, 0.06, 0.04, 0.06, 'red'),
  cyl(0.5, 0.5, 0.78, 0.07, 0.06, 'bottle', { shadow: false }),
  cyl(0.5, 0.5, 0.84, 0.17, 0.34, 'bottle', { cap: 'water', film: false, shadow: false }),
  line([[0.38, 0.62, 0.9], [0.38, 0.62, 1.12]], '#ffffff', 0.02, { al: 0.7 }),
  line([[0.335, 0.5, 1.0], [0.5, 0.67, 1.0], [0.665, 0.5, 1.0]], 'water', 0.016),
  cap(0.5, 0.5, 1.18, 0.17, [0, 0, 1], 0, Math.PI / 2, 'bottle', { shadow: false }),
];

const mat = [
  box(0.08, 0.08, 0, 1.84, 1.84, 0.03, '$accent', { film: false }),
  line([[0.22, 0.22, 0.031], [1.78, 0.22, 0.031], [1.78, 1.78, 0.031], [0.22, 1.78, 0.031], [0.22, 0.22, 0.031]], '$accentPale', 0.03, { b: 1 }),
  poly(discZ(1, 1, 0.031, 0.46), '$accentPale', { b: 1 }),
  poly(discZ(1, 1, 0.032, 0.36), '$accent', { b: 1 }),
  poly(discZ(1, 1, 0.033, 0.12), '$accentPale', { b: 1 }),
];

const speaker = [
  box(0.33, 0.36, 0, 0.08, 0.08, 0.06, 'iron'), box(0.59, 0.36, 0, 0.08, 0.08, 0.06, 'iron'),
  box(0.33, 0.58, 0, 0.08, 0.08, 0.06, 'iron'), box(0.59, 0.58, 0, 0.08, 0.08, 0.06, 'iron'),
  box(0.29, 0.32, 0.06, 0.42, 0.38, 0.84, 'black'),
  poly(discY(0.5, 0.701, 0.36, 0.165), '$accent', { b: 0.75 }),
  poly(discY(0.5, 0.702, 0.36, 0.14), 'charcoal', { b: 0.8 }),
  poly(discY(0.5, 0.703, 0.36, 0.095), '#15151a', { b: 0.8 }),
  poly(discY(0.5, 0.704, 0.36, 0.035), 'grey', { b: 0.9 }),
  poly(discY(0.5, 0.702, 0.7, 0.075), 'charcoal', { b: 0.8 }),
  poly(discY(0.5, 0.703, 0.7, 0.04), 'grey', { b: 0.9 }),
  poly(rectY(0.34, 0.37, 0.702, 0.84, 0.86), 'led', { b: 1 }),
  rod([0.4, 0.5, 0.92], [0.6, 0.5, 0.92], 0.018, 'charcoal', { shadow: false }),
];

export const DECOR_MODELS = {
  'plant-monstera': { prims: plant, webs: [] },
  'mirror-wall': { prims: mirror },
  'poster-lift': { prims: poster },
  'cooler-water': { prims: cooler, webs: [[[0.3, 0.702, 0.78], [0.3, 0.702, 0.4], [0.64, 0.702, 0.78]]] },
  'mat-floor': { prims: mat },
  'speaker-boom': { prims: speaker },
};
