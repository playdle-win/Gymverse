# GymBros prototype v1: build spec and contracts

Every agent reads this first. Sections 1 to 6 are contracts: do not deviate without telling the manager in your final report.

## 1. Product

GymBros is a workout logger with a social feed and a tycoon game on top. You log workouts; workouts earn points; points build and decorate your own isometric gym (think Habbo / The Sims / Tuber Simulator) where your character lives. The gym feeds back into training: equipment raises per-muscle point multipliers, consistency makes your character train passively for extra income, neglect makes the gym collect dust. No quests. Instead, when the app sees consistent training with a muscle left behind, it offers a points multiplier for training that muscle next.

Roadmap: (1) this prototype, a single self-contained HTML artifact; (2) the same build served from Cloudflare Pages; (3) a native iOS app. So: design to iPhone conventions now, keep game logic pure and portable, keep rendering separate from state.

The prototype must feel like a finished product: real content, no lorem ipsum, no "coming soon", no dead buttons. If something is out of scope, leave it out instead of stubbing it visibly.

Units are metric (kg). Floor area is counted in tiles; 1 tile = 1 m².

### Tabs (fixed order)
`Home`, `Train`, `Gym`, `Progress`, `Exercises`.

- **Home**: start a workout (empty or from a routine, optionally with friends), then a timeline of friends' recent workouts. Shows the focus offer when one is active.
- **Train**: start a workout, create a routine, browse and edit routines.
- **Workout session** (full-screen over the tabs): running timer, add exercise, per exercise a list of sets. Each set: type (normal, numbered 1,2,3; warm-up `W`; drop set `D`; superset `S`), kg, reps, done check. Finish shows a points breakdown. Training with friends: when both finish, both get a bonus.
- **Progress**: history and stats. Per exercise: graph over time, estimated 1RM, best set, volume. Weekly consistency and muscle balance.
- **Exercises**: the library. Each exercise: icon, looping animation of the movement, primary and secondary muscles, equipment.
- **Gym**: the room. A button expands into four: `Shop`, `Build`, `Character`, `Rooms`.
  - Shop: equipment, decor, floors and walls (priced per m²), room space (price grows exponentially per purchase, clicker style), extra floors, clothes, hair and beard styles, accessories.
  - Build: edit the room. Place, move, rotate, store items on a grid; apply floors and walls.
  - Character: dress the avatar with owned cosmetics.
  - Rooms: visit friends' gyms and other people's gyms.
  - New players start with an empty 5x5 room, bare concrete, cracked plaster, and one nearly broken wooden bench in the middle.

### Test lab
The user is testing: points are unlimited by default (`settings.unlimited = true`; purchases succeed and do not deduct; the balance shows the infinity sign). The test lab also offers: toggle unlimited points, skip time forward (to see dust build up and passive income accrue), reset to day one.

## 2. Tech

- Preact 10 + hooks, automatic JSX (`.jsx` files), bundled by esbuild into ONE html file. No other runtime dependencies. No network requests at runtime except Google Fonts.
- `node build.mjs` builds `dist/index.html`. `node build.mjs --dev <name>` builds `dev/<name>.jsx` to `dist/dev-<name>.html` (same CSS, own entry). Use a dev harness to work on your part in isolation.
- `node tools/shot.mjs <html> <png> [--style studio|arcade|varsity] [--theme id] [--dark] [--hash tab] [--click sel] [--eval js] [--desktop]` screenshots with headless Chrome and exits 2 on console/page errors. Look at your own screenshots (Read the png) before you call anything done. Put them in `shots/<your-area>/`.
- CSS: plain CSS files in `src/styles/`, concatenated in filename order. No CSS-in-JS, no Tailwind. Style only through tokens (section 6).
- Canvas 2D for the gym room. SVG for exercise art and charts.
- Artifact sandbox rules: no `alert/confirm/prompt`, no downloads, no `window.open`, no remote images (inline SVG / canvas / data URIs only), `localStorage` only inside try/catch (the store already does this), `height:100%` on html/body (never `100vh`), respect `prefers-reduced-motion`.
- Never run git commands. Never edit files outside your ownership (section 3). If the build fails because of a file you do not own, wait a minute and retry; if it persists, report it.
- Code quality bar: small pure functions, no dead code, no TODOs, comments only where the why is not obvious. This code gets ported to Swift later; keep logic readable.
- No em dashes or en dashes anywhere in UI copy. No emoji in UI. No filler text.

## 3. File ownership

