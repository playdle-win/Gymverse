// Pixel rasteriser (arcade): fills a display list into an integer pixel buffer with no antialiasing,
// then adds the dark outline and the darker separation lines between parts. Also used for hit masks.
import { rgb } from './color.js';
import { extent } from './kit.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const packed = new Map();
function pack(c, a = 255) {
  const key = a === 255 ? c : c + a;
  let v = packed.get(key);
  if (v === undefined) { const [r, g, b] = rgb(c); v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; packed.set(key, v); }
  return v;
}
const colourOf = (f) => (typeof f === 'string' ? f : f.a);

function scale(v, kr, kg, kb) {
  const r = Math.min(255, (v & 255) * kr) | 0, g = Math.min(255, ((v >> 8) & 255) * kg) | 0, b = Math.min(255, ((v >> 16) & 255) * kb) | 0;
  return ((v & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
}

function lerpPacked(a, b, t) {
  const ch = (s) => { const x = (a >> s) & 255, y = (b >> s) & 255; return (x + (y - x) * t) & 255; };
  return ((a & 0xff000000) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
}

class PixelBuf {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.col = new Uint32Array(w * h);
    this.gid = new Uint16Array(w * h);
  }

  put(x, y, v, gid, dither, mul, blend) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (dither != null && BAYER[((y & 3) << 2) | (x & 3)] >= dither * 16) return;
    const i = y * this.w + x;
    if (mul != null) { if (this.gid[i]) this.col[i] = scale(this.col[i], mul, mul, mul); return; }
    if (blend != null) { if (this.gid[i]) this.col[i] = lerpPacked(this.col[i], v, blend); return; }
    this.col[i] = v; this.gid[i] = gid;
  }

  poly(xs, ys, v, gid, dither, mul, blend) {
    const n = xs.length;
    let y0 = Infinity, y1 = -Infinity, hits = 0;
    for (let i = 0; i < n; i++) { if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i]; }
    const cross = [];
    for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y <= Math.min(this.h - 1, Math.floor(y1 - 0.5)); y++) {
      const yc = y + 0.5;
      cross.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        if ((ys[i] <= yc) !== (ys[j] <= yc)) cross.push(xs[i] + ((yc - ys[i]) * (xs[j] - xs[i])) / (ys[j] - ys[i]));
      }
      cross.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cross.length; k += 2) {
        for (let x = Math.ceil(cross[k] - 0.5), xe = Math.ceil(cross[k + 1] - 0.5); x < xe; x++) { this.put(x, y, v, gid, dither, mul, blend); hits++; }
      }
    }
    return hits;
  }

  line(x0, y0, x1, y1, v, gid, thick, dither) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.put(x0, y0, v, gid, dither);
      if (thick) { if (dx >= dy) this.put(x0, y0 + 1, v, gid, dither); else this.put(x0 + 1, y0, v, gid, dither); }
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // inkOf[gid]: 0 none, 1 outer outline only, 2 outer outline + separation lines.
  outline(inkOf, ink) {
    const { w, h, col, gid } = this, mark = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, g = gid[i];
      if (!g || inkOf[g] < 2) continue;
      if (x + 1 < w) { const g2 = gid[i + 1]; if (g2 && g2 !== g && inkOf[g2] === 2) mark[g < g2 ? i : i + 1] = 1; }
      if (y + 1 < h) { const g2 = gid[i + w]; if (g2 && g2 !== g && inkOf[g2] === 2) mark[g < g2 ? i : i + w] = 1; }
    }
    for (let i = 0; i < mark.length; i++) if (mark[i]) col[i] = scale(col[i], 0.62, 0.62, 0.72);
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (gid[i]) continue;
      if ((x > 0 && inkOf[gid[i - 1]]) || (x + 1 < w && inkOf[gid[i + 1]]) || (y > 0 && inkOf[gid[i - w]]) || (y + 1 < h && inkOf[gid[i + w]])) edge.push(i);
    }
    for (const i of edge) col[i] = ink;
  }
}

