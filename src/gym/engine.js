// The live gym room: camera, render loop, input, build mode. Plain DOM + Canvas 2D, no framework, no store.
// The engine never mutates the room it is given; it reports what the player wants through callbacks.
import { ZK, WALL_H, WALL_T, SLAB_T, floorAt } from './iso.js';
import { rgba, mix } from './color.js';
import { itemById } from './catalog.js';
import { isWallItem, footprintOf, findSpot } from './placement.js';
import { DEFAULT_PALETTES, paletteKey } from './palette.js';
import { avatarEntries, entriesDisplay } from './avatar.js';
import { createCrowd } from './actor.js';
import { fixtureSpots } from './roomlayer.js';
import {
  pixelFit, makeEnv, modelOf, describeRoom, variantOf, geometry, placedSolids, maskOf, maskHit, spot, drawSprite,
  paintRoom, paintLive, paintItem, paintShadow, actorShadow, gridSprite, footprintSprite,
} from './scene.js';

const DEFAULTS = {
  room: null, avatar: null, guests: [], style: 'studio', palette: DEFAULT_PALETTES.light, dust: 0, training: false, mode: 'view',
  insets: { top: 0, right: 0, bottom: 0, left: 0 }, reducedMotion: null,
  canPlace: null, onSelect: null, onMove: null, onPlace: null, onStore: null, onPlacementChange: null, onTap: null,
};
const NUDGES = [[0, 0], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
const ease = (t) => t * t * (3 - 2 * t);
const backOut = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

export function createGymEngine(canvas, initial = {}) {
  const ctx = canvas.getContext('2d'), low = document.createElement('canvas'), lowCtx = low.getContext('2d');
  const crowd = createCrowd(modelOf), motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let props = { ...DEFAULTS }, layout = null, fixtures = [], env = null, order = [];
  let cssW = 0, cssH = 0, dpr = 1, raf = 0, last = 0, clock = 0, tick = -1, dirty = true, visible = true, alive = true;
  // z = CSS pixels per unit. artS = scale the vector sprites were drawn at; pixS = arcade art pixels per unit.
  const cam = { cx: 0, cy: 0, z: 32, fitted: true, artS: 0, pixS: 16, tween: null, settle: 0 };
  const moves = new Map();          // uid -> { x, y, rot }: live drags and commits the host has not echoed back yet
  let selected = null, ghost = null, drag = null, fx = [], puffs = [], motes = [];
  const pointers = new Map();
  let press = null, pinch = null, holdTimer = 0, lastTap = null;

  const reduced = () => (props.reducedMotion == null ? !!(motionQuery && motionQuery.matches) : props.reducedMotion);
  const pixel = () => props.style === 'arcade';
  const emit = (name, arg) => { if (props[name]) props[name](arg); };
  const valid = (itemId, x, y, rot, uid) => (props.canPlace ? !!props.canPlace(itemId, x, y, rot, uid) : true);

  // ---- camera ----------------------------------------------------------------------------------------
  const pixelScale = (z = cam.z) => Math.max(1, Math.round((z * dpr) / cam.pixS));
  function roomBounds() {
    const { w, d } = props.room;
    return [-d - WALL_T - 0.1, -WALL_H * ZK - 0.45, w + WALL_T + 0.1, (w + d) / 2 + SLAB_T * ZK + 0.5];
  }
  function inner() {
    const i = props.insets, pad = 8;
    return { x: i.left + pad, y: i.top + pad, w: Math.max(40, cssW - i.left - i.right - pad * 2), h: Math.max(40, cssH - i.top - i.bottom - pad * 2) };
  }
  function fitView() {
    const b = roomBounds(), a = inner();
    const z = Math.min(a.w / (b[2] - b[0]), a.h / (b[3] - b[1])), pix = pixel() ? pixelFit(z * dpr) : null;
    return { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, z: pix ? (pix.s * pix.S) / dpr : z, pixS: pix ? pix.S : cam.pixS };
  }
  function zoomRange() {
    if (!pixel()) { const f = fitView().z; return [f * 0.8, Math.max(f * 3.2, 72)]; }
    const step = cam.pixS / dpr, fit = Math.max(1, Math.floor(fitView().z / step + 1e-6));
    return [Math.max(1, fit - 1) * step, (fit + 4) * step];
  }
  function clampCam() {
    const b = roomBounds(), [z0, z1] = zoomRange();
    cam.z = Math.min(z1, Math.max(z0, cam.z));
    cam.cx = Math.min(b[2], Math.max(b[0], cam.cx)); cam.cy = Math.min(b[3], Math.max(b[1], cam.cy));
  }
  function settleArt() { cam.artS = cam.z * dpr; }
  function refit(animate = true) {
    if (!props.room || !cssW) return;
    const to = fitView();
    cam.fitted = true;
    if (animate && !reduced() && !pixel() && cam.artS) cam.tween = { from: { cx: cam.cx, cy: cam.cy, z: cam.z }, to, t: 0 };
    else { cam.tween = null; Object.assign(cam, to); settleArt(); }
    invalidate();
  }
  // Device-pixel transform of the current view: screen = o + unit * S (arcade: in low-res pixels, shown at scale s).
  function view() {
    const a = inner(), mx = (a.x + a.w / 2) * dpr, my = (a.y + a.h / 2) * dpr;
    if (pixel()) { const s = pixelScale(), S = cam.pixS; return { s, S, ox: Math.round(mx / s - cam.cx * S), oy: Math.round(my / s - cam.cy * S) }; }
    const S = cam.z * dpr, still = !cam.tween && !pinch && !cam.settle;
    return { s: 1, S, ox: still ? Math.round(mx - cam.cx * S) : mx - cam.cx * S, oy: still ? Math.round(my - cam.cy * S) : my - cam.cy * S };
  }
  function toUnits(px, py) { const v = view(); return [((px * dpr) / v.s - v.ox) / v.S, ((py * dpr) / v.s - v.oy) / v.S]; }
  function zoomAt(px, py, z) {
    const [ux, uy] = toUnits(px, py);
    cam.z = z; cam.fitted = false; cam.tween = null; clampCam();
    const [nx, ny] = toUnits(px, py);
    cam.cx += ux - nx; cam.cy += uy - ny; clampCam();
    cam.settle = 0.18;
    invalidate();
  }

  // ---- room state ------------------------------------------------------------------------------------
  function relayout() {
    layout = props.room ? describeRoom(props.room, moves) : null;
    fixtures = props.room ? fixtureSpots(props.room) : [];
  }
  function people() {
    const list = props.avatar ? [{ id: 'me', avatar: props.avatar, main: true }] : [];
    for (const g of props.guests || []) list.push({ id: 'guest:' + g.id, avatar: g.avatar });
    return list;
  }
  function syncCrowd() {
    if (props.room) crowd.sync(props.room, layout, people(), { training: props.training && props.mode !== 'build', still: reduced(), calm: props.mode === 'build' });
  }
  function seedMotes() {
    const n = reduced() || !props.room ? 0 : Math.round(Math.max(0, props.dust - 0.15) * 34);
    motes = Array.from({ length: n }, (_, i) => ({ x: ((i * 0.618) % 1) * props.room.w, y: ((i * 0.381 + 0.2) % 1) * props.room.d, z: 0.3 + ((i * 0.27) % 1) * 2, p: i * 1.7 }));
  }
  const entryOf = (uid) => layout && [...layout.standing, ...layout.flats, ...layout.walls].find((e) => e.it.uid === uid);

  // ---- build mode ------------------------------------------------------------------------------------
  function announce() {
    const d = drag && !drag.ghost ? { uid: drag.uid, itemId: drag.def.id, x: drag.x, y: drag.y, rot: drag.rot, valid: drag.valid } : ghost ? { uid: null, itemId: ghost.def.id, x: ghost.x, y: ghost.y, rot: ghost.rot, valid: ghost.valid } : null;
    emit('onPlacementChange', d);
  }
  function select(uid) {
    if (selected === uid) return;
    selected = uid;
    if (uid) fx.push({ uid, kind: 'pop', t: 0, dur: 0.2 });
    emit('onSelect', uid);
    invalidate();
  }
  function clampSpot(def, x, y, rot) {
    const { w, d } = props.room;
    if (isWallItem(def)) return y === -1 ? [Math.min(w - def.size[0], Math.max(0, x)), -1] : [-1, Math.min(d - def.size[0], Math.max(0, y))];
    const [fw, fd] = footprintOf(def, rot);
    return [Math.min(w - fw, Math.max(0, x)), Math.min(d - fd, Math.max(0, y))];
  }
  function beginPlacement(itemId) {
    const def = itemById(itemId);
    if (!def || !def.size || !props.room || props.mode !== 'build') return false;
    cancel();
    const [ux, uy] = toUnits(inner().x + inner().w / 2, inner().y + inner().h / 2), [fx0, fy0] = floorAt(ux, uy);
    const at = findSpot(props.room, itemId, (id, x, y, r) => valid(id, x, y, r, null), fx0, fy0);
    const [x, y] = at ? [at.x, at.y] : clampSpot(def, isWallItem(def) ? 0 : Math.round(fx0), isWallItem(def) ? -1 : Math.round(fy0), 0);
    ghost = { def, x, y, rot: 0, valid: valid(itemId, x, y, 0, null) };
    select(null); announce(); invalidate();
    return true;
  }
  function commitPlacement() {
    if (!ghost || ghost.sent) return false;
    if (!ghost.valid) { fx.push({ uid: '#ghost', kind: 'shake', t: 0, dur: 0.3 }); invalidate(); return false; }
    ghost.sent = true;
    fx.push({ uid: '#ghost', kind: 'land', t: 0, dur: 0.28 });
    puff(ghost.def, ghost);
    emit('onPlace', { itemId: ghost.def.id, x: ghost.x, y: ghost.y, rot: ghost.rot });
    emit('onPlacementChange', null);
    invalidate();
    return true;
  }
  function cancel() {
    if (drag && !drag.ghost) { if (drag.prev) moves.set(drag.uid, drag.prev); else moves.delete(drag.uid); relayout(); }
    const had = drag || ghost;
    drag = null; ghost = null;
    if (had) { emit('onPlacementChange', null); invalidate(); }
  }
  function rotate() {
    if (ghost && !ghost.sent) {
      if (isWallItem(ghost.def)) return false;
      ghost.rot = (ghost.rot + 1) & 3;
      [ghost.x, ghost.y] = clampSpot(ghost.def, ghost.x, ghost.y, ghost.rot);
      ghost.valid = valid(ghost.def.id, ghost.x, ghost.y, ghost.rot, null);
      announce(); invalidate();
      return true;
    }
    const e = selected && entryOf(selected);
    if (!e || isWallItem(e.def)) return false;
    const rot = (e.it.rot + 1) & 3;
    for (const [dx, dy] of NUDGES) {
      const [x, y] = clampSpot(e.def, e.it.x + dx, e.it.y + dy, rot);
      if (!valid(e.def.id, x, y, rot, e.it.uid)) continue;
      moves.set(e.it.uid, { x, y, rot }); relayout(); syncCrowd();
      fx.push({ uid: e.it.uid, kind: 'pop', t: 0, dur: 0.2 });
      emit('onMove', { uid: e.it.uid, x, y, rot });
      invalidate();
      return true;
    }
    fx.push({ uid: e.it.uid, kind: 'shake', t: 0, dur: 0.3 });
    invalidate();
    return false;
  }
  // Move the placement ghost or the selected item by whole tiles (for arrow buttons and keyboards).
  function nudge(dx, dy) {
    if (ghost && !ghost.sent) {
      const wall = isWallItem(ghost.def);
      [ghost.x, ghost.y] = clampSpot(ghost.def, ghost.x + (wall && ghost.x === -1 ? 0 : dx), ghost.y + (wall && ghost.y === -1 ? 0 : dy), ghost.rot);
      ghost.valid = valid(ghost.def.id, ghost.x, ghost.y, ghost.rot, null);
      announce(); invalidate();
      return ghost.valid;
    }
    const e = selected && entryOf(selected);
    if (!e) return false;
    const wall = isWallItem(e.def), [x, y] = clampSpot(e.def, e.it.x + (wall && e.it.x === -1 ? 0 : dx), e.it.y + (wall && e.it.y === -1 ? 0 : dy), e.it.rot);
    if ((x === e.it.x && y === e.it.y) || !valid(e.def.id, x, y, e.it.rot, e.it.uid)) { fx.push({ uid: e.it.uid, kind: 'shake', t: 0, dur: 0.3 }); invalidate(); return false; }
    moves.set(e.it.uid, { x, y, rot: e.it.rot }); relayout(); syncCrowd();
    emit('onMove', { uid: e.it.uid, x, y, rot: e.it.rot });
    invalidate();
    return true;
  }
  function store() {
    if (ghost) { cancel(); return true; }
    if (!selected) return false;
    const uid = selected;
    select(null);
    emit('onStore', { uid });
    return true;
  }
  function puff(def, at) {
    if (reduced() || isWallItem(def)) return;
    const [fw, fd] = footprintOf(def, at.rot);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      puffs.push({ x: at.x + fw / 2 + Math.cos(a) * fw * 0.5, y: at.y + fd / 2 + Math.sin(a) * fd * 0.5, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, t: 0 });
    }
  }

  function startDrag(target, px, py) {
    const [ux, uy] = toUnits(px, py);
    if (target === ghost) drag = { ghost: true, def: ghost.def, x: ghost.x, y: ghost.y, rot: ghost.rot, valid: ghost.valid, ux, uy, x0: ghost.x, y0: ghost.y };
    else {
      const e = target;
      select(e.it.uid);
      drag = { uid: e.it.uid, def: e.def, x: e.it.x, y: e.it.y, rot: e.it.rot, valid: true, ux, uy, x0: e.it.x, y0: e.it.y, prev: moves.get(e.it.uid) || null, home: { x: e.it.x, y: e.it.y, rot: e.it.rot } };
    }
    invalidate();
  }
  function dragTo(px, py) {
    const [ux, uy] = toUnits(px, py), def = drag.def;
    let x, y;
    if (isWallItem(def)) {
      const n = def.size[0], u0 = drag.y0 === -1 ? drag.x0 : -(drag.y0 + n), u = u0 + (ux - drag.ux);
      [x, y] = u + n / 2 >= 0 ? clampSpot(def, Math.round(u), -1, 0) : clampSpot(def, -1, Math.round(-u - n), 0);
    } else {
      const [fx1, fy1] = floorAt(ux, uy), [fx0, fy0] = floorAt(drag.ux, drag.uy);
      [x, y] = clampSpot(def, Math.round(drag.x0 + fx1 - fx0), Math.round(drag.y0 + fy1 - fy0), drag.rot);
    }
    if (x === drag.x && y === drag.y) return;
    drag.x = x; drag.y = y; drag.valid = valid(def.id, x, y, drag.rot, drag.uid || null);
    if (drag.ghost) Object.assign(ghost, { x, y, valid: drag.valid });
    else { moves.set(drag.uid, { x, y, rot: drag.rot }); relayout(); }
    announce(); invalidate();
  }
  function drop() {
    const d = drag;
    drag = null;
    if (d.ghost) { announce(); invalidate(); return; }
    const movedAway = d.x !== d.home.x || d.y !== d.home.y;
    if (d.valid && movedAway) {
      fx.push({ uid: d.uid, kind: 'land', t: 0, dur: 0.28 });
      puff(d.def, d);
      syncCrowd();
      emit('onMove', { uid: d.uid, x: d.x, y: d.y, rot: d.rot });
    } else {
      if (d.prev) moves.set(d.uid, d.prev); else moves.delete(d.uid);
      relayout();
      if (movedAway) fx.push({ uid: d.uid, kind: 'shake', t: 0, dur: 0.3 });
    }
    emit('onPlacementChange', null);
    invalidate();
  }

  // ---- picking ---------------------------------------------------------------------------------------
  function hitEntry(e, ux, uy, slop) {
    const [ox, oy] = e.variant === 'R' ? [e.it.x, e.it.x / 2] : e.variant === 'L' ? [-e.it.y, e.it.y / 2] : [e.it.x - e.it.y, (e.it.x + e.it.y) / 2];
    return maskHit(maskOf(e.def, e.variant), ux - ox, uy - oy, slop);
  }
  // Front-most item under a canvas point, following the last painted order.
  function pick(px, py, slop = 1) {
    if (!layout) return null;
    const [ux, uy] = toUnits(px, py);
    for (let i = order.length - 1; i >= 0; i--) if (hitEntry(order[i], ux, uy, slop)) return order[i];
    for (const list of [layout.walls, layout.flats]) for (let i = list.length - 1; i >= 0; i--) if (hitEntry(list[i], ux, uy, slop)) return list[i];
    return null;
  }
  function onGhost(px, py) {
    if (!ghost || ghost.sent) return false;
    const [ux, uy] = toUnits(px, py), it = { x: ghost.x, y: ghost.y, rot: ghost.rot };
    return hitEntry({ def: ghost.def, it, variant: variantOf(ghost.def, it) }, ux, uy, 3);
  }

  // ---- input -----------------------------------------------------------------------------------------
  // The desktop phone frame scales the stage with a CSS transform, so client pixels are converted back to layout pixels.
  const local = (ev) => {
    const r = canvas.getBoundingClientRect(), k = r.width ? canvas.clientWidth / r.width : 1;
    return [(ev.clientX - r.left) * k, (ev.clientY - r.top) * k];
  };
  function onDown(ev) {
    if (!props.room) return;
    const [x, y] = local(ev);
    canvas.setPointerCapture?.(ev.pointerId);
    pointers.set(ev.pointerId, { x, y });
    clearTimeout(holdTimer);
    if (pointers.size === 2 && !drag) {
      const [a, b] = [...pointers.values()];
      press = null;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    if (pointers.size !== 1) return;
    press = { id: ev.pointerId, x, y, lx: x, ly: y, moved: false, mode: 'pan', touch: ev.pointerType !== 'mouse' };
    if (props.mode !== 'build') return;
    const slop = press.touch ? 3 : 1, hit = pick(x, y, slop);
    if (onGhost(x, y)) { press.mode = 'item'; press.target = ghost; }
    else if (hit && (hit.it.uid === selected || !press.touch) && !ghost) { press.mode = 'item'; press.target = hit; }
    else if (hit && !ghost) holdTimer = setTimeout(() => { if (press && !press.moved) { press.mode = 'item'; press.moved = true; startDrag(hit, press.lx, press.ly); } }, 280);
  }
  function onMove(ev) {
    if (!pointers.has(ev.pointerId)) return;
    const [x, y] = local(ev);
    pointers.set(ev.pointerId, { x, y });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, (pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d);
      cam.cx -= (mx - pinch.mx) / cam.z; cam.cy -= (my - pinch.my) / cam.z; clampCam();
      pinch.mx = mx; pinch.my = my;
      return;
    }
    if (!press || press.id !== ev.pointerId) return;
    if (!press.moved && Math.hypot(x - press.x, y - press.y) > (press.touch ? 7 : 3)) {
      press.moved = true;
      clearTimeout(holdTimer);
      if (press.mode === 'item') startDrag(press.target, press.x, press.y);
    }
    if (!press.moved) return;
    if (press.mode === 'item' && drag) dragTo(x, y);
    else if (press.mode === 'pan') {
      const z = pixel() ? (pixelScale() * cam.pixS) / dpr : cam.z;
      cam.cx -= (x - press.lx) / z; cam.cy -= (y - press.ly) / z; cam.fitted = false; cam.tween = null; clampCam();
      invalidate();
    }
    press.lx = x; press.ly = y;
  }
  function onUp(ev) {
    if (!pointers.has(ev.pointerId)) return;
    pointers.delete(ev.pointerId);
    clearTimeout(holdTimer);
    if (pinch) { if (pointers.size < 2) { pinch = null; cam.settle = 0.12; invalidate(); } return; }
    if (!press || press.id !== ev.pointerId) return;
    const p = press;
    press = null;
    if (drag) { if (ev.type === 'pointercancel') cancel(); else drop(); return; }
    if (p.moved || ev.type === 'pointercancel') return;
    tap(p.x, p.y, p.touch);
  }
  function tap(x, y, touch) {
    const now = performance.now(), hit = pick(x, y, touch ? 3 : 1);
    const double = lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 28;
    lastTap = double ? null : { t: now, x, y };
    const [fx0, fy0] = floorAt(...toUnits(x, y)), tile = { x: Math.floor(fx0), y: Math.floor(fy0) };
    if (props.mode === 'build') {
      if (ghost && !ghost.sent) {
        if (onGhost(x, y) || isWallItem(ghost.def)) return;
        const [fw, fd] = footprintOf(ghost.def, ghost.rot);
        [ghost.x, ghost.y] = clampSpot(ghost.def, tile.x - Math.floor((fw - 1) / 2), tile.y - Math.floor((fd - 1) / 2), ghost.rot);
        ghost.valid = valid(ghost.def.id, ghost.x, ghost.y, ghost.rot, null);
        announce(); invalidate();
        return;
      }
      if (hit) { select(hit.it.uid); return; }
      if (double) { refit(true); return; }
      select(null);
      return;
    }
    if (double) { refit(true); return; }
    emit('onTap', { uid: hit ? hit.it.uid : null, itemId: hit ? hit.def.id : null, x: tile.x, y: tile.y });
  }
  function onWheel(ev) {
    if (!props.room) return;
    ev.preventDefault();
    const [x, y] = local(ev);
    if (pixel()) { if (Math.abs(ev.deltaY) > 2) zoomAt(x, y, ((pixelScale() + (ev.deltaY < 0 ? 1 : -1)) * cam.pixS) / dpr); } else zoomAt(x, y, cam.z * Math.exp(-ev.deltaY * 0.0016));
  }

  // ---- drawing ---------------------------------------------------------------------------------------
  function backdrop(T, w, h) {
    const { g } = T, p = props.palette;
    if (props.style === 'studio') {
      const lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, p.bg); lg.addColorStop(1, p.bgSunken);
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      if (!props.room) return;
      const [cx, cy] = spot(T, props.room.w / 2, props.room.d / 2, 0.6), r = (props.room.w + props.room.d) * T.S * 0.95;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, rgba(mix(p.accentSoft, p.bg, p.dark ? 0.2 : 0.35), 0.9)); rg.addColorStop(1, rgba(p.bg, 0));
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      return;
    }
    g.fillStyle = props.style === 'arcade' ? p.bgSunken : p.bg; g.fillRect(0, 0, w, h);
    if (!props.room) return;
    if (props.style === 'arcade') {
      g.fillStyle = mix(p.bgSunken, p.ink, 0.1);
      const ox = ((T.ox % 8) + 8) % 8, oy = ((T.oy % 8) + 8) % 8;
      for (let y = oy - 8; y < h; y += 8) for (let x = ox - 8 + (((y - oy) / 8) & 1) * 4; x < w; x += 8) g.fillRect(x, y, 1, 1);
      return;
    }
    const [cx, cy] = spot(T, props.room.w / 2, props.room.d / 2, 0.8), r = (props.room.w + props.room.d) * T.S * 0.5;
    g.fillStyle = p.accentSoft;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  }

  function itemState(e) {
    const uid = e.it.uid, s = {};
    if (uid === selected) s.selected = props.palette.accent;
    if (drag && drag.uid === uid) { s.lift = 0.1; if (!drag.valid) { s.tint = props.palette.bad; s.selected = props.palette.bad; } }
    for (const f of fx) {
      if (f.uid !== uid) continue;
      const t = f.t / f.dur;
      if (f.kind === 'land') s.lift = 0.1 * (1 - backOut(t));
      if (f.kind === 'pop') s.lift = (s.lift || 0) + 0.05 * Math.sin(t * Math.PI);
      if (f.kind === 'shake') s.dx = Math.sin(t * 22) * (1 - t) * 0.09 * (pixel() ? cam.pixS : cam.z * dpr);
    }
    return s;
  }

  // Footprint highlights for the selection and the placement ghost.
  function marks() {
    const out = [], sel = selected && entryOf(selected);
    if (sel) out.push({ def: sel.def, it: sel.it, colour: drag && drag.uid === selected && !drag.valid ? props.palette.bad : props.palette.accent });
    if (ghost && !ghost.sent) out.push({ def: ghost.def, it: ghost, colour: ghost.valid ? props.palette.accent : props.palette.bad });
    return out;
  }
  function drawMark(T, m) {
    const wall = isWallItem(m.def), v = variantOf(m.def, m.it), [fw, fd] = wall ? [m.def.size[0], 1] : footprintOf(m.def, m.it.rot);
    const sp = footprintSprite(fw, fd, wall ? v : '', m.colour, env), [X, Y] = !wall ? spot(T, m.it.x, m.it.y) : v === 'R' ? spot(T, m.it.x, 0) : spot(T, 0, m.it.y);
    drawSprite(T.g, sp, X, Y, T.S / sp.S);
  }
  function overlay(T) {
    if (props.mode !== 'build') return;
    const grid = gridSprite(props.room, env);
    drawSprite(T.g, grid, T.ox, T.oy, T.S / grid.S);
    for (const m of marks()) if (!isWallItem(m.def)) drawMark(T, m);
  }

  function actorAt(a) { return { x: a.x, y: a.y, z: 0, yaw: a.yaw }; }
  function actorEntries(a) {
    return avatarEntries(a.avatar, a.skel, actorAt(a), { blink: a.blinkIn < 0, look: a.look, pixel: pixel() });
  }

  function liveThings(T, hidden) {
    const live = [], users = new Map();
    for (const a of crowd.actors) {
      const e = a.using && layout.standing.find((s) => s.it.uid === a.using);
      if (e && !(drag && drag.uid === a.using)) { if (!users.has(e)) users.set(e, []); users.get(e).push(a); continue; }
      live.push({ bb: [a.x - 0.36, a.y - 0.36, 0, a.x + 0.36, a.y + 0.36, 1.8], draw: (t) => paintLive(t, env, entriesDisplay(actorEntries(a), env.sh)) });
    }
    for (const [e, list] of users) {
      hidden.add(e.it.uid);
      const offsets = list.map((a) => a.offsets).find(Boolean) || null;
      const bb = e.bb.slice();
      for (const a of list) { bb[5] = Math.max(bb[5], 2.6); }
      live.push({ bb, item: e, draw: (t) => {
        const entries = placedSolids(e.def, e.it, offsets).map((s) => ({ bb: s.bb, solids: [s] }));
        for (const a of list) entries.push(...actorEntries(a));
        paintLive(t, env, entriesDisplay(entries, env.sh));
      } });
    }
    if (ghost && !isWallItem(ghost.def)) {
      const it = { uid: '#ghost', x: ghost.x, y: ghost.y, rot: ghost.rot }, variant = variantOf(ghost.def, it), g = geometry(ghost.def, variant);
      const [fw, fd] = footprintOf(ghost.def, ghost.rot), e = { it, def: ghost.def, variant, geo: g };
      const s = { ...itemState(e), alpha: ghost.sent ? 1 : 0.86 };
      if (!ghost.sent) { s.lift = (s.lift || 0) + (drag && drag.ghost ? 0.1 : 0.04); if (!ghost.valid) s.tint = props.palette.bad; }
      live.push({ bb: [it.x, it.y, g.flat ? -1 : 0, it.x + fw, it.y + fd, Math.max(0.1, g.bb[5])], draw: (t) => paintItem(t, env, e, s) });
    }
    return live;
  }

  function drawScene(T) {
    const hidden = new Set(), live = liveThings(T, hidden);
    const painted = paintRoom(T, env, props.room, layout, fixtures, {
      state: itemState, hidden, live, overlay,
      shadows(t) {
        const sh = actorShadow(env);
        for (const a of crowd.actors) { const [X, Y] = spot(t, a.x, a.y); drawSprite(t.g, sh, X, Y, t.S / sh.S); }
        for (const e of layout.standing) if (hidden.has(e.it.uid)) paintShadow(t, env, e);
        if (props.mode === 'build') for (const m of marks()) if (isWallItem(m.def)) drawMark(t, m);
      },
    });
    order = painted;
    if (ghost && isWallItem(ghost.def)) {
      const it = { uid: '#ghost', x: ghost.x, y: ghost.y, rot: 0 }, e = { it, def: ghost.def, variant: variantOf(ghost.def, it) };
      paintItem(T, env, e, { ...itemState(e), alpha: ghost.sent ? 1 : 0.86, tint: ghost.valid || ghost.sent ? null : props.palette.bad });
    }
    const { g } = T;
    for (const p of puffs) {
      const [X, Y] = spot(T, p.x + p.vx * p.t * 0.5, p.y + p.vy * p.t * 0.5, 0.05 + p.t * 0.3), k = p.t / 0.4;
      g.globalAlpha = 0.7 * (1 - k); g.fillStyle = '#e6e0d2';
      if (pixel()) g.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 2, 2); else { g.beginPath(); g.arc(X, Y, T.S * (0.05 + k * 0.08), 0, Math.PI * 2); g.fill(); }
    }
    for (const m of motes) {
      const [X, Y] = spot(T, m.x + Math.sin(clock * 0.3 + m.p) * 0.4, m.y + Math.cos(clock * 0.23 + m.p * 1.3) * 0.4, m.z + Math.sin(clock * 0.4 + m.p * 2) * 0.25);
      g.globalAlpha = 0.35 + 0.3 * Math.sin(clock * 0.9 + m.p); g.fillStyle = '#fff8e2';
      if (pixel()) g.fillRect(Math.round(X), Math.round(Y), 1, 1); else { g.beginPath(); g.arc(X, Y, Math.max(1, T.S * 0.022), 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
  }

  function draw() {
    const v = view(), key = `${props.style}|${paletteKey(props.palette)}`;
    const artS = pixel() ? cam.pixS : cam.artS || v.S;
    if (!env || env.base !== key || env.dustIn !== props.dust || Math.abs(env.S - artS) > 0.005) {
      env = makeEnv(props.style, props.palette, props.dust, artS);
      env.base = key; env.dustIn = props.dust;
    }
    if (pixel()) {
      const w = Math.ceil(canvas.width / v.s), h = Math.ceil(canvas.height / v.s);
      if (low.width !== w || low.height !== h) { low.width = w; low.height = h; }
      lowCtx.imageSmoothingEnabled = false;
      const T = { g: lowCtx, S: v.S, ox: v.ox, oy: v.oy };
      backdrop(T, w, h);
      if (props.room) drawScene(T);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, w * v.s, h * v.s);
      return;
    }
    const T = { g: ctx, S: v.S, ox: v.ox, oy: v.oy };
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    backdrop(T, canvas.width, canvas.height);
    if (props.room) drawScene(T);
  }

  // ---- loop ------------------------------------------------------------------------------------------
  const animating = () => !!cam.tween || cam.settle > 0 || fx.length > 0 || puffs.length > 0 || (!reduced() && (crowd.actors.length > 0 || motes.length > 0));
  function schedule() { if (!raf && alive && visible) raf = requestAnimationFrame(frame); }
  function invalidate() { dirty = true; schedule(); }
  function frame(ts) {
    raf = 0;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    if (!cssW || !props.room) { if (dirty && cssW) { draw(); dirty = false; } return; }
    if (cam.tween) {
      cam.tween.t = Math.min(1, cam.tween.t + dt / 0.28);
      const k = ease(cam.tween.t), { from, to } = cam.tween;
      cam.cx = from.cx + (to.cx - from.cx) * k; cam.cy = from.cy + (to.cy - from.cy) * k; cam.z = from.z + (to.z - from.z) * k;
      if (cam.tween.t >= 1) { cam.tween = null; settleArt(); }
      dirty = true;
    }
    if (cam.settle > 0) { cam.settle -= dt; if (cam.settle <= 0) { cam.settle = 0; settleArt(); } dirty = true; }
    for (const f of fx) f.t += dt;
    for (const p of puffs) p.t += dt;
    if (fx.length || puffs.length) dirty = true;
    fx = fx.filter((f) => f.t < f.dur); puffs = puffs.filter((p) => p.t < 0.4);
    if (!reduced()) {
      clock += dt; crowd.step(dt);
      const now = pixel() ? Math.floor(clock * 10) : clock;
      if (now !== tick) { tick = now; dirty = true; }
    }
    if (dirty) { draw(); dirty = false; }
    if (animating()) schedule(); else last = 0;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight, r = Math.min(3, window.devicePixelRatio || 1);
    if (!w || !h) return;
    if (w === cssW && h === cssH && r === dpr) return;
    cssW = w; cssH = h; dpr = r;
    canvas.width = Math.round(w * r); canvas.height = Math.round(h * r);
    if (cam.fitted || !cam.artS) refit(false); else { clampCam(); settleArt(); }
    invalidate();
  }

  function update(next) {
    const prev = props;
    props = { ...props, ...next, insets: { ...DEFAULTS.insets, ...(next.insets || props.insets) } };
    const roomChanged = props.room !== prev.room, restyle = props.style !== prev.style;
    const resized = !prev.room || !props.room || props.room.w !== prev.room.w || props.room.d !== prev.room.d || props.room.id !== prev.room.id;
    if (roomChanged) {
      moves.clear();
      if (resized) crowd.actors.length = 0;
      if (ghost && ghost.sent) ghost = null;
      if (drag && !drag.ghost) drag = null;
      relayout();
      if (selected && !entryOf(selected)) { selected = null; emit('onSelect', null); }
    }
    if (props.mode !== prev.mode && props.mode !== 'build') { cancel(); if (selected) select(null); }
    if (roomChanged || props.avatar !== prev.avatar || props.guests !== prev.guests || props.training !== prev.training || props.mode !== prev.mode || props.reducedMotion !== prev.reducedMotion) syncCrowd();
    if (roomChanged || props.dust !== prev.dust || props.reducedMotion !== prev.reducedMotion) seedMotes();
    const i = props.insets, j = prev.insets;
    if (restyle || (roomChanged && resized) || i.top !== j.top || i.bottom !== j.bottom || i.left !== j.left || i.right !== j.right) { if (cam.fitted || restyle || resized) refit(false); }
    invalidate();
  }

  const onVisibility = () => { visible = !document.hidden; if (visible) { last = 0; invalidate(); } };
  const watcher = typeof IntersectionObserver === 'function' ? new IntersectionObserver((list) => { visible = list[list.length - 1].isIntersecting && !document.hidden; if (visible) { last = 0; invalidate(); } }) : null;
  const onMotion = () => { syncCrowd(); seedMotes(); invalidate(); };
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  if (watcher) watcher.observe(canvas);
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);

  update(initial);
  resize();

  return {
    update, resize, refit, beginPlacement, commitPlacement, cancel, rotate, nudge, store,
    select: (uid) => select(uid || null),
    // Walk the player's avatar to a placed item and train on it (view mode).
    sendAvatarTo: (uid) => crowd.send('me', uid),
    destroy() {
      alive = false;
      cancelAnimationFrame(raf); clearTimeout(holdTimer);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      if (watcher) watcher.disconnect();
      if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotion);
    },
  };
}
