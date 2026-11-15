# Gym engine

The isometric gym room: renderer, avatar, build mode, thumbnails. Canvas 2D, plain ES modules. The engine never
imports the store; it gets data and callbacks and reports intents. Import everything from `src/gym/index.js`.

## Coordinates

Room space follows `docs/SPEC.md` section 4: `x` runs along the back-right wall, `y` along the back-left wall, `z`
is up, origin at the back corner, 1 tile = 1 unit. The camera looks at the `+x` and `+y` sides of everything.
`rot` and `face` are quarter turns: 0 faces `+y` (screen left), 1 faces `-x`, 2 faces `-y`, 3 faces `+x` (screen right).

## Public API

```js
import {
  GymCanvas, createGymEngine,
  renderItemThumb, renderRoomThumb, renderAvatarPortrait, itemThumbUrl, roomThumbUrl, avatarPortraitUrl,
  CATALOG, itemById, SHOWROOMS, starterRoom,
  canPlaceIn, findSpot, footprintOf, areaOf, isWallItem,
  DEFAULT_PALETTES, paletteFromCSS, SKIN, HAIR, DEFAULT_AVATAR, POSE_IDS, STYLES,
} from '../gym/index.js';
```

### `<GymCanvas {...props} ref={gym} />`

Fills its parent (give the parent a size). Props, all optional except `room`:

| prop | type | notes |
| --- | --- | --- |
| `room` | `Room` | never mutated. Pass a new object to change it |
| `avatar` | `state.avatar` | the player's character. Omit for an empty room |
| `guests` | `[{ id, avatar }]` | other people in the room; they wander, sit and train on their own |
| `style` | `'studio' \| 'arcade' \| 'varsity'` | art direction (this is not CSS) |
| `palette` | palette object | see Palette. Defaults to `DEFAULT_PALETTES.light` |
| `dust` | `0..1` | cobwebs, dust bunnies, grime, motes, desaturation |
| `training` | `boolean` | on: the avatar walks to equipment and works out, switching now and then |
| `mode` | `'view' \| 'build'` | build shows the grid and enables selecting, dragging, placing |
| `insets` | `{ top, right, bottom, left }` | CSS pixels covered by UI; the room is fitted into what is left |
| `reducedMotion` | `boolean` | overrides `prefers-reduced-motion` (static poses, no motes, no tweens) |
| `canPlace` | `(itemId, x, y, rot, ignoreUid) => boolean` | validity of a spot. Defaults to always true |
| `onSelect` | `(uid \| null) => void` | build: selection changed |
| `onMove` | `({ uid, x, y, rot }) => void` | build: a placed item was moved or rotated to a valid spot. Update the room |
| `onPlace` | `({ itemId, x, y, rot }) => void` | build: `commitPlacement()` accepted a new item. Add it to the room |
| `onStore` | `({ uid }) => void` | build: `store()` on the selected item. Remove it from the room |
| `onPlacementChange` | `({ uid, itemId, x, y, rot, valid } \| null) => void` | live state of a drag (`uid` set) or of the new-item ghost (`uid: null`); `null` when it ends |
| `onTap` | `({ uid, itemId, x, y }) => void` | view: tap on an item (`uid`) or a floor tile (`uid: null`) |
| `class`, `label` | string | class for the canvas, accessible label |

Wall items use `{ x, y }` with one of them `-1` (SPEC section 4); `rot` is ignored for them.

Imperative handle (`ref.current`):

```js
beginPlacement(itemId)   // build: show a ghost for a new item at the nearest valid spot -> boolean
commitPlacement()        // place the ghost if its spot is valid (calls onPlace) -> boolean
cancel()                 // drop the ghost / revert a drag in progress
rotate()                 // rotate the ghost or the selected item (nudges it if needed) -> boolean
nudge(dx, dy)            // move the ghost or the selected item by tiles -> boolean (valid)
store()                  // selected item -> onStore; with a ghost active it cancels -> boolean
select(uid | null)       // select a placed item
refit(animate = true)    // fit the room to the viewport again
sendAvatarTo(uid)        // view: walk the avatar to that item and train on it -> boolean
```

Gestures. View: drag pans, pinch or wheel zooms, double tap refits, tap reports `onTap`. Build: tap selects, drag
on the selected item (or the ghost) moves it with snapping, long press picks up an unselected item (a mouse can
drag any item directly), drag elsewhere pans, tap on a tile moves the ghost there. Dragging an item never pans.
Invalid spots tint the item with `palette.bad`; releasing there snaps it back.

### `createGymEngine(canvas, props) -> engine`

What `GymCanvas` wraps; use it directly outside Preact. `engine.update(partialProps)`, `engine.resize()` (call when
the canvas box changes), the imperative methods above, and `engine.destroy()`.

### Thumbnails

```js
renderItemThumb(itemId, { style, palette, size = 72, dpr, avatar })              -> canvas
renderRoomThumb(room, { style, palette, width = 160, height = 120, dpr, avatar, dust }) -> canvas
renderAvatarPortrait(avatar, { style, palette, size = 96, crop: 'full' | 'head', dpr }) -> canvas
itemThumbUrl(itemId, opts) / roomThumbUrl(room, opts) / avatarPortraitUrl(avatar, opts)  -> data URL (cached)
```

