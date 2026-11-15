// Equipment models, keyed by catalog id. Pure data built with the kit primitives (see README.md).
// Model space: tiles. x in [0, w], y in [0, d] of the catalog footprint at rot 0, z up. The camera looks at the
// +x and +y sides, so put the interesting side of a model toward +y (screen left) or +x (screen right).
// anchors: z = height of the surface the avatar sits/lies/stands on; grip = [left, right] hand points at rest;
//          rail = [dy, dz] travel direction for sled machines.
// part tags: 'load' follows the pose's load offset; 'gripL' / 'gripR' follow each hand.
import { box, cyl, prism, rod, poly, line, shift } from './kit.js';

const FRAME = 'gunmetal', DARK = 'iron';

// A weight plate on a bar along x: rubber disc with an accent ring and a steel hub.
const plate = (x, y, z, r, th, o) => [
  cyl(x, y, z, r, th, 'rubber', { axis: 'x', cap: 'rubber', ...o }),
  cyl(x + th, y, z, r * 0.62, 0.006, '$accent', { axis: 'x', cap: '$accent', shadow: false, ...o }),
  cyl(x + th + 0.006, y, z, r * 0.24, 0.012, 'steel', { axis: 'x', cap: 'chrome', shadow: false, ...o }),
];

// A loaded barbell along x between x0 and x1.
const barbell = (y, z, x0, x1, o) => [
  rod([x0, y, z], [x1, y, z], 0.024, 'chrome', o),
  ...plate(x0 + 0.07, y, z, 0.24, 0.06, o), ...plate(x0 + 0.145, y, z, 0.19, 0.05, o),
  ...plate(x1 - 0.15, y, z, 0.24, 0.06, o), ...plate(x1 - 0.215, y, z, 0.19, 0.05, o),
  cyl(x0 + 0.035, y, z, 0.04, 0.025, 'chrome', { axis: 'x', shadow: false, ...o }),
  cyl(x1 - 0.06, y, z, 0.04, 0.025, 'chrome', { axis: 'x', shadow: false, ...o }),
];

// A dumbbell lying along y.
const dumbbell = (x, y, z, r, c) => [
  cyl(x, y, z, r, 0.08, c, { axis: 'y', cap: c }),
  rod([x, y + 0.08, z], [x, y + 0.18, z], 0.02, 'chrome', { shadow: false }),
  cyl(x, y + 0.18, z, r, 0.08, c, { axis: 'y', cap: c }),
];

