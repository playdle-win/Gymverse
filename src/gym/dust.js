// Dust: what neglect looks like. Grime and dust bunnies on the floor, stains and cobwebs on the walls,
// cobwebs on equipment. Everything grows with the dust level (0..1) and is stable between frames.
import { ZK, WALL_H, rng, hash2 } from './iso.js';
import { luma } from './color.js';
import { wallFinish, floorFinish } from './finishes.js';
import { planePainter } from './painter.js';

const P2 = (p) => [p[0] - p[1], (p[0] + p[1]) * 0.5 - p[2] * ZK];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// A cobweb fanned between apex->a and apex->b (room coordinates). Returns line ops.
export function webOps(apex, a, b, colour, grow = 1) {
  const A = lerp3(apex, a, grow), B = lerp3(apex, b, grow), ops = [], spokes = [];
  for (let i = 0; i <= 3; i++) {
    const end = lerp3(A, B, i / 3), pull = i === 0 || i === 3 ? 1 : 0.86;
    spokes.push(lerp3(apex, end, pull));
  }
  const strand = (pts, w) => ops.push({ t: 1, p: pts.flatMap(P2), f: colour, w, al: 0.9 });
  for (const s of spokes) strand([apex, s], 0.016);
  for (const f of [0.34, 0.6, 0.86]) {
    const ring = [];
    for (let i = 0; i < spokes.length; i++) {
      ring.push(lerp3(apex, spokes[i], f));
      if (i + 1 < spokes.length) ring.push(lerp3(apex, lerp3(spokes[i], spokes[i + 1], 0.5), f * 0.9));
    }
    strand(ring, 0.012);
  }
  return ops;
}

export const webColour = (surface) => (luma(surface) > 0.55 ? '#6e6a63' : '#e6e6ec');

function bunny(P, u, v, s, light) {
  const body = light ? '#c9c3b3' : '#aca697', shade = light ? '#8f897a' : '#7c776b';
  const puff = (du, dv, r, c) => { const pts = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = r * (0.8 + P.rnd() * 0.4); pts.push([u + du + Math.cos(a) * rr, v + dv + Math.sin(a) * rr]); } P.fill(pts, c); };
  puff(0.02 * s, 0.02 * s, 0.085 * s, shade);
  puff(0, 0, 0.075 * s, body);
  puff(-0.05 * s, 0.03 * s, 0.045 * s, body);
  P.line([[u + 0.06 * s, v - 0.04 * s], [u + 0.13 * s, v - 0.08 * s]], shade, 0.01);
  P.line([[u - 0.04 * s, v - 0.06 * s], [u - 0.07 * s, v - 0.13 * s]], shade, 0.01);
}

// Adds dust ops for one layer of the room base: 'floor', 'walls' or 'webs'.
export function roomDust(room, sh, ops, dust, layer, seed) {
  if (dust <= 0.05) return;
  const { w, d } = room, rnd = rng(hash2(seed, 99, layer.length));
  const wallBase = sh.flat(wallFinish(room.wall).cap, 0.9), lightFloor = luma(sh.flat(floorFinish(room.floor).edge)) < 0.45;
  if (layer === 'floor') {
    const P = planePainter(sh, ops, (u, v) => [u, v, 0], 1, [0, 0, w, d], hash2(seed, 5));
    for (let i = 0; i < w * d * 0.5; i++) {
      const u = rnd() * w, v = rnd() * d, r = 0.3 + rnd() * 0.5;
      if (rnd() < 0.6) P.blob(u, v, r, '#cfc8b4', dust * 0.34); else P.blob(u, v, r * 0.8, '#5d574b', dust * 0.26);
    }
    const spots = Math.round((w + d) * 0.9);
    for (let i = 0; i < spots; i++) {
      const along = rnd(), near = 0.14 + rnd() * 0.2, wallSide = rnd(), s = 0.7 + rnd() * 0.7, need = 0.22 + rnd() * 0.6;
      const [u, v] = wallSide < 0.4 ? [along * w, near] : wallSide < 0.8 ? [near, along * d] : [0.3 + rnd() * (w - 0.6), 0.3 + rnd() * (d - 0.6)];
      if (dust >= need) bunny(P, Math.min(w - 0.2, Math.max(0.2, u)), Math.min(d - 0.2, Math.max(0.2, v)), s * (0.7 + dust * 0.5), lightFloor);
    }
    return;
  }
  if (layer === 'walls') {
    for (const side of [0, 1]) {
      const n = side ? d : w;
      const P = planePainter(sh, ops, side ? (u, h) => [0, u, h] : (u, h) => [u, 0, h], side ? 0.88 : 1, [0, 0, n, WALL_H], hash2(seed, 17 + side));
      for (let i = 0; i < n * 1.2; i++) P.blob(rnd() * n, rnd() * 0.9, 0.3 + rnd() * 0.4, '#6d6657', dust * 0.3);
      for (let i = 0; i < n * 0.6; i++) P.blob(rnd() * n, 1.2 + rnd() * 1.3, 0.3 + rnd() * 0.3, '#857d6a', dust * 0.2);
    }
    return;
  }
  if (dust < 0.25) return;
  const c = webColour(wallBase), g = 0.45 + dust * 0.55, H = WALL_H - 0.02;
  ops.push(...webOps([0, 0, H], [1.25, 0, H], [0, 0, H - 1.3], c, g), ...webOps([0, 0, H], [0, 1.25, H], [0, 0, H - 1.3], c, g));
  if (dust >= 0.5) {
    ops.push(...webOps([0, 0, 0.02], [0.8, 0, 0.02], [0, 0, 0.75], c, g), ...webOps([0, 0, 0.02], [0, 0.8, 0.02], [0, 0, 0.75], c, g));
    ops.push(...webOps([w, 0, H], [w - 0.9, 0, H], [w, 0, H - 0.8], c, g), ...webOps([0, d, H], [0, d - 0.9, H], [0, d, H - 0.8], c, g));
  }
}

// Cobweb for an item: fans out of the top-left corner of its front face unless the model lists its own
// webs ([[apex, a, b], ...] in model space, already placed by the caller through `place`).
export function itemWebOps(webs, sh, dust) {
  if (dust < 0.3) return [];
  const c = '#e9e8ee', g = 0.5 + dust * 0.5;
  const ops = [];
  for (const [apex, a, b] of webs) {
    const under = webOps(apex, a, b, '#55524c', g), over = webOps(apex, a, b, c, g);
    for (const o of under) { o.w *= 2.2; o.al = 0.35; }
    ops.push(...(sh.style === 'arcade' ? [] : under), ...over);
  }
  return ops;
}