| Path | Owner |
| --- | --- |
| `build.mjs`, `tools/`, `docs/SPEC.md`, `src/core/store.js` | manager (frozen) |
| `src/core/**` (except store.js), `tests/**` | systems agent |
| `src/gym/**`, `dev/gym.jsx` | gym-engine agent (later also the item artist) |
| `src/exercises/**`, `dev/exercises.jsx` | exercise-art agent |
| `src/index.html`, `src/main.jsx`, `src/ui/system/**`, `src/ui/app.jsx`, `src/styles/0*.css` to `src/styles/3*.css`, `dev/kit.jsx` | UI-system agent |
| `src/ui/screens/<area>/**`, `src/styles/5x-<area>.css` | the screen agent for that area (phase 2) |

## 4. State (single store, `src/core/store.js`)

```js
state = {
  v: 1,
  settings: { style: 'studio'|'arcade'|'varsity', theme: '<theme id>', appearance: 'auto'|'light'|'dark',
              unlimited: true, timeOffsetMs: 0, bodyKg: 78 },
  profile:  { id: 'me', name, handle },
  wallet:   { points, lifetime, passiveSince /* ms timestamp of last passive collection */ },
  avatar:   { skin, hair, hairColor, beard, top, bottom, shoes, accessory },   // values are catalog ids (skin/hairColor: palette keys)
  owned:    { [itemId]: count },            // everything bought, placed or not. Cosmetics and finishes: 1.
  gym:      { rooms: [Room], active: 0, expansions: 0 },
  workouts: [Workout],                      // mine, finished, oldest first
  active:   null | ActiveWorkout,           // the session in progress
  routines: [Routine],
  friends:  [Friend],                       // { id, name, handle, avatar, gym: {rooms:[Room]}, streakWeeks, lastWorkoutAt }
  strangers:[Friend],                       // other people's gyms for Rooms > Explore
  feed:     [Workout],                      // friends' finished workouts, newest first (userId = friend id)
}
Room    = { id, name, w, d, floor: itemId, wall: itemId, items: [ { uid, itemId, x, y, rot /*0..3*/ } ] }
Workout = { id, userId, name, routineId?, startedAt, endedAt, buddies: [friendId],
            exercises: [ { exId, sets: [ { type: 'normal'|'warmup'|'drop'|'super', kg, reps, done } ] } ],
            points: Breakdown }
Routine = { id, name, exercises: [ { exId, sets: [ { type, kg, reps } ] } ] }
```

Time: always use `now()` from `src/core/time.js` (`Date.now() + settings.timeOffsetMs`), never `Date.now()` directly, so the test lab can skip time.

Room grid: `x` runs along the right-hand wall direction, `y` along the left-hand wall direction, origin at the back corner. An item with `size:[w,d]` at rot 0 covers tiles `x..x+w-1`, `y..y+d-1`; rot 1 and 3 swap w and d. Wall-mounted items (`mount:'wall'`) sit on a wall: `{x, y}` where exactly one of them is -1 (`y:-1` = on the back-right wall at column x, `x:-1` = on the back-left wall at row y) and occupy `size[0]` wall panels.

## 5. Catalog schema (`src/gym/catalog.js`, pure data)

```js
{ id, kind: 'equipment'|'decor'|'floor'|'wall'|'cosmetic', name, blurb /* <= 48 chars, plain and a bit dry */, price,
  starter?: true,                // owned from day one
  // equipment + decor
  size?: [w, d], mount?: 'floor'|'wall' /* default floor */,
  muscles?: { [muscle]: bonus }, // equipment: additive multiplier contribution per muscle, e.g. 0.08 = +8%
  vibe?: number,                 // decor: small global multiplier contribution, e.g. 0.01
  use?: { pose, at: [dx, dy], face },   // where and how the avatar trains on it (engine-defined poses)
  // floor + wall: price is PER m² (floor: per tile; wall: per wall panel, panels = w + d)
  // cosmetic
  slot?: 'hair'|'beard'|'top'|'bottom'|'shoes'|'accessory', tint?: '#hex' }
```
Exports: `CATALOG`, `itemById(id)`. Muscles are the ten ids in `src/exercises/data.js` (`MUSCLES`).

Economy rules of thumb (systems agent owns the real numbers, in `src/core/economy.js`): a solid one-hour workout earns roughly 300 to 600 points before multipliers. Starter gear costs 150 to 600, serious machines 1,500 to 9,000, decor 80 to 900, finishes 15 to 90 per m², room expansion starts near 800 and multiplies by about 1.7 each time, a second floor costs about 25,000.

## 6. Design system contract

Three art directions (`settings.style`), each restyles BOTH the UI chrome and the room renderer. They share layout and behaviour; they differ in type, shape, edge treatment, motion feel, and how the room is drawn. Not copies of each other, not different apps.