// ---- bench-worn: the day-one bench. Sagging boards, a split, one leg taped, one corner propped on bricks.
const topA = (y) => 0.347 - (y - 0.12) * 0.022, topB = (y) => 0.339 - (y - 0.18) * 0.027;
const OLD = '#b0926b', OLD2 = '#9c7f5c', LEG = '#7a6144', SPLIT = '#4d3b28', NAIL = '#3a3026';
const benchWorn = [
  box(0.3, 0.24, 0, 0.07, 0.07, 0.29, LEG), box(0.63, 0.24, 0, 0.07, 0.07, 0.29, LEG),
  box(0.37, 0.255, 0.12, 0.26, 0.04, 0.04, '#6a5338'),
  box(0.3, 1.68, 0, 0.07, 0.07, 0.25, LEG),
  box(0.283, 1.663, 0.07, 0.104, 0.104, 0.1, 'tape'),
  line([[0.283, 1.767, 0.1], [0.387, 1.767, 0.115]], '#9c9684', 0.014), line([[0.283, 1.767, 0.135], [0.387, 1.767, 0.15]], '#9c9684', 0.014),
  box(0.52, 1.6, 0, 0.26, 0.13, 0.075, '#a85a3c'),
  box(0.55, 1.62, 0.075, 0.24, 0.13, 0.075, '#b9694b'),
  line([[0.55, 1.75, 0.076], [0.79, 1.75, 0.076]], '#7c4029', 0.012),
  box(0.635, 1.68, 0.15, 0.07, 0.07, 0.1, LEG),
  rod([0.345, 0.3, 0.2], [0.655, 1.69, 0.1], 0.018, '#5f4a31'),
  prism('x', 0.265, 0.228, [[0.12, 0.292], [1.88, 0.253], [1.88, 0.308], [0.12, 0.347]], OLD),
  line([[0.39, 0.7, topA(0.7)], [0.35, 0.98, topA(0.98)], [0.41, 1.22, topA(1.22)], [0.365, 1.5, topA(1.5)], [0.42, 1.88, topA(1.88)]], SPLIT, 0.018),
  line([[0.365, 1.5, topA(1.5)], [0.3, 1.66, topA(1.66)]], SPLIT, 0.012),
  line([[0.35, 0.98, topA(0.98)], [0.44, 0.9, topA(0.9)]], SPLIT, 0.012),
  poly([[0.275, 0.2, topA(0.2)], [0.42, 0.18, topA(0.18)], [0.46, 0.46, topA(0.46)], [0.33, 0.6, topA(0.6)]], '#9a8160'),
  line([[0.31, 0.17, topA(0.17)], [0.316, 0.176, topA(0.176)]], NAIL, 0.026), line([[0.44, 0.17, topA(0.17)], [0.446, 0.176, topA(0.176)]], NAIL, 0.026),
  line([[0.31, 1.82, topA(1.82)], [0.316, 1.826, topA(1.826)]], NAIL, 0.026),
  prism('x', 0.507, 0.228, [[0.18, 0.284], [1.8, 0.24], [1.8, 0.295], [0.18, 0.339]], OLD2),
  poly([[0.735, 1.8, topB(1.8)], [0.735, 1.42, topB(1.42)], [0.64, 1.58, topB(1.58)], [0.6, 1.8, topB(1.8)]], SPLIT, { b: 1 }),
  line([[0.64, 1.58, topB(1.58)], [0.62, 1.2, topB(1.2)], [0.67, 0.92, topB(0.92)]], SPLIT, 0.014),
  line([[0.69, 0.24, topB(0.24)], [0.696, 0.246, topB(0.246)]], NAIL, 0.026), line([[0.57, 0.24, topB(0.24)], [0.576, 0.246, topB(0.246)]], NAIL, 0.026),
  box(0.25, 1.1, 0.232, 0.5, 0.16, 0.118, 'tape'),
  line([[0.25, 1.26, 0.27], [0.75, 1.26, 0.255]], '#9c9684', 0.014), line([[0.25, 1.26, 0.315], [0.75, 1.26, 0.3]], '#9c9684', 0.014),
  line([[0.3, 1.1, 0.351], [0.3, 1.26, 0.351]], '#9c9684', 0.014), line([[0.52, 1.1, 0.351], [0.52, 1.26, 0.351]], '#9c9684', 0.014),
];

const benchFlat = [
  box(0.66, 0.4, 0, 0.68, 0.08, 0.06, FRAME), box(0.74, 1.74, 0, 0.52, 0.08, 0.06, FRAME),
  box(0.95, 0.44, 0.06, 0.1, 1.34, 0.06, FRAME),
  box(0.95, 0.7, 0.12, 0.1, 0.1, 0.16, FRAME), box(0.95, 1.6, 0.12, 0.1, 0.1, 0.16, FRAME),
  box(0.55, 0.41, 0.06, 0.065, 0.065, 1.0, FRAME), box(1.385, 0.41, 0.06, 0.065, 0.065, 1.0, FRAME),
  box(0.55, 0.475, 0.93, 0.065, 0.09, 0.035, DARK), box(1.385, 0.475, 0.93, 0.065, 0.09, 0.035, DARK),
  box(0.55, 0.555, 0.93, 0.065, 0.02, 0.1, DARK), box(1.385, 0.555, 0.93, 0.065, 0.02, 0.1, DARK),
  box(0.78, 0.3, 0.28, 0.44, 1.62, 0.1, 'pad'),
  poly([[0.78, 1.92, 0.295], [1.22, 1.92, 0.295], [1.22, 1.92, 0.325], [0.78, 1.92, 0.325]], '$accent', { b: 0.7 }),
  poly([[1.22, 0.3, 0.295], [1.22, 1.92, 0.295], [1.22, 1.92, 0.325], [1.22, 0.3, 0.325]], '$accent', { b: 0.45 }),
  ...barbell(0.515, 1.0, 0.05, 1.95, { part: 'load' }),
];

