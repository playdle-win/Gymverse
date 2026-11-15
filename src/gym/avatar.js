// The avatar: a chibi built from the same kit as the equipment. A pose function returns a handful of joint
// targets in the avatar's own frame ([side, forward, up], right-handed, root on the floor under the hips);
// this file fills in the rest of the skeleton and dresses it with the avatar's cosmetics.
import { rod, ball, poly, line, solids, boxOf, depthSort, display, VIEW } from './kit.js';
import { itemById } from './catalog.js';
import { mix } from './color.js';
import { SKIN, HAIR, DEFAULT_AVATAR, COSMETICS, HAIR_SHAPES, BEARD_SHAPES, ACC_SHAPES } from './models-avatar.js';

// Skeleton sizes in avatar units; AVATAR_SCALE turns them into tiles (a chibi about 1.65 tiles tall).
export const AVATAR_SCALE = 1.35;
const K = AVATAR_SCALE;
const D = { hip: 0.385, torso: 0.33, headR: 0.25, shW: 0.2, hipW: 0.085, arm: 0.165, leg: 0.172, ankle: 0.045 };
const TAU = Math.PI * 2;

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mirror = (v) => [-v[0], v[1], v[2]];

// One smooth rep: 0 at the start, 1 at the top, back to 0 after T seconds.
const rep = (t, T) => 0.5 - 0.5 * Math.cos((t / T) * TAU);

const stand = (dz = 0) => ({
  pelvis: [0, 0, D.hip + dz], chest: [0, 0, D.hip + D.torso + dz],
  fl: [-D.hipW, 0, D.ankle + dz], fr: [D.hipW, 0, D.ankle + dz], hl: [-0.225, 0.03, 0.365 + dz], hr: [0.225, 0.03, 0.365 + dz],
});

