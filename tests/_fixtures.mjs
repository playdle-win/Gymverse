// Shared builders and sample workouts for the tests and the balance report.
export const HOUR = 3600e3;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);

let counter = 0;

/** A done set. */
export const set = (kg, reps, type = 'normal', done = true) => ({ type, kg, reps, done });

/** n identical done sets. */
export const sets = (n, kg, reps, type = 'normal') => Array.from({ length: n }, () => set(kg, reps, type));

/**
 * A finished workout ending at endedAt.
 * @param {Array<[string, Array]>} exercises pairs of exercise id and sets
 */
export function workout(exercises, endedAt = T0, minutes = 60, extra = {}) {
  counter += 1;
  return {
    id: `t${counter}`, userId: 'me', name: 'Test', startedAt: endedAt - minutes * 60e3, endedAt, buddies: [],
    exercises: exercises.map(([exId, s]) => ({ exId, sets: s })),
    ...extra,
  };
}

/** Workouts ending the given numbers of days before t. */
export const workoutsDaysAgo = (days, t = T0, exercises = [['bench-press', sets(3, 60, 8)]]) =>
  days.map((d) => workout(exercises, t - d * DAY));

export const starterGym = () => ({
  rooms: [{ id: 'r1', name: 'Ground floor', w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare',
    items: [{ uid: 'i1', itemId: 'bench-worn', x: 2, y: 1, rot: 0 }] }],
  active: 0, expansions: 0,
});

// A small fixed catalog so economy tests do not depend on the live shop list.
export const TEST_CATALOG = [
  { id: 'bench-worn', kind: 'equipment', price: 0, size: [1, 2], starter: true, muscles: { chest: 0.02 } },
  { id: 'rack', kind: 'equipment', price: 2400, size: [2, 2], muscles: { quads: 0.1, glutes: 0.08, hamstrings: 0.04 } },
  { id: 'leg-press', kind: 'equipment', price: 5200, size: [2, 3], muscles: { quads: 0.12, glutes: 0.05, calves: 0.04 } },
  { id: 'cable', kind: 'equipment', price: 6800, size: [3, 1], muscles: { chest: 0.08, back: 0.1, shoulders: 0.08, biceps: 0.08, triceps: 0.1 } },
  { id: 'bench-pro', kind: 'equipment', price: 1800, size: [1, 2], muscles: { chest: 0.12, triceps: 0.05, shoulders: 0.04 } },
  { id: 'pullup-bar', kind: 'equipment', price: 900, size: [2, 1], muscles: { back: 0.08, biceps: 0.04, core: 0.05 } },
  { id: 'dumbbells', kind: 'equipment', price: 1500, size: [2, 1], muscles: { biceps: 0.08, shoulders: 0.06, back: 0.04, chest: 0.03 } },
  { id: 'ab-bench', kind: 'equipment', price: 700, size: [1, 2], muscles: { core: 0.1 } },
  { id: 'calf-block', kind: 'equipment', price: 450, size: [1, 1], muscles: { calves: 0.1, hamstrings: 0.05 } },
  { id: 'plant', kind: 'decor', price: 180, size: [1, 1], vibe: 0.01 },
  { id: 'neon', kind: 'decor', price: 600, size: [2, 1], mount: 'wall', vibe: 0.03 },
  { id: 'mirror', kind: 'decor', price: 400, size: [2, 1], mount: 'wall', vibe: 0.02 },
  { id: 'speaker', kind: 'decor', price: 350, size: [1, 1], vibe: 0.02 },
  { id: 'rug', kind: 'decor', price: 250, size: [2, 2], vibe: 0.015 },
  { id: 'poster', kind: 'decor', price: 90, size: [1, 1], mount: 'wall', vibe: 0.01 },
  { id: 'floor-concrete', kind: 'floor', price: 0, starter: true },
  { id: 'floor-rubber', kind: 'floor', price: 24 },
  { id: 'wall-bare', kind: 'wall', price: 0, starter: true },
  { id: 'wall-brick', kind: 'wall', price: 30 },
];
export const testLookup = (id) => TEST_CATALOG.find((i) => i.id === id);

/** A gym with every equipment and decor item of the test catalog placed (positions are irrelevant to multipliers). */
export const kittedGym = () => ({
  rooms: [{ id: 'r1', name: 'Ground floor', w: 10, d: 10, floor: 'floor-rubber', wall: 'wall-brick',
    items: TEST_CATALOG.filter((i) => i.size).map((i, n) => ({ uid: `k${n}`, itemId: i.id, x: 0, y: 0, rot: 0 })) }],
  active: 0, expansions: 5,
});

// Sample sessions for the balance checks. Loads are kg; pull-ups and leg raises are bodyweight.
export const SAMPLES = {
  // First months of training: light loads, 5 exercises x 3 sets, about an hour with long breaks.
  beginnerHour: () => workout([
    ['bench-press', sets(3, 40, 10)],
    ['back-squat', sets(3, 50, 10)],
    ['dumbbell-row', sets(3, 14, 12)],
    ['overhead-press', sets(3, 25, 10)],
    ['hanging-leg-raise', sets(3, 0, 10)],
  ], T0, 55),
  // A regular: warm-ups, 5 exercises, 17 working sets.
  intermediateHour: () => workout([
    ['bench-press', [set(40, 10, 'warmup'), ...sets(4, 72.5, 8)]],
    ['overhead-press', sets(3, 42.5, 8)],
    ['dumbbell-row', sets(3, 30, 10)],
    ['cable-pushdown', [...sets(3, 30, 12), set(22.5, 12, 'drop')]],
    ['hanging-leg-raise', sets(3, 0, 12)],
  ], T0, 60),
  // Strong lifter: heavy compounds, long rests.
  advancedHour: () => workout([
    ['back-squat', [set(60, 8, 'warmup'), set(100, 5, 'warmup'), ...sets(4, 140, 5)]],
    ['deadlift', [set(100, 5, 'warmup'), ...sets(3, 180, 4)]],
    ['leg-press', sets(3, 260, 10)],
    ['pull-up', sets(4, 15, 8)],
    ['hanging-leg-raise', sets(3, 5, 12)],
  ], T0, 65),
  // Padding: one exercise, 20 sets of 25 reps with a light bar.
  junkVolume: () => workout([['bench-press', sets(20, 20, 25)]], T0, 60),
  // In and out: 2 exercises, 6 sets.
  quickTwenty: () => workout([
    ['bench-press', sets(3, 70, 8)],
    ['dumbbell-curl', sets(3, 12, 12)],
  ], T0, 20),
};

// Best estimated 1RMs a lifter of each kind walks in with (so intensity is not neutral).
export const BESTS = {
  beginner: { 'bench-press': 55, 'back-squat': 68, 'dumbbell-row': 20, 'overhead-press': 34, 'hanging-leg-raise': 33 },
  intermediate: { 'bench-press': 93, 'overhead-press': 55, 'dumbbell-row': 41, 'cable-pushdown': 43, 'hanging-leg-raise': 39 },
  advanced: { 'back-squat': 166, deadlift: 206, 'leg-press': 350, 'pull-up': 120, 'hanging-leg-raise': 46 },
};
