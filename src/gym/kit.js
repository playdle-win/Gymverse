// The modelling kit. Items and avatars are lists of primitives (plain data); this file turns them into
// solids in room space, orders them back to front, and projects them into a style-neutral display list
// that the two rasterisers (vector and pixel) consume.
import { ZK, RK, rotPoint, rotVec } from './iso.js';

// ---- primitives (model space: tiles; x and y inside the footprint, z up) --------------------------------
export const box = (x, y, z, w, d, h, c, o) => ({ t: 'box', p: [x, y, z], s: [w, d, h], c, ...o });
// Cylinder: p is the centre of the first cap; it extends h along o.axis ('z' default, 'x', 'y'). o.r2 tapers, o.cap recolours the caps.
export const cyl = (x, y, z, r, h, c, o) => ({ t: 'cyl', p: [x, y, z], r, h, c, ...o });
// Prism: a convex profile [[u, z], ...] extruded along `axis` from `at` over `len`. For axis 'x' u is y; for axis 'y' u is x.
export const prism = (axis, at, len, pts, c, o) => ({ t: 'prism', axis, at, len, pts, c, ...o });
// Wedge: a box whose top slopes from height h0 (low side) to h1 along +y (axis 'x') or +x (axis 'y').
export const wedge = (x, y, z, w, d, h0, h1, c, o) => ((o && o.axis) === 'y'
  ? prism('y', y, d, [[x, z], [x + w, z], [x + w, z + h1], [x, z + h0]], c, o)
  : prism('x', x, w, [[y, z], [y + d, z], [y + d, z + h1], [y, z + h0]], c, o));
// Rod: a capsule between two points. Ball: a sphere. Both keep their roundness in every rotation.
export const rod = (a, b, r, c, o) => ({ t: 'rod', a, b, r, c, ...o });
export const ball = (x, y, z, r, c, o) => ({ t: 'ball', p: [x, y, z], r, c, ...o });
// Sphere cap or zone between polar angles a0..a1 (radians) around `axis`; used for hair, hats, domes.
export const cap = (x, y, z, r, axis, a0, a1, c, o) => ({ t: 'cap', p: [x, y, z], r, axis, a0, a1, c, ...o });
// Decals: painted on the solid listed just before them. poly = flat patch, line = stroke of width w (tiles).
export const poly = (pts, c, o) => ({ t: 'poly', pts, c, ...o });
export const line = (pts, c, w, o) => ({ t: 'line', pts, c, w, ...o });

const moved = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
// Translate a list of primitives; handy for repeated parts (plates, uprights, legs).
export function shift(prims, dx, dy, dz = 0) {
  const d = [dx, dy, dz];
  return prims.map((q) => {
    switch (q.t) {
      case 'rod': return { ...q, a: moved(q.a, d), b: moved(q.b, d) };
      case 'poly': case 'line': return { ...q, pts: q.pts.map((p) => moved(p, d)) };
      case 'prism': {
        const along = q.axis === 'x' ? dx : dy, across = q.axis === 'x' ? dy : dx;
        return { ...q, at: q.at + along, pts: q.pts.map(([u, z]) => [u + across, z + dz]) };
      }
      default: return { ...q, p: moved(q.p, d) };
    }
  });
}

// ---- placement transform -------------------------------------------------------------------------------
// offsets: { [part]: [dx, dy, dz] } moves primitives tagged with `part` (model space) while equipment is in use.
export function placement(size, rot = 0, ox = 0, oy = 0, oz = 0, offsets = null) {
  const [w, d] = size;
  return {
    pt(p, part) {
      const off = offsets && part && offsets[part];
      const x = off ? p[0] + off[0] : p[0], y = off ? p[1] + off[1] : p[1], z = off ? p[2] + off[2] : p[2];
      const [rx, ry] = rotPoint(x, y, w, d, rot);
      return [rx + ox, ry + oy, z + oz];
    },
    vec(v) { const [x, y] = rotVec(v[0], v[1], rot); return [x, y, v[2]]; },
  };
}
export const IDENTITY = { pt: (p) => p, vec: (v) => v };

// ---- primitives -> solids ------------------------------------------------------------------------------
const AX = { x: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], y: [[0, 1, 0], [1, 0, 0], [0, 0, 1]], z: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] };

function boxFaces(q) {
  const [x0, y0, z0] = q.p, x1 = x0 + q.s[0], y1 = y0 + q.s[1], z1 = z0 + q.s[2];
  return [
    { pts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [0, 0, 1] },
    { pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], n: [1, 0, 0] },
    { pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], n: [-1, 0, 0] },
    { pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], n: [0, 1, 0] },
    { pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], n: [0, -1, 0] },
  ];
}

