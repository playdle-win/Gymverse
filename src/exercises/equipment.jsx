// Gym equipment drawn in the same language as the figure: solid rounded shapes, no gradients.
// Every piece takes `bold`: 0 for the animation, or the icon's line-weight factor, which draws
// a heavier version with fewer details. Colours and outlines come from the classes in styles.js.
import { GROUND, VIEW } from './rig.js';
import { add, sub, mul, dist, round as f } from './math.js';

const at = (p) => `translate(${f(p[0])} ${f(p[1])})`;

export const BENCH_TOP = GROUND - 25;
const PLATE_R = 13;

export function Floor({ shadow }) {
  return (
    <g>
      <ellipse class="gbx-shadow" cx={shadow[0]} cy={GROUND + 2.6} rx={shadow[1]} ry={3.6} />
      <rect class="gbx-floor" x={5} y={GROUND} width={VIEW - 10} height={1.2} rx={0.6} />
    </g>
  );
}

// Barbell seen end-on (side views): the plate sits behind the lifter, the bar end in the fist.
export function Plate({ at: p, bold }) {
  return (
    <g transform={at(p)}>
      <circle r={PLATE_R} class="gbx-plate gbx-o" />
      {!bold && <circle r={PLATE_R * 0.6} class="gbx-groove" />}
      {!bold && <circle r={3.4} class="gbx-steel" />}
    </g>
  );
}

export function BarEnd({ at: p }) {
  return <circle cx={f(p[0])} cy={f(p[1])} r={1.9} class="gbx-cap gbx-o" />;
}

// Barbell seen from the front, centred on `at`.
export function Barbell({ at: p, bold }) {
  const h = bold ? 4.2 * bold : 2.3;
  const half = bold ? 46 : 58;
  const inner = bold ? 31 : 40.5;
  return (
    <g transform={at(p)}>
      <rect x={-half} y={-h / 2} width={half * 2} height={h} rx={h / 2} class="gbx-steel gbx-o" />
      {[-1, 1].map((s) => (
        <g transform={`scale(${s} 1)`}>
          <rect x={inner} y={-13} width={bold ? 7 * bold : 5} height={26} rx={1.8} class="gbx-plate gbx-o" />
          {!bold && <rect x={46.3} y={-10} width={4} height={20} rx={1.6} class="gbx-plate gbx-o" />}
          {!bold && <rect x={38} y={-2.6} width={2.5} height={5.2} rx={0.8} class="gbx-steel" />}
        </g>
      ))}
    </g>
  );
}

// Dumbbell held across the palm: the handle runs perpendicular to the forearm (angle in limb degrees).
export function Dumbbell({ at: p, angle, bold }) {
  const w = bold ? 6.6 * bold : 5, h = bold ? 12.5 * bold : 9.4, gap = bold ? 4.4 * bold : 3.3;
  return (
    <g transform={`${at(p)} rotate(${f(-angle)})`}>
      <rect x={-gap - 1} y={-1.1} width={gap * 2 + 2} height={2.2} class="gbx-steel" />
      <rect x={-gap - w} y={-h / 2} width={w} height={h} rx={1.7} class="gbx-plate gbx-o" />
      <rect x={gap} y={-h / 2} width={w} height={h} rx={1.7} class="gbx-plate gbx-o" />
    </g>
  );
}

export function Bench({ x, w, bold }) {
  const t = bold ? 4.6 * bold : 3.4;
  const leg = (lx) => (
    <g>
      <rect x={lx - t / 2} y={BENCH_TOP + 5} width={t} height={GROUND - BENCH_TOP - 6} class="gbx-steel gbx-o" />
      <rect x={lx - 7} y={GROUND - t * 0.82} width={14} height={t * 0.82} rx={t * 0.41} class="gbx-steel gbx-o" />
    </g>
  );
  return (
    <g>
      {leg(x + 11)}
      {leg(x + w - 11)}
      {!bold && <rect x={x + 5} y={BENCH_TOP + 4.6} width={w - 10} height={2.6} class="gbx-steel" />}
      <rect x={x} y={BENCH_TOP} width={w} height={bold ? 7 * bold : 5.4} rx={2.7} class="gbx-pad gbx-o" />
    </g>
  );
}

