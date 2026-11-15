// Colour maths for the gym renderer. Colours are '#rrggbb' strings; everything is cached because the
// shaders call these for every face.
const parsed = new Map();

export function rgb(c) {
  let v = parsed.get(c);
  if (v) return v;
  let h = c.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  parsed.set(c, v);
  return v;
}

const h2 = (n) => (n < 16 ? '0' : '') + n.toString(16);
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
export const hex = (r, g, b) => '#' + h2(clamp255(r)) + h2(clamp255(g)) + h2(clamp255(b));

export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export const luma = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

export const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };

function toHsl(c) {
  const [R, G, B] = rgb(c), r = R / 255, g = G / 255, b = B / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

const toneCache = new Map();
// tone(c, f): f < 1 darkens, f > 1 lightens. `shift` (0..1) pushes shadows toward blue-violet and
// highlights toward warm, the classic hue shift that keeps flat fills from looking muddy.
export function tone(c, f, shift = 0.5, sat = 1) {
  const key = c + '|' + ((f * 200) | 0) + '|' + ((shift * 10) | 0) + '|' + ((sat * 20) | 0);
  let out = toneCache.get(key);
  if (out) return out;
  let [h, s, l] = toHsl(c);
  s = Math.min(1, s * sat);
  if (f < 1) {
    const d = 1 - f;
    l *= f;
    s = Math.min(1, s * (1 + d * 0.12 * shift));
    if (s > 0.04) h += shortest(h, 250) * d * 0.28 * shift;
  } else {
    const d = Math.min(1, f - 1);
    l += (1 - l) * d;
    if (s > 0.04) h += shortest(h, 55) * d * 0.5 * shift;
  }
  out = fromHsl(((h % 360) + 360) % 360, s, Math.max(0, Math.min(1, l)));
  toneCache.set(key, out);
  return out;
}

function shortest(from, to) {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function desat(c, t) {
  if (!t) return c;
  const g = luma(c) * 255;
  const [r, gg, b] = rgb(c);
  return hex(r + (g - r) * t, gg + (g - gg) * t, b + (g - b) * t);
}

let probe = null;
// Any CSS colour (rgb(), oklch(), named) -> '#rrggbb', by painting one pixel.
export function cssToHex(value, fallback = '#888888') {
  if (!value) return fallback;
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (typeof document === 'undefined') return fallback;
  if (!probe) { const c = document.createElement('canvas'); c.width = c.height = 1; probe = c.getContext('2d', { willReadFrequently: true }); }
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = v;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return hex(d[0], d[1], d[2]);
}