// ---- poses ---------------------------------------------------------------------------------------------
// (t seconds, c) -> joint targets. c = { z, grip: [left, right] | null, rail: [forward, up] | null } in the avatar frame.
// Optional fields: head, el / er (explicit elbows), elbow / knee (bend hints for the right side, mirrored for the left),
// bar (where the gripped bar is), load (offset of the machine's moving part), props, effort (0..1, drives the face).
export const POSES = {
  idle(t) {
    const b = Math.sin(t * 1.9), p = stand();
    p.chest[2] += 0.006 * b; p.hl[2] += 0.004 * b; p.hr[2] += 0.004 * b;
    return p;
  },
  walk(t) {
    const a = t * 10.5, s = Math.sin(a), c = Math.cos(a), p = stand(0.012 * Math.abs(c));
    p.chest[1] = 0.02;
    p.fl = [-D.hipW, 0.1 * s, D.ankle + 0.05 * Math.max(0, c)]; p.fr = [D.hipW, -0.1 * s, D.ankle + 0.05 * Math.max(0, -c)];
    p.hl = [-0.235, -0.09 * s, 0.41]; p.hr = [0.235, 0.09 * s, 0.41];
    return p;
  },
  sit(t, c) {
    const z = c.z + 0.11, sw = Math.sin(t * 2.2) * 0.02, fu = Math.max(D.ankle, z - 0.16);
    return {
      pelvis: [0, 0, z], chest: [0, 0.015, z + D.torso + Math.sin(t * 1.9) * 0.005],
      fl: [-0.09, 0.2 + sw, fu], fr: [0.09, 0.2 - sw, fu], hl: [-0.13, 0.13, z + 0.05], hr: [0.13, 0.13, z + 0.05], knee: [0, 1, 0.7],
    };
  },
  'bench-press'(t, c) {
    const z = c.z, s = rep(t, 2.4), gr = c.grip ? Math.abs(c.grip[1][0]) : 0.24, hu = z + 0.28 + 0.2 * s;
    return {
      pelvis: [0, 0.12, z + 0.14], chest: [0, -0.21, z + 0.15], head: [0, -0.46, z + 0.21],
      fl: [-0.09, 0.45, z + D.ankle], fr: [0.09, 0.45, z + D.ankle], knee: [0, 0.2, 1],
      hl: [-gr, -0.2, hu], hr: [gr, -0.2, hu], elbow: [1, 0, -0.6],
      bar: c.grip ? [0, -0.2, hu] : null, props: c.grip ? null : 'dumbbells', effort: 1 - s,
    };
  },
  squat(t, c) {
    const s = rep(t, 2.6), pu = D.hip - 0.15 * s, cu = pu + D.torso - 0.03 * s, bar = [0, -0.05, cu];
    return {
      pelvis: [0, -0.1 * s, pu], chest: [0, 0.01 * s, cu],
      fl: [-0.125, 0.02, D.ankle], fr: [0.125, 0.02, D.ankle], knee: [0.4, 1, 0.3],
      hl: [-0.27, -0.03, cu - 0.02], hr: [0.27, -0.03, cu - 0.02], elbow: [0.3, -0.6, -1],
      bar: c.grip ? bar : null, effort: s,
    };
  },
  curl(t) {
    const p = stand(), eu = D.hip + D.torso - 0.045 - 0.16;
    const hand = (side, s) => { const a = 0.2 + 2.1 * s; return [side * 0.225, -0.01 + 0.165 * Math.sin(a), eu - 0.165 * Math.cos(a)]; };
    const sl = rep(t, 2.2), sr = rep(t + 1.1, 2.2);
    p.el = [-0.225, -0.01, eu]; p.er = [0.225, -0.01, eu]; p.hl = hand(-1, sl); p.hr = hand(1, sr);
    p.props = 'dumbbells'; p.effort = Math.max(sl, sr) * 0.8;
    return p;
  },
  press(t) {
    const p = stand(), s = rep(t, 2.4);
    p.hl = [-(0.28 - 0.07 * s), 0.02, 0.74 + 0.3 * s]; p.hr = mirror(p.hl); p.elbow = [1, 0, -0.3];
    p.props = 'dumbbells'; p.effort = 1 - s * 0.5;
    return p;
  },
  'pull-up'(t, c) {
    const g = c.grip || [[-0.2, 0, 1.6], [0.2, 0, 1.6]], s = rep(t, 2.6), gu = g[0][2], gf = g[0][1];
    const chest = [0, gf - 0.03 - 0.03 * s, gu - 0.27 + 0.25 * s], pelvis = [0, chest[1] - 0.03, chest[2] - D.torso];
    return {
      pelvis, chest, hl: g[0], hr: g[1], elbow: [1, -0.2, -0.5],
      fl: [-0.07, pelvis[1] - 0.13, pelvis[2] - 0.2], fr: [0.07, pelvis[1] - 0.13, pelvis[2] - 0.2], knee: [0, 1, -0.3], effort: s,
    };
  },
  cable(t) {
    const s = rep(t, 2.3), hr = lerp([0.31, -0.04, 0.63], [0.05, 0.3, 0.6], s);
    return {
      pelvis: [0, 0, 0.375], chest: [0, 0.06, 0.375 + D.torso - 0.01],
      fl: [-0.09, 0.1, D.ankle], fr: [0.09, -0.1, D.ankle], hl: mirror(hr), hr, elbow: [1, -0.3, -0.3], effort: s,
    };
  },
  run(t, c) {
    const a = (t / 0.5) * TAU, s = Math.sin(a), co = Math.cos(a), z = c.z || 0, pu = D.hip + z + 0.02 * Math.abs(s);
    return {
      pelvis: [0, 0, pu], chest: [0, 0.05, pu + D.torso],
      fl: [-D.hipW, 0.13 * co, z + D.ankle + 0.1 * Math.max(0, -s)], fr: [D.hipW, -0.13 * co, z + D.ankle + 0.1 * Math.max(0, s)],
      hl: [-0.22, 0.06 - 0.12 * co, pu + 0.17], hr: [0.22, 0.06 + 0.12 * co, pu + 0.17], elbow: [0, -1, -0.4], knee: [0, 1, 0.2], effort: 0.35,
    };
  },
  'leg-press'(t, c) {
    const r = c.rail || [0.813, 0.582], n = [-r[1], r[0]], s = rep(t, 2.6), z = c.z + 0.1, reach = 0.2 + 0.15 * s;
    const chest = [0, n[0] * D.torso, z + n[1] * D.torso];
    return {
      pelvis: [0, 0, z], chest, head: [0, chest[1] + n[0] * 0.24, chest[2] + n[1] * 0.24],
      fl: [-0.08, r[0] * reach, z + r[1] * reach], fr: [0.08, r[0] * reach, z + r[1] * reach], knee: [0.3, n[0], n[1]],
      hl: [-0.21, 0.05, z - 0.02], hr: [0.21, 0.05, z - 0.02], load: [0, r[0] * 0.15 * s, r[1] * 0.15 * s], effort: s,
    };
  },
};