function cylFaces(q) {
  const [a, u, w] = AX[q.axis || 'z'];
  const r1 = q.r2 == null ? q.r : q.r2, n = q.r > 0.09 ? 18 : 12;
  const ring = (t, r) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2, c = Math.cos(th) * r, s = Math.sin(th) * r;
      out.push([q.p[0] + a[0] * t + u[0] * c + w[0] * s, q.p[1] + a[1] * t + u[1] * c + w[1] * s, q.p[2] + a[2] * t + u[2] * c + w[2] * s]);
    }
    return out;
  };
  const r0 = ring(0, q.r), rt = ring(q.h, r1), faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, th = ((i + 0.5) / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    faces.push({ pts: [r0[i], r0[j], rt[j], rt[i]], n: [u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s], s: true });
  }
  faces.push({ pts: r0, n: [-a[0], -a[1], -a[2]], c: q.cap }, { pts: rt, n: a, c: q.cap });
  return faces;
}

function prismFaces(q) {
  const P = (u, z, t) => (q.axis === 'x' ? [t, u, z] : [u, t, z]);
  const N = (nu, nz) => (q.axis === 'x' ? [0, nu, nz] : [nu, 0, nz]);
  const ax = q.axis === 'x' ? [1, 0, 0] : [0, 1, 0];
  const t0 = q.at, t1 = q.at + q.len, pts = q.pts, k = pts.length;
  let cu = 0, cz = 0;
  for (const [u, z] of pts) { cu += u / k; cz += z / k; }
  const faces = [
    { pts: pts.map(([u, z]) => P(u, z, t0)), n: [-ax[0], -ax[1], 0], c: q.cap },
    { pts: pts.map(([u, z]) => P(u, z, t1)), n: ax, c: q.cap },
  ];
  for (let i = 0; i < k; i++) {
    const [u0, z0] = pts[i], [u1, z1] = pts[(i + 1) % k];
    let nu = z1 - z0, nz = u0 - u1;
    const len = Math.hypot(nu, nz) || 1;
    nu /= len; nz /= len;
    if (nu * ((u0 + u1) / 2 - cu) + nz * ((z0 + z1) / 2 - cz) < 0) { nu = -nu; nz = -nz; }
    faces.push({ pts: [P(u0, z0, t0), P(u1, z1, t0), P(u1, z1, t1), P(u0, z0, t1)], n: N(nu, nz), s: q.smooth });
  }
  return faces;
}

function perp(a) {
  const u = Math.abs(a[2]) < 0.9 ? [a[1], -a[0], 0] : [1, 0, 0];
  const ul = Math.hypot(u[0], u[1], u[2]);
  const U = [u[0] / ul, u[1] / ul, u[2] / ul];
  return [U, [a[1] * U[2] - a[2] * U[1], a[2] * U[0] - a[0] * U[2], a[0] * U[1] - a[1] * U[0]]];
}

function capFaces(q) {
  const al = Math.hypot(q.axis[0], q.axis[1], q.axis[2]) || 1;
  const a = [q.axis[0] / al, q.axis[1] / al, q.axis[2] / al];
  const [u, w] = perp(a), segs = 16, rings = Math.max(2, Math.ceil((q.a1 - q.a0) / 0.3));
  const dir = (th, ph) => {
    const ct = Math.cos(th), st = Math.sin(th), c = Math.cos(ph) * st, s = Math.sin(ph) * st;
    return [a[0] * ct + u[0] * c + w[0] * s, a[1] * ct + u[1] * c + w[1] * s, a[2] * ct + u[2] * c + w[2] * s];
  };
  const at = (d) => [q.p[0] + d[0] * q.r, q.p[1] + d[1] * q.r, q.p[2] + d[2] * q.r];
  const faces = [];
  for (let i = 0; i < rings; i++) {
    const t0 = q.a0 + ((q.a1 - q.a0) * i) / rings, t1 = q.a0 + ((q.a1 - q.a0) * (i + 1)) / rings;
    for (let j = 0; j < segs; j++) {
      const p0 = (j / segs) * Math.PI * 2, p1 = ((j + 1) / segs) * Math.PI * 2;
      const quad = t0 < 1e-4 ? [dir(t0, p0), dir(t1, p0), dir(t1, p1)] : [dir(t0, p0), dir(t1, p0), dir(t1, p1), dir(t0, p1)];
      faces.push({ pts: quad.map(at), n: dir((t0 + t1) / 2, (p0 + p1) / 2), s: true });
    }
  }
  return faces;
}

const FACES = { box: boxFaces, cyl: cylFaces, prism: prismFaces, cap: capFaces };

function bounds(points, pad = 0) {
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i++) { if (p[i] - pad < bb[i]) bb[i] = p[i] - pad; if (p[i] + pad > bb[i + 3]) bb[i + 3] = p[i] + pad; }
  return bb;
}

