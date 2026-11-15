// Pre-built gyms for friends and strangers. PURE DATA. Owned by the gym agents.
// The seed (src/core/seed.js) assigns SHOWROOMS[key] to people by key order and falls back to starterRoom().
export const starterRoom = () => ({
  id: 'r1', name: 'Ground floor', w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare',
  items: [{ uid: 'i1', itemId: 'bench-worn', x: 2, y: 1, rot: 0 }],
});

export const SHOWROOMS = {
  starter: { rooms: [starterRoom()] },
};
