// The ten movements. Each move is:
//   view     'side' | 'front' | 'back'   which rig draws it
//   seconds  length of one rep
//   strokes  timeline of keyed channels (see timeline.js); phase 0 is the start position and
//            phase 0.5 the opposite end of the rep
//   pose(k)  turns the interpolated channels into a rig pose (see rig.js). Constraints live here:
//            hands that must follow the bar, a bar that must stay over the foot, and so on
//   scene(j, k, bold)  equipment for the solved joints: { shadow: [cx, rx], back, mid, front };
//            bold is 0 for the animation or the icon's line-weight factor
//   armsBehind  optional: draw the near arm behind the body (a hang from the side, so the
//            raised arm does not hide the head)
//   still    phase shown when motion is reduced (mid-rep)
//   icon     { t, box: [x, y, size] }  key pose and crop for the icon
import { cycle } from './timeline.js';
import { VIEW, GROUND, BODY, ARM, onTorso } from './rig.js';
import { add, mul, dir, deg, clamp } from './math.js';
import {
  BENCH_TOP, Plate, BarEnd, Barbell, Dumbbell, Bench, Upright, PullUpRig, HangingBar, CableTower, CableRope, LegPress,
} from './equipment.jsx';

const FLOOR = GROUND - BODY.ankle;
const CX = VIEW / 2;

const benchPress = (() => {
  const hip = [CX + 8, BENCH_TOP - 8.3];
  const shoulder = [hip[0] - BODY.torso, hip[1]];
  const from = (dx, dy) => [shoulder[0] + dx, shoulder[1] + dy];
  const top = { elbow: from(0.6, -17.9), bar: from(0.9, -36.7) };
  const bottom = { elbow: from(11, 7.6), bar: from(10.4, -11) };
  return {
    view: 'side',
    seconds: 3.4,
    strokes: cycle(top, bottom, { at: [0.04, 0.45, 0.56, 0.92] }),
    pose: (k) => ({
      root: hip, spine: -90, head: -10,
      arm: { via: k.elbow, to: k.bar },
      leg: { to: [hip[0] + 23, FLOOR] },
      far: { leg: { to: [hip[0] + 16, FLOOR] } },
    }),
    scene: (j, k, bold) => ({
      shadow: [CX, 52],
      back: [
        !bold && <Upright x={shoulder[0] - 8} top={shoulder[1] - 42} hook={shoulder[1] - 27} />,
        <Bench x={hip[0] - 54} w={62} bold={bold} />,
        <Plate at={j.near.arm.hand} bold={bold} />,
      ],
      front: !bold && <BarEnd at={j.near.arm.hand} />,
    }),
    still: 0.26,
    icon: { t: 0.04, box: [25, 53, 94] },
  };
})();

const backSquat = (() => {
  const foot = [CX - 9, FLOOR];
  const barX = foot[0] + 4;
  const rest = [-4.6, 27.4];
  const elbow = [-8, 15.4];
  const top = { hipY: FLOOR - 48, lean: 5 };
  const bottom = { hipY: FLOOR - 19, lean: 44 };
  return {
    view: 'side',
    seconds: 3.6,
    strokes: cycle(top, bottom, { at: [0.04, 0.44, 0.54, 0.9] }),
    // The hip is placed so the bar on the back stays over mid-foot at every depth.
    pose: (k) => {
      const offset = onTorso([0, 0], k.lean, rest);
      const root = [barX - offset[0], k.hipY];
      return {
        root, spine: k.lean, head: -k.lean * 0.6,
        arm: { via: onTorso(root, k.lean, elbow), to: add(root, offset) },
        leg: { to: foot },
      };
    },
    scene: (j, k, bold) => ({
      shadow: [foot[0] + 4, 30],
      back: [
        !bold && <Upright x={foot[0] + 40} top={FLOOR - 88} hook={FLOOR - 72} face={-1} />,
        <Plate at={j.near.arm.hand} bold={bold} />,
      ],
      front: !bold && <BarEnd at={j.near.arm.hand} />,
    }),
    still: 0.25,
    icon: { t: 0.3, box: [22, 59, 88] },
  };
})();

