// Turns solved joints into drawable parts. A part is one closed shape in its own local frame:
//   { tf, d, tone, patches?: [{ m, d, clip? }], lines?: d }
// tone picks the neutral fill (far | body | near | hair). patches are the muscle regions that sit
// on the part, in the same frame; `clip` marks patches that must be clipped to the torso outline.
// Limb frames run along +y from the proximal joint with +x toward the front of the limb.
import { BODY } from './rig.js';
import { round as f } from './math.js';

export const LOOK = { fat: 1, head: 1 };
// Icons: thicker limbs and a larger head so the pose survives at 40 px. The weight grows with
// the crop so every icon lands on the same apparent stroke.
export const iconLook = (box) => ({ fat: 1.34 * (box / 100), head: 1.16 * (box / 100) });

const SIDE_R = { upperArm: [4.8, 3.9], forearm: [3.8, 3], hand: [3.1, 3.4], thigh: [6.8, 5], shin: [4.8, 3.3], neck: 3.6, head: [7.5, 8.1] };
const FRONT_R = { upperArm: [4.6, 3.8], forearm: [3.7, 2.9], hand: [3, 3.3], thigh: [5.7, 4.5], shin: [4.4, 3.1], neck: 3.4, head: [6.8, 8] };
const HAND_LEN = BODY.grip + 1.5;

function radii(base, { fat, head }) {
  const out = {};
  for (const k in base) out[k] = Array.isArray(base[k]) ? base[k].map((r) => r * fat) : base[k] * fat;
  out.head = base.head.map((r) => r * head);
  return out;
}

const pt = (p) => `${f(p[0])},${f(p[1])}`;

// Tapered capsule from (0,0) to (0,len).
const capsule = (len, [r1, r2]) =>
  `M${f(-r1)},0A${f(r1)},${f(r1)} 0 0 1 ${f(r1)},0L${f(r2)},${f(len)}A${f(r2)},${f(r2)} 0 0 1 ${f(-r2)},${f(len)}Z`;

const ellipse = ([rx, ry]) => `M${f(-rx)},0a${f(rx)},${f(ry)} 0 1 0 ${f(2 * rx)},0a${f(rx)},${f(ry)} 0 1 0 ${f(-2 * rx)},0Z`;