// Compile primitives into solids placed by transform T. Decals attach to the solid before them.
export function solids(prims, T = IDENTITY) {
  const out = [];
  for (const q of prims) {
    if (q.t === 'poly' || q.t === 'line') {
      const host = out[out.length - 1];
      if (host) host.decals.push({ ...q, pts: q.pts.map((p) => T.pt(p, q.part || host.part)) });
      continue;
    }
    const base = { c: q.c, m: q.m, part: q.part, ink: q.ink !== false, bias: q.bias || 0, decals: [], shadow: q.shadow !== false, film: q.film !== false };
    if (q.t === 'rod') {
      const a = T.pt(q.a, q.pa || q.part), b = T.pt(q.b, q.pb || q.part);
      out.push({ ...base, k: 'rod', a, b, r: q.r, bb: bounds([a, b], q.r) });
    } else if (q.t === 'ball') {
      const p = T.pt(q.p, q.part);
      out.push({ ...base, k: 'ball', p, r: q.r, bb: bounds([p], q.r) });
    } else {
      const faces = FACES[q.t](q).map((f) => ({ pts: f.pts.map((p) => T.pt(p, q.part)), n: T.vec(f.n), s: f.s, c: f.c }));
      const all = [];
      for (const f of faces) for (const p of f.pts) all.push(p);
      out.push({ ...base, k: 'mesh', faces, bb: bounds(all) });
    }
  }
  return out;
}

// ---- ordering ------------------------------------------------------------------------------------------
export const VIEW = [0.6124, 0.6124, 0.5];
const depthOf = (bb) => (bb[0] + bb[3]) * 0.5 * VIEW[0] + (bb[1] + bb[4]) * 0.5 * VIEW[1] + (bb[2] + bb[5]) * 0.5 * VIEW[2];
const EPS = 1e-4;
// a cannot hide b when it lies entirely on the far side of b along some axis.
const behind = (a, b) => a[3] <= b[0] + EPS || a[4] <= b[1] + EPS || a[5] <= b[2] + EPS;

// Back to front order for things with a `bb` box ([x0,y0,z0,x1,y1,z1]) and optional `bias`.
// Separated boxes are ordered exactly; interpenetrating ones fall back to centre depth.
export function depthSort(items) {
  const n = items.length;
  if (n < 2) return items;
  const key = new Float64Array(n), indeg = new Int32Array(n), next = [];
  for (let i = 0; i < n; i++) { key[i] = depthOf(items[i].bb) + (items[i].bias || 0); next.push([]); }
  for (let i = 0; i < n; i++) {
    const a = items[i].bb;
    for (let j = i + 1; j < n; j++) {
      const b = items[j].bb, ab = behind(a, b), ba = behind(b, a);
      if (ab && ba) continue;
      const first = ab ? i : ba ? j : key[i] <= key[j] ? i : j, second = first === i ? j : i;
      next[first].push(second); indeg[second]++;
    }
  }
  const done = new Uint8Array(n), out = [];
  for (let k = 0; k < n; k++) {
    let pick = -1, loose = -1;
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      if (indeg[i] === 0 && (pick < 0 || key[i] < key[pick])) pick = i;
      if (loose < 0 || key[i] < key[loose]) loose = i;
    }
    if (pick < 0) pick = loose;
    done[pick] = 1; out.push(items[pick]);
    for (const j of next[pick]) indeg[j]--;
  }
  return out;
}

// ---- solids -> display list ----------------------------------------------------------------------------
// One light for everything: tops are brightest, faces toward +y (screen left) are mid, toward +x are in shade.
export const bright = (n) => Math.max(0.2, Math.min(1.05, n[0] * 0.36 + n[1] * 0.62 + n[2]));

const P2 = (p) => [p[0] - p[1], (p[0] + p[1]) * 0.5 - p[2] * ZK];

function flat(points) {
  const out = new Array(points.length * 2);
  for (let i = 0; i < points.length; i++) { const p = P2(points[i]); out[i * 2] = p[0]; out[i * 2 + 1] = p[1]; }
  return out;
}

function normalOf(pts) {
  const [a, b, c] = pts;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  n = [n[0] / l, n[1] / l, n[2] / l];
  return n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] < 0 ? [-n[0], -n[1], -n[2]] : n;
}

function arc(out, cx, cy, r, a0, a1, steps) {
  for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
}

