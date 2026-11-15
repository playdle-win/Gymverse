// Pre-built gyms for friends and strangers. PURE DATA. Owned by the gym agents.
// The seed (src/core/seed.js) assigns SHOWROOMS[key] to people by key order and falls back to starterRoom().
export const starterRoom = () => ({
  id: 'r1', name: 'Ground floor', w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare',
  items: [{ uid: 'i1', itemId: 'bench-worn', x: 2, y: 1, rot: 0 }],
});

const item = (n, itemId, x, y, rot = 0) => ({ uid: 's' + n, itemId, x, y, rot });
const room = (id, name, w, d, floor, wall, items) => ({ id, name, w, d, floor, wall, items: items.map((it, i) => item(i + 1, ...it)) });

export const SHOWROOMS = {
  starter: { rooms: [starterRoom()] },
  // 6 x 6: a first real setup. Rubber floor, fresh paint, the worn bench kept out of loyalty.
  small: { rooms: [room('r1', 'Garage gym', 6, 6, 'floor-rubber', 'wall-paint', [
    ['bench-flat', 0, 1], ['rack-dumbbells', 3, 0], ['bench-worn', 5, 2], ['station-pullup', 0, 4],
    ['mat-floor', 2, 3], ['plant-monstera', 5, 0], ['poster-lift', 1, -1], ['mirror-wall', -1, 1], ['speaker-boom', 5, 5],
  ])] },
  // 8 x 8: a proper strength room on wood with brick walls.
  mid: { rooms: [room('r1', 'Strength room', 8, 8, 'floor-wood', 'wall-brick', [
    ['rack-squat', 0, 0], ['bench-flat', 3, 0], ['rack-dumbbells', 6, 0], ['treadmill', 0, 4], ['treadmill', 1, 4],
    ['machine-cable', 7, 2], ['station-pullup', 0, 7], ['mat-floor', 3, 4], ['cooler-water', 7, 7], ['plant-monstera', 5, 0],
    ['speaker-boom', 7, 5], ['mirror-wall', 3, -1], ['poster-lift', 6, -1], ['poster-lift', -1, 2], ['mirror-wall', -1, 5],
  ])] },
  // 10 x 10: everything, twice. Dark panels, checker floor.
  big: { rooms: [room('r1', 'The big room', 10, 10, 'floor-checker', 'wall-panel', [
    ['rack-squat', 0, 0], ['rack-squat', 2, 0], ['bench-flat', 5, 0], ['rack-dumbbells', 8, 0], ['plant-monstera', 7, 0],
    ['machine-legpress', 0, 3], ['machine-cable', 0, 6], ['machine-cable', 1, 6], ['station-pullup', 0, 9], ['station-pullup', 1, 9],
    ['treadmill', 7, 3], ['treadmill', 8, 3], ['treadmill', 9, 3], ['mat-floor', 3, 4], ['bench-flat', 3, 7], ['rack-dumbbells', 6, 8, 2],
    ['cooler-water', 9, 9], ['speaker-boom', 9, 6], ['plant-monstera', 4, 0], ['plant-monstera', 0, 5],
    ['mirror-wall', 1, -1], ['mirror-wall', 5, -1], ['poster-lift', 8, -1], ['poster-lift', 3, -1], ['mirror-wall', -1, 3], ['poster-lift', -1, 6], ['poster-lift', -1, 8],
  ])] },
};
