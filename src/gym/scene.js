// Scene building blocks shared by the live engine and the thumbnail renderers: model lookup, cached sprites
// (items, shadows, room base, overlays), and hit masks. Nothing here knows about cameras or input.
import { ZK, WALL_H } from './iso.js';
import { box, solids, placement, display, extent, boxOf, depthSort } from './kit.js';
import { makeShader } from './shade.js';
import { paintGroups } from './raster-vector.js';
import { rasterGroups } from './raster-pixel.js';
import { itemById } from './catalog.js';
import { isWallItem, footprintOf } from './placement.js';
import { EQUIPMENT_MODELS } from './models.js';
import { DECOR_MODELS } from './models-decor.js';
import { roomGroups, fixtureGroups } from './roomlayer.js';
import { itemWebOps } from './dust.js';
import { floorFinish } from './finishes.js';
import { luma } from './color.js';
import { DEFAULT_PALETTES, paletteKey } from './palette.js';

export const MODELS = { ...EQUIPMENT_MODELS, ...DECOR_MODELS };
export const PIXEL_S = 16;                     // hit masks and the default arcade resolution: art pixels per unit

// Arcade resolution for a wanted size of zDev device pixels per unit: art pixels per unit S (even, so tiles stay
// clean 2:1 diamonds) shown at a whole-number scale s. Prefers filling the space, then staying near 16.
export function pixelFit(zDev) {
  let best = { s: 1, S: 12, score: -1 };
  for (let s = 1; s <= 12; s++) for (let S = 12; S <= 22; S += 2) {
    if (s * S > zDev + 1e-6) continue;
    const score = (s * S) / zDev - Math.abs(S - PIXEL_S) * 0.012;
    if (score > best.score) best = { s, S, score };
  }
  return best;
}
const crates = new Map();
// Unknown ids still draw: a plain crate sized to the footprint, so a missing model is obvious but harmless.
export function modelOf(def) {
  if (MODELS[def.id]) return MODELS[def.id];
  if (!crates.has(def.id)) {
    const [w, d] = def.size || [1, 1];
    crates.set(def.id, { prims: isWallItem(def) ? [box(0.1, 0, 0.9, w - 0.2, 0.04, 0.8, 'wood')] : [box(0.14, 0.14, 0, w - 0.28, d - 0.28, 0.55, 'wood')] });
  }
  return crates.get(def.id);
}

const P2 = (x, y, z) => [x - y, (x + y) * 0.5 - z * ZK];
export const dustStep = (dust) => Math.round(Math.max(0, Math.min(1, dust || 0)) * 5) / 5;

// Everything a sprite depends on besides its own identity.
export function makeEnv(style, palette, dust, S) {
  const pixel = style === 'arcade', step = dustStep(dust), scale = pixel ? Math.round(S) : Math.round(S * 100) / 100;
  const sh = makeShader(style, palette, step);
  return {
    style, pixel, sh, S: scale, palette, dust: step, key: `${style}|${paletteKey(palette)}|${step}|${scale}`,
    // ink widths in units: constant on screen-sized rooms, never below a hairline, never swallowing a thumbnail
    st: style === 'varsity' ? { ink: sh.ink, outW: Math.min(0.12, Math.max(0.075, 1.6 / scale)), inW: Math.min(0.05, Math.max(0.03, 0.8 / scale)), hardBlobs: true } : { seam: true },
  };
}

