// Shop catalog. PURE DATA (no DOM, no Preact) so the core engine and Node tests can import it.
// Owned by the gym-engine agent, who replaces this stub with the real catalog. The SCHEMA is frozen (docs/SPEC.md section 5).
// Drawable models live elsewhere (src/gym/models*.js), keyed by the same id.
export const CATALOG = [
  { id: 'bench-worn', kind: 'equipment', name: 'Worn Wooden Bench', blurb: 'Creaks. Wobbles. Still counts.', price: 0, size: [1, 2], starter: true,
    muscles: { chest: 0.02 }, use: { pose: 'bench-press', at: [0, 0], face: 0 } },
  { id: 'rack-squat', kind: 'equipment', name: 'Squat Rack', blurb: 'Steel uprights with safety arms.', price: 2400, size: [2, 2],
    muscles: { quads: 0.1, glutes: 0.08, hamstrings: 0.04 }, use: { pose: 'squat', at: [0, 0], face: 0 } },
  { id: 'plant-monstera', kind: 'decor', name: 'Monstera', blurb: 'Survives on gym air alone.', price: 180, size: [1, 1], vibe: 0.01 },
  { id: 'floor-concrete', kind: 'floor', name: 'Bare Concrete', blurb: 'Cold, grey, free.', price: 0, starter: true },
  { id: 'floor-rubber', kind: 'floor', name: 'Rubber Tiles', blurb: 'Drop-friendly black rubber.', price: 24 },
  { id: 'wall-bare', kind: 'wall', name: 'Bare Plaster', blurb: 'Stained and cracked.', price: 0, starter: true },
  { id: 'wall-brick', kind: 'wall', name: 'Exposed Brick', blurb: 'Warehouse character.', price: 30 },
  { id: 'hair-buzz', kind: 'cosmetic', slot: 'hair', name: 'Buzz Cut', price: 0, starter: true },
  { id: 'top-tank-grey', kind: 'cosmetic', slot: 'top', name: 'Grey Tank', price: 0, starter: true },
];

export const itemById = (id) => CATALOG.find((i) => i.id === id);
