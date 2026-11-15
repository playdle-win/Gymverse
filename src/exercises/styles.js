// All CSS for the exercise art. Components inject it once (see ensureExerciseStyles).
// Every colour derives from the design tokens; nothing is hard-coded except token fallbacks.
// Tones are mixed with color-mix so they stay opaque: overlapping limbs must not show seams.
// Each --gbx-t-* is how much ink goes into a tone; dark appearance swaps the amounts so the
// mannequin stays a mid grey with darker hair and iron on either ground.
// Style knobs are set on the [data-style] scope (the root or any subtree, like the tokens) and
// inherited: outline weight limits, edge rendering, stepped motion, floor colour. The outline is
// --bw scaled with the rendered size (--gbx-size, set inline by the components) so the line
// weight follows the art from 120 to 360 px; studio has none.
const DARK_TONES = '--gbx-t-body:50%;--gbx-t-near:59%;--gbx-t-far:36%;--gbx-t-hair:22%;--gbx-t-zone:33%;'
  + '--gbx-t-steel:46%;--gbx-t-iron:29%;--gbx-t-frame:15%;--gbx-t-pad:31%;--gbx-t-well:9%';

export const EXERCISE_CSS = `
.gbx{display:block;flex:none;overflow:hidden;
--gbx-ground:var(--bg-raised,#fff);--gbx-ink:var(--ink,#1c1c1e);--gbx-pri:var(--accent,#f2541b);
--gbx-t-body:26%;--gbx-t-near:34%;--gbx-t-far:17%;--gbx-t-hair:64%;--gbx-t-zone:36%;
--gbx-t-steel:52%;--gbx-t-iron:80%;--gbx-t-frame:14%;--gbx-t-pad:44%;--gbx-t-well:22%;
--gbx-body:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-body),var(--gbx-ground));
--gbx-near:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-near),var(--gbx-ground));
--gbx-far:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-far),var(--gbx-ground));
--gbx-hair:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-hair),var(--gbx-ground));
--gbx-zone:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-zone),var(--gbx-ground));
--gbx-sec:color-mix(in srgb,var(--gbx-pri) 46%,var(--gbx-body));
--gbx-steel:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-steel),var(--gbx-ground));
--gbx-iron:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-iron),var(--gbx-ground));
--gbx-frame:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-frame),var(--gbx-ground));
--gbx-pad:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-pad),var(--gbx-ground));
--gbx-well:color-mix(in srgb,var(--gbx-ink) var(--gbx-t-well),var(--gbx-ground));
--gbx-edge:var(--gbx-ink);
--gbx-sw:clamp(var(--gbx-ol-min,0px),calc(var(--gbx-size)*var(--gbx-ol-grow,0)*1px),var(--gbx-ol-max,0px));
shape-rendering:var(--gbx-render,auto)}
:root[data-theme="dark"] .gbx{${DARK_TONES}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .gbx{${DARK_TONES}}}
[data-style="studio"]{--gbx-ol-min:0px;--gbx-ol-grow:0;--gbx-ol-max:0px;--gbx-render:auto;--gbx-fps:0;
--gbx-floor:var(--line);--gbx-shade:var(--fill)}
[data-style="arcade"]{--gbx-ol-min:1px;--gbx-ol-grow:.008;--gbx-ol-max:var(--bw,2px);--gbx-render:crispEdges;--gbx-fps:10;
--gbx-floor:var(--ink);--gbx-shade:var(--fill)}
[data-style="varsity"]{--gbx-ol-min:1.25px;--gbx-ol-grow:.0105;--gbx-ol-max:calc(var(--bw,2px)*1.4);--gbx-render:auto;--gbx-fps:0;
--gbx-floor:var(--ink);--gbx-shade:var(--fill-strong)}
.gbx-far{fill:var(--gbx-far)}
.gbx-body{fill:var(--gbx-body)}
.gbx-near{fill:var(--gbx-near)}
.gbx-hair{fill:var(--gbx-hair)}
.gbx-pri{fill:var(--gbx-pri)}
.gbx-sec{fill:var(--gbx-sec)}
.gbx-zone{fill:var(--gbx-zone)}
.gbx-edge path,.gbx-o{stroke:var(--gbx-edge);stroke-width:calc(var(--gbx-sw)*2);stroke-linejoin:round;vector-effect:non-scaling-stroke}
.gbx-edge path{fill:none}
.gbx-o{paint-order:stroke}
.gbx-steel{fill:var(--gbx-steel)}
.gbx-cap{fill:var(--gbx-ground)}
.gbx-plate{fill:var(--gbx-iron)}
.gbx-groove{fill:none;stroke:var(--gbx-steel);stroke-width:1}
.gbx-frame{fill:var(--gbx-frame)}
.gbx-well{fill:var(--gbx-well)}
.gbx-pad{fill:var(--gbx-pad)}
.gbx-cable{fill:none;stroke:var(--gbx-steel);stroke-width:1.1px;stroke-linecap:round}
.gbx-rope{fill:none;stroke:var(--gbx-iron);stroke-width:2.6;stroke-linecap:round}
.gbx-brace{fill:none;stroke:var(--gbx-frame);stroke-width:3;stroke-linecap:round}
.gbx-floor{fill:var(--gbx-floor,var(--line,rgba(60,60,67,.2)))}
.gbx-shadow{fill:var(--gbx-shade,var(--fill,rgba(120,120,128,.14)))}
.gbx-icon{--gbx-body:var(--gbx-ink);--gbx-near:var(--gbx-ink);--gbx-hair:var(--gbx-ink);
--gbx-far:color-mix(in srgb,var(--gbx-ink) 50%,var(--gbx-ground));
--gbx-steel:var(--gbx-pri);--gbx-iron:var(--gbx-pri);--gbx-pad:var(--gbx-pri);--gbx-frame:var(--gbx-pri);--gbx-sw:0px}
`;

const STYLE_ID = 'gbx-styles';

export function ensureExerciseStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = EXERCISE_CSS;
  document.head.appendChild(el);
}
