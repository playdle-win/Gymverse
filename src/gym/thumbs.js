// Still images: item thumbnails for the shop and build tray, room previews for the Rooms list, avatar portraits
// for the Character editor and the feed. Each returns a canvas; the *Url variants return a cached data URL.
import { extent, display } from './kit.js';
import { itemById } from './catalog.js';
import { DEFAULT_PALETTES, paletteKey } from './palette.js';
import { DEFAULT_AVATAR } from './models-avatar.js';
import { POSES, skeleton, avatarEntries, entriesDisplay } from './avatar.js';
import { roomGroups, fixtureSpots } from './roomlayer.js';
import { pixelFit, makeEnv, describeRoom, geometry, shadowSprite, actorShadow, drawSprite, paintRoom, paintLive, spot } from './scene.js';
import { ZK, WALL_H } from './iso.js';

const ratio = (o) => o.dpr || (typeof window !== 'undefined' && Math.min(3, window.devicePixelRatio || 1)) || 1;
const opt = (o = {}) => ({ style: 'studio', palette: DEFAULT_PALETTES.light, ...o });

function blank(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// A drawing target that fits box = [x0, y0, x1, y1] (units) centred in a pw x ph pixel canvas. Arcade draws on a
// low-resolution canvas first; call done() to scale it up with hard edges.
function stage(o, pw, ph, box, pad) {
  const canvas = blank(pw, ph), want = Math.min((pw * (1 - pad * 2)) / (box[2] - box[0]), (ph * (1 - pad * 2)) / (box[3] - box[1]));
  const pix = o.style === 'arcade' ? pixelFit(want) : null, S = pix ? pix.S : want, s = pix ? pix.s : 1;
  const env = makeEnv(o.style, o.palette, o.dust || 0, S), target = pix ? blank(Math.ceil(pw / s), Math.ceil(ph / s)) : canvas;
  const T = { g: target.getContext('2d'), S: env.S, ox: Math.round(pw / s / 2 - ((box[0] + box[2]) / 2) * env.S), oy: Math.round(ph / s / 2 - ((box[1] + box[3]) / 2) * env.S) };
  const done = () => {
    if (pix) { const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(target, 0, 0, target.width * s, target.height * s); }
    return canvas;
  };
  return { T, env, done };
}

const PORTRAIT_YAW = -0.42;
function avatarGroups(avatar, env, x = 0, y = 0) {
  const j = skeleton(POSES.idle(0.4, { z: 0 }));
  return entriesDisplay(avatarEntries(avatar, j, { x, y, z: 0, yaw: PORTRAIT_YAW }, { pixel: env.pixel }), env.sh);
}

// renderAvatarPortrait(avatar, { style, palette, size, crop: 'full' | 'head', dpr }) -> canvas (size x size CSS pixels)
export function renderAvatarPortrait(avatar, options) {
  const o = opt(options), px = (o.size || 96) * ratio(o), head = o.crop === 'head';
  const box = head ? [-0.7, -1.31 * ZK - 0.68, 0.7, -1.31 * ZK + 0.72] : [-0.84, -1.84 * ZK, 0.84, 0.16];
  const { T, env, done } = stage(o, px, px, box, head ? 0 : 0.05);
  if (!head) { const sh = actorShadow(env); drawSprite(T.g, sh, T.ox, T.oy, T.S / sh.S); }
  paintLive(T, env, avatarGroups({ ...DEFAULT_AVATAR, ...avatar }, env));
  return done();
}

const HEAD_SLOTS = { hair: 1, beard: 1, accessory: 1 };

// renderItemThumb(itemId, { style, palette, size, dpr, avatar }) -> canvas. Works for every catalog kind:
// equipment and decor show the model, floors and walls a swatch, cosmetics the avatar wearing it.
export function renderItemThumb(itemId, options) {
  const o = opt(options), def = itemById(itemId), px = (o.size || 72) * ratio(o);
  if (!def) return blank(px, px);
  if (def.kind === 'cosmetic') return renderAvatarPortrait({ ...DEFAULT_AVATAR, ...o.avatar, [def.slot]: def.id }, { ...o, crop: HEAD_SLOTS[def.slot] ? 'head' : 'full' });
  const probe = makeEnv(o.style, o.palette, 0, 16);
  if (def.kind === 'floor' || def.kind === 'wall') {
    const room = { id: 'swatch', w: 2, d: 2, floor: def.kind === 'floor' ? def.id : 'floor-concrete', wall: def.kind === 'wall' ? def.id : 'wall-bare', items: [] };
    const floorOnly = def.kind === 'floor', { T, env, done } = stage(o, px, px, extent(roomGroups(room, probe.sh, 0, floorOnly).base), 0.04);
    paintLive(T, env, roomGroups(room, env.sh, 0, floorOnly).base);
    return done();
  }
  const variant = def.mount === 'wall' ? 'R' : 0, list = geometry(def, variant).list;
  const { T, env, done } = stage(o, px, px, extent(display(list, probe.sh)), 0.07);
  const sh = shadowSprite(def, variant, env);
  if (sh) drawSprite(T.g, sh, T.ox, T.oy, T.S / sh.S);
  paintLive(T, env, display(list, env.sh));
  return done();
}

// renderRoomThumb(room, { style, palette, width, height, dpr, avatar, dust }) -> canvas with the furnished room.
export function renderRoomThumb(room, options) {
  const o = opt(options), r = ratio(o), box = [-room.d - 0.3, -WALL_H * ZK - 0.3, room.w + 0.3, (room.w + room.d) / 2 + 0.6];
  const { T, env, done } = stage(o, (o.width || 160) * r, (o.height || 120) * r, box, 0.02), layout = describeRoom(room), live = [];
  if (o.avatar) {
    const [tx, ty] = freeTile(room, layout), groups = avatarGroups({ ...DEFAULT_AVATAR, ...o.avatar }, env, tx + 0.5, ty + 0.5);
    live.push({ bb: [tx + 0.14, ty + 0.14, 0, tx + 0.86, ty + 0.86, 1.8], draw: (t) => paintLive(t, env, groups) });
  }
  paintRoom(T, env, room, layout, fixtureSpots(room), {
    live, shadows: o.avatar ? (t) => { const sh = actorShadow(env), [X, Y] = spot(t, live[0].bb[0] + 0.36, live[0].bb[1] + 0.36); drawSprite(t.g, sh, X, Y, t.S / sh.S); } : null,
  });
  return done();
}

function freeTile(room, layout) {
  const taken = new Set();
  for (const e of layout.standing) for (let y = e.it.y; y < e.it.y + e.fd; y++) for (let x = e.it.x; x < e.it.x + e.fw; x++) taken.add(x + ',' + y);
  let best = [0, 0], bd = Infinity;
  for (let y = 0; y < room.d; y++) for (let x = 0; x < room.w; x++) {
    const dd = (x - room.w * 0.6) ** 2 + (y - room.d * 0.6) ** 2;
    if (!taken.has(x + ',' + y) && dd < bd) { bd = dd; best = [x, y]; }
  }
  return best;
}

// ---- data URL variants (cached) --------------------------------------------------------------------------
const urls = new Map();
function url(key, o, make) {
  const full = `${key}|${o.style}|${paletteKey(o.palette)}|${o.size || ''}|${o.width || ''}x${o.height || ''}|${o.crop || ''}|${o.dust || 0}|${ratio(o)}`;
  if (!urls.has(full)) { if (urls.size > 400) urls.delete(urls.keys().next().value); urls.set(full, make().toDataURL()); }
  return urls.get(full);
}
export const itemThumbUrl = (itemId, options) => { const o = opt(options); return url('i:' + itemId + JSON.stringify(o.avatar || ''), o, () => renderItemThumb(itemId, o)); };
export const avatarPortraitUrl = (avatar, options) => { const o = opt(options); return url('a:' + JSON.stringify(avatar), o, () => renderAvatarPortrait(avatar, o)); };
export const roomThumbUrl = (room, options) => { const o = opt(options); return url('r:' + JSON.stringify(room) + JSON.stringify(o.avatar || ''), o, () => renderRoomThumb(room, o)); };