function drawOp(buf, o, S, x0, y0, gid, blend) {
  const dither = !blend && o.al != null && o.al < 1 ? o.al : null;
  const v = pack(colourOf(o.f), blend && o.al != null ? Math.round(o.al * 255) : 255);
  if (o.t === 2) {
    // stains and glows: one flat patch blended into what is underneath (dithered only when it floats in the air)
    const xs = [], ys = [], n = o.q ? o.q.length : 16, k = 0.82;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, c = (o.q ? o.q[i][0] : Math.cos(a) * o.r) * k, s = (o.q ? o.q[i][1] : Math.sin(a) * o.r) * k;
      xs.push((o.m[0] * c + o.m[2] * s + o.m[4]) * S - x0); ys.push((o.m[1] * c + o.m[3] * s + o.m[5]) * S - y0);
    }
    if (o.q) buf.poly(xs, ys, v, gid, null, null, Math.min(0.6, o.al * 0.75)); else buf.poly(xs, ys, v, gid, Math.min(1, o.al * 1.3));
    return;
  }
  const p = o.p, n = p.length / 2;
  if (o.t === 1) {
    const thick = o.w * S >= 1.7;
    for (let i = 0; i + 1 < n; i++) buf.line(p[i * 2] * S - x0, p[i * 2 + 1] * S - y0, p[i * 2 + 2] * S - x0, p[i * 2 + 3] * S - y0, v, gid, thick, dither);
    return;
  }
  const xs = new Array(n), ys = new Array(n);
  let ax = 0, bx = 0;
  for (let i = 0; i < n; i++) {
    xs[i] = Math.round(p[i * 2] * S) - x0; ys[i] = Math.round(p[i * 2 + 1] * S) - y0;
    if (xs[i] < xs[ax] || (xs[i] === xs[ax] && ys[i] < ys[ax])) ax = i;
    if (xs[i] > xs[bx] || (xs[i] === xs[bx] && ys[i] > ys[bx])) bx = i;
  }
  const hits = buf.poly(xs, ys, v, gid, dither, o.mul);
  // slivers thinner than a pixel would vanish: keep them as a 1px line
  if (!hits && !o.d && o.mul == null && Math.abs(xs[bx] - xs[ax]) + Math.abs(ys[bx] - ys[ax]) >= 2) buf.line(xs[ax], ys[ax], xs[bx], ys[bx] - (ys[bx] > ys[ax] ? 1 : 0), v, gid, false, dither);
}

// Rasterise groups at S pixels per unit. Returns the pixel buffer placed at integer offset (x, y) from the origin.
// opts: { ink: '#hex' | null, blend: keep real alpha (overlays) instead of dithering, mask: also return an alpha mask }
export function rasterGroups(groups, S, opts = {}) {
  const [ex0, ey0, ex1, ey1] = extent(groups);
  const x0 = Math.floor(ex0 * S) - 2, y0 = Math.floor(ey0 * S) - 2;
  const w = Math.max(1, Math.ceil(ex1 * S) - x0 + 3), h = Math.max(1, Math.ceil(ey1 * S) - y0 + 3);
  const buf = new PixelBuf(w, h), inkOf = new Uint8Array(groups.length + 2);
  groups.forEach((g, gi) => {
    inkOf[gi + 1] = g.ink === true ? 2 : g.ink ? 1 : 0;
    for (const o of g.ops) drawOp(buf, o, S, x0, y0, gi + 1, opts.blend);
  });
  if (opts.ink) buf.outline(inkOf, pack(opts.ink));
  const out = { x: x0, y: y0, w, h };
  if (opts.mask) {
    out.mask = new Uint8Array(w * h);
    for (let i = 0; i < out.mask.length; i++) out.mask[i] = buf.col[i] >>> 24 ? 1 : 0;
  }
  if (typeof document !== 'undefined' && !opts.maskOnly) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const img = new ImageData(new Uint8ClampedArray(buf.col.buffer), w, h);
    canvas.getContext('2d').putImageData(img, 0, 0);
    out.canvas = canvas;
  }
  return out;
}
