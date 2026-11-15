// A timeline describes one rep as strokes that cover phase 0..1. Every stroke eases along a
// path of poses and finishes at `end`; a one-pose path is a hold. The loop closes on the first
// pose, so the last stroke must return to it. Poses are plain objects of numbers and number
// arrays (nested objects allowed); every pose on a path has the same shape.
import { EASE } from './math.js';

export const hold = (pose, end) => ({ end, path: [pose] });

export const go = (path, end, ease = 'smooth', stops = path.map((_, i) => i / (path.length - 1))) =>
  ({ end, path, ease, stops });

// The common rep: rest at `a`, travel to `b`, pause, travel back. at = [leave a, reach b, leave b, reach a].
// `via` poses are waypoints the motion flows through without stopping; `stops` places them (0..1).
export function cycle(a, b, { at, out = 'lower', back = 'drive', via = [], stops, viaBack = [...via].reverse(), stopsBack }) {
  return [
    hold(a, at[0]),
    go([a, ...via, b], at[1], out, stops),
    hold(b, at[2]),
    go([b, ...viaBack, a], at[3], back, stopsBack ?? stops?.map((s) => 1 - s).reverse()),
  ];
}

function combine(items, weights) {
  const first = items[0];
  if (typeof first === 'number') return items.reduce((sum, v, i) => sum + v * weights[i], 0);
  if (Array.isArray(first)) return first.map((_, k) => combine(items.map((it) => it[k]), weights));
  if (first && typeof first === 'object') {
    const out = {};
    for (const k in first) out[k] = combine(items.map((it) => it[k]), weights);
    return out;
  }
  return first;
}

// Cubic Hermite through the waypoints (finite-difference tangents), expressed as weights on the
// four neighbouring poses so nested poses blend in one pass.
function along({ path, stops, ease }, x) {
  if (path.length === 1) return path[0];
  const u = EASE[ease](x);
  let i = 0;
  while (i < path.length - 2 && u > stops[i + 1]) i++;
  const h = stops[i + 1] - stops[i];
  const s = (u - stops[i]) / h;
  const h10 = s * s * s - 2 * s * s + s, h11 = s * s * s - s * s;
  const h01 = -2 * s * s * s + 3 * s * s, h00 = 1 - h01;
  const before = i > 0, after = i < path.length - 2;
  const k1 = (h10 * h) / (before ? stops[i + 1] - stops[i - 1] : h);
  const k2 = (h11 * h) / (after ? stops[i + 2] - stops[i] : h);
  const items = [path[i], path[i + 1]];
  const weights = [h00 - (before ? 0 : k1) - k2, h01 + k1 + (after ? 0 : k2)];
  if (before) { items.push(path[i - 1]); weights.push(-k1); }
  if (after) { items.push(path[i + 2]); weights.push(k2); }
  return combine(items, weights);
}

export function sample(strokes, t) {
  let start = 0;
  for (const s of strokes) {
    if (t < s.end) return along(s, (t - start) / (s.end - start));
    start = s.end;
  }
  return strokes[0].path[0];
}