const rackSquat = [
  box(0.34, 0.26, 0, 0.1, 1.4, 0.07, FRAME), box(1.56, 0.26, 0, 0.1, 1.4, 0.07, FRAME),
  box(0.34, 0.3, 0.02, 1.32, 0.08, 0.06, FRAME),
  rod([0.25, 0.3375, 0.42], [0.36, 0.3375, 0.42], 0.022, 'chrome'), rod([1.64, 0.3375, 0.42], [1.76, 0.3375, 0.42], 0.022, 'chrome'),
  ...plate(0.18, 0.3375, 0.42, 0.24, 0.06), ...plate(1.69, 0.3375, 0.42, 0.24, 0.06),
  box(0.355, 0.3, 0.07, 0.075, 0.075, 2.0, FRAME), box(1.57, 0.3, 0.07, 0.075, 0.075, 2.0, FRAME),
  poly([[0.355, 0.376, 0.5], [0.43, 0.376, 0.5], [0.43, 0.376, 1.7], [0.355, 0.376, 1.7]], '$accent', { b: 0.62 }),
  poly([[1.57, 0.376, 0.5], [1.645, 0.376, 0.5], [1.645, 0.376, 1.7], [1.57, 0.376, 1.7]], '$accent', { b: 0.62 }),
  rod([0.39, 0.3375, 2.04], [1.61, 0.3375, 2.04], 0.03, 'chrome'),
  box(0.43, 0.31, 1.76, 1.14, 0.05, 0.18, DARK),
  poly([[0.6, 0.361, 1.8], [1.4, 0.361, 1.8], [1.4, 0.361, 1.9], [0.6, 0.361, 1.9]], '$accent', { b: 0.7 }),
  box(0.36, 0.375, 0.46, 0.065, 0.72, 0.05, DARK), box(1.575, 0.375, 0.46, 0.065, 0.72, 0.05, DARK),
  box(0.36, 0.375, 0.9, 0.065, 0.15, 0.035, DARK), box(1.575, 0.375, 0.9, 0.065, 0.15, 0.035, DARK),
  box(0.36, 0.515, 0.9, 0.065, 0.02, 0.1, DARK), box(1.575, 0.515, 0.9, 0.065, 0.02, 0.1, DARK),
  ...barbell(0.47, 0.965, 0.03, 1.97, { part: 'load' }),
];

// A shelf that tilts toward the front so the dumbbells sit in it.
const shelf = (x, y, z, w, d, c) => prism('x', x, w, [[y, z + 0.05], [y + d, z + 0.012], [y + d, z + 0.045], [y, z + 0.083]], c);
const DB = [0.06, 0.068, 0.076, 0.084, 0.092];
const rackDumbbells = [
  box(0.07, 0.06, 0, 0.07, 0.46, 0.06, FRAME), box(1.86, 0.06, 0, 0.07, 0.46, 0.06, FRAME),
  box(0.07, 0.07, 0.06, 0.07, 0.07, 0.8, FRAME), box(1.86, 0.07, 0.06, 0.07, 0.07, 0.8, FRAME),
  box(0.07, 0.42, 0.06, 0.07, 0.07, 0.36, FRAME), box(1.86, 0.42, 0.06, 0.07, 0.07, 0.36, FRAME),
  shelf(0.1, 0.06, 0.7, 1.8, 0.3, FRAME),
  ...DB.flatMap((r, i) => dumbbell(0.3 + i * 0.35, 0.08, 0.775 + r, r, i % 2 ? 'rubber' : '$accent')),
  shelf(0.1, 0.2, 0.32, 1.8, 0.3, FRAME),
  ...DB.flatMap((r, i) => dumbbell(0.3 + i * 0.35, 0.22, 0.4 + r + 0.022, r + 0.022, 'rubber')),
];

const stationPullup = [
  box(0.06, 0.14, 0, 0.09, 0.78, 0.06, FRAME), box(0.85, 0.14, 0, 0.09, 0.78, 0.06, FRAME),
  box(0.07, 0.2, 0.06, 0.07, 0.07, 1.98, FRAME), box(0.86, 0.2, 0.06, 0.07, 0.07, 1.98, FRAME),
  box(0.14, 0.21, 0.4, 0.72, 0.05, 0.07, FRAME),
  box(0.28, 0.25, 1.02, 0.44, 0.06, 0.4, 'pad'),
  poly([[0.28, 0.311, 1.16], [0.72, 0.311, 1.16], [0.72, 0.311, 1.22], [0.28, 0.311, 1.22]], '$accent', { b: 0.7 }),
  box(0.14, 0.21, 1.2, 0.72, 0.05, 0.07, FRAME),
  rod([0.105, 0.27, 0.95], [0.105, 0.68, 0.95], 0.026, 'chrome'), rod([0.895, 0.27, 0.95], [0.895, 0.68, 0.95], 0.026, 'chrome'),
  rod([0.105, 0.52, 0.95], [0.105, 0.68, 0.95], 0.036, 'rubber', { shadow: false }), rod([0.895, 0.52, 0.95], [0.895, 0.68, 0.95], 0.036, 'rubber', { shadow: false }),
  box(0.07, 0.2, 1.98, 0.07, 0.4, 0.06, FRAME), box(0.86, 0.2, 1.98, 0.07, 0.4, 0.06, FRAME),
  rod([0.02, 0.57, 2.01], [0.98, 0.57, 2.01], 0.03, 'chrome'),
  rod([0.04, 0.57, 2.01], [0.2, 0.57, 2.01], 0.04, 'rubber', { shadow: false }), rod([0.8, 0.57, 2.01], [0.96, 0.57, 2.01], 0.04, 'rubber', { shadow: false }),
];