// ---- sprite cache --------------------------------------------------------------------------------------
const cache = new Map();
const LIMIT = 600;
function cached(key, make) {
  let v = cache.get(key);
  if (v) { cache.delete(key); cache.set(key, v); return v; }
  v = make();
  cache.set(key, v);
  if (cache.size > LIMIT) cache.delete(cache.keys().next().value);
  return v;
}

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Rasterise display groups into a sprite { canvas, x, y, S }: (x, y) is the canvas origin relative to the
// display origin, in pixels at scale S. opts.blend keeps real alpha and skips outlines (overlays, shadows).
export function renderGroups(groups, env, opts = {}) {
  if (env.pixel) {
    const r = rasterGroups(groups, env.S, { ink: opts.blend ? null : env.sh.ink, blend: opts.blend });
    return { canvas: r.canvas, x: r.x, y: r.y, S: env.S };
  }
  const S = opts.S || env.S, [x0, y0, x1, y1] = extent(groups), pad = Math.ceil((env.st.outW || 0) * S) + 2;
  const ox = Math.ceil(-x0 * S) + pad, oy = Math.ceil(-y0 * S) + pad;
  const canvas = newCanvas(x1 * S + ox + pad, y1 * S + oy + pad);
  paintGroups(canvas.getContext('2d'), groups, S, ox, oy, opts.blend ? { seam: false, hardBlobs: env.st.hardBlobs } : env.st);
  return { canvas, x: -ox, y: -oy, S };
}

export function drawSprite(ctx, sp, X, Y, k = 1, lift = 0) {
  ctx.drawImage(sp.canvas, Math.round(X + sp.x * k), Math.round(Y + sp.y * k - lift), sp.canvas.width * k, sp.canvas.height * k);
}

// A flat-colour copy of a sprite (selection outlines, invalid tint).
export function tinted(sp, colour) {
  sp.tints = sp.tints || {};
  if (!sp.tints[colour]) {
    const c = newCanvas(sp.canvas.width, sp.canvas.height), g = c.getContext('2d');
    g.drawImage(sp.canvas, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height);
    sp.tints[colour] = { canvas: c, x: sp.x, y: sp.y, S: sp.S };
  }
  return sp.tints[colour];
}

// ---- items ---------------------------------------------------------------------------------------------
// variant: rot 0..3 for floor items, 'R' / 'L' for the two walls.
export const variantOf = (def, it) => (isWallItem(def) ? (it.y === -1 ? 'R' : 'L') : it.rot & 3);

function placer(def, variant, x, y, offsets) {
  if (variant === 'R') return placement([def.size[0], 1], 0, x, 0, 0, offsets);
  if (variant === 'L') return placement([def.size[0], 1], 3, 0, y, 0, offsets);
  return placement(def.size, variant, x, y, 0, offsets);
}

// Solids of a placed item in room space. offsets moves the model's tagged parts (see kit.placement).
export const placedSolids = (def, it, offsets) => solids(modelOf(def).prims, placer(def, variantOf(def, it), it.x, it.y, offsets));

const geoCache = new Map();
// Style-independent facts about a model in one orientation, at the origin.
export function geometry(def, variant) {
  const key = def.id + '|' + variant;
  let g = geoCache.get(key);
  if (g) return g;
  const model = modelOf(def), T = placer(def, variant, 0, 0, null), list = solids(model.prims, T), bb = boxOf(list);
  for (const s of list) for (const d of s.decals) for (const p of d.pts) if (p[2] > bb[5]) bb[5] = p[2];
  const mb = boxOf(solids(model.prims));
  const webs = (model.webs || (mb[5] > 0.15 && !isWallItem(def) ? [[[mb[0], mb[4], mb[5]], [mb[0], mb[4], Math.max(0.02, mb[5] - 0.55)], [Math.min(mb[3], mb[0] + 0.55), mb[4], mb[5]]]] : []))
    .map((tri) => tri.map((p) => T.pt(p)));
  g = { list, bb, flat: bb[5] <= 0.06, webs, shadow: list.filter((s) => s.shadow && s.bb[2] < 1.2).map((s) => s.bb) };
  geoCache.set(key, g);
  return g;
}

export function itemSprite(def, variant, env) {
  return cached(`i|${env.key}|${def.id}|${variant}`, () => {
    const g = geometry(def, variant), groups = display(g.list, env.sh);
    const web = itemWebOps(g.webs, env.sh, env.dust);
    if (web.length) groups.push({ ops: web, ink: false });
    return renderGroups(groups, env);
  });
}

