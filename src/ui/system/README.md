# GymBros UI system

Everything a screen needs: tokens, icons, components, the app shell. Screens import from one place and style
only through tokens, so each screen works in all three art directions and all five colour themes without
knowing which is active.

```js
import { Screen, Section, List, ListRow, Button, PointsPill, nav, toast } from '../../system/index.js';
```

Look at it: `node build.mjs --dev kit`, then open `dist/dev-kit.html` (every component in every state, three
styles side by side on a wide window) or `dist/dev-kit.html?demo` (the real shell with sample screens built
only from this kit).

## Register a screen

`src/ui/screens/index.js` (owned by the screen agents) registers one root component per tab. The shell shows
a placeholder for any tab that has none.

```js
import { registerScreen } from '../system/index.js';
import { TrainScreen } from './train/index.jsx';
registerScreen('train', TrainScreen);   // 'home' | 'train' | 'gym' | 'progress' | 'exercises'
```

That module joins the build with a single line in `src/main.jsx`: `import './ui/screens/index.js';`.

A complete screen:

```jsx
import { useStore } from '../../../core/index.js';
import { Screen, Section, List, ListRow, Button, PointsPill, EmptyState, nav, toast } from '../../system/index.js';
import { RoutinePage } from './routine.jsx';

export function TrainScreen() {
  const routines = useStore((s) => s.routines);
  return (
    <Screen title="Train" trailing={<PointsPill />}>
      <Button block icon="play" onClick={() => toast('Workout started')}>Start empty workout</Button>
      <Section title="Routines" action={{ label: 'New routine', onClick: () => nav.push(RoutinePage, {}) }}>
        {routines.length ? (
          <List>
            {routines.map((r) => (
              <ListRow key={r.id} title={r.name} subtitle={`${r.exercises.length} exercises`} chevron
                onClick={() => nav.push(RoutinePage, { id: r.id })} />
            ))}
          </List>
        ) : (
          <EmptyState icon="barbell" title="No routines yet" text="Save the exercises you repeat as a routine." />
        )}
      </Section>
    </Screen>
  );
}
```

Direct children of `<Screen>` are spaced 32px apart; a `<Section>` spaces its own children 10px apart.

## Rules that keep it finished

- Colours, radii, fonts, shadows and motion come from tokens. Never a literal in a screen stylesheet.
- One card level. Group with `Section`, `List`, hairlines and spacing first. `Card` is for a distinct object
  (a feed post, a routine, a shop item). A `Card` inside a `Card` or an inset `List` drops its own surface in
  CSS, so nesting cannot produce cards in cards. Inside a `Card` or `Sheet`, use `<List variant="plain">`.
- Display type (`.t-large`, `.t-title`, `.t-num`, section and nav titles) is for titles and numbers. Everything
  people read uses `--font-ui`. In Arcade, single letters (set types W, D, S, initials) stay in the sans because
  the pixel face makes V and W ambiguous at small sizes; `Badge` and `Avatar` already do this.
- Accent means primary action, selected, mine. `--good`, `--warn`, `--bad` are for state only.
- Small accent-coloured text uses `--accent-text` (class `c-accent`), which clears 4.5:1 on every surface
  including its own tint. `--accent` is for fills, icons and large type.
- Points always go through `<Points>` or `<PointsPill>`: the coin (`--points`) plus the number in ink.
- Every control already has pressed, focus-visible and disabled states and a 44px target. Keep them: do not
  wrap controls in smaller clickable boxes.
- Copy: sentence case, buttons say what happens, no em or en dashes, no emoji.
- Hover styles only inside `@media (hover: hover) and (pointer: fine)`. Motion uses `--dur-*` and `--ease*`;
  reduced motion is handled globally.

## Tokens (`src/styles/00-tokens.css`)

