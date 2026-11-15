// The static part of a room: floor, walls, slab, ambient shading, ceiling fixtures. Produces display groups;
// the engine rasterises them once per style / scale / dust level and reuses the bitmap every frame.
import { ZK, WALL_H, WALL_T, SLAB_T, hash2 } from './iso.js';
import { rod, cyl, ball, solids, display } from './kit.js';
import { floorFinish, wallFinish } from './finishes.js';
import { roomDust } from './dust.js';
import { planePainter } from './painter.js';

const P2 = (x, y, z) => [x - y, (x + y) * 0.5 - z * ZK];

const SIDE_K = { studio: 0.87, arcade: 0.84, varsity: 0.8 };
const shadeRgba = (a) => `rgba(24,20,36,${a})`;

function ambient(room, sh, ops) {
  const { w, d } = room;
  if (sh.style === 'studio') {
    const strip = (pts, lin, a) => ops.push({ t: 0, p: pts.flatMap((p) => P2(...p)), f: { lin, a: shadeRgba(a), b: shadeRgba(0) }, al: 1 });
    strip([[0, 0, 0], [w, 0, 0], [w, 0.6, 0], [0, 0.6, 0]], [0, 0, -0.24, 0.48], 0.2);
    strip([[0, 0, 0], [0, d, 0], [0.6, d, 0], [0.6, 0, 0]], [0, 0, 0.24, 0.48], 0.26);
    strip([[0, 0, 0], [w, 0, 0], [w, 0, 0.5], [0, 0, 0.5]], [0, 0, 0.245, -0.49], 0.12);
    strip([[0, 0, 0], [0, d, 0], [0, d, 0.5], [0, 0, 0.5]], [0, 0, -0.245, -0.49], 0.12);
    strip([[0, 0, 0], [0.7, 0, 0], [0.7, 0, WALL_H], [0, 0, WALL_H]], [0, 0, 0.7, 0], 0.14);
    strip([[0, 0, 0], [0, 0.7, 0], [0, 0.7, WALL_H], [0, 0, WALL_H]], [0, 0, -0.7, 0], 0.16);
    return;
  }
  const edge = (a, b, wd) => ops.push({ t: 1, p: [...P2(...a), ...P2(...b)], f: sh.ink, w: wd });
  const wd = sh.style === 'varsity' ? 0.035 : 0.01;
  edge([0, 0, 0], [w, 0, 0], wd); edge([0, 0, 0], [0, d, 0], wd); edge([0, 0, 0], [0, 0, WALL_H], wd);
  edge([0, d, 0], [w, d, 0], wd); edge([w, 0, 0], [w, d, 0], wd);
}