export const POSE_IDS = Object.keys(POSES);
// Seconds of one loop per pose; reduced motion freezes each pose at a readable point of its loop.
export const POSE_STILL = { idle: 0, walk: 0.15, sit: 0, 'bench-press': 1.2, squat: 1.0, curl: 0.9, press: 1.0, 'pull-up': 1.3, cable: 1.15, run: 0.12, 'leg-press': 1.3 };

const JOINTS = ['pelvis', 'chest', 'head', 'hl', 'hr', 'fl', 'fr', 'el', 'er', 'kl', 'kr'];

// Two-bone IK: the joint between a and c, bending toward hint. Returns [joint, clampedEnd].
function bend(a, c, len, hint) {
  const ac = sub(c, a), dist = Math.hypot(ac[0], ac[1], ac[2]) || 1e-6, dir = mul(ac, 1 / dist);
  const d = Math.min(dist, len * 2 - 1e-3), h = Math.sqrt(Math.max(0, len * len - (d * d) / 4));
  let side = sub(hint, mul(dir, dot(hint, dir)));
  side = Math.hypot(side[0], side[1], side[2]) < 1e-3 ? [0, 0, 1] : norm(side);
  return [add(add(a, mul(dir, d / 2)), mul(side, h)), add(a, mul(dir, d))];
}

// Complete a pose into a full skeleton (still in the avatar frame).
export function skeleton(p) {
  const spine = norm(sub(p.chest, p.pelvis));
  const j = { pelvis: p.pelvis, chest: p.chest, head: p.head || add(p.chest, mul(spine, 0.25)), fl: p.fl, fr: p.fr };
  const sh = sub(p.chest, mul(spine, 0.045));
  j.sl = add(sh, [-D.shW, 0, 0]); j.sr = add(sh, [D.shW, 0, 0]);
  j.pl = add(p.pelvis, [-D.hipW, 0, 0]); j.pr = add(p.pelvis, [D.hipW, 0, 0]);
  const eh = p.elbow || [0.6, -0.6, -0.5], kh = p.knee || [0, 1, 0.2];
  if (p.el) { j.el = p.el; j.er = p.er; j.hl = p.hl; j.hr = p.hr; } else {
    [j.el, j.hl] = bend(j.sl, p.hl, D.arm, mirror(eh)); [j.er, j.hr] = bend(j.sr, p.hr, D.arm, eh);
  }
  [j.kl, j.fl] = bend(j.pl, p.fl, D.leg, mirror(kh)); [j.kr, j.fr] = bend(j.pr, p.fr, D.leg, kh);
  j.props = p.props; j.effort = p.effort || 0; j.bar = p.bar; j.load = p.load;
  return j;
}

// Blend two skeletons (used when the avatar gets on or off equipment).
export function blendSkeleton(a, b, k) {
  if (k >= 1) return b;
  const out = { ...b };
  for (const key of [...JOINTS, 'sl', 'sr', 'pl', 'pr']) out[key] = lerp(a[key], b[key], k);
  return out;
}

// ---- dressing ------------------------------------------------------------------------------------------
function lookOf(avatar) {
  const a = { ...DEFAULT_AVATAR, ...avatar }, tint = (id, d) => (itemById(id) && itemById(id).tint) || d;
  return {
    skin: SKIN[a.skin] || SKIN.s2, hairC: HAIR[a.hairColor] || HAIR.h2,
    hair: HAIR_SHAPES[COSMETICS[a.hair]], beard: BEARD_SHAPES[COSMETICS[a.beard]], acc: ACC_SHAPES[COSMETICS[a.accessory]],
    accC: tint(a.accessory, '#e7e3d8'), top: COSMETICS[a.top] || 'tank', topC: tint(a.top, '#9a9da3'),
    bottom: COSMETICS[a.bottom] || 'shorts', bottomC: tint(a.bottom, '#2b2d33'), shoes: COSMETICS[a.shoes] || 'low', shoeC: tint(a.shoes, '#ecebe6'),
  };
}