| Group | Tokens |
| --- | --- |
| Surfaces | `--bg` `--bg-raised` `--bg-sunken` `--bg-elevated` `--bg-inverse` `--fill` `--fill-strong` `--glass` |
| Text | `--ink` `--ink-2` `--ink-3` `--ink-inverse` `--ink-inverse-2` |
| Lines | `--line` (hairline) `--line-strong` (3:1 control edge) `--edge` (surface border, per style) `--edge-control` |
| Accent | `--accent` `--accent-ink` `--accent-soft` `--accent-text` `--accent-inverse` `--accent-inverse-ink` |
| State | `--good` `--warn` `--bad` `--on-semantic` `--good-soft` `--warn-soft` `--bad-soft` |
| Points | `--points` `--points-edge` `--points-ink` (constant) `--points-text` (per appearance) |
| Type | `--font-ui` `--font-display` `--font-num` `--font-label`, `--t-large` `--t-title` `--t-section` `--t-navtitle` `--t-headline` `--t-body` `--t-callout` `--t-foot` `--t-caption` `--t-label` |
| Shape | `--r-s` `--r-m` `--r-l` `--r-pill` `--r-control` `--r-avatar` `--bw` |
| Depth | `--shadow-1` `--shadow-2` `--scrim` |
| Motion | `--ease` (small things, may overshoot) `--ease-move` (pages, sheets) `--dur-1` `--dur-2` `--press` |
| Layout | `--gutter` `--tap` `--navbar-h` `--tabbar-h` `--tabbar-space` (bar plus its offset) `--safe-t` `--safe-b` `--s-1` to `--s-10` |
| Charts | `--chart-grid` `--chart-axis` `--chart-line` `--chart-area` `--chart-muted`, class `.t-axis` |

Type classes: `t-large t-title t-headline t-body t-callout t-foot t-caption t-label t-num t-num-m t-num-l
t-num-xl t-axis`, colour classes `c-2 c-3 c-accent c-good c-warn c-bad c-points`, helpers `t-center
t-truncate gb-sr gb-scroll gb-hscroll`.

Inside a `<Screen>` two more variables exist: `--top-inset` (nav bar plus the top safe area) and
`--bottom-inset` (tab bar or home indicator space). A `scroll={false}` screen fills the whole stage under a
transparent nav bar and must keep its own controls inside both.

## Styles and themes

| `data-style` | Type | Shape and edge | Motion |
| --- | --- | --- | --- |
| `studio` | System stack, rounded numerals | 10/14/24px, hairlines, soft shadow, glass tab bar | spring-like ease, 160/380ms |
| `arcade` | Jersey 15 on its 15px grid | 2/3/4px, 2px ink edges, lip and hard shadows | `steps()`, 120/240ms |
| `varsity` | Barlow Condensed italic caps, Barlow body | pills, inverse blocks, one slant | overshoot, 150/320ms |

Themes (`data-gbtheme`): `ember` (default), `cobalt`, `pine`, `berry`, `graphite` (monochrome: the accent is
the ink, the coin is the only colour). Appearance: `auto` leaves `data-theme` to the host and falls back to
`prefers-color-scheme`; `light` and `dark` set it.

`useThemeColors()` returns the resolved tokens as strings for canvas and SVG code and re-renders on any
style, theme or appearance change; `getThemeColors()` and `onThemeChange(fn)` do the same outside Preact.
Keys: `bg bgRaised bgSunken bgInverse fill fillStrong ink ink2 ink3 inkInverse line lineStrong accent
accentInk accentSoft accentText good warn bad points pointsEdge pointsInk pointsText chartGrid chartAxis
chartLine chartArea chartMuted fontUi fontDisplay fontNum dark style theme`.

## Components

Shell and navigation