// A rack upright with one J-hook. `hook` is the hook height, `face` the side it points to.
export function Upright({ x, top, hook, face = 1 }) {
  return (
    <g>
      <rect x={x - 9} y={GROUND - 2.8} width={18} height={2.8} rx={1.4} class="gbx-frame gbx-o" />
      <rect x={x - 2} y={top} width={4} height={GROUND - top - 1.4} rx={1.2} class="gbx-frame gbx-o" />
      <path d={`M${x},${hook - 1.2}h${face * 7.4}v-3.4h${face * 2}v6h${-face * 9.4}Z`} class="gbx-frame gbx-o" />
    </g>
  );
}

// Pull-up rig seen face on: two uprights and the bar. The icon keeps only the bar.
export function PullUpRig({ x, half, y, bold }) {
  const post = (px) => (
    <g>
      <rect x={px - 8} y={GROUND - 2.8} width={16} height={2.8} rx={1.4} class="gbx-frame gbx-o" />
      <rect x={px - 2} y={y - 5} width={4} height={GROUND - y + 3.6} rx={1.2} class="gbx-frame gbx-o" />
    </g>
  );
  const h = bold ? 4.4 * bold : 2.6;
  const reach = bold ? half * 0.8 : half + 3;
  return (
    <g>
      {!bold && post(x - half)}
      {!bold && post(x + half)}
      <rect x={x - reach} y={y - h / 2} width={reach * 2} height={h} rx={h / 2} class="gbx-steel gbx-o" />
    </g>
  );
}

// Pull-up bar seen end-on, cantilevered from an upright behind the lifter's back.
export function HangingBar({ at: p, post, bold }) {
  const [x, y] = p;
  const t = bold ? 2.5 * bold : 2;
  return (
    <g>
      {!bold && <rect x={post - 9} y={GROUND - 2.8} width={22} height={2.8} rx={1.4} class="gbx-frame gbx-o" />}
      {!bold && <path d={`M${post + 1},${y + 15}L${post + 16},${y - 1}`} class="gbx-brace" />}
      <path
        d={`M${post - t},${GROUND - 1.4}V${y - 3.6 + t}a${t},${t} 0 0 1 ${t},${-t}H${x + 1}a${t},${t} 0 0 1 0,${t * 2}H${post + t}V${GROUND - 1.4}Z`}
        class="gbx-frame gbx-o"
      />
      {!bold && <circle cx={x} cy={y} r={2.3} class="gbx-steel gbx-o" />}
    </g>
  );
}

// Cable column with a high pulley. `lift` raises the selected part of the weight stack.
export function CableTower({ x, pulley, lift, bold }) {
  const top = 11, plate = 4.1, count = 10, picked = 4;
  const stackTop = GROUND - 4 - count * plate;
  const arm = bold ? 4.4 * bold : 3.6;
  const plates = (from, n) => Array.from({ length: n }, (_, i) => (
    <rect x={x + 3.4} y={stackTop + (from + i) * plate} width={13.2} height={plate - 0.8} rx={0.8} class="gbx-plate" />
  ));
  return (
    <g>
      {!bold && <rect x={x - 6} y={GROUND - 2.8} width={32} height={2.8} rx={1.4} class="gbx-frame gbx-o" />}
      <path
        d={`M${x},${GROUND - 1.4}V${top + 3}a3,3 0 0 1 3,-3h${bold ? 8 : 14}a3,3 0 0 1 3,3V${GROUND - 1.4}Z`}
        class="gbx-frame gbx-o"
      />
      {!bold && <rect x={x + 2.2} y={top + 9} width={15.6} height={GROUND - top - 12} rx={1.6} class="gbx-well" />}
      <rect x={pulley[0] - 1} y={top + 1.2} width={x - pulley[0] + 3} height={arm} rx={arm / 2} class="gbx-frame gbx-o" />
      {!bold && <rect x={pulley[0] - 1.4} y={top + 2} width={2.8} height={pulley[1] - top - 2} rx={1.4} class="gbx-frame gbx-o" />}
      {!bold && <path d={`M${x + 10},${top + 10}V${f(stackTop - lift)}`} class="gbx-cable" />}
      {!bold && plates(picked, count - picked)}
      {!bold && <g transform={`translate(0 ${f(-lift)})`}>{plates(0, picked)}</g>}
      {!bold && <circle cx={pulley[0]} cy={pulley[1]} r={3.4} class="gbx-steel gbx-o" />}
      {!bold && <circle cx={pulley[0]} cy={pulley[1]} r={1.1} class="gbx-cap" />}
    </g>
  );
}

