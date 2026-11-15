// Small 2D helpers shared by the rigs and the timeline. Angles are in degrees.
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const round = (n) => Math.round(n * 100) / 100;

// Limb direction for a segment angle: 0 points down, 90 forward (+x), 180 up.
export const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
export const angleOf = (v) => deg(Math.atan2(v[0], v[1]));

// Two-bone IK. Returns the segment angles [upper, lower] that take a chain of lengths a and b
// from `from` to `to`. bend +1 folds like an elbow (lower segment swings forward of the upper),
// -1 like a knee. The reach is capped just short of straight so a joint never locks or flips.
export function reach(from, to, a, b, bend) {
  const v = sub(to, from);
  const d = clamp(Math.hypot(v[0], v[1]), Math.abs(a - b) + 0.01, (a + b) * 0.9995);
  const base = angleOf(v);
  const atRoot = deg(Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)));
  const atTip = deg(Math.acos(clamp((b * b + d * d - a * a) / (2 * b * d), -1, 1)));
  return [base - bend * atRoot, base + bend * atTip];
}

// CSS-style cubic-bezier easing, solved with a few Newton steps.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(slope) < 1e-6) break;
      t = clamp(t - ((((ax * t + bx) * t + cx) * t - x) / slope), 0, 1);
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

// Tempo vocabulary. `lower` is an unhurried eccentric, `drive` leaves the hole with intent and
// settles into lockout, `smooth` is a plain ease in and out.
export const EASE = {
  smooth: bezier(0.42, 0, 0.58, 1),
  lower: bezier(0.45, 0, 0.45, 1),
  drive: bezier(0.32, 0, 0.2, 1),
};
