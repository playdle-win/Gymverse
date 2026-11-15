// Pre-built gyms for friends and strangers. PURE DATA. Owned by the gym agents.
// The seed (src/core/seed.js) assigns SHOWROOMS[key] to people by key order and falls back to starterRoom().
export const starterRoom = () => ({
  id: 'r1', name: 'Ground floor', w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare',
  items: [{ uid: 'i1', itemId: 'bench-worn', x: 2, y: 1, rot: 0 }],
});

const item = (n, itemId, x, y, rot = 0) => ({ uid: 's' + n, itemId, x, y, rot });
const room = (id, name, w, d, floor, wall, items) => ({ id, name, w, d, floor, wall, items: items.map((it, i) => item(i + 1, ...it)) });
// Rooms above the ground floor prefix their item uids with the room id so uids stay unique across a gym.
const upstairs = (r) => ({ ...r, items: r.items.map((it) => ({ ...it, uid: r.id + it.uid })) });

export const SHOWROOMS = {
  starter: { rooms: [starterRoom()] },
  // 5 x 5: a few weeks in. Still concrete and plaster, but the first real purchases are here.
  first: { rooms: [room('r1', 'Ground floor', 5, 5, 'floor-concrete', 'wall-bare', [
    ['bench-worn', 1, 0], ['rack-dumbbells', 3, 0], ['station-pullup', 0, 3], ['plant-monstera', 4, 4], ['poster-lift', 2, -1],
  ])] },
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
  // 7 x 7: cardio corner with a mirror wall, light and tidy.
  cardio: { rooms: [room('r1', 'Cardio studio', 7, 7, 'floor-wood', 'wall-paint', [
    ['treadmill', 0, 0], ['treadmill', 1, 0], ['treadmill', 2, 0], ['rack-dumbbells', 4, 0], ['plant-monstera', 6, 0],
    ['mat-floor', 2, 3], ['mat-floor', 4, 4], ['station-pullup', 0, 5], ['cooler-water', 6, 6], ['speaker-boom', 0, 3],
    ['mirror-wall', -1, 1], ['mirror-wall', -1, 4], ['poster-lift', 3, -1], ['poster-lift', 5, -1],
  ])] },
  // 9 x 9: a lifter's basement. Brick, rubber, a lot of steel.
  iron: { rooms: [room('r1', 'Iron basement', 9, 9, 'floor-rubber', 'wall-brick', [
    ['rack-squat', 0, 0], ['rack-squat', 2, 0], ['bench-flat', 5, 0], ['rack-dumbbells', 7, 0, 0], ['machine-legpress', 0, 3],
    ['machine-cable', 0, 6], ['bench-flat', 3, 6], ['station-pullup', 8, 3], ['treadmill', 8, 5], ['mat-floor', 4, 3],
    ['speaker-boom', 8, 8], ['cooler-water', 0, 8], ['plant-monstera', 4, 0], ['bench-worn', 6, 6, 1],
    ['mirror-wall', 0, -1], ['mirror-wall', 5, -1], ['poster-lift', 3, -1], ['poster-lift', -1, 2], ['mirror-wall', -1, 5],
  ])] },
  // 10 x 10: everything, twice. Dark panels, checker floor.
  big: { rooms: [room('r1', 'The big room', 10, 10, 'floor-checker', 'wall-panel', [
    ['rack-squat', 0, 0], ['rack-squat', 2, 0], ['bench-flat', 5, 0], ['rack-dumbbells', 8, 0], ['plant-monstera', 7, 0],
    ['machine-legpress', 0, 3], ['machine-cable', 0, 6], ['machine-cable', 1, 6], ['station-pullup', 0, 9], ['station-pullup', 1, 9],
    ['treadmill', 7, 3], ['treadmill', 8, 3], ['treadmill', 9, 3], ['mat-floor', 3, 4], ['bench-flat', 3, 7], ['rack-dumbbells', 6, 8, 2],
    ['cooler-water', 9, 9], ['speaker-boom', 9, 6], ['plant-monstera', 4, 0], ['plant-monstera', 0, 5],
    ['mirror-wall', 1, -1], ['mirror-wall', 5, -1], ['poster-lift', 8, -1], ['poster-lift', 3, -1], ['mirror-wall', -1, 3], ['poster-lift', -1, 6], ['poster-lift', -1, 8],
  ])] },
  // Two floors: a 10 x 10 strength hall under a 7 x 7 cardio deck. The most valuable gym in the seed.
  tower: { rooms: [
    room('r1', 'Strength hall', 10, 10, 'floor-rubber', 'wall-brick', [
      ['rack-squat', 0, 0], ['rack-squat', 2, 0], ['rack-squat', 4, 0], ['bench-flat', 7, 0], ['plant-monstera', 9, 0],
      ['machine-legpress', 0, 3], ['machine-legpress', 2, 3], ['mat-floor', 5, 3], ['rack-dumbbells', 8, 3], ['rack-dumbbells', 8, 4],
      ['machine-cable', 0, 6], ['machine-cable', 1, 6], ['bench-flat', 3, 6], ['bench-flat', 6, 6], ['station-pullup', 9, 6], ['station-pullup', 9, 7],
      ['cooler-water', 0, 9], ['plant-monstera', 5, 9], ['speaker-boom', 9, 9],
      ['mirror-wall', 0, -1], ['mirror-wall', 2, -1], ['mirror-wall', 4, -1], ['poster-lift', 7, -1], ['poster-lift', 8, -1],
      ['mirror-wall', -1, 3], ['poster-lift', -1, 6], ['poster-lift', -1, 8],
    ]),
    upstairs(room('r2', 'Cardio deck', 7, 7, 'floor-wood', 'wall-panel', [
      ['treadmill', 0, 0], ['treadmill', 1, 0], ['treadmill', 2, 0], ['treadmill', 3, 0], ['plant-monstera', 6, 0], ['station-pullup', 6, 2],
      ['mat-floor', 1, 3], ['mat-floor', 4, 3], ['speaker-boom', 0, 6], ['rack-dumbbells', 3, 6], ['cooler-water', 6, 6],
      ['mirror-wall', -1, 2], ['mirror-wall', -1, 4], ['poster-lift', 5, -1],
    ])),
  ] },
  // 5 x 5: two weeks in and already house-proud. Wood and paint before any machine.
  nook: { rooms: [room('r1', 'Spare room', 5, 5, 'floor-wood', 'wall-paint', [
    ['rack-dumbbells', 0, 0], ['plant-monstera', 4, 0], ['bench-worn', 0, 2], ['mat-floor', 2, 2], ['mirror-wall', 2, -1], ['poster-lift', -1, 3],
  ])] },
  // 8 x 8: all the money went into steel. The floor is still bare concrete.
  garage: { rooms: [room('r1', 'Garage', 8, 8, 'floor-concrete', 'wall-brick', [
    ['rack-squat', 0, 0], ['bench-flat', 3, 0], ['rack-dumbbells', 6, 0], ['machine-legpress', 0, 3], ['machine-cable', 7, 3],
    ['bench-worn', 3, 5, 1], ['treadmill', 5, 5], ['station-pullup', 0, 7], ['speaker-boom', 7, 7],
    ['poster-lift', 2, -1], ['poster-lift', 5, -1], ['poster-lift', -1, 2], ['poster-lift', -1, 5],
  ])] },
  // 6 x 6: checker floor under cracked plaster. A treadmill, a mat, good intentions.
  attic: { rooms: [room('r1', 'Attic', 6, 6, 'floor-checker', 'wall-bare', [
    ['treadmill', 0, 0], ['bench-worn', 2, 0], ['station-pullup', 5, 0], ['mat-floor', 2, 3], ['rack-dumbbells', 0, 4],
    ['plant-monstera', 5, 5], ['poster-lift', 3, -1],
  ])] },
  // Two floors: a 7 x 7 room that is mostly mirrors and plants, with a small rubber mezzanine above it.
  loft: { rooms: [
    room('r1', 'Loft', 7, 7, 'floor-wood', 'wall-panel', [
      ['bench-flat', 0, 0], ['machine-cable', 3, 0], ['rack-dumbbells', 5, 0], ['cooler-water', 6, 2], ['mat-floor', 1, 3], ['mat-floor', 4, 3],
      ['plant-monstera', 0, 6], ['speaker-boom', 3, 6], ['plant-monstera', 6, 6],
      ['mirror-wall', 1, -1], ['mirror-wall', 4, -1], ['mirror-wall', -1, 1], ['poster-lift', -1, 3], ['mirror-wall', -1, 4],
    ]),
    upstairs(room('r2', 'Mezzanine', 5, 5, 'floor-rubber', 'wall-paint', [
      ['station-pullup', 0, 0], ['treadmill', 2, 0], ['treadmill', 3, 0], ['mat-floor', 1, 2], ['plant-monstera', 4, 4], ['poster-lift', 1, -1],
    ])),
  ] },
};