function facePrims(H, look, o) {
  const prims = [], INKY = '#2a2331';
  const onHead = (s, f, u, k = 1.012) => { const d = norm(H.ax(s, f, u)); return add(H.c, mul(d, H.R * k)); };
  for (const side of [-1, 1]) {
    if (dot(norm(H.ax(side * 0.34, 0.86, -0.02)), VIEW) < 0.1) continue;
    const eye = (rs, ru, k) => Array.from({ length: 10 }, (_, i) => onHead(side * 0.34 + Math.cos((i / 10) * TAU) * rs, 0.86, -0.06 + Math.sin((i / 10) * TAU) * ru, k));
    if (o.pixel) prims.push(line([onHead(side * 0.34, 0.86, 0.06), onHead(side * 0.34, 0.86, o.blink ? 0.05 : -0.14)], INKY, 0.03, { m: 'glow' }));
    else {
      prims.push(poly(eye(0.1, o.blink ? 0.02 : 0.165, 1.012), INKY, { m: 'glow' }));
      if (!o.blink) prims.push(poly(Array.from({ length: 6 }, (_, i) => onHead(side * 0.34 + 0.035 + Math.cos(i * 1.05) * 0.035, 0.86, 0.02 + Math.sin(i * 1.05) * 0.045, 1.016)), '#ffffff', { m: 'glow' }));
      prims.push(poly(Array.from({ length: 8 }, (_, i) => onHead(side * 0.6 + Math.cos((i / 8) * TAU) * 0.1, 0.72, -0.34 + Math.sin((i / 8) * TAU) * 0.07)), mix(look.skin, '#f0627a', 0.5), { m: 'glow', al: 0.4 }));
    }
  }
  return prims;
}

function mouthPrims(H, o, effort) {
  if (dot(H.f, VIEW) < 0.05) return [];
  const onHead = (s, f, u, k) => add(H.c, mul(norm(H.ax(s, f, u)), H.R * k)), k = o.beard ? 1.085 : 1.014;
  if (effort > 0.6 && !o.pixel) return [poly(Array.from({ length: 8 }, (_, i) => onHead(Math.cos((i / 8) * TAU) * 0.085, 0.9, -0.42 + Math.sin((i / 8) * TAU) * 0.07, k)), '#6b2d34', { m: 'glow' })];
  const w = o.pixel ? 0.07 : 0.12;
  return [line([onHead(-w, 0.9, -0.36, k), onHead(0, 0.9, -0.42, k), onHead(w, 0.9, -0.36, k)], '#70393a', 0.018, { m: 'glow' })];
}

const entry = (prims) => { const list = solids(prims); return { solids: list, bb: boxOf(list) }; };

