import { useId } from 'preact/hooks';
import { MUSCLE_LABEL } from './data.js';
import { BODY, solveFront } from './rig.js';
import { LOOK, frontParts, frontTorso } from './figure.js';
import { Parts, tintOf, useExerciseStyles } from './stage.jsx';

const FIGURE_W = 46;
const FIGURE_H = 110;
const GAP = 6;
const STANCE = { arm: { u: 13, l: 9 }, leg: { u: 5.5, l: -1.5 } };
const TOP = BODY.neck[1] + BODY.headUp + 9.5;

const heat = (v) => ({ style: { fill: `color-mix(in srgb, var(--gbx-pri) ${Math.round(Math.min(1, Math.max(0, v)) * 100)}%, var(--gbx-zone))` } });

// Front and back anatomy with the ten muscle regions.
//   primary / secondary  arrays of muscle ids to highlight (exercise detail)
//   values               { muscle: 0..1 } heat per muscle (muscle balance); wins over primary/secondary
//   view                 'both' | 'front' | 'back'
//   size                 height in px
export function MuscleFigure({ primary, secondary, values, size = 220, view = 'both' }) {
  useExerciseStyles();
  const clipId = useId();
  const views = view === 'both' ? ['front', 'back'] : [view];
  const width = views.length * FIGURE_W + (views.length - 1) * GAP;
  const tint = tintOf(primary, secondary);
  const paint = values
    ? (m) => heat(values[m] ?? 0)
    : (m) => ({ class: `gbx-${tint[m] ?? 'zone'}` });
  const named = values ? Object.keys(values).filter((m) => values[m] > 0) : [...(primary ?? []), ...(secondary ?? [])];
  const label = `Muscle map: ${named.map((m) => MUSCLE_LABEL[m]).join(', ') || 'no muscles highlighted'}`;
  return (
    <svg class="gbx gbx-map" style={{ '--gbx-size': size * 0.8 }} width={(size * width) / FIGURE_H} height={size} viewBox={`0 0 ${width} ${FIGURE_H}`} role="img" aria-label={label}>
      <clipPath id={clipId}><path d={frontTorso(LOOK)} /></clipPath>
      {views.map((v, i) => {
        const j = solveFront({ ...STANCE, root: [FIGURE_W / 2 + i * (FIGURE_W + GAP), TOP] });
        const fig = frontParts(j, LOOK, v === 'back', 'body');
        return (
          <g>
            <Parts list={fig.body} paint={paint} clip={`url(#${clipId})`} />
            <Parts list={fig.arms} paint={paint} clip={`url(#${clipId})`} />
          </g>
        );
      })}
    </svg>
  );
}