| id | UI | Room |
| --- | --- | --- |
| `studio` | Apple-native: system type, large titles, soft depth, floating translucent tab bar, continuous-corner shapes | clean vector isometric, soft gradients and shadows |
| `arcade` | Habbo-era pixel: crisp 2px edges, small radii, pixel display face for numbers and titles, stepped motion | pixel art: low-res render scaled up with hard edges, dark outlines, limited palette |
| `varsity` | bold sport: heavy condensed italic display type, pill controls, high-contrast blocks | toon: thick ink outlines, flat saturated fills, blob shadows |

Colour themes (`settings.theme`) are orthogonal to style: one accent family each, at least five, every one working in light and dark. `settings.appearance` = auto follows the host/system.

Root attributes on `<html>`: `data-style`, `data-gbtheme`, and `data-theme="light|dark"` (the artifact host may also set `data-theme`; when `appearance` is auto, do not override it, and fall back to `prefers-color-scheme`).

CSS tokens every screen uses (UI-system agent defines them in `src/styles/00-tokens.css`; screen agents never hard-code colours, radii, fonts or shadows):

```
--bg, --bg-raised, --bg-sunken, --fill, --fill-strong           surfaces and control fills
--ink, --ink-2, --ink-3                                         text: primary, secondary, tertiary
--line                                                          hairlines / borders
--accent, --accent-ink (text on accent), --accent-soft          the one accent
--good, --warn, --bad                                           semantic only
--points                                                        the points/coin colour (constant meaning)
--font-ui, --font-display, --font-num                           families
--t-large, --t-title, --t-headline, --t-body, --t-callout, --t-foot, --t-caption   type scale (size/line-height)
--r-s, --r-m, --r-l, --r-pill                                   radius scale (style-dependent)
--bw                                                            border width (style-dependent)
--shadow-1, --shadow-2                                          elevation
--ease, --dur-1, --dur-2                                        motion
--tabbar-h, --safe-b                                            layout
```

Layout rules for all screens:
- Phone-first. On screens wider than ~700px the app renders inside a centered phone-sized frame; prototype controls (style, theme, test lab) sit beside the frame.
- Group with spacing, hairlines and type first. A card is allowed when it is a distinct object (a feed post, a routine, a shop item). Never a card inside a card inside a card: maximum nesting is one card on the page background.
- Touch targets at least 44x44. Body text at least 15px, nothing under 11px. Contrast: 4.5:1 for text, 3:1 for large/bold text and control edges, in both appearances, in all themes.
- Numbers use tabular figures. Points always appear with the points glyph and `--points`.
- One accent colour means "primary action / selected / mine". Semantic colours only for state.
- Motion: purposeful and short; everything must still work with reduced motion.

## 7. Game rules (systems agent turns these into pure, tested functions)

- **Workout points**: per done set from load x reps (bodyweight exercises use `bodyKg * bwFactor + kg`), scaled sublinearly so volume junk does not dominate; set-type factors (warm-up low, drop/superset slightly high); an intensity factor from how close the set's estimated 1RM is to your best; a modest duration term; then per exercise the gym's muscle multiplier (primary muscles weigh more than secondary); then focus-offer and buddy bonuses. Return a `Breakdown` the UI can show line by line.
- **Gym multipliers**: per muscle `1 + sum of equipment contributions` with diminishing returns for stacking the same muscle; decor adds a small capped global `vibe`; dust subtracts.
- **Consistency**: computed from workouts in the trailing weeks. Levels (e.g. Off, Warming up, Consistent, Locked in). At Consistent or better the character trains passively.
- **Passive income**: points per hour = base by consistency level x average gym multiplier; accrues since `wallet.passiveSince`, capped (e.g. 12 hours); collected with one tap.
- **Dust**: 0..1 from days since the last workout (clean for the first ~3 days, fully dusty at ~14). Affects rendering and applies a multiplier penalty. One workout clears it.
- **Focus offer**: only when consistent. Finds the muscle with the lowest recent training load relative to the others (primary counts full, secondary half, trailing ~3 weeks). Offers a multiplier (e.g. x1.5) on exercises whose primary muscles include it, valid for the next workout. No offer when training is balanced.
- **Buddy bonus**: +15% per buddy who also finishes, capped at +30%.
- **Space**: expansion n costs `round(base * growth^n)`, grows the room by one tile in both directions up to a cap; extra floors add a new empty room.
- **Finishes**: floor cost = price x (w x d); wall cost = price x (w + d). Changing room size after buying a finish: the finish extends for free (keep it simple).

## 8. Seed content

The user (`me`) has about seven weeks of believable history (3 to 4 sessions a week, slowly rising loads, legs trained less than upper body so a focus offer appears) but still the day-one gym, so every system has something to show and the gym is theirs to build. Friends (6) and strangers (6) have names that fit a Dutch/Belgian friend group mixed with a few international ones, varied avatars, and gyms at different stages (one barely started, a few mid, one or two impressive, one dusty). No Jane Doe, no Acme.
