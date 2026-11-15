// Placement rules as pure functions (no DOM), shared by the engine, the harness and anyone who needs a default
// `canPlace`. Coordinates follow docs/SPEC.md section 4.
import { itemById } from './catalog.js';

export const isWallItem = (def) => def && def.mount === 'wall';

// Footprint [w, d] in tiles of a floor item at rot.
export const footprintOf = (def, rot) => (rot & 1 ? [def.size[1], def.size[0]] : [def.size[0], def.size[1]]);

// Tiles or wall panels covered by a placed item: { wall: null | 'right' | 'left', x0, y0, x1, y1 } (x1, y1 exclusive).
export function areaOf(def, x, y, rot) {
  if (isWallItem(def)) return y === -1 ? { wall: 'right', x0: x, y0: 0, x1: x + def.size[0], y1: 1 } : { wall: 'left', x0: 0, y0: y, x1: 1, y1: y + def.size[0] };
  const [w, d] = footprintOf(def, rot);
  return { wall: null, x0: x, y0: y, x1: x + w, y1: y + d };
}

const overlaps = (a, b) => a.wall === b.wall && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// Default validity: inside the room (or on a wall for wall items) and not overlapping another item.
export function canPlaceIn(room, itemId, x, y, rot = 0, ignoreUid = null) {
  const def = itemById(itemId);
  if (!def || !def.size) return false;
  const wall = isWallItem(def);
  if (wall !== (x === -1 || y === -1) || (x === -1 && y === -1)) return false;
  const a = areaOf(def, x, y, rot);
  if (a.x0 < 0 || a.y0 < 0 || a.x1 > room.w || a.y1 > room.d) return false;
  for (const it of room.items) {
    if (it.uid === ignoreUid) continue;
    const other = itemById(it.itemId);
    if (other && other.size && overlaps(a, areaOf(other, it.x, it.y, it.rot))) return false;
  }
  return true;
}

// First valid spot for a new item, scanning outward from (cx, cy). Returns { x, y, rot } or null.
export function findSpot(room, itemId, canPlace, cx = room.w / 2, cy = room.d / 2) {
  const def = itemById(itemId);
  if (!def || !def.size) return null;
  const spots = [];
  if (isWallItem(def)) {
    for (let x = 0; x + def.size[0] <= room.w; x++) spots.push({ x, y: -1, rot: 0, k: Math.abs(x + def.size[0] / 2 - cx) });
    for (let y = 0; y + def.size[0] <= room.d; y++) spots.push({ x: -1, y, rot: 0, k: Math.abs(y + def.size[0] / 2 - cy) + 0.25 });
  } else {
    for (let y = 0; y < room.d; y++) for (let x = 0; x < room.w; x++) spots.push({ x, y, rot: 0, k: Math.hypot(x + def.size[0] / 2 - cx, y + def.size[1] / 2 - cy) });
  }
  spots.sort((a, b) => a.k - b.k);
  const hit = spots.find((s) => canPlace(itemId, s.x, s.y, s.rot, null));
  return hit ? { x: hit.x, y: hit.y, rot: 0 } : null;
}