// Smooth closed curve through points (Catmull-Rom as cubic Beziers).
function blob(points) {
  const n = points.length;
  const at = (i) => points[(i + n) % n];
  let d = `M${pt(at(0))}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}

const mirror = (points) => points.map(([x, y]) => [-x, y]);
const both = (points) => blob(points) + blob(mirror(points));
const symmetric = (half) => blob([...half, ...mirror(half).reverse()]);

const roundRect = (x, y, w, h, r) =>
  `M${f(x + r)},${f(y)}h${f(w - 2 * r)}a${r},${r} 0 0 1 ${r},${r}v${f(h - 2 * r)}a${r},${r} 0 0 1 ${-r},${r}h${f(-(w - 2 * r))}a${r},${r} 0 0 1 ${-r},${-r}v${f(-(h - 2 * r))}a${r},${r} 0 0 1 ${r},${-r}Z`;

// A muscle belly hugging one edge of a capsule limb between fractions y0..y1 of its length.
// side +1 front edge, -1 back edge; depth is how far it reaches across (0.5 = to the centre line).
function belly(len, [r1, r2], side, y0, y1, depth) {
  const r = (y) => r1 + (r2 - r1) * (y / len);
  const a = y0 * len, b = y1 * len, h = b - a;
  const inner = (y) => side * r(y) * (1 - (2 * depth) / 0.75);
  return `M${f(side * r(a))},${f(a)}L${f(side * r(b))},${f(b)}C${f(inner(b))},${f(b - h * 0.1)} ${f(inner(a))},${f(a + h * 0.28)} ${f(side * r(a))},${f(a)}Z`;
}

// A muscle belly centred on the limb (front and back views). width is a fraction of the radius.
function lens(len, [r1, r2], y0, y1, width) {
  const a = y0 * len, b = y1 * len, h = b - a;
  const w = ((r1 + r2) / 2) * width / 0.75;
  return `M0,${f(a)}C${f(w)},${f(a + h * 0.12)} ${f(w * 0.9)},${f(b - h * 0.3)} 0,${f(b)}C${f(-w * 0.9)},${f(b - h * 0.3)} ${f(-w)},${f(a + h * 0.12)} 0,${f(a)}Z`;
}

// Deltoid: a cap over the top of the upper arm. `lift` (0..1) flattens the dome as the arm rises,
// so the muscle stays on the shoulder instead of swinging into the armpit.
function cap([r], drop, lift) {
  const top = -r * (1 - lift), x = Math.sqrt(r * r - top * top);
  return `M${f(-x)},${f(top)}L${f(x)},${f(top)}A${f(r)},${f(r)} 0 0 1 ${f(r)},0L${f(r * 0.97)},${f(drop * 0.45)}`
    + `Q0,${f(drop * 1.25)} ${f(-r * 0.97)},${f(drop * 0.45)}L${f(-r)},0A${f(r)},${f(r)} 0 0 1 ${f(-x)},${f(top)}Z`;
}
const liftOf = (raise) => Math.min(1, Math.max(0, (Math.abs(raise) - 35) / 75));

const seg = (from, angle, d, tone, patches) => ({ tf: `translate(${pt(from)}) rotate(${f(-angle)})`, d, tone, patches });

// ---------------------------------------------------------------------------------- side view

const SIDE_TORSO = [
  [1.8, -34.8], [6.6, -32], [9.6, -26.5], [9.9, -20.5], [8.2, -13.5], [6.9, -7], [6.7, 0], [5, 5.2], [-0.5, 7],
  [-6, 5.6], [-8.4, 1], [-8, -5], [-6.7, -11], [-7.2, -18], [-8.5, -25], [-7, -31.8], [-2.6, -34.8],
];
const SIDE_PATCHES = [
  { m: 'chest', d: blob([[0.2, -36], [13, -36], [13, -17], [5, -16.6], [1.6, -19.6], [0.2, -27]]) },
  { m: 'core', d: blob([[2.4, -15.2], [13, -15.6], [13, 4.6], [4.4, 4.2], [2.2, -5]]) },
  { m: 'back', d: blob([[-1.8, -37], [-13, -37], [-13, -9.8], [-4.2, -9.4], [-2.6, -15], [-1.8, -27]]) },
  { m: 'glutes', d: blob([[-0.6, -5.4], [-13, -8], [-13, 10], [0.6, 10], [1.6, 2]]) },
].map((p) => ({ ...p, clip: true }));

const SIDE_FOOT = [[-3.4, -2.2], [-4.6, 1.2], [-4, 4], [3, 4], [10.6, 4], [12.4, 2.4], [10.2, 0], [6, -1.5], [3.2, -3]];
const sideFoot = (fat) => blob(SIDE_FOOT.map(([x, y]) => [x * (1 + (fat - 1) * 0.5), y < 4 ? y * fat : y]));

// Hair: the part of the head ellipse behind a chord from the forehead to the nape.
function sideHair([rx, ry]) {
  const on = (a) => [rx * Math.cos(a), -ry * Math.sin(a)];
  return `M${pt(on(1.05))}A${f(rx)},${f(ry)} 0 0 0 ${pt(on(3.5))}Z`;
}

const scaleX = (points, k) => points.map(([x, y]) => [x * k, y]);

export function sideTorso(look) {
  return blob(scaleX(SIDE_TORSO, 1 + (look.fat - 1) * 0.45));
}

function sideArm(shoulder, arm, spine, R, tone) {
  const upper = [
    { m: 'shoulders', d: cap(R.upperArm, 6.5, liftOf(arm.u + spine)) },
    { m: 'biceps', d: belly(arm.lenU, R.upperArm, 1, 0.26, 0.93, 0.56) },
    { m: 'triceps', d: belly(arm.lenU, R.upperArm, -1, 0.22, 0.92, 0.4) },
  ];
  // The upper arm goes on top so a curled forearm never hides the biceps.
  return [
    seg(arm.elbow, arm.l, capsule(arm.lenL, R.forearm), tone),
    seg(arm.wrist, arm.l, capsule(HAND_LEN, R.hand), tone),
    seg(shoulder, arm.u, capsule(arm.lenU, R.upperArm), tone, upper),
  ];
}

function sideLeg(hip, leg, foot, R, tone, fat) {
  const [r] = R.thigh;
  const thigh = [
    { m: 'glutes', d: `M${f(r * 0.1)},${f(-r)}A${f(r)},${f(r)} 0 0 0 ${f(-r)},0L${f(-r * 0.97)},4.4Q${f(-r * 0.5)},8 ${f(r * 0.1)},2.6Z` },
    { m: 'quads', d: belly(leg.lenU, R.thigh, 1, 0.1, 0.9, 0.56) },
    { m: 'hamstrings', d: belly(leg.lenU, R.thigh, -1, 0.24, 0.9, 0.38) },
  ];
  const shin = [{ m: 'calves', d: belly(leg.lenL, R.shin, -1, 0.05, 0.66, 0.5) }];
  return [
    seg(hip, leg.u, capsule(leg.lenU, R.thigh), tone, thigh),
    seg(leg.knee, leg.l, capsule(leg.lenL, R.shin), tone, shin),
    seg(leg.ankle, foot, sideFoot(fat), tone),
  ];
}

// Returns the figure as depth-ordered groups: far limbs, body (with the near leg), near arm.
// Torso and near leg share a group so they outline as one silhouette.
export function sideParts(j, look = LOOK) {
  const R = radii(SIDE_R, look);
  const torsoTf = `translate(${pt(j.root)}) rotate(${f(j.spine)})`;
  const headTf = `translate(${pt(j.head)}) rotate(${f(j.headTilt)})`;
  return {
    far: [...sideArm(j.shoulder, j.far.arm, j.spine, R, 'far'), ...sideLeg(j.root, j.far.leg, j.far.foot, R, 'far', look.fat)],
    body: [
      { tf: `translate(${pt(j.neck)}) rotate(${f(j.headTilt + 180)})`, d: capsule(BODY.headUp, [R.neck, R.neck]), tone: 'body' },
      { tf: torsoTf, d: sideTorso(look), tone: 'body', patches: SIDE_PATCHES },
      { tf: headTf, d: ellipse(R.head), tone: 'body' },
      { tf: headTf, d: sideHair(R.head), tone: 'hair' },
      ...sideLeg(j.root, j.near.leg, j.near.foot, R, 'body', look.fat),
    ],
    arm: sideArm(j.shoulder, j.near.arm, j.spine, R, 'near'),
  };
}

// --------------------------------------------------------------------------- front / back view

const FRONT_TORSO = [
  [3.2, -35.4], [6.6, -33.3], [11.6, -31.7], [14.3, -28.4], [13.5, -23.6], [11.5, -18.6], [10.3, -13],
  [8.8, -7.5], [9.4, -2.5], [10.7, 1.6], [10.3, 5.4], [5.6, 7.2], [1.2, 7.8],
];

const absRow = (y, h, w) => roundRect(0.55, y, w, h, 1.1) + roundRect(-0.55 - w, y, w, h, 1.1);

const FRONT_PATCHES = [
  { m: 'chest', d: both([[0.7, -30.4], [6, -31.2], [11.8, -29.4], [12.6, -25.2], [10.2, -21.2], [5.2, -19.9], [0.7, -21.6]]) },
  {
    m: 'core',
    d: absRow(-19, 3.7, 4.3) + absRow(-14.7, 3.7, 4.2) + absRow(-10.4, 3.7, 4) + absRow(-6.1, 5.4, 3.7)
      + both([[6.3, -18.4], [9.6, -17.6], [9.3, -12], [8.2, -6.6], [6.4, -4.6], [5.9, -11.5]]),
  },
].map((p) => ({ ...p, clip: true }));

const BACK_PATCHES = [
  {
    m: 'back',
    d: symmetric([[0.4, -37], [4, -34.6], [10.8, -31], [5.2, -27], [0.5, -17.6]])
      + both([[1.2, -15.6], [5.2, -25.6], [13, -26.4], [12.4, -19], [9.6, -10.6], [3, -5.2], [1.2, -8.6]]),
  },
  { m: 'glutes', d: both([[0.6, -2.4], [5.6, -3.6], [11, -0.6], [11.4, 4.6], [6.4, 8.4], [0.6, 6.4]]) },
].map((p) => ({ ...p, clip: true }));

// Foot seen from the front; `point` 0 stands flat, 1 hangs with the toes pointed.
const FRONT_FOOT = (point) => {
  const h = 4.4 + point * 5.6, w = 5 - point * 1.6, in_ = 3.6 - point * 0.8;
  return `M-2.8,-1.8L2.8,-1.8L${f(w)},${f(h - 1.6)}Q${f(w)},${f(h)} ${f(w - 1.6)},${f(h)}L${f(1.6 - in_)},${f(h)}Q${f(-in_)},${f(h)} ${f(-in_)},${f(h - 1.6)}Z`;
};

function frontHair([rx, ry], back) {
  if (back) return ellipse([rx, ry]);
  const y = -ry * 0.3, x = rx * Math.sqrt(1 - 0.09);
  return `M${f(-x)},${f(y)}A${f(rx)},${f(ry)} 0 0 1 ${f(x)},${f(y)}Q0,${f(y - ry * 0.42)} ${f(-x)},${f(y)}Z`;
}

export function frontTorso(look) {
  return symmetric(scaleX(FRONT_TORSO, 1 + (look.fat - 1) * 0.3));
}

function frontArm(s, R, back, tone) {
  const { arm } = s;
  const tf = (from, angle) => `translate(${pt(from)}) scale(${s.sign} 1) rotate(${f(-angle)})`;
  const upper = back
    ? [
      { m: 'shoulders', d: cap(R.upperArm, 6.5, liftOf(arm.u)) },
      { m: 'triceps', d: lens(arm.lenU, R.upperArm, 0.3, 0.92, 0.78) },
      { m: 'biceps', d: belly(arm.lenU, R.upperArm, -1, 0.4, 0.86, 0.17) },
    ]
    : [
      { m: 'shoulders', d: cap(R.upperArm, 6.5, liftOf(arm.u)) },
      { m: 'biceps', d: lens(arm.lenU, R.upperArm, 0.34, 0.92, 0.7) },
      { m: 'triceps', d: belly(arm.lenU, R.upperArm, 1, 0.36, 0.86, 0.17) },
    ];
  return [
    { tf: tf(s.shoulder, arm.u), d: capsule(arm.lenU, R.upperArm), tone, patches: upper },
    { tf: tf(arm.elbow, arm.l), d: capsule(arm.lenL, R.forearm), tone },
    { tf: tf(arm.wrist, arm.l), d: capsule(HAND_LEN, R.hand), tone },
  ];
}

function frontLeg(s, foot, R, back) {
  const { leg } = s;
  const tf = (from, angle) => `translate(${pt(from)}) scale(${s.sign} 1) rotate(${f(-angle)})`;
  const thigh = [back
    ? { m: 'hamstrings', d: lens(leg.lenU, R.thigh, 0.2, 0.92, 0.8) }
    : { m: 'quads', d: lens(leg.lenU, R.thigh, 0.1, 0.92, 0.84) }];
  const shin = back
    ? [{ m: 'calves', d: lens(leg.lenL, R.shin, 0.04, 0.64, 0.86) }]
    : [{ m: 'calves', d: belly(leg.lenL, R.shin, 1, 0.06, 0.6, 0.16) + belly(leg.lenL, R.shin, -1, 0.06, 0.6, 0.16) }];
  return [
    { tf: tf(s.hip, leg.u), d: capsule(leg.lenU, R.thigh), tone: 'body', patches: thigh },
    { tf: tf(leg.knee, leg.l), d: capsule(leg.lenL, R.shin), tone: 'body', patches: shin },
    { tf: tf(leg.ankle, 0), d: FRONT_FOOT(foot), tone: 'body' },
  ];
}

// Returns the figure as groups: body (legs, torso, head) and arms. `back` draws the rear anatomy.
// armTone 'near' lifts the arms off the torso when they cross it; the muscle map keeps one tone.
export function frontParts(j, look = LOOK, back = false, armTone = 'near') {
  const R = radii(FRONT_R, look);
  const at = (p) => `translate(${pt(p)})`;
  return {
    body: [
      ...frontLeg(j.left, j.foot, R, back),
      ...frontLeg(j.right, j.foot, R, back),
      { tf: `${at(j.neck)} rotate(180)`, d: capsule(BODY.headUp, [R.neck, R.neck]), tone: 'body' },
      { tf: at(j.root), d: frontTorso(look), tone: 'body', patches: back ? BACK_PATCHES : FRONT_PATCHES },
      { tf: at(j.head), d: ellipse(R.head), tone: 'body' },
      { tf: at(j.head), d: frontHair(R.head, back), tone: 'hair' },
    ],
    arms: [...frontArm(j.left, R, back, armTone), ...frontArm(j.right, R, back, armTone)],
  };
}
