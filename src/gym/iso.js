// Isometric projection shared by every part of the gym renderer.
// Room space: x runs along the back-right wall, y along the back-left wall, z is up, origin at the back corner.
// Screen space is in "units": one unit is half a tile width, so a floor tile is a 2 x 1 diamond.
export const ZK = 1.225;            // screen units per unit of height (true 2:1 dimetric)
export const RK = 1.4142;           // screen units per unit of radius for spheres and capsules
export const WALL_H = 2.6;          // wall height in tiles
export const WALL_T = 0.16;         // wall thickness
export const SLAB_T = 0.22;         // visible floor slab thickness

export const sx = (x, y) => x - y;
export const sy = (x, y, z) => (x + y) * 0.5 - z * ZK;

// Screen unit point -> floor position (z = 0).
export const floorAt = (ux, uy) => [uy + ux * 0.5, uy - ux * 0.5];

// Facing vectors for rot / face 0..3.
export const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];

export const rotSize = (size, rot) => (rot & 1 ? [size[1], size[0]] : [size[0], size[1]]);

// Rotate a point inside a w x d footprint by rot quarter turns; the result lies in the rotated footprint.
export function rotPoint(px, py, w, d, rot) {
  switch (rot & 3) {
    case 1: return [d - py, px];
    case 2: return [w - px, d - py];
    case 3: return [py, w - px];
    default: return [px, py];
  }
}

export function rotVec(vx, vy, rot) {
  switch (rot & 3) {
    case 1: return [-vy, vx];
    case 2: return [-vx, -vy];
    case 3: return [vy, -vx];
    default: return [vx, vy];
  }
}

export const isWallSpot = (it) => it.x === -1 || it.y === -1;

// Deterministic pseudo random numbers so finishes, dust and behaviour never flicker between frames.
export function rng(seed) {
  let a = (seed | 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash2 = (a, b, s = 0) => (Math.imul(a + 374761393, 668265263) ^ Math.imul(b + 1274126177, 2246822519) ^ Math.imul(s + 31, 3266489917)) | 0;