Sizes are CSS pixels; canvases are `size * dpr`. `renderItemThumb` handles every catalog kind: equipment and decor
show the model, floors and walls a swatch, cosmetics the avatar wearing the item (`avatar` sets the base look).
`crop: 'head'` is the small round-avatar crop for feeds.

### Palette

`{ bg, bgSunken, ink, accent, accentInk, accentSoft, good, bad, dark }`, all `#rrggbb` plus the boolean.
`paletteFromCSS(el = document.documentElement)` reads the SPEC section 6 tokens. The palette tints the backdrop,
selection and validity highlights, and every model colour written as `$accent`, `$accentDeep`, `$accentPale`,
`$accentSoft`, `$accentInk`, `$ink`, `$bg` (mats, stripes, plates, the paint stripe, the LED strip).

### Placement helpers (pure)

`canPlaceIn(room, itemId, x, y, rot, ignoreUid)` (bounds + no overlap), `findSpot(room, itemId, canPlace, cx, cy)`,
`footprintOf(def, rot) -> [w, d]`, `areaOf(def, x, y, rot)`, `isWallItem(def)`.

## Files

| file | what |
| --- | --- |
| `catalog.js`, `showrooms.js` | pure data |
| `iso.js`, `color.js` | projection and colour maths |
| `kit.js` | primitives, solids, depth ordering, display lists |
| `shade.js` | the three shaders and the material table `MAT` |
| `raster-vector.js`, `raster-pixel.js` | the two rasterisers (studio and varsity / arcade and hit masks) |
| `models.js`, `models-decor.js`, `models-avatar.js` | equipment, decor, cosmetics |
| `finishes.js`, `painter.js`, `roomlayer.js`, `dust.js` | floors, walls, the static room, dust |
| `avatar.js`, `actor.js` | skeleton, poses, dressing / behaviour |
| `scene.js` | sprite cache, shadows, hit masks, room painting |
| `engine.js`, `GymCanvas.jsx`, `thumbs.js`, `placement.js`, `palette.js` | the public pieces |

## Models

A model is `{ prims, anchors?, webs? }` in `EQUIPMENT_MODELS` (`models.js`) or `DECOR_MODELS` (`models-decor.js`),
keyed by catalog id. `prims` is a flat list of plain objects made with the kit constructors. Model space: `x` in
`[0, w]`, `y` in `[0, d]` of the catalog `size` at rot 0, `z` up, in tiles. Put the interesting side toward `+y` or
`+x`. Rotation, ordering, shading, outlines, shadows, thumbnails and hit masks are derived; a model never draws.

```js
box(x, y, z, w, d, h, c, o)                 // also your slab: a box with a small h
cyl(x, y, z, r, h, c, o)                    // (x, y, z) = centre of the first cap; o.axis 'z' | 'x' | 'y', o.r2 taper, o.cap colour
prism(axis, at, len, [[u, z], ...], c, o)   // convex profile extruded along 'x' (u = y) or 'y' (u = x); o.cap, o.smooth
wedge(x, y, z, w, d, h0, h1, c, o)          // box whose top slopes from h0 to h1 along +y (o.axis 'y': along +x)
rod([x, y, z], [x, y, z], r, c, o)          // capsule between two points: bars, cables, handles, limbs
ball(x, y, z, r, c, o)                      // sphere
cap(x, y, z, r, [ax, ay, az], a0, a1, c, o) // sphere cap / zone between polar angles a0..a1 around an axis
poly([[x, y, z], ...], c, o)                // decal: flat patch painted on the solid listed before it; o.b brightness 0..1, o.al alpha
line([[x, y, z], ...], c, w, o)             // decal: stroke of width w (tiles) on the solid listed before it
shift(prims, dx, dy, dz)                    // translated copy of a list (repeat plates, legs, uprights)
```

Colour `c`: `'#rrggbb'`, a material name from `MAT` in `shade.js` (`steel`, `chrome`, `iron`, `gunmetal`, `rubber`,
`pad`, `wood`, `tape`, `leaf`, `glass`, `screen`, `lamp`, ...), or a palette token (`'$accent'`). Options `o` on any
solid: `m` (material kind; `'glow'` is unshaded), `part` (see below), `shadow: false` (no contact shadow),
`film: false` (no dust film on top), `ink: false` (no outline), `bias` (depth nudge). Rods also take `pa` / `pb` to
tag one end.

Light is fixed: tops brightest, `+y` faces mid, `+x` faces in shade. Decals and thin parts: at arcade resolution a
tile is about 32 x 16 pixels, so anything under 0.06 tiles is a pixel at best. Use rods for thin bars.

Wall-mounted models (`mount: 'wall'`) are authored against the back-right wall: `x` along the wall in
`[0, size[0]]`, `y` = distance out of the wall (keep it under 0.1), `z` = height. The engine turns them for the
left wall.

A model whose highest point is 0.06 or lower is flat (mats): it is drawn under everything and people walk over it.