const stack = (z0, n, o) => Array.from({ length: n }, (_, i) => box(0.34, 0.2, z0 + i * 0.085, 0.32, 0.17, 0.075, i % 2 ? 'iron' : 'charcoal', o));
const machineCable = [
  box(0.08, 0.1, 0, 0.84, 0.42, 0.07, FRAME),
  box(0.1, 0.2, 0.07, 0.08, 0.12, 2.0, FRAME), box(0.82, 0.2, 0.07, 0.08, 0.12, 2.0, FRAME),
  rod([0.42, 0.285, 0.07], [0.42, 0.285, 2.0], 0.013, 'chrome', { shadow: false }), rod([0.58, 0.285, 0.07], [0.58, 0.285, 2.0], 0.013, 'chrome', { shadow: false }),
  ...stack(0.09, 7), ...stack(0.685, 3, { part: 'load' }),
  poly([[0.42, 0.371, 0.78], [0.58, 0.371, 0.78], [0.58, 0.371, 0.9], [0.42, 0.371, 0.9]], '$accent', { b: 0.75, part: 'load' }),
  box(0.1, 0.18, 2.0, 0.8, 0.16, 0.12, FRAME),
  poly([[0.28, 0.341, 2.03], [0.72, 0.341, 2.03], [0.72, 0.341, 2.09], [0.28, 0.341, 2.09]], '$accent', { b: 0.7 }),
  box(0.115, 0.32, 1.78, 0.05, 0.38, 0.06, FRAME), box(0.835, 0.32, 1.78, 0.05, 0.38, 0.06, FRAME),
  cyl(0.105, 0.7, 1.78, 0.075, 0.07, 'iron', { axis: 'x', cap: 'steel', shadow: false }), cyl(0.825, 0.7, 1.78, 0.075, 0.07, 'iron', { axis: 'x', cap: 'steel', shadow: false }),
  rod([0.14, 0.72, 1.72], [0.14, 0.72, 1.3], 0.009, 'black', { pb: 'gripL', shadow: false }),
  rod([0.86, 0.72, 1.72], [0.86, 0.72, 1.3], 0.009, 'black', { pb: 'gripR', shadow: false }),
  rod([0.08, 0.72, 1.27], [0.2, 0.72, 1.27], 0.028, 'rubber', { part: 'gripL', shadow: false }),
  rod([0.8, 0.72, 1.27], [0.92, 0.72, 1.27], 0.028, 'rubber', { part: 'gripR', shadow: false }),
];

// ---- leg press: the sled travels along RAIL; at rest the foot plate sits 0.2 avatar units up the rail from the hips.
const RAIL = [0.813, 0.582], RN = [-0.582, 0.813];
const railAt = (t) => [0.72 + RAIL[0] * t, 0.17 + RAIL[1] * t];
const PLATE_AT = [1.098, 0.55], SLED_AT = [1.149, 0.477];
const platePts = [[-0.26, -0.035], [0.26, -0.035], [0.26, 0.035], [-0.26, 0.035]].map(([n, d]) => [PLATE_AT[0] + RN[0] * n + RAIL[0] * d, PLATE_AT[1] + RN[1] * n + RAIL[1] * d]);
const machineLegpress = [
  box(0.46, 0.3, 0, 0.1, 1.62, 0.07, FRAME), box(1.44, 0.3, 0, 0.1, 1.62, 0.07, FRAME),
  box(0.46, 0.34, 0.02, 1.08, 0.09, 0.06, FRAME), box(0.46, 1.8, 0.02, 1.08, 0.09, 0.06, FRAME),
  box(0.47, 1.8, 0.07, 0.08, 0.08, 0.98, FRAME), box(1.45, 1.8, 0.07, 0.08, 0.08, 0.98, FRAME),
  box(0.47, 1.8, 1.0, 1.06, 0.08, 0.07, FRAME),
  box(0.74, 0.62, 0.07, 0.52, 0.36, 0.17, 'pad'),
  prism('x', 0.74, 0.52, [[0.7, 0.22], [0.8, 0.29], [0.36, 0.92], [0.26, 0.85]], 'pad'),
  poly([[1.261, 0.7, 0.22], [1.261, 0.8, 0.29], [1.261, 0.36, 0.92], [1.261, 0.26, 0.85]], '$accentDeep', { b: 0.62 }),
  rod([0.51, ...railAt(0)], [0.51, ...railAt(1.38)], 0.03, 'chrome'), rod([1.49, ...railAt(0)], [1.49, ...railAt(1.38)], 0.03, 'chrome'),
  rod([0.66, 0.8, 0.22], [0.66, 0.9, 0.36], 0.024, 'rubber', { shadow: false }), rod([1.34, 0.8, 0.22], [1.34, 0.9, 0.36], 0.024, 'rubber', { shadow: false }),
  box(0.47, SLED_AT[0] - 0.06, SLED_AT[1] - 0.05, 1.06, 0.12, 0.1, DARK, { part: 'load' }),
  prism('x', 0.68, 0.64, platePts, 'steel', { part: 'load', cap: 'gunmetal' }),
  ...shift(plate(0.33, 0, 0, 0.24, 0.06, { part: 'load' }), 0, SLED_AT[0], SLED_AT[1] + 0.03),
  ...shift(plate(1.6, 0, 0, 0.24, 0.06, { part: 'load' }), 0, SLED_AT[0], SLED_AT[1] + 0.03),
];

