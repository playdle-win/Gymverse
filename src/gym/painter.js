// Plane painter: lets finishes and dust draw on a floor tile or wall panel in simple 2D coordinates.
import { ZK, rng } from './iso.js';

const P2 = (p) => [p[0] - p[1], (p[0] + p[1]) * 0.5 - p[2] * ZK];

function clipHalf(pts, axis, limit, keepBelow) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ia = keepBelow ? a[axis] <= limit : a[axis] >= limit, ib = keepBelow ? b[axis] <= limit : b[axis] >= limit;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (limit - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

// map(u, v) gives room coordinates; k shades the whole plane; bounds = [u0, v0, u1, v1] is the extent of the
// surface in this painter's coordinates (blobs are clipped to it); seed makes P.rnd() stable.
export function planePainter(sh, ops, map, k, bounds, seed) {
  const o = P2(map(0, 0)), pu = P2(map(1, 0)), pv = P2(map(0, 1));
  const eu = [pu[0] - o[0], pu[1] - o[1]], ev = [pv[0] - o[0], pv[1] - o[1]];
  const flat = (pts) => { const p = []; for (const [u, v] of pts) p.push(o[0] + eu[0] * u + ev[0] * v, o[1] + eu[1] * u + ev[1] * v); return p; };
  const P = {
    style: sh.style, rnd: rng(seed),
    fill(pts, c, kk = 1, al, glow) { ops.push({ t: 0, p: flat(pts), f: glow ? sh.resolve(c) : sh.flat(c, k * kk), al: al == null ? undefined : al }); },
    rect(u0, v0, u1, v1, c, kk, al, glow) { P.fill([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], c, kk, al, glow); },
    line(pts, c, w, kk = 1, al) { ops.push({ t: 1, p: flat(pts), f: sh.flat(c, k * kk), w: w * 1.15, al: al == null ? undefined : al }); },
    dot(u, v, c, size) { P.line([[u, v], [u, v]], c, size * 1.3); },
    blob(u, v, r, c, al) {
      let q = [];
      // toon and pixel stains are hard-edged, so give them an uneven outline
      const wob = sh.style === 'studio' ? 0 : 0.3;
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = r * (1 - wob * P.rnd()); q.push([u + Math.cos(a) * rr, v + Math.sin(a) * rr]); }
      q = clipHalf(clipHalf(clipHalf(clipHalf(q, 0, bounds[0], false), 0, bounds[2], true), 1, bounds[1], false), 1, bounds[3], true);
      if (q.length < 3) return;
      const c0 = flat([[u, v]]);
      ops.push({ t: 2, m: [eu[0], eu[1], ev[0], ev[1], c0[0], c0[1]], r, q: q.map(([a, b]) => [a - u, b - v]), f: sh.flat(c, k), al });
    },
  };
  return P;
}