`anchors` (equipment):

- `z`: height of the surface the avatar lies, sits or stands on.
- `grip: [[x, y, z], [x, y, z]]`: where the hands hold at rest (bar, handles). Poses reach for these.
- `rail: [dy, dz]`: unit direction a sled travels (leg press).

Moving parts: tag primitives with `part: 'load'` (follows the bar or the pose's load: barbell, weight stack, sled)
or `'gripL'` / `'gripR'` (follows the avatar's left / right hand: cable handles). They only move while in use.

`webs: [[apex, end, end], ...]`: triangles in real corners of the model where cobwebs grow with dust. Without it a
web fans out of the top-left corner of the model's front face; `webs: []` disables it.

### Adding an item

1. `catalog.js`: add the entry (schema: SPEC section 5). Equipment needs `muscles` and
   `use: { pose, at: [dx, dy], face }`: `at` is a tile offset inside the footprint at rot 0 (fractions allowed);
   the avatar's root is the centre of that tile, facing `face`.
2. `models.js` or `models-decor.js`: add the model under the same id.
3. `node build.mjs --dev gym`, then `node tools/shot.mjs dist/dev-gym.html shots/gym/x.png --style arcade --h 2500
   --eval "await gymdev.set({ view: 'thumbs' })"` and look at it in all three styles; then place it in a room.

An id without a model draws as a plain crate. Floors and walls: add an entry to `FLOORS` / `WALLS` in `finishes.js`
(the painter API is described at the top of that file). Cosmetics: add the catalog entry, map its id to a shape in
`COSMETICS` (`models-avatar.js`), and add a shape builder to `HAIR_SHAPES` / `BEARD_SHAPES` / `ACC_SHAPES` if it
is a new shape. Clothes take their colour from the catalog `tint`; hair and beards from `avatar.hairColor`.

## Avatar and poses

`avatar = { skin: 's1'..'s5', hair, hairColor: 'h1'..'h5', beard, top, bottom, shoes, accessory }` with catalog
ids. Missing fields fall back to `DEFAULT_AVATAR`. The avatar is 1.35 avatar units per tile (`AVATAR_SCALE`), about
1.65 tiles tall.

Poses (`POSE_IDS`), usable as `use.pose`:

| pose | what | needs |
| --- | --- | --- |
| `bench-press` | lying press; holds the model's bar if it has `grip`, dumbbells otherwise | `anchors.z` (bench top) |
| `squat` | barbell back squat; the `load` part rides on the shoulders | `anchors.grip` |
| `curl` | standing alternating dumbbell curls | |
| `press` | standing overhead dumbbell press | |
| `pull-up` | hangs from `grip` and pulls up | `anchors.grip` |
| `cable` | standing cable fly; `gripL` / `gripR` parts follow the hands | `anchors.grip` |
| `run` | running in place | `anchors.z` (deck height) |
| `leg-press` | seated, pushes the sled along `rail`; the foot plate rests 0.2 avatar units up the rail from the hips | `anchors.z`, `anchors.rail` |
| `idle`, `walk`, `sit` | used by the behaviour code (sitting happens on `bench-press` items) | |

A pose is a function `(t seconds, c) => joints` in `POSES` (`avatar.js`), in the avatar's own frame
`[side, forward, up]`; `c = { z, grip, rail }` are the model's anchors in that frame. It returns `pelvis`, `chest`,
`hl`, `hr`, `fl`, `fr` and optional `head`, `elbow` / `knee` bend hints, `bar`, `load`, `props: 'dumbbells'`,
`effort`. Elbows and knees are solved. Add a pose by adding a function there and a still time to `POSE_STILL`.

## Rendering notes

- Static layers are bitmaps: the room (floor, walls, dust) per style / scale / dust step, one sprite per item and
  rotation, one shadow per item. Per frame the engine blits sprites and only rebuilds the avatars and the piece of
  equipment in use. The loop stops when nothing animates and when the canvas is hidden.
- Arcade draws the whole scene on a low-resolution canvas with an integer pixel rasteriser (no antialiasing), adds
  outlines there, and scales up by a whole number of device pixels. Art resolution is 12 to 22 pixels per unit,
  chosen so the room fills the view.
- Ordering: separated boxes are ordered exactly (topological sort on footprint boxes), so multi-tile items and
  people between them overlap correctly. Hit testing walks the painted order back to front against 1-bit masks.
- Dust levels are stepped in fifths for caching.

## Dev harness

`node build.mjs --dev gym` builds `dist/dev-gym.html` (`dev/gym.jsx`). `window.gymdev`:

```js
await gymdev.set({ room: 'starter'|'small'|'mid'|'big', style, dark, dust, training, mode, guests: 0..5,
                   avatar: 0..5, view: 'room'|'thumbs', fresh: true /* remount the canvas */ })
await gymdev.place(itemId, x, y, rot)    // add an item to the room -> uid
await gymdev.select(uid)
await gymdev.ghost(itemId, x, y, rot)    // start placing and move the ghost there (valid or not)
await gymdev.use(itemIdOrUid)            // send the avatar to train on it
gymdev.room, gymdev.engine
```
