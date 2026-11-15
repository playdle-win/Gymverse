// The mannequin rigs. A rig turns a pose (joint angles and/or reach targets) into joint
// positions in scene units. The scene is a 146 x 146 box with the floor at GROUND; the figure
// stands about 103 units tall in every exercise.
//
// Side rig (figure faces +x). Pose:
//   root   [x, y]   hip joint
//   spine  deg      torso lean, 0 upright, positive forward (-90 lies supine, head toward -x)
//   head   deg      extra head tilt on top of the spine (default 0)
//   arm    { u, l } segment angles (0 down, 90 forward, 180 up)  or  { to: [x, y] } grip target
//          or  { via: [x, y], to: [x, y] } explicit elbow and grip, for arms that leave the picture
//          plane: the segments are drawn between the points and foreshorten as needed
//   leg    { u, l } segment angles                               or  { to: [x, y] } ankle target
//   armK, legK  [upper, lower]  foreshortening factors for limbs that point out of the picture
//   foot   deg      toe direction, 0 flat on the floor
//   far    { arm, leg, armK, legK, foot }  overrides for the far-side limbs (default: same as near)
//   pin    { hand: [x, y] }  slide the whole figure so the near hand lands there (hangs)
//
// Front rig (seen from the front or the back, symmetric). Pose:
//   root   [x, y]   centre of the pelvis
//   arm    { u, l } angles (0 down, positive away from the body)  or  { to } / { via, to } for the right arm
//   leg    { u, l } angles
//   armK, legK, foot (0 standing .. 1 toes pointed)
import { add, sub, mul, dir, angleOf, reach, rad } from './math.js';

export const VIEW = 146;
export const GROUND = 139;

export const BODY = {
  torso: 29.5, upperArm: 18, forearm: 15.5, grip: 3.4, thigh: 25, shin: 24, ankle: 4,
  neck: [-0.4, 31.8], headUp: 11.9, headFwd: 1.6,
  shoulderX: 12, hipX: 5.6,
};

export const ARM = BODY.upperArm + BODY.forearm + BODY.grip;

// A point given in torso space (front, up) for a hip at `root` and a lean of `spine` degrees.
export function onTorso(root, spine, [front, up]) {
  const c = Math.cos(rad(spine)), s = Math.sin(rad(spine));
  return [root[0] + front * c + up * s, root[1] + front * s - up * c];
}

// A segment drawn from `from` toward `to`, never longer than `max`: [angle, length].
function toward(from, to, max) {
  const v = sub(to, from);
  return [angleOf(v), Math.min(max, Math.hypot(v[0], v[1]))];
}

function chain(from, spec, a, b, bend, k = [1, 1]) {
  if (spec.via) {
    const [u, lenU] = toward(from, spec.via, a);
    const mid = add(from, mul(dir(u), lenU));
    const [l, lenL] = toward(mid, spec.to, b);
    return { u, l, lenU, lenL, mid, end: add(mid, mul(dir(l), lenL)) };
  }
  const lenU = a * k[0], lenL = b * k[1];
  const [u, l] = spec.to ? reach(from, spec.to, lenU, lenL, bend) : [spec.u, spec.l];
  const mid = add(from, mul(dir(u), lenU));
  return { u, l, lenU, lenL, mid, end: add(mid, mul(dir(l), lenL)) };
}

function armOf(shoulder, spec, k, bend) {
  const c = chain(shoulder, spec, BODY.upperArm, BODY.forearm + BODY.grip, bend, k);
  const lenL = c.lenL * (BODY.forearm / (BODY.forearm + BODY.grip));
  return { u: c.u, l: c.l, lenU: c.lenU, lenL, elbow: c.mid, wrist: add(c.mid, mul(dir(c.l), lenL)), hand: c.end };
}

function legOf(hip, spec, k, bend) {
  const c = chain(hip, spec, BODY.thigh, BODY.shin, bend, k);
  return { u: c.u, l: c.l, lenU: c.lenU, lenL: c.lenL, knee: c.mid, ankle: c.end };
}

function sideJoints(pose) {
  const { root, spine = 0, head = 0 } = pose;
  const shoulder = onTorso(root, spine, [0, BODY.torso]);
  const neck = onTorso(root, spine, BODY.neck);
  const limbs = (p) => ({
    arm: armOf(shoulder, p.arm, p.armK, 1),
    leg: legOf(root, p.leg, p.legK, -1),
    foot: p.foot ?? 0,
  });
  return {
    root, spine, shoulder, neck,
    headTilt: spine + head,
    head: onTorso(neck, spine + head, [BODY.headFwd, BODY.headUp]),
    near: limbs(pose),
    far: limbs({ ...pose, ...pose.far }),
  };
}

export function solveSide(pose) {
  const j = sideJoints(pose);
  if (!pose.pin) return j;
  return sideJoints({ ...pose, root: add(pose.root, sub(pose.pin.hand, j.near.arm.hand)) });
}

// Front rig limbs are solved for the right side in a mirrored frame (x = distance from the
// centre line), then flipped for the left.
export function solveFront(pose) {
  const { root } = pose;
  const local = (p) => [p[0] - root[0], p[1]];
  const world = (p, sign) => [root[0] + sign * p[0], p[1]];
  const shoulder = [BODY.shoulderX, root[1] - BODY.torso];
  const hip = [BODY.hipX, root[1]];
  const { via, to } = pose.arm;
  const armSpec = to ? { to: local(to), via: via && local(via) } : pose.arm;
  const arm = armOf(shoulder, armSpec, pose.armK, 1);
  const leg = legOf(hip, pose.leg, pose.legK, -1);
  const side = (sign) => ({
    sign,
    shoulder: world(shoulder, sign),
    hip: world(hip, sign),
    arm: { ...arm, elbow: world(arm.elbow, sign), wrist: world(arm.wrist, sign), hand: world(arm.hand, sign) },
    leg: { ...leg, knee: world(leg.knee, sign), ankle: world(leg.ankle, sign) },
  });
  return {
    root,
    neck: [root[0], root[1] - BODY.neck[1]],
    head: [root[0], root[1] - BODY.neck[1] - BODY.headUp],
    foot: pose.foot ?? 0,
    right: side(1),
    left: side(-1),
  };
}