const deadlift = (() => {
  const foot = [CX + 1, FLOOR];
  const barX = foot[0] + 8;
  const at = (dx, up) => [foot[0] + dx, FLOOR - up];
  const floor = { hip: at(-16.5, 31), lean: 60 };
  const knee = { hip: at(-14.5, 43), lean: 58 };
  const lockout = { hip: at(2.5, 48.3), lean: -2 };
  return {
    view: 'side',
    seconds: 3.8,
    strokes: cycle(floor, lockout, { at: [0.08, 0.42, 0.54, 0.92], out: 'drive', back: 'lower', via: [knee], stops: [0, 0.4, 1] }),
    // Arms hang straight and are aimed so the bar travels in a vertical line over the foot.
    pose: (k) => {
      const shoulder = onTorso(k.hip, k.lean, [0, BODY.torso]);
      const hang = deg(Math.asin(clamp((barX - shoulder[0]) / ARM, -1, 1)));
      return {
        root: k.hip, spine: k.lean, head: -k.lean * 0.62,
        arm: { u: hang - 0.6, l: hang + 0.9 },
        leg: { to: foot },
      };
    },
    scene: (j, k, bold) => ({
      shadow: [foot[0] + 2, 32],
      back: <Plate at={j.near.arm.hand} bold={bold} />,
      front: !bold && <BarEnd at={j.near.arm.hand} />,
    }),
    still: 0.25,
    icon: { t: 0.17, box: [26, 44, 102] },
  };
})();

const overheadPress = (() => {
  const root = [CX, FLOOR - 49];
  const gripX = root[0] + 16.5;
  const from = (dx, dy) => [root[0] + BODY.shoulderX + dx, root[1] - BODY.torso + dy];
  // The elbows travel forward of the picture plane, so they are keyed directly: tucked under
  // the bar in the rack, flaring as the bar clears the head, stacked at lockout.
  const rack = { elbow: from(2.6, 15), bar: from(0, -2.2)[1] };
  const face = { elbow: from(6.2, 3.4), bar: from(0, -14)[1] };
  const crown = { elbow: from(8.4, -8), bar: from(0, -25)[1] };
  const lockout = { elbow: from(2.3, -17.8), bar: from(0, -35.8)[1] };
  return {
    view: 'front',
    seconds: 3.2,
    strokes: cycle(rack, lockout, { at: [0.06, 0.4, 0.52, 0.92], out: 'drive', back: 'lower', via: [face, crown], stops: [0, 0.35, 0.68, 1] }),
    pose: (k) => ({
      root,
      arm: { via: k.elbow, to: [gripX, k.bar] },
      leg: { u: 5.5, l: -1.5 },
    }),
    scene: (j, k, bold) => ({
      shadow: [CX, 30],
      mid: <Barbell at={[root[0], k.bar]} bold={bold} />,
    }),
    still: 0.24,
    icon: { t: 0.34, box: [7, 6, 132] },
  };
})();

const pullUp = (() => {
  const bar = [CX, 18];
  const grip = 24;
  const hang = { y: bar[1] + 64.2, sway: 3 };
  const top = { y: bar[1] + 37.4, sway: 6 };
  return {
    view: 'back',
    seconds: 3.4,
    strokes: cycle(hang, top, { at: [0.06, 0.4, 0.52, 0.92], out: 'drive', back: 'lower' }),
    pose: (k) => ({
      root: [bar[0], k.y],
      arm: { to: [bar[0] + grip, bar[1]] },
      leg: { u: k.sway, l: 1 }, legK: [1, 0.62],
      foot: 1,
    }),
    scene: (j, k, bold) => ({
      shadow: [CX, 24],
      back: <PullUpRig x={bar[0]} half={52} y={bar[1]} bold={bold} />,
    }),
    still: 0.24,
    icon: { t: 0.5, box: [19, 1, 108] },
  };
})();

const dumbbellRow = (() => {
  const hip = [CX - 15, FLOOR - 48];
  const hang = { u: 3, l: 6, lean: 78 };
  const pulled = { u: -98, l: -4, lean: 75 };
  return {
    view: 'side',
    seconds: 3,
    strokes: cycle(hang, pulled, { at: [0.06, 0.38, 0.5, 0.92], out: 'drive', back: 'lower' }),
    pose: (k) => ({
      root: hip, spine: k.lean, head: -k.lean * 0.55,
      arm: { u: k.u, l: k.l },
      leg: { to: [hip[0] - 6, FLOOR] },
      far: { arm: { to: [hip[0] + 42, BENCH_TOP - 2.6] }, leg: { u: 27.4, l: -86 }, foot: 180 },
    }),
    scene: (j, k, bold) => ({
      shadow: [CX, 46],
      back: <Bench x={hip[0] - 22} w={74} bold={bold} />,
      mid: <Dumbbell at={j.near.arm.hand} angle={j.near.arm.l} bold={bold} />,
    }),
    still: 0.22,
    icon: { t: 0.5, box: [26, 55, 94] },
  };
})();