// Cable from the pulley to a rope attachment that ends in the fist.
export function CableRope({ from, hand, bold }) {
  const aim = mul(sub(hand, from), 1 / dist(hand, from));
  const knot = sub(hand, mul(aim, 7.5));
  const tip = add(hand, mul(aim, 4.6));
  const line = (a, b) => `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  return (
    <g>
      <path d={line(from, bold ? hand : knot)} class="gbx-cable" stroke-width={bold ? 3 * bold : undefined} />
      {!bold && <path d={line(knot, tip)} class="gbx-rope" />}
    </g>
  );
}

// 45 degree leg press: back rest, rail, and a sled whose foot plate sits `travel` units up the rail from the hip.
export function LegPress({ hip, recline, travel, bold }) {
  const up = [Math.SQRT1_2, -Math.SQRT1_2], out = [Math.SQRT1_2, Math.SQRT1_2];
  const railEnd = add(hip, add(mul(up, 96), mul(out, 19.6)));
  const pad = bold ? 7 * bold : 5.6;
  return (
    <g>
      {!bold && <rect x={hip[0] - 16} y={GROUND - 2.8} width={railEnd[0] - hip[0] + 24} height={2.8} rx={1.4} class="gbx-frame gbx-o" />}
      {!bold && <rect x={railEnd[0] - 2} y={railEnd[1]} width={4} height={GROUND - railEnd[1] - 1.4} rx={1.2} class="gbx-frame gbx-o" />}
      {!bold && <rect x={hip[0] - 9} y={hip[1] + 12} width={4} height={GROUND - hip[1] - 13} class="gbx-frame gbx-o" />}
      <g transform={`${at(hip)} rotate(-45)`}>
        <rect x={-4} y={18} width={bold ? 78 : 102} height={bold ? 4.4 * bold : 3.4} rx={1.7} class="gbx-frame gbx-o" />
        <g transform={`translate(${f(travel)} 0)`}>
          {!bold && <circle cx={15} cy={7} r={10} class="gbx-plate gbx-o" />}
          {!bold && <circle cx={15} cy={7} r={5.6} class="gbx-groove" />}
          {!bold && <circle cx={15} cy={7} r={2.4} class="gbx-steel" />}
          {!bold && <rect x={2} y={13.4} width={22} height={4.6} rx={1.6} class="gbx-steel gbx-o" />}
          <rect x={4.2} y={-11} width={bold ? 5.4 * bold : 3.6} height={bold ? 30 : 26} rx={1.6} class="gbx-steel gbx-o" />
        </g>
      </g>
      <g transform={`${at(hip)} rotate(${f(recline)})`}>
        <rect x={-9 - pad} y={-48} width={pad} height={57} rx={2.8} class="gbx-pad gbx-o" />
      </g>
      {!bold && (
        <g transform={`${at(hip)} rotate(-12)`}>
          <rect x={-13} y={8.4} width={30} height={pad} rx={2.8} class="gbx-pad gbx-o" />
        </g>
      )}
    </g>
  );
}