| Export | Props and notes |
| --- | --- |
| `Screen` | `title`, `large` (collapsing large title; default true on a tab root), `trailing`, `leading` (replaces the automatic back button), `fab`, `footer` (pinned above the tab bar), `scroll` (false: children get the whole area, for the gym canvas), `padded` |
| `NavBar` | `title`, `leading`, `trailing`, `solid`, `showTitle`. Only for custom layouts; `Screen` includes one |
| `nav` | `select(tab)`, `push(Component, props)`, `pop()`, `popToRoot()`, `present(Component, props)` (full-screen cover that hides the tab bar: the workout session), `dismiss()`, `setTabBarHidden(bool)` |
| `useNav()` `usePage()` `useHideTabBar()` | reactive nav state; `{ tabId, depth, active, cover, pop }` for the current page (pause canvas loops when `active` is false); hide the bar while mounted |
| `TABS` | the five tabs in order, with icons |
| `AppShell` `TabBar` | mounted by `app.jsx`; hash routes `#home #train #gym #progress #exercises`; tabs stay mounted, so scroll and state survive |
| `PrototypeControls` `openControls()` `ProfileButton` | the controls panel, the function that opens it in a sheet, and the avatar button that calls it (put `ProfileButton` in Home's `trailing`) |

Controls

| Export | Props |
| --- | --- |
| `Button` | `variant` primary, secondary (tinted), quiet (neutral), plain, destructive; `size` l (50px), m (44), s (34 visual); `icon`, `iconEnd`, `loading`, `disabled`, `block` |
| `IconButton` | `icon`, `label` (required), `variant` plain, quiet, tinted, primary; `size` m, s; `weight` |
| `Segmented` | `options` (strings or `{ value, label }`), `value`, `onChange`, `label` |
| `FilterChips` `Chip` | `options`, `value`, `onChange`, `multiple`, `label`, `bleed`; `Chip`: `selected`, `icon`, `onClick` |
| `Toggle` | `checked`, `onChange`, `label`, `disabled` |
| `Slider` | `value`, `min`, `max`, `step`, `onInput`, `label` |
| `Stepper` | `value`, `onChange`, `min`, `max`, `step`, `label`, `unit`, `format` |
| `NumberField` | `value`, `onChange(number or null)`, `label`, `unit`, `decimal`, `min`, `max`, `size` l or m (set rows), `hideLabel`. Numeric keypad, selects all on focus, commits on blur or Enter |
| `TextField` | `label`, `value`, `onInput`, `placeholder`, `helper`, `error`, `icon`, `type`, `multiline`, `hideLabel`, plus any input attribute (`enterkeyhint`, `autocapitalize`) |

Content

| Export | Props |
| --- | --- |
| `Section` | `title`, `action` `{ label, onClick }`, `footnote` |
| `List` | `variant` inset (default) or plain |
| `ListRow` | `leading` or `icon`, `title`, `subtitle`, `value`, `trailing`, `chevron`, `selected` (with `role="radio"` for single choice), `onClick`, `tone="bad"`, `disabled`, children (extra content under the title) |
| `Card` | `onClick`, `padded` |
| `Stat` `StatRow` | `value`, `unit`, `label`, `delta` `{ text, tone }`, `size` m or l |
| `Points` `PointsPill` | `Points`: `value`, `sign`, `size` s, m, l. `PointsPill`: reads the wallet and shows the infinity sign while points are unlimited; `value`, `unlimited`, `onClick` override |
| `Badge` | `tone` neutral, accent, good, warn, bad, points; `solid`; `icon` |
| `Avatar` | `size`, `name` (initials fallback), `ring`, children (canvas, SVG or image fills the slot) |
| `EmptyState` | `icon`, `title`, `text`, `action` |
| `Skeleton` | `w`, `h`, `shape` rect, text, circle |
| `ProgressRing` `Meter` | `value` 0 to 1, `tone`, `label`; ring also `size`, `stroke`, children in the middle |
| `Icon` `PointsGlyph` | `name`, `weight` regular, fill, bold; `size`; `label`. Names: `ICON_NAMES`. Add icons by importing the Phosphor SVG in `icons.js`; never draw a path |

Overlays (all render inside the phone stage, above the tab bar)

| Export | Props |
| --- | --- |
| `Sheet` | `open`, `onClose`, `title`, `trailing`, `detents` `['medium', 'large']` (default), `['medium']`, `['large']`, `['auto']`. Grabber drag, scrim tap and Escape dismiss; focus is trapped |
| `confirm(options)` | `await confirm({ title, message, confirmLabel, cancelLabel, destructive })` resolves true or false. Use it instead of `window.confirm` |
| `Dialog` | the same as a controlled component |
| `toast(message, { icon, duration })` | one short status line above the tab bar |
| `Fab` `FabMenu` | pass to `<Screen fab>`. `FabMenu`: `label`, `icon`, `actions` `[{ icon, label, onClick }]` |

## Contrast

WCAG ratios computed from the shipped hex values, light / dark, for every theme. 485 pairs are checked in
total (text on each surface, tints, inverse surfaces, control edges); the lowest text pair is 4.63:1 and the
lowest control edge is 3.51:1.

| Pair (minimum) | ember L / D | cobalt L / D | pine L / D | berry L / D | graphite L / D |
|---|---|---|---|---|---|
| ink / bg (4.5) | 16.03 / 16.89 | 15.96 / 16.88 | 15.86 / 16.90 | 16.05 / 16.83 | 16.00 / 16.77 |
| ink-2 / bg (4.5) | 7.13 / 9.29 | 7.08 / 9.33 | 7.03 / 9.36 | 7.13 / 9.25 | 7.09 / 9.34 |
| ink-3 / bg (4.5) | 5.19 / 5.98 | 5.20 / 5.96 | 5.16 / 6.03 | 5.24 / 5.95 | 5.20 / 5.96 |
| ink-3 / raised (4.5) | 5.60 / 5.24 | 5.59 / 5.23 | 5.58 / 5.26 | 5.67 / 5.25 | 5.59 / 5.23 |
| accent-ink / accent (4.5) | 4.63 / 8.02 | 6.49 / 8.47 | 6.76 / 10.84 | 6.01 / 8.48 | 15.73 / 16.56 |
| accent-text / bg (4.5) | 5.45 / 7.80 | 6.09 / 8.23 | 6.32 / 10.60 | 5.67 / 8.24 | 14.63 / 16.13 |
| accent-text / accent-soft on bg (4.5) | 4.63 / 5.91 | 5.08 / 6.13 | 5.28 / 7.47 | 4.65 / 6.14 | 12.54 / 10.19 |
| accent / bg (control edge) (3) | 4.34 / 7.80 | 6.09 / 8.23 | 6.32 / 10.60 | 5.67 / 8.24 | 14.63 / 16.13 |
| line-strong / raised (3) | 3.90 / 3.53 | 3.90 / 3.52 | 3.88 / 3.51 | 3.91 / 3.51 | 3.90 / 3.53 |
| good / bg (4.5) | 5.98 / 10.66 | 5.99 / 10.64 | 6.16 / 10.43 | 5.99 / 10.65 | 6.00 / 10.63 |
| warn / bg (4.5) | 6.00 / 10.91 | 6.01 / 10.88 | 6.01 / 10.88 | 6.01 / 10.89 | 6.02 / 10.87 |
| bad / bg (4.5) | 6.00 / 7.52 | 5.98 / 7.56 | 5.98 / 7.56 | 5.88 / 7.62 | 5.99 / 7.56 |
| on-semantic / bad (4.5) | 6.39 / 7.70 | 6.37 / 7.78 | 6.39 / 7.73 | 6.27 / 7.84 | 6.37 / 7.75 |
| points-text / bg (4.5) | 5.59 / 11.34 | 5.59 / 11.31 | 5.59 / 11.32 | 5.59 / 11.33 | 5.60 / 11.31 |
| points edge / bg (3) | 4.91 / 10.13 | 4.92 / 10.10 | 4.92 / 10.11 | 4.92 / 10.12 | 4.93 / 10.10 |
| ink-inverse-2 / bg-inverse (4.5) | 9.41 / 10.06 | 9.36 / 10.10 | 9.32 / 10.13 | 9.40 / 10.04 | 9.38 / 10.13 |
| accent-inverse / bg-inverse (3) | 7.34 / 8.44 | 7.72 / 8.91 | 9.87 / 11.46 | 7.77 / 8.95 | 15.15 / 17.49 |

## Fonts

Loaded from Google Fonts in `src/index.html`: Jersey 15 (Arcade titles, numbers, tab labels), Barlow Condensed
600 and italic 700/800 plus Barlow 400 to 700 (Varsity), Nunito 700/800 (rounded numerals where `ui-rounded`
is missing). Studio uses the system stack, so on iPhone it is San Francisco. Every family has a real fallback.
