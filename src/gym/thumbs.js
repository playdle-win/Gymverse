// Still images: item thumbnails for the shop and build tray, room previews for the Rooms list, avatar portraits
// for the Character editor and the feed. Each returns a canvas; the *Url variants return a cached data URL.
import { extent } from './kit.js';
import { itemById } from './catalog.js';
import { DEFAULT_PALETTES, paletteKey } from './palette.js';
import { DEFAULT_AVATAR } from './models-avatar.js';
import { POSES, skeleton, avatarEntries, entriesDisplay } from './avatar.js';
import { roomGroups, fixtureSpots } from './roomlayer.js';
import { PIXEL_S, makeEnv, describeRoom, geometry, renderGroups, itemSprite, shadowSprite, actorShadow, drawSprite, paintRoom, paintLive } from './scene.js';
import { display } from './kit.js';
import { ZK, WALL_H } from './iso.js';

const ratio = (o) => o.dpr || (typeof window !== 'undefined' && Math.min(3, window.devicePixelRatio || 1)) || 1;
const opt = (o = {}) => ({ style: 'studio', palette: DEFAULT_PALETTES.light, ...o });

function blank(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// Scale that fits a w x h box (units) into the pixel area; arcade snaps to whole art pixels.
function fitScale(style, wu, hu, pw, ph) {
  const S = Math.min(pw / wu, ph / hu);
  return style === 'arcade' ? Math.max(1, Math.floor(S / PIXEL_S)) : S;
}

// Draw display groups centred in a canvas. box = [x0, y0, x1, y1] in units to frame (defaults to the groups' extent).
function framed(groups, o, pw, ph, box, pad = 0.08, under = null) {
  const canvas = blank(pw, ph), g = canvas.getContext('2d'), [x0, y0, x1, y1] = box || extent(groups);
  const k = fitScale(o.style, x1 - x0, y1 - y0, pw * (1 - pad * 2), ph * (1 - pad * 2));
  const env = makeEnv(o.style, o.palette, o.dust || 0, k);
  const S = env.pixel ? PIXEL_S : k, s = env.pixel ? k : 1;
  const T = { g, S, ox: Math.round(pw / s / 2 - ((x0 + x1) / 2) * S), oy: Math.round(ph / s / 2 - ((y0 + y1) / 2) * S) };
  if (!env.pixel) { if (under) under(T, env); paintLive(T, env, groups); return canvas; }
  const low = blank(Math.ceil(pw / s), Math.ceil(ph / s));
  T.g = low.getContext('2d');
  if (under) under(T, env);
  paintLive(T, env, groups);
  g.imageSmoothingEnabled = false;
  g.drawImage(low, 0, 0, low.width * s, low.height * s);
  return canvas;
}

const PORTRAIT_YAW = -0.42;
function avatarGroups(avatar, o, env) {
  const j = skeleton(POSES.idle(0.4, { z: 0 }));
  return entriesDisplay(avatarEntries(avatar, j, { x: 0, y: 0, z: 0, yaw: PORTRAIT_YAW }, { pixel: env.pixel }), env.sh);
}

// renderAvatarPortrait(avatar, { style, palette, size, crop: 'full' | 'head', dpr }) -> canvas (size x size CSS pixels)
export function renderAvatarPortrait(avatar, options) {
  const o = opt(options), px = (o.size || 96) * ratio(o), env = makeEnv(o.style, o.palette, 0, 32);
  const groups = avatarGroups({ ...DEFAULT_AVATAR, ...avatar }, o, env);
  const box = o.crop === 'head' ? [-0.7, -1.31 * ZK - 0.68, 0.7, -1.31 * ZK + 0.72] : [-0.84, -1.84 * ZK, 0.84, 0.16];
  return framed(groups, o, px, px, box, o.crop === 'head' ? 0 : 0.06, o.crop === 'head' ? null : (T, e) => { const sh = actorShadow(e); drawSprite(T.g, sh, T.ox, T.oy, T.S / sh.S); });
}

const HEAD_SLOTS = { hair: 1, beard: 1, accessory: 1 };

// renderItemThumb(itemId, { style, palette, size, dpr, avatar }) -> canvas. Works for every catalog kind:
// equipment and decor show the model, floors and walls a swatch, cosmetics the avatar wearing it.
export function renderItemThumb(itemId, options) {
  const o = opt(options), def = itemById(itemId), px = (o.size || 72) * ratio(o);
  if (!def) return blank(px, px);
  if (def.kind === 'cosmetic') return renderAvatarPortrait({ ...DEFAULT_AVATAR, ...o.avatar, [def.slot]: def.id }, { ...o, crop: HEAD_SLOTS[def.slot] ? 'head' : 'full' });
  const env = makeEnv(o.style, o.palette, 0, 32);
  if (def.kind === 'floor' || def.kind === 'wall') {
    const room = { id: 'swatch', w: 2, d: 2, floor: def.kind === 'floor' ? def.id : 'floor-concrete', wall: def.kind === 'wall' ? def.id : 'wall-bare', items: [] };
    const { base } = roomGroups(room, env.sh, 0, def.kind === 'floor');
    return framed(base, o, px, px, null, 0.06);
  }
  const variant = def.mount === 'wall' ? 'R' : 0, groups = display(geometry(def, variant).list, env.sh);
  return framed(groups, o, px, px, null, 0.1, (T, e) => { const sh = shadowSprite(def, variant, e); if (sh) drawSprite(T.g, sh, T.ox, T.oy, T.S / sh.S); });
}

// renderRoomThumb(room, { style, palette, width, height, dpr, avatar, dust }) -> canvas with the furnished room.
export function renderRoomThumb(room, options) {
  const o = opt(options), r = ratio(o), pw = (o.width || 160) * r, ph = (o.height || 120) * r;
  const box = [-room.d - 0.3, -WALL_H * ZK - 0.3, room.w + 0.3, (room.w + room.d) / 2 + 0.6];
  const k = fitScale(o.style, box[2] - box[0], box[3] - box[1], pw * 0.96, ph * 0.96), env = makeEnv(o.style, o.palette, o.dust || 0, k);
  const s = env.pixel ? k : 1, S = env.pixel ? PIXEL_S : k, canvas = blank(pw, ph), target = env.pixel ? blank(Math.ceil(pw / s), Math.ceil(ph / s)) : canvas;
  const T = { g: target.getContext('2d'), S, ox: Math.round(pw / s / 2 - ((box[0] + box[2]) / 2) * S), oy: Math.round(ph / s / 2 - ((box[1] + box[3]) / 2) * S) };
  const layout = describeRoom(room), live = [];
  if (o.avatar) {
    const spot = freeTile(room, layout), at = { x: spot[0] + 0.5, y: spot[1] + 0.5, z: 0, yaw: PORTRAIT_YAW };
    const groups = entriesDisplay(avatarEntries(o.avatar, skeleton(POSES.idle(0.4, { z: 0 })), at, { pixel: env.pixel }), env.sh);
    live.push({ bb: [at.x - 0.36, at.y - 0.36, 0, at.x + 0.36, at.y + 0.36, 1.8], draw: (t) => paintLive(t, env, groups) });
  }
  paintRoom(T, env, room, layout, fixtureSpots(room), { live });
  if (env.pixel) { const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(target, 0, 0, target.width * s, target.height * s); }
  return canvas;
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
