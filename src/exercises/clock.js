// One requestAnimationFrame loop shared by every animation on screen. It only runs while
// something is subscribed. Also holds the debug freeze used by the dev harness and the probe for
// stepped motion.
const frameSubs = new Set();
const freezeSubs = new Set();
let raf = 0;
let last = 0;
let frozen = null;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frameSubs.forEach((fn) => fn(dt));
  raf = frameSubs.size ? requestAnimationFrame(frame) : 0;
}

export function onFrame(fn) {
  frameSubs.add(fn);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  return () => frameSubs.delete(fn);
}

// Pin every animation at phase t (0..1); pass null to release.
export function freeze(t) {
  frozen = t;
  freezeSubs.forEach((fn) => fn(t));
}
export const frozenPhase = () => frozen;
export function onFreeze(fn) {
  freezeSubs.add(fn);
  return () => freezeSubs.delete(fn);
}

// A style may ask for stepped motion (arcade) through --gbx-fps on its scope; 0 means smooth.
export const stepRate = (el) => parseFloat(getComputedStyle(el).getPropertyValue('--gbx-fps')) || 0;