const treadmill = [
  box(0.12, 0.12, 0, 0.76, 1.74, 0.1, 'charcoal'),
  box(0.2, 0.16, 0.1, 0.6, 1.34, 0.035, 'rubber'),
  ...[0.4, 0.7, 1.0, 1.3].map((y) => line([[0.24, y, 0.136], [0.76, y, 0.136]], '#484b54', 0.014)),
  box(0.12, 0.16, 0.1, 0.08, 1.34, 0.05, 'silver'), box(0.8, 0.16, 0.1, 0.08, 1.34, 0.05, 'silver'),
  prism('x', 0.12, 0.76, [[1.48, 0.1], [1.86, 0.1], [1.86, 0.22], [1.62, 0.28], [1.48, 0.2]], 'charcoal'),
  poly([[0.12, 1.861, 0.13], [0.88, 1.861, 0.13], [0.88, 1.861, 0.18], [0.12, 1.861, 0.18]], '$accent', { b: 0.7 }),
  rod([0.18, 1.74, 0.22], [0.18, 1.82, 1.2], 0.034, 'silver'), rod([0.82, 1.74, 0.22], [0.82, 1.82, 1.2], 0.034, 'silver'),
  rod([0.18, 1.8, 1.04], [0.18, 1.3, 0.99], 0.03, 'rubber', { shadow: false }), rod([0.82, 1.8, 1.04], [0.82, 1.3, 0.99], 0.03, 'rubber', { shadow: false }),
  prism('x', 0.14, 0.72, [[1.74, 1.14], [1.88, 1.1], [1.92, 1.36], [1.8, 1.4]], 'charcoal'),
  poly([[0.22, 1.753, 1.17], [0.78, 1.753, 1.17], [0.78, 1.795, 1.37], [0.22, 1.795, 1.37]], 'screen', { b: 1 }),
  poly([[0.28, 1.757, 1.21], [0.52, 1.757, 1.21], [0.52, 1.778, 1.3], [0.28, 1.778, 1.3]], 'led', { b: 1 }),
  line([[0.58, 1.767, 1.25], [0.72, 1.767, 1.25]], '$accent', 0.024, { m: 'glow' }),
];

export const EQUIPMENT_MODELS = {
  'bench-worn': { prims: benchWorn, anchors: { z: 0.33 } },
  'bench-flat': { prims: benchFlat, anchors: { z: 0.38, grip: [[0.7, 0.515, 1.0], [1.3, 0.515, 1.0]] } },
  'rack-squat': { prims: rackSquat, anchors: { z: 0, grip: [[0.68, 0.47, 0.965], [1.32, 0.47, 0.965]] } },
  'rack-dumbbells': { prims: rackDumbbells, anchors: { z: 0 } },
  'station-pullup': { prims: stationPullup, anchors: { z: 0, grip: [[0.26, 0.57, 2.01], [0.74, 0.57, 2.01]] } },
  'machine-cable': { prims: machineCable, anchors: { z: 0, grip: [[0.14, 0.72, 1.27], [0.86, 0.72, 1.27]] } },
  'machine-legpress': { prims: machineLegpress, anchors: { z: 0.24, rail: RAIL } },
  treadmill: { prims: treadmill, anchors: { z: 0.135 } },
};