const dumbbellCurl = (() => {
  const hip = [CX, FLOOR - 48.85];
  const down = { u: 1, l: 7 };
  const up = { u: 14, l: 142 };
  return {
    view: 'side',
    seconds: 3,
    strokes: cycle(down, up, { at: [0.06, 0.4, 0.5, 0.92], out: 'drive', back: 'lower' }),
    pose: (k) => ({
      root: hip, spine: 1, head: 0,
      arm: { u: k.u, l: k.l },
      leg: { to: [hip[0] - 1, FLOOR] },
    }),
    scene: (j, k, bold) => ({
      shadow: [CX + 1, 26],
      mid: <Dumbbell at={j.near.arm.hand} angle={j.near.arm.l} bold={bold} />,
    }),
    still: 0.24,
    icon: { t: 0.3, box: [20, 32, 116] },
  };
})();

const cablePushdown = (() => {
  const hip = [38, FLOOR - 48];
  const pulley = [hip[0] + 36, 23];
  const high = { u: 5, l: 128, lean: 11 };
  const low = { u: 9, l: 15, lean: 13 };
  const slack = (hand) => Math.hypot(hand[0] - pulley[0], hand[1] - pulley[1]);
  return {
    view: 'side',
    seconds: 2.8,
    strokes: cycle(high, low, { at: [0.06, 0.38, 0.5, 0.92], out: 'drive', back: 'lower' }),
    pose: (k) => ({
      root: hip, spine: k.lean, head: -k.lean * 0.5,
      arm: { u: k.u, l: k.l },
      leg: { to: [hip[0] + 2.5, FLOOR] },
    }),
    // The stack is geared 2:1, so it rises half as far as the rope travels.
    scene: (j, k, bold) => ({
      shadow: [hip[0] + 3, 26],
      back: <CableTower x={hip[0] + 56} pulley={pulley} lift={(slack(j.near.arm.hand) - 50) / 2} bold={bold} />,
      mid: <CableRope from={[pulley[0] - 3, pulley[1] + 1.4]} hand={j.near.arm.hand} bold={bold} />,
    }),
    still: 0.22,
    icon: { t: 0.25, box: [8, 9, 130] },
  };
})();

const legPress = (() => {
  const hip = [50, GROUND - 25];
  const recline = -50;
  const rail = dir(135);
  const out = { reach: 48 };
  const deep = { reach: 29.5 };
  return {
    view: 'side',
    seconds: 3.4,
    strokes: cycle(out, deep, { at: [0.04, 0.44, 0.54, 0.92] }),
    pose: (k) => ({
      root: hip, spine: recline, head: 12,
      arm: { to: [hip[0] + 5, hip[1] + 3.5] },
      leg: { to: add(hip, mul(rail, k.reach)) },
      foot: 135,
    }),
    scene: (j, k, bold) => ({
      shadow: [CX + 6, 60],
      back: <LegPress hip={hip} recline={recline} travel={k.reach} bold={bold} />,
    }),
    still: 0.25,
    icon: { t: 0.3, box: [6, 42, 106] },
  };
})();

const hangingLegRaise = (() => {
  const bar = [60, 8];
  const hang = { swing: 0, u: 5, l: 0, foot: -48 };
  const raised = { swing: 9, u: 93, l: 87, foot: -12 };
  return {
    view: 'side',
    seconds: 3.4,
    strokes: cycle(hang, raised, { at: [0.06, 0.42, 0.54, 0.92], out: 'drive', back: 'lower' }),
    // The body swings as one piece about the hands; the hips drift back as the legs come up.
    pose: (k) => ({
      root: bar, spine: k.swing, head: 6,
      arm: { u: 180 - k.swing * 1.5, l: 181.5 - k.swing * 1.5 },
      leg: { u: k.u, l: k.l },
      foot: k.foot,
      pin: { hand: bar },
    }),
    scene: (j, k, bold) => ({
      shadow: [bar[0] + 4, 28],
      back: <HangingBar at={bar} post={bar[0] - 36} bold={bold} />,
    }),
    armsBehind: true,
    still: 0.26,
    icon: { t: 0.5, box: [20, 0, 96] },
  };
})();

export const MOVES = {
  'bench-press': benchPress,
  'back-squat': backSquat,
  'deadlift': deadlift,
  'overhead-press': overheadPress,
  'pull-up': pullUp,
  'dumbbell-row': dumbbellRow,
  'dumbbell-curl': dumbbellCurl,
  'cable-pushdown': cablePushdown,
  'leg-press': legPress,
  'hanging-leg-raise': hangingLegRaise,
};