function softShadow(polys, S, blur, alpha) {
  const groups = [{ ops: polys.map((p) => ({ t: 0, p, f: '#000000' })), ink: false }];
  const [x0, y0, x1, y1] = extent(groups), pad = Math.ceil(blur * 2.5) + 2;
  const ox = Math.ceil(-x0 * S) + pad, oy = Math.ceil(-y0 * S) + pad, w = Math.ceil(x1 * S + ox + pad), h = Math.ceil(y1 * S + oy + pad);
  const solid = newCanvas(w, h);
  paintGroups(solid.getContext('2d'), groups, S, ox, oy, { seam: true });
  const canvas = newCanvas(w, h), g = canvas.getContext('2d');
  g.shadowColor = `rgba(16,12,28,${alpha})`; g.shadowBlur = blur; g.shadowOffsetX = w + 8;
  g.drawImage(solid, -(w + 8), 0);
  return { canvas, x: -ox, y: -oy, S };
}

const ellipse = (cx, cy, rx, ry, n = 20) => { const p = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push(...P2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0)); } return p; };

// Contact shadow of an item: blurred in studio, a blob in varsity, a hard pixel patch in arcade.
export function shadowSprite(def, variant, env) {
  return cached(`s|${env.key}|${def.id}|${variant}`, () => {
    const g = geometry(def, variant);
    if (!g.shadow.length) return null;
    if (env.style === 'varsity') {
      const bb = boxOf(g.shadow.map((b) => ({ bb: b })));
      return renderGroups([{ ops: [{ t: 0, p: ellipse((bb[0] + bb[3]) / 2 + 0.05, (bb[1] + bb[4]) / 2 + 0.05, (bb[3] - bb[0]) * 0.54 + 0.06, (bb[4] - bb[1]) * 0.54 + 0.06), f: '#15151b', al: 0.2 }], ink: false }], env, { blend: true });
    }
    const polys = g.shadow.map((b) => [...P2(b[0] - 0.03, b[1] - 0.03, 0), ...P2(b[3] + 0.05, b[1] - 0.03, 0), ...P2(b[3] + 0.05, b[4] + 0.05, 0), ...P2(b[0] - 0.03, b[4] + 0.05, 0)]);
    if (env.pixel) return renderGroups([{ ops: polys.map((p) => ({ t: 0, p, f: '#16131f', al: 0.3 })), ink: false }], env, { blend: true });
    return softShadow(polys, env.S, env.S * 0.14, 0.5);
  });
}

export function actorShadow(env) {
  return cached(`as|${env.key}`, () => {
    if (env.style === 'studio') return renderGroups([{ ops: [{ t: 2, m: [1, 0.5, -1, 0.5, 0, 0], r: 0.44, f: '#100c1c', al: 0.34 }], ink: false }], env, { blend: true });
    return renderGroups([{ ops: [{ t: 0, p: ellipse(0, 0, 0.3, 0.3, 14), f: '#15151b', al: env.pixel ? 0.3 : 0.24 }], ink: false }], env, { blend: true });
  });
}

// ---- room ----------------------------------------------------------------------------------------------
const MAX_BASE_PIXELS = 5e6;
// The static room bitmap. Large rooms at deep zoom are rendered below screen resolution and scaled up.
export function roomSprite(room, env) {
  return cached(`r|${env.key}|${room.w}x${room.d}|${room.floor}|${room.wall}`, () => {
    const { under, base } = roomGroups(room, env.sh, env.dust), groups = [...under, ...base];
    if (env.pixel) return renderGroups(groups, env);
    const [x0, y0, x1, y1] = extent(groups), px = (x1 - x0) * (y1 - y0) * env.S * env.S;
    return renderGroups(groups, env, { S: px > MAX_BASE_PIXELS ? env.S * Math.sqrt(MAX_BASE_PIXELS / px) : env.S });
  });
}

export const fixtureSprite = (kind, env) => cached(`f|${env.key}|${kind}`, () => renderGroups(fixtureGroups(kind, env.sh), env));