function rodOps(s, sh, ops) {
  const a = P2(s.a), b = P2(s.b), hw = Math.max(s.r * RK, 0.012);
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
  const ang = Math.atan2(dy, dx), p = [];
  arc(p, b[0], b[1], hw, ang - Math.PI / 2, ang + Math.PI / 2, 5);
  arc(p, a[0], a[1], hw, ang + Math.PI / 2, ang + Math.PI * 1.5, 5);
  // the shaded side is the one whose normal points down-right on screen
  let nx = -dy, ny = dx;
  if (nx + ny < 0) { nx = -nx; ny = -ny; }
  ops.push({ t: 0, p, f: sh.round(s.c, s.m, [a[0] - nx * hw, a[1] - ny * hw, a[0] + nx * hw, a[1] + ny * hw]) });
  if (sh.cel) {
    const q = [];
    const k = 0.15;
    q.push(a[0] + nx * hw * k, a[1] + ny * hw * k, b[0] + nx * hw * k, b[1] + ny * hw * k, b[0] + nx * hw, b[1] + ny * hw, a[0] + nx * hw, a[1] + ny * hw);
    if (len > hw * 0.6) ops.push({ t: 0, p: q, f: sh.soft(s.c, s.m), d: true });
  }
}

const CR0 = (-57 * Math.PI) / 180, CR1 = (147 * Math.PI) / 180;
function ballOps(s, sh, ops) {
  const c = P2(s.p), R = s.r * RK, p = [];
  arc(p, c[0], c[1], R, 0, Math.PI * 2 * (1 - 1 / 22), 21);
  ops.push({ t: 0, p, f: sh.round(s.c, s.m, [c[0] - R * 0.7, c[1] - R * 0.7, c[0] + R * 0.7, c[1] + R * 0.7], [c[0], c[1], R]) });
  if (sh.cel && R > 0.09) {
    const q = [], k = 0.3 * R;
    arc(q, c[0], c[1], R, CR0, CR1, 10);
    arc(q, c[0] - k, c[1] - k, R, CR1, CR0, 10);
    ops.push({ t: 0, p: q, f: sh.soft(s.c, s.m), d: true });
  }
}

function decalOps(s, sh, ops) {
  for (const d of s.decals) {
    if (d.t === 'line') { ops.push({ t: 1, p: flat(d.pts), f: sh.face(d.c, d.m, d.b == null ? 0.8 : d.b), w: (d.w || 0.02) * RK, al: d.al }); continue; }
    const b = d.b == null ? bright(normalOf(d.pts)) : d.b;
    ops.push({ t: 0, p: flat(d.pts), f: sh.face(d.c, d.m, b), d: true, al: d.al });
  }
}

// Project solids into groups of paint ops, back to front. `sh` is a shader from shade.js.
// Pass presorted = true when the caller already ordered the list.
export function display(list, sh, presorted = false) {
  const groups = [];
  for (const s of presorted ? list : depthSort(list)) {
    const ops = [];
    if (s.k === 'rod') rodOps(s, sh, ops);
    else if (s.k === 'ball') ballOps(s, sh, ops);
    else {
      for (const f of s.faces) {
        if (f.n[0] * VIEW[0] + f.n[1] * VIEW[1] + f.n[2] * VIEW[2] <= 0.02) continue;
        const p = flat(f.pts);
        let y0 = Infinity, y1 = -Infinity;
        for (let i = 1; i < p.length; i += 2) { if (p[i] < y0) y0 = p[i]; if (p[i] > y1) y1 = p[i]; }
        const b = bright(f.n);
        ops.push({ t: 0, p, f: sh.face(f.c || s.c, s.m, b, s.film && f.n[2] > 0.9, Math.abs(f.n[2]) < 0.5 ? [y0, y1] : null), h: !f.s, b });
      }
    }
    decalOps(s, sh, ops);
    if (ops.length) groups.push({ ops, ink: s.ink });
  }
  return groups;
}

// Screen bounds (units) of a display list: [x0, y0, x1, y1].
export function extent(groups) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of groups) for (const o of g.ops) {
    if (o.t === 2) {
      const r = o.r * Math.max(Math.abs(o.m[0]) + Math.abs(o.m[2]), Math.abs(o.m[1]) + Math.abs(o.m[3]));
      x0 = Math.min(x0, o.m[4] - r); x1 = Math.max(x1, o.m[4] + r); y0 = Math.min(y0, o.m[5] - r); y1 = Math.max(y1, o.m[5] + r);
      continue;
    }
    const p = o.p, pad = o.t === 1 ? o.w : 0;
    for (let i = 0; i < p.length; i += 2) {
      if (p[i] - pad < x0) x0 = p[i] - pad; if (p[i] + pad > x1) x1 = p[i] + pad;
      if (p[i + 1] - pad < y0) y0 = p[i + 1] - pad; if (p[i + 1] + pad > y1) y1 = p[i + 1] + pad;
    }
  }
  return x0 === Infinity ? [0, 0, 0, 0] : [x0, y0, x1, y1];
}

// Union box of a list of solids, used for scene ordering and shadows.
export function boxOf(list) {
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const s of list) for (let i = 0; i < 3; i++) { if (s.bb[i] < bb[i]) bb[i] = s.bb[i]; if (s.bb[i + 3] > bb[i + 3]) bb[i + 3] = s.bb[i + 3]; }
  return bb;
}
