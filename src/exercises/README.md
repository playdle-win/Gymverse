# Exercise art

A 2D mannequin rig drawn as inline SVG, ten looping movement animations, matching icons and a
muscle map. Everything is generated from joint data at render time; there are no image assets.

```js
import { ExerciseAnim, ExerciseIcon, MuscleFigure, EXERCISES, exerciseById } from '../exercises/index.js';
```

## Components

| Component | Props | Notes |
| --- | --- | --- |
| `<ExerciseAnim id size playing />` | `id` exercise id, `size` px (default 240, made for 120 to 360), `playing` (default true) | Seamless loop of one rep. Pauses when off screen or `playing` is false and resumes where it stopped. With `prefers-reduced-motion` it shows the mid-rep pose and does not animate. Working muscles are tinted: primary in `--accent`, secondary in a softer mix. |
| `<ExerciseIcon id size />` | `id`, `size` px (default 44, made for 40 to 56) | Static key pose, heavier forms, tight crop. Figure in `--ink`, equipment in `--accent`. |
| `<MuscleFigure primary secondary values size view />` | `primary`, `secondary` arrays of muscle ids; or `values` `{ muscle: 0..1 }` heat (wins over the arrays); `size` height in px (default 220); `view` `'both'` (default), `'front'`, `'back'` | Width follows from the view: about 0.89 x size for both, 0.42 x size for one. |

`index.js` also re-exports `EXERCISES`, `MUSCLES`, `MUSCLE_LABEL`, `EQUIPMENT_LABEL` and `exerciseById`
from `data.js`. Each exercise carries `summary` (one sentence) and `cues` (three coaching cues).

All three render a plain `<svg class="gbx">` with `role="img"` and a label.

## Styling

`styles.js` holds the only CSS (`EXERCISE_CSS`); the components inject it into `<head>` once.
Colours come from the design tokens only: `--ink`, `--bg-raised`, `--accent`, `--line`, `--fill`,
`--fill-strong`, and `--bw` for the outline.

- Neutral tones are `color-mix` blends of `--ink` into `--bg-raised`, so they are always opaque
  (overlapping limbs never show seams). If the art sits on another surface, set `--gbx-ground`
  on a parent to that colour.
- `:root[data-theme="dark"]`, or `prefers-color-scheme: dark` unless `data-theme="light"` is set
  (the same rule the tokens use), swaps the blend amounts so the figure stays a mid grey with
  darker hair and iron.
- Style knobs ride on the `[data-style]` scope like the tokens do, on the root or any subtree.
  `studio` has no outline. `arcade` and `varsity` get an ink outline derived from `--bw` and the
  rendered size; arcade also renders with crisp edges and steps the motion at 10 frames a second;
  varsity draws a heavier line and a solid blob shadow.

## Files

| File | What it holds |
| --- | --- |
| `data.js` | Exercise metadata. Pure data, safe to import from Node. |
| `math.js` | Vectors, two-bone IK (`reach`), cubic-bezier easing, the `EASE` tempo set. |
| `timeline.js` | Keyframe timelines: `cycle`, `hold`, `go`, `sample`. |
| `rig.js` | Body measurements and the two solvers, `solveSide` and `solveFront`. |
| `figure.js` | Joints to drawable parts: limb capsules, torso outlines, muscle patches. |
| `equipment.jsx` | Barbell, plates, dumbbell, bench, uprights, pull-up rig, cable tower, leg press, floor. |
| `moves.jsx` | The ten movements. |
| `stage.jsx` | Renders one frame of a move (shared by the animation and the icon). |
| `clock.js` | The shared animation frame loop, the debug freeze, the stepped-motion probe. |

## The rig

Scene units: a 146 x 146 box, floor at `GROUND` (139), figure about 103 units tall in every
exercise. Segment angles are absolute and in degrees: 0 points down, 90 forward, 180 up.

**Side rig** (`solveSide`, figure faces +x):