// Build-mode grid for a room's floor: light lines on dark floors, dark lines on light ones.
export function gridSprite(room, env) {
  return cached(`g|${env.key}|${room.w}x${room.d}|${room.floor}`, () => {
    const { w, d } = room, ops = [], c = luma(floorFinish(room.floor).edge) < 0.45 ? '#ffffff' : '#14131c', lw = env.pixel ? 0.01 : 0.03;
    for (let x = 0; x <= w; x++) ops.push({ t: 1, p: [...P2(x, 0, 0), ...P2(x, d, 0)], f: c, w: lw, al: 0.34 });
    for (let y = 0; y <= d; y++) ops.push({ t: 1, p: [...P2(0, y, 0), ...P2(w, y, 0)], f: c, w: lw, al: 0.34 });
    return renderGroups([{ ops, ink: false }], env, { blend: true });
  });
}

// Highlight for a footprint: w x d tiles on the floor, or `w` panels on a wall ('R' / 'L').
export function footprintSprite(w, d, wall, colour, env) {
  return cached(`fp|${env.key}|${w}x${d}|${wall}|${colour}`, () => {
    const pts = wall === 'R' ? [[0, 0, 0.04], [w, 0, 0.04], [w, 0, WALL_H - 0.04], [0, 0, WALL_H - 0.04]]
      : wall === 'L' ? [[0, 0, 0.04], [0, w, 0.04], [0, w, WALL_H - 0.04], [0, 0, WALL_H - 0.04]]
        : [[0.03, 0.03, 0], [w - 0.03, 0.03, 0], [w - 0.03, d - 0.03, 0], [0.03, d - 0.03, 0]];
    const p = pts.flatMap((q) => P2(...q));
    return renderGroups([{ ops: [{ t: 0, p, f: colour, al: 0.38 }, { t: 1, p: [...p, p[0], p[1]], f: colour, w: env.pixel ? 0.01 : 0.05, al: 0.95 }], ink: false }], env, { blend: true });
  });
}

// ---- hit masks -----------------------------------------------------------------------------------------
let maskShader = null;
const masks = new Map();
// 1-bit silhouette of an item at PIXEL_S, used to pick the item under a pointer.
export function maskOf(def, variant) {
  const key = def.id + '|' + variant;
  if (!masks.has(key)) {
    maskShader = maskShader || makeShader('arcade', DEFAULT_PALETTES.light, 0);
    masks.set(key, rasterGroups(display(geometry(def, variant).list, maskShader), PIXEL_S, { mask: true, maskOnly: true }));
  }
  return masks.get(key);
}

// Is screen-unit point (ux, uy), relative to the item's origin, on the item? `slop` widens the test (pixels at PIXEL_S).
export function maskHit(mask, ux, uy, slop = 1) {
  const mx = Math.round(ux * PIXEL_S) - mask.x, my = Math.round(uy * PIXEL_S) - mask.y;
  for (let dy = -slop; dy <= slop; dy++) for (let dx = -slop; dx <= slop; dx++) {
    const x = mx + dx, y = my + dy;
    if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.mask[y * mask.w + x]) return true;
  }
  return false;
}

// ---- layout --------------------------------------------------------------------------------------------
// Resolve a room's items against the catalog. moves: Map uid -> { x, y, rot } overrides (live drags, optimistic commits).
export function describeRoom(room, moves) {
  const standing = [], flats = [], walls = [];
  for (const raw of room.items) {
    const def = itemById(raw.itemId);
    if (!def || !def.size) continue;
    const mv = moves && moves.get(raw.uid), it = mv ? { ...raw, ...mv } : raw, variant = variantOf(def, it), g = geometry(def, variant);
    const e = { it, def, variant, geo: g };
    if (isWallItem(def)) { walls.push(e); continue; }
    const [fw, fd] = footprintOf(def, it.rot);
    e.fw = fw; e.fd = fd;
    e.bb = [it.x, it.y, 0, it.x + fw, it.y + fd, Math.max(0.1, g.bb[5])];
    (g.flat ? flats : standing).push(e);
  }
  flats.sort((a, b) => a.it.x + a.it.y - b.it.x - b.it.y);
  return { standing, flats, walls };
}