// Display groups for a room. Returns { under, base }: `under` is the soft ground shadow, `base` the room itself.
// floorOnly leaves the walls out (floor swatches).
export function roomGroups(room, sh, dust = 0, floorOnly = false) {
  const { w, d } = room, floor = floorFinish(room.floor), wall = wallFinish(room.wall), ops = [];
  const sideK = SIDE_K[sh.style] || 0.86, seed = hash2(w, d, room.id ? room.id.length : 0);
  const quad = (pts, c, k) => ops.push({ t: 0, p: pts.flatMap((p) => P2(...p)), f: sh.flat(c, k) });

  quad([[0, d, 0], [w, d, 0], [w, d, -SLAB_T], [0, d, -SLAB_T]], floor.edge, 0.86);
  quad([[w, 0, 0], [w, d, 0], [w, d, -SLAB_T], [w, 0, -SLAB_T]], floor.edge, 0.68);
  if (!floorOnly) {
    quad([[-WALL_T, d, WALL_H], [0, d, WALL_H], [0, d, -SLAB_T], [-WALL_T, d, -SLAB_T]], wall.cap, 0.82);
    quad([[w, -WALL_T, WALL_H], [w, 0, WALL_H], [w, 0, -SLAB_T], [w, -WALL_T, -SLAB_T]], wall.cap, 0.6);
  }

  for (let ty = 0; ty < d; ty++) for (let tx = 0; tx < w; tx++) {
    floor.tile(planePainter(sh, ops, (u, v) => [tx + u, ty + v, 0], 1, [-tx, -ty, w - tx, d - ty], hash2(tx, ty, seed)), tx, ty);
  }
  const lightR = Math.min(w, d) * 0.55;
  if (sh.style === 'studio') planePainter(sh, ops, (u, v) => [u, v, 0], 1, [0, 0, w, d], 1).blob(w / 2, d / 2, lightR, '#fff2cf', 0.2);
  roomDust(room, sh, ops, dust, 'floor', seed);
  if (floorOnly) return { under: [], base: [{ ops, ink: 'edge' }] };

  for (let i = 0; i < w; i++) wall.panel(planePainter(sh, ops, (u, h) => [i + u, 0, h], 1, [-i, 0, w - i, WALL_H], hash2(i, 7, seed)), i);
  for (let i = 0; i < d; i++) wall.panel(planePainter(sh, ops, (u, h) => [0, i + u, h], sideK, [-i, 0, d - i, WALL_H], hash2(i, 13, seed)), i + 1);
  roomDust(room, sh, ops, dust, 'walls', seed);
  ambient(room, sh, ops);
  quad([[-WALL_T, -WALL_T, WALL_H], [w, -WALL_T, WALL_H], [w, 0, WALL_H], [0, 0, WALL_H], [0, d, WALL_H], [-WALL_T, d, WALL_H]], wall.cap, 1.04);
  if (sh.style === 'arcade') {
    // the cap is only a pixel or two thick: back it with solid lines so it never breaks up
    const top = (a, b) => ops.push({ t: 1, p: [...P2(...a), ...P2(...b)], f: sh.flat(wall.cap, 1.04), w: 0.12 });
    top([0, -WALL_T / 2, WALL_H], [w, -WALL_T / 2, WALL_H]); top([-WALL_T / 2, 0, WALL_H], [-WALL_T / 2, d, WALL_H]);
  }
  roomDust(room, sh, ops, dust, 'webs', seed);

  const under = [];
  if (sh.style === 'studio') {
    const c = P2(w / 2 + 0.5, d / 2 + 0.5, -SLAB_T);
    under.push({ t: 2, m: [1, 0.5, -1, 0.5, c[0], c[1]], r: (w + d) * 0.42, f: '#0d0b18', al: sh.palette.dark ? 0.5 : 0.2 });
  } else {
    const dz = -SLAB_T - 0.32;
    under.push({ t: 0, p: [[0, 0, dz], [w, 0, dz], [w, d, dz], [0, d, dz]].flatMap((p) => P2(...p)), f: sh.ink, al: sh.style === 'arcade' ? 0.5 : sh.palette.dark ? 0.5 : 0.22 });
  }
  return { under: [{ ops: under, ink: false }], base: [{ ops, ink: 'edge' }] };
}

// Hanging lights that belong to the wall finish; one per 5 x 5 tiles or so. Returns [{ x, y, kind }].
export function fixtureSpots(room) {
  const kind = wallFinish(room.wall).fixture;
  if (!kind) return [];
  const nx = Math.max(1, Math.round(room.w / 5)), ny = Math.max(1, Math.round(room.d / 5)), out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push({ kind, x: (room.w * (i + 0.5)) / nx + 0.45, y: (room.d * (j + 0.5)) / ny - 0.45 });
  return out;
}

const DROP = 2.16;
// The only fixture so far is the bare bulb of the starter walls.
export function fixtureGroups(kind, sh) {
  const prims = [rod([0, 0, WALL_H + 0.6], [0, 0, DROP + 0.2], 0.008, 'black', { ink: false }), cyl(0, 0, DROP + 0.09, 0.045, 0.11, 'iron'), ball(0, 0, DROP, 0.1, 'lamp')];
  const c = P2(0, 0, DROP);
  const halo = { ops: [{ t: 2, m: [1, 0, 0, 1, c[0], c[1]], r: sh.style === 'studio' ? 0.75 : 0.42, f: '#ffe9a6', al: sh.style === 'studio' ? 0.38 : 0.3 }], ink: false };
  return [halo, ...display(solids(prims), sh)];
}