```js
{
  root: [x, y],            // hip joint
  spine: 12,               // torso lean; 0 upright, positive forward, -90 lies supine
  head: -6,                // extra head tilt on top of the spine
  arm: { u: 10, l: 120 },  // upper and lower segment angles ...
  arm: { to: [x, y] },     // ... or a grip target, solved with IK (elbow folds forward) ...
  arm: { via: [x, y], to: [x, y] },  // ... or explicit elbow and grip for arms that leave the
                           //     picture plane; the segments foreshorten to fit
  leg: { u: 5, l: -3 },    // same three forms; `to` is the ankle, knees fold backward
  armK: [1, 1], legK: [1, 0.6],  // foreshortening for the angle and IK forms
  foot: 0,                 // toe direction, 0 flat on the floor
  far: { arm, leg, foot }, // overrides for the far-side limbs (default: same as near)
  pin: { hand: [x, y] },   // slide the whole figure so the near hand lands there (hangs)
}
```

**Front rig** (`solveFront`, used from the front and from the back, symmetric): `root` is the
centre of the pelvis; `arm` and `leg` describe the right side (angles are positive away from the
body, `to` and `via` are world points) and are mirrored for the left; `foot` runs from 0
(standing) to 1 (toes pointed).

IK never reaches full extension, so joints cannot lock, flip or hyperextend. Hands and feet stay
attached because equipment is drawn at the solved joints, not at the targets.

## A move

```js
const dumbbellCurl = (() => {
  const hip = [CX, FLOOR - 48.85];
  const down = { u: 1, l: 7 };
  const up = { u: 14, l: 142 };
  return {
    view: 'side',                       // 'side' | 'front' | 'back'
    seconds: 3,                         // one rep
    strokes: cycle(down, up, { at: [0.06, 0.4, 0.5, 0.92], out: 'drive', back: 'lower' }),
    pose: (k) => ({ root: hip, spine: 1, arm: { u: k.u, l: k.l }, leg: { to: [hip[0] - 1, FLOOR] } }),
    scene: (j, k, bold) => ({
      shadow: [CX + 1, 26],             // floor shadow: centre x, radius
      mid: <Dumbbell at={j.near.arm.hand} angle={j.near.arm.l} bold={bold} />,
    }),
    still: 0.24,                        // phase shown with reduced motion
    // armsBehind: true                 // optional: near arm drawn behind the body (side hangs)
    icon: { t: 0.3, box: [20, 32, 116] },  // icon pose and square crop [x, y, size]
  };
})();
```

- `strokes` keys whatever channels the move needs. `cycle(a, b, { at })` is the usual rep: rest at
  `a` until `at[0]`, reach `b` at `at[1]`, leave it at `at[2]`, be back at `at[3]`. Phase 0 is the
  start position and 0.5 the far end, in every move. `out` and `back` name the easing (`lower`,
  `drive`, `smooth`). `via` adds waypoints the motion flows through without stopping.
- `pose(k)` maps the interpolated channels to a rig pose. Put constraints here. Examples: the squat
  places the hip so the bar stays over mid-foot; the deadlift aims straight arms so the bar path is
  vertical; the leg press keeps the feet on the sled rail.
- `scene(j, k, bold)` returns equipment for the solved joints in up to three layers: `back`
  (behind the figure), `mid` (between body and near arm, or between body and both arms in the
  front rig) and `front`. `bold` is 0 for the animation and the line-weight factor for the icon.

## Adding an exercise

1. Add the entry to `EXERCISES` in `data.js` (id, name, equipment, muscles, summary, cues).
2. Write the move in `moves.jsx` and register it in `MOVES` under the same id. Pick the view that
   shows the working muscles, key the two ends of the rep, add `via` poses only if the path needs them.
3. Draw new equipment in `equipment.jsx` from the existing classes (`gbx-steel`, `gbx-plate`,
   `gbx-frame`, `gbx-pad`, plus `gbx-o` for shapes that take the style outline).
4. Run the harness: `node build.mjs --dev exercises`, then open `dist/dev-exercises.html` or
   `node tools/shot.mjs dist/dev-exercises.html shots/exercises/x.png --w 900 --h 1200 --eval "exdev.freeze(0.5)"`.
   `exdev.set({ section: 'strip', only: '<id>', size: 300 })` lays phases of one move side by side;
   `exdev.set({ tokens: 'mock' })` swaps the app tokens for the harness's stand-in values.
   Check the start, the far end and two phases between in all three styles, light and dark, then
   set `icon.t` and `icon.box` so the icon fills its square.