// ---- painting ------------------------------------------------------------------------------------------
// A target T = { g, S, ox, oy }: a 2D context, pixels per unit, and the pixel position of the room origin.
export const spot = (T, x, y, z = 0) => [T.ox + (x - y) * T.S, T.oy + ((x + y) * 0.5 - z * ZK) * T.S];

const RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];

// Paint dynamic display groups (avatars, equipment in use) straight onto the target.
export function paintLive(T, env, groups) {
  if (env.pixel) {
    const r = rasterGroups(groups, env.S, { ink: env.sh.ink });
    T.g.drawImage(r.canvas, T.ox + r.x, T.oy + r.y);
  } else paintGroups(T.g, groups, T.S, T.ox, T.oy, env.st);
}

// Paint one placed item. s: { selected: colour, tint: colour (invalid), lift (units), dx (pixels), alpha }.
export function paintItem(T, env, e, s = {}) {
  const sp = itemSprite(e.def, e.variant, env), k = T.S / sp.S, { g } = T;
  const [X0, Y] = e.variant === 'R' ? spot(T, e.it.x, 0) : e.variant === 'L' ? spot(T, 0, e.it.y) : spot(T, e.it.x, e.it.y);
  const X = X0 + (s.dx || 0), lift = (s.lift || 0) * ZK * T.S;
  if (s.selected) {
    // a white halo under the coloured ring keeps the selection readable on any floor or item colour
    const o = env.pixel ? 1 : Math.max(2, Math.round(T.S * 0.045));
    for (const [ring, r] of [[tinted(sp, '#ffffff'), o * 2], [tinted(sp, s.selected), o]]) {
      for (const [dx, dy] of RING) drawSprite(g, ring, X + Math.round(dx * r), Y + Math.round(dy * r), k, lift);
    }
  }
  if (s.alpha != null) g.globalAlpha = s.alpha;
  drawSprite(g, sp, X, Y, k, lift);
  if (s.tint) { g.globalAlpha = 0.42; drawSprite(g, tinted(sp, s.tint), X, Y, k, lift); }
  g.globalAlpha = 1;
}

export function paintShadow(T, env, e, alpha = 1) {
  const sp = shadowSprite(e.def, e.variant, env);
  if (!sp) return;
  const [X, Y] = spot(T, e.it.x, e.it.y);
  T.g.globalAlpha = alpha;
  drawSprite(T.g, sp, X, Y, T.S / sp.S);
  T.g.globalAlpha = 1;
}

// Paint a whole room. o: { state(e) -> paintItem state, live: [{ bb, draw(T) }] extra depth-sorted things,
// hidden: Set of uids not drawn as plain sprites (they appear in `live`), overlay(T) drawn on the floor under items,
// shadows(T) extra floor shadows }. A live thing may carry `item` (the layout entry it stands for).
// Returns the standing items in paint order (for hit testing).
export function paintRoom(T, env, room, layout, fixtures, o = {}) {
  const state = o.state || (() => undefined), base = roomSprite(room, env);
  drawSprite(T.g, base, T.ox, T.oy, T.S / base.S);
  for (const e of layout.flats) paintItem(T, env, e, state(e));
  if (o.overlay) o.overlay(T);
  for (const e of layout.standing) { const s = state(e); paintShadow(T, env, e, s && s.lift ? 0.6 : 1); }
  if (o.shadows) o.shadows(T);
  for (const e of layout.walls) paintItem(T, env, e, state(e));
  const things = layout.standing.filter((e) => !(o.hidden && o.hidden.has(e.it.uid))).map((e) => ({ bb: e.bb, e }));
  const order = depthSort(o.live ? things.concat(o.live) : things);
  for (const t of order) { if (t.e) paintItem(T, env, t.e, state(t.e)); else t.draw(T); }
  for (const f of fixtures) { const sp = fixtureSprite(f.kind, env), [X, Y] = spot(T, f.x, f.y); drawSprite(T.g, sp, X, Y, T.S / sp.S); }
  return order.filter((t) => t.e || t.item).map((t) => t.e || t.item);
}
