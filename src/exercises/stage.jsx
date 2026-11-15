// Draws one frame of a move: floor, equipment and the figure, layered by depth.
import { useId, useLayoutEffect } from 'preact/hooks';
import { sample } from './timeline.js';
import { VIEW, solveSide, solveFront } from './rig.js';
import { LOOK, iconLook, sideParts, frontParts, sideTorso, frontTorso } from './figure.js';
import { Floor } from './equipment.jsx';
import { ensureExerciseStyles } from './styles.js';

export const useExerciseStyles = () => useLayoutEffect(ensureExerciseStyles, []);

// One depth group. The outline pass strokes every shape first and the fills cover the inner
// half, so a group reads as a single silhouette instead of a stack of outlined capsules.
// paint(muscle) returns the props for a muscle patch, or a falsy value to leave it out.
export function Parts({ list, paint, clip }) {
  return (
    <g>
      <g class="gbx-edge">{list.map((p) => <path d={p.d} transform={p.tf} />)}</g>
      {list.map((p) => (
        <g transform={p.tf}>
          <path d={p.d} class={`gbx-${p.tone}`} />
          {p.patches && p.patches.map((patch) => {
            const props = paint(patch.m);
            return props ? <path d={patch.d} clip-path={patch.clip ? clip : undefined} {...props} /> : null;
          })}
        </g>
      ))}
    </g>
  );
}

// Muscle id -> 'pri' | 'sec' for an exercise's primary and secondary muscles.
export function tintOf(primary = [], secondary = []) {
  const tint = {};
  secondary.forEach((m) => { tint[m] = 'sec'; });
  primary.forEach((m) => { tint[m] = 'pri'; });
  return tint;
}

const unpainted = () => null;

export function Stage({ move, t, size, tint, icon, label, rootRef }) {
  useExerciseStyles();
  const clipId = useId();
  const look = icon ? iconLook(move.icon.box[2]) : LOOK;
  const side = move.view === 'side';
  const k = sample(move.strokes, t);
  const j = (side ? solveSide : solveFront)(move.pose(k));
  const scene = move.scene(j, k, icon ? move.icon.box[2] / 100 : 0);
  const fig = side ? sideParts(j, look) : frontParts(j, look, move.view === 'back');
  const group = {
    clip: `url(#${clipId})`,
    paint: icon ? unpainted : (m) => tint[m] && { class: `gbx-${tint[m]}` },
  };
  const arms = <Parts list={side ? fig.arm : fig.arms} {...group} />;
  const box = icon ? [move.icon.box[0], move.icon.box[1], move.icon.box[2], move.icon.box[2]] : [0, 0, VIEW, VIEW];
  return (
    <svg ref={rootRef} class={icon ? 'gbx gbx-icon' : 'gbx'} style={{ '--gbx-size': size }} width={size} height={size} viewBox={box.join(' ')} role="img" aria-label={label}>
      <clipPath id={clipId}><path d={side ? sideTorso(look) : frontTorso(look)} /></clipPath>
      {!icon && <Floor shadow={scene.shadow} />}
      {scene.back}
      {side && <Parts list={fig.far} {...group} />}
      {move.armsBehind && arms}
      <Parts list={fig.body} {...group} />
      {scene.mid}
      {!move.armsBehind && arms}
      {scene.front}
    </svg>
  );
}