// Build the avatar as depth-sortable entries ({ bb, solids }) in room space.
// at = { x, y, z, yaw } (yaw 0 faces +y, quarter turns match catalog `face`); o = { blink, look, pixel }.
export function avatarEntries(avatar, j, at, o = {}) {
  const look = lookOf(avatar), cs = Math.cos(at.yaw), sn = Math.sin(at.yaw), z0 = at.z || 0;
  const V = (l) => [cs * l[0] - sn * l[1], sn * l[0] + cs * l[1], l[2]];
  const W = (l) => [at.x + (cs * l[0] - sn * l[1]) * K, at.y + (sn * l[0] + cs * l[1]) * K, z0 + l[2] * K];
  const limb = (a, b, r, c) => rod(a, b, r * K, c), orb = (p, r, c) => ball(p[0], p[1], p[2], r * K, c);
  const w = {};
  for (const k of [...JOINTS, 'sl', 'sr', 'pl', 'pr']) w[k] = W(j[k]);
  const F = V([0, 1, 0]), R = V([1, 0, 0]), spine = norm(sub(w.chest, w.pelvis)), out = [];

  for (const [hip, knee, foot] of [[w.pl, w.kl, w.fl], [w.pr, w.kr, w.fr]]) {
    const shin = norm(sub(foot, knee));
    let toe = sub(F, mul(shin, dot(F, shin)));
    toe = Math.hypot(toe[0], toe[1], toe[2]) < 0.2 ? [0, 0, 1] : norm(toe);
    out.push(entry([limb(hip, knee, 0.07, look.bottomC)]), entry([limb(knee, foot, 0.058, look.bottom === 'joggers' ? look.bottomC : look.skin)]));
    const shoe = [limb(sub(foot, mul(toe, 0.02 * K)), add(foot, mul(toe, 0.09 * K)), 0.062, look.shoeC)];
    if (look.shoes === 'high') shoe.unshift(limb(foot, sub(foot, mul(shin, 0.07 * K)), 0.066, look.shoeC));
    out.push(entry(shoe));
  }
  out.push(entry([
    limb(sub(w.pelvis, mul(spine, 0.03 * K)), add(w.pelvis, mul(spine, 0.05 * K)), 0.152, look.bottomC),
    limb(add(w.pelvis, mul(spine, 0.07 * K)), sub(w.chest, mul(spine, 0.075 * K)), 0.15, look.topC),
  ]));
  const sleeve = look.top !== 'tank', cuff = look.top === 'hoodie';
  for (const [s, e, h] of [[w.sl, w.el, w.hl], [w.sr, w.er, w.hr]]) {
    out.push(entry([limb(s, e, 0.056, sleeve ? look.topC : look.skin)]), entry([limb(e, h, 0.05, cuff ? look.topC : look.skin)]), entry([orb(h, 0.06, look.skin)]));
    if (j.props === 'dumbbells') out.push(entry([orb(sub(h, mul(R, 0.09 * K)), 0.056, 'rubber')]), entry([limb(sub(h, mul(R, 0.08 * K)), add(h, mul(R, 0.08 * K)), 0.018, 'chrome')]), entry([orb(add(h, mul(R, 0.09 * K)), 0.056, 'rubber')]));
  }
  if (cuff) out.push(entry([orb(add(sub(w.chest, mul(F, 0.13 * K)), mul(spine, 0.02 * K)), 0.12, look.topC)]));

  // head frame: u = crown direction, f = face direction, s = the avatar's right
  const hu = norm(sub(w.head, w.chest));
  let hf = sub(F, mul(hu, dot(F, hu)));
  hf = Math.hypot(hf[0], hf[1], hf[2]) < 0.25 ? norm(sub([0, 0, 1], mul(hu, hu[2]))) : norm(hf);
  if (o.look) { const c = Math.cos(o.look), s = Math.sin(o.look), side = cross(hu, hf); hf = add(mul(hf, c), mul(side, s)); }
  const hs = cross(hf, hu);
  const H = { c: w.head, r: D.headR, R: D.headR * K, k: K, f: hf, u: hu, s: hs, ax: (a, b, c) => [hs[0] * a + hf[0] * b + hu[0] * c, hs[1] * a + hf[1] * b + hu[1] * c, hs[2] * a + hf[2] * b + hu[2] * c] };
  H.at = (a, b, c) => add(H.c, mul(H.ax(a, b, c), K));
  const beard = look.beard ? look.beard(H, look.hairC, look.skin) : null, acc = look.acc ? look.acc(H, look.accC) : null;
  const hair = look.hair ? look.hair(H, look.hairC, look.skin) : null;
  const fo = { ...o, beard: look.beard === BEARD_SHAPES.full };
  const head = [orb(w.head, D.headR, look.skin), ...facePrims(H, look, fo)];
  if (beard) head.push(...beard.caps);
  head.push(...mouthPrims(H, fo, j.effort));
  if (hair && !(acc && acc.hidesHair)) head.push(...hair.caps);
  if (acc) head.push(...acc.caps);
  out.push(entry(head));
  for (const side of [-1, 1]) out.push(entry([orb(H.at(side * 0.245, -0.02, -0.04), 0.052, look.skin)]));
  for (const group of [hair, beard, acc]) if (group) for (const q of group.extra) out.push(entry([q]));
  return out;
}

// Display groups for a set of entries (avatar alone, or avatar + the equipment it is using).
export const entriesDisplay = (entries, sh) => display(depthSort(entries).flatMap((e) => e.solids), sh, true);

// ---- using equipment -----------------------------------------------------------------------------------
// Convert a model's anchors into the avatar frame for a catalog `use` spec. Returns the pose context.
export function useContext(use, anchors = {}) {
  const th = (use.face * Math.PI) / 2, R = [Math.cos(th), Math.sin(th)], F = [-Math.sin(th), Math.cos(th)];
  const root = [use.at[0] + 0.5, use.at[1] + 0.5];
  const local = (p) => [((p[0] - root[0]) * R[0] + (p[1] - root[1]) * R[1]) / K, ((p[0] - root[0]) * F[0] + (p[1] - root[1]) * F[1]) / K, p[2] / K];
  const grip = anchors.grip ? anchors.grip.map(local).sort((a, b) => a[0] - b[0]) : null;
  return { z: (anchors.z || 0) / K, grip, rail: anchors.rail || null, root, R, F };
}

// Offsets (model space) for the model's moving parts while skeleton j uses it.
export function partOffsets(j, c) {
  const model = (v) => [(v[0] * c.R[0] + v[1] * c.F[0]) * K, (v[0] * c.R[1] + v[1] * c.F[1]) * K, v[2] * K], out = {};
  if (j.load) out.load = model(j.load);
  if (c.grip) {
    if (j.bar) out.load = model(sub(j.bar, lerp(c.grip[0], c.grip[1], 0.5)));
    out.gripL = model(sub(j.hl, c.grip[0])); out.gripR = model(sub(j.hr, c.grip[1]));
  }
  return out;
}
