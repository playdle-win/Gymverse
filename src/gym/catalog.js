// Shop catalog. PURE DATA (no DOM, no Preact) so the core engine and Node tests can import it.
// Schema: docs/SPEC.md section 5. Drawable models live in src/gym/models*.js, keyed by the same id.
// use.at is a tile offset inside the footprint at rot 0 (fractions allowed); the avatar's root is the centre of that tile.
// use.face is the direction the avatar faces at rot 0: 0 = +y, 1 = -x, 2 = -y, 3 = +x.
export const CATALOG = [
  // equipment
  { id: 'bench-worn', kind: 'equipment', name: 'Worn Wooden Bench', blurb: 'Creaks. Wobbles. Still counts.', price: 0, size: [1, 2], starter: true,
    muscles: { chest: 0.02 }, use: { pose: 'bench-press', at: [0, 0.62], face: 0 } },
  { id: 'bench-flat', kind: 'equipment', name: 'Flat Bench and Barbell', blurb: 'Four legs, all the same length.', price: 480, size: [2, 2],
    muscles: { chest: 0.08, triceps: 0.04, shoulders: 0.03 }, use: { pose: 'bench-press', at: [0.5, 0.76], face: 0 } },
  { id: 'rack-dumbbells', kind: 'equipment', name: 'Dumbbell Rack', blurb: 'Ten pairs. Put them back.', price: 600, size: [2, 1],
    muscles: { biceps: 0.07, shoulders: 0.05, triceps: 0.03 }, use: { pose: 'curl', at: [0.5, 0.26], face: 0 } },
  { id: 'station-pullup', kind: 'equipment', name: 'Pull-Up Station', blurb: 'A bar, some padding, gravity.', price: 950, size: [1, 1],
    muscles: { back: 0.08, biceps: 0.04, core: 0.03 }, use: { pose: 'pull-up', at: [0, 0.07], face: 0 } },
  { id: 'treadmill', kind: 'equipment', name: 'Treadmill', blurb: 'Goes nowhere at up to 18 km/h.', price: 1800, size: [1, 2],
    muscles: { calves: 0.06, quads: 0.03, hamstrings: 0.03, core: 0.02 }, use: { pose: 'run', at: [0, 0.4], face: 0 } },
  { id: 'rack-squat', kind: 'equipment', name: 'Squat Rack', blurb: 'Steel uprights with safety arms.', price: 2400, size: [2, 2],
    muscles: { quads: 0.1, glutes: 0.08, hamstrings: 0.04, core: 0.02 }, use: { pose: 'squat', at: [0.5, 0.36], face: 0 } },
  { id: 'machine-cable', kind: 'equipment', name: 'Cable Machine', blurb: 'Two pulleys, endless angles.', price: 3800, size: [1, 2],
    muscles: { chest: 0.06, triceps: 0.06, back: 0.05, shoulders: 0.04 }, use: { pose: 'cable', at: [0, 0.92], face: 0 } },
  { id: 'machine-legpress', kind: 'equipment', name: 'Leg Press', blurb: 'Sit down and push the floor away.', price: 5200, size: [2, 2],
    muscles: { quads: 0.12, glutes: 0.06, calves: 0.05, hamstrings: 0.04 }, use: { pose: 'leg-press', at: [0.5, 0.35], face: 0 } },

  // decor
  { id: 'poster-lift', kind: 'decor', name: 'Lift Poster', blurb: 'Motivation, taped to the wall.', price: 90, size: [1, 1], mount: 'wall', vibe: 0.005 },
  { id: 'mat-floor', kind: 'decor', name: 'Training Mat', blurb: 'Soft landing for hard sessions.', price: 140, size: [2, 2], vibe: 0.005 },
  { id: 'plant-monstera', kind: 'decor', name: 'Monstera', blurb: 'Survives on gym air alone.', price: 180, size: [1, 1], vibe: 0.01 },
  { id: 'cooler-water', kind: 'decor', name: 'Water Cooler', blurb: 'Where rest periods get long.', price: 260, size: [1, 1], vibe: 0.01 },
  { id: 'speaker-boom', kind: 'decor', name: 'Floor Speaker', blurb: 'Loud enough to skip small talk.', price: 340, size: [1, 1], vibe: 0.015 },
  { id: 'mirror-wall', kind: 'decor', name: 'Wall Mirror', blurb: 'For checking form. Only form.', price: 420, size: [2, 1], mount: 'wall', vibe: 0.015 },

  // floors (price per tile)
  { id: 'floor-concrete', kind: 'floor', name: 'Bare Concrete', blurb: 'Cold, grey, free.', price: 0, starter: true },
  { id: 'floor-rubber', kind: 'floor', name: 'Rubber Tiles', blurb: 'Drop-friendly black rubber.', price: 24 },
  { id: 'floor-checker', kind: 'floor', name: 'Checker Tiles', blurb: 'Old-school locker room squares.', price: 30 },
  { id: 'floor-wood', kind: 'floor', name: 'Light Wood', blurb: 'Pale planks, studio feel.', price: 38 },

  // walls (price per wall panel)
  { id: 'wall-bare', kind: 'wall', name: 'Bare Plaster', blurb: 'Stained and cracked.', price: 0, starter: true },
  { id: 'wall-paint', kind: 'wall', name: 'Two-Tone Paint', blurb: 'Fresh coat with a team stripe.', price: 22 },
  { id: 'wall-brick', kind: 'wall', name: 'Exposed Brick', blurb: 'Warehouse character.', price: 30 },
  { id: 'wall-panel', kind: 'wall', name: 'Dark Panels', blurb: 'Matte slats and a strip of light.', price: 60 },

  // cosmetics
  { id: 'hair-buzz', kind: 'cosmetic', slot: 'hair', name: 'Buzz Cut', blurb: 'Zero maintenance.', price: 0, starter: true },
  { id: 'hair-crop', kind: 'cosmetic', slot: 'hair', name: 'Textured Crop', blurb: 'Short sides, a bit of lift.', price: 120 },
  { id: 'hair-bun', kind: 'cosmetic', slot: 'hair', name: 'Top Knot', blurb: 'Out of the way for heavy sets.', price: 150 },
  { id: 'hair-curls', kind: 'cosmetic', slot: 'hair', name: 'Curls', blurb: 'Big, round, unbothered.', price: 180 },
  { id: 'beard-none', kind: 'cosmetic', slot: 'beard', name: 'Clean Shaven', blurb: 'Nothing to see here.', price: 0, starter: true },
  { id: 'beard-stubble', kind: 'cosmetic', slot: 'beard', name: 'Stubble', blurb: 'Three days in.', price: 90 },
  { id: 'beard-full', kind: 'cosmetic', slot: 'beard', name: 'Full Beard', blurb: 'Adds two kilos to every lift.', price: 160 },
  { id: 'top-tank-grey', kind: 'cosmetic', slot: 'top', name: 'Grey Tank', blurb: 'Washed about a hundred times.', price: 0, starter: true, tint: '#9a9da3' },
  { id: 'top-tee-white', kind: 'cosmetic', slot: 'top', name: 'White Tee', blurb: 'Plain cotton, fits right.', price: 140, tint: '#f1efe8' },
  { id: 'top-tee-team', kind: 'cosmetic', slot: 'top', name: 'Team Tee', blurb: 'Club colours, short sleeves.', price: 220, tint: '#e2553d' },
  { id: 'top-hoodie-black', kind: 'cosmetic', slot: 'top', name: 'Black Hoodie', blurb: 'Warm-up layer. Stays on.', price: 420, tint: '#2c2e35' },
  { id: 'bottom-shorts-black', kind: 'cosmetic', slot: 'bottom', name: 'Black Shorts', blurb: 'They do the job.', price: 0, starter: true, tint: '#2b2d33' },
  { id: 'bottom-shorts-blue', kind: 'cosmetic', slot: 'bottom', name: 'Blue Shorts', blurb: 'Same shorts, better colour.', price: 120, tint: '#3565c4' },
  { id: 'bottom-joggers-grey', kind: 'cosmetic', slot: 'bottom', name: 'Grey Joggers', blurb: 'Tapered, soft, leg day proof.', price: 220, tint: '#7d828c' },
  { id: 'shoes-trainers-white', kind: 'cosmetic', slot: 'shoes', name: 'White Trainers', blurb: 'Were white once.', price: 0, starter: true, tint: '#ecebe6' },
  { id: 'shoes-hightops-red', kind: 'cosmetic', slot: 'shoes', name: 'Red High Tops', blurb: 'Flat soles, loud colour.', price: 260, tint: '#d13f36' },
  { id: 'acc-none', kind: 'cosmetic', slot: 'accessory', name: 'No Accessory', blurb: 'Travelling light.', price: 0, starter: true },
  { id: 'acc-headband', kind: 'cosmetic', slot: 'accessory', name: 'Headband', blurb: 'Keeps sweat out of your eyes.', price: 80, tint: '#e7e3d8' },
  { id: 'acc-cap', kind: 'cosmetic', slot: 'accessory', name: 'Cap', blurb: 'Brim low, focus high.', price: 150, tint: '#2f4f8f' },
  { id: 'acc-headphones', kind: 'cosmetic', slot: 'accessory', name: 'Headphones', blurb: 'Do not disturb, politely.', price: 380, tint: '#2a2b31' },
];

const byId = new Map(CATALOG.map((i) => [i.id, i]));
export const itemById = (id) => byId.get(id);
