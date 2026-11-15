// Game economy. PURE functions: no store, no clock, no DOM. Everything takes state / values and a
// timestamp (ms) as arguments so it can be tested in Node and ported to Swift line by line.
// Rules: docs/SPEC.md section 7. Numbers and measured balance: docs/ECONOMY.md.
import { EXERCISES, MUSCLES, MUSCLE_LABEL, exerciseById } from '../exercises/data.js';
import { itemById } from '../gym/catalog.js';

const MS_HOUR = 3600e3;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;

/** Every tunable number of the economy. Change balance here, nowhere else. */
export const TUNING = {
  defaultBodyKg: 78,            // body weight used when the player has not set one
  oneRmRepCap: 12,              // reps the Epley estimate counts; above this a set says little about strength
  setScale: 2.5,                // points of one set = setScale * (load x reps) ^ volumeExponent
  volumeExponent: 0.36,         // below 1 so doubling the volume of a set gives about 28% more, not 100%
  repCap: 30,                   // reps of one set that count toward points
  typeFactor: { normal: 1, warmup: 0.3, drop: 1.1, super: 1.1 }, // set-type multipliers
  intensityFloor: 0.6,          // factor for a set at or below intensityFloorRatio of your best estimated 1RM
  intensityFloorRatio: 0.5,     // share of your best 1RM where the intensity factor bottoms out
  intensityCeil: 1.1,           // highest intensity factor, reached when a set beats your best by 12.5%
  fullSets: 6,                  // sets per exercise that count in full (best sets first)
  setDecay: 0.75,               // each set past fullSets is worth this much of the one before it
  durationPerMin: 0.6,          // points per credited minute of session time
  minutesPerSet: 3.5,           // minutes of session time each done set can justify (stops idle timers)
  durationCapMin: 90,           // session minutes that count at most
  primaryWeight: 1,             // weight of a primary muscle in an exercise's gym multiplier and in training load
  secondaryWeight: 0.5,         // weight of a secondary muscle
  stackDecay: 0.7,              // nth best piece of equipment for the same muscle counts stackDecay^n
  muscleBonusCap: 0.6,          // most equipment bonus one muscle can reach (+60%)
  vibeRepeatDecay: 0.5,         // nth copy of the same decor item counts vibeRepeatDecay^n
  vibeCap: 0.1,                 // most global bonus decor can add (+10%)
  dustCleanDays: 3,             // days after a workout during which the gym stays clean
  dustFullDays: 14,             // days after a workout at which the gym is fully dusty
  dustMaxPenalty: 0.25,         // multiplier points subtracted at full dust
  activeWeekMin: 2,             // workouts a 7-day block needs to count as an active week
  consistencyLevels: [          // requirements per level: workouts in the last 14 days, active weeks in a row
    { label: 'Off', workouts14: 0, weeksActive: 0 },
    { label: 'Warming up', workouts14: 2, weeksActive: 0 },
    { label: 'Consistent', workouts14: 4, weeksActive: 2 },
    { label: 'Locked in', workouts14: 6, weeksActive: 4 },
  ],
  consistencyWeeks: 8,          // trailing 7-day blocks reported by consistency()
  passiveMinLevel: 2,           // consistency level from which the character trains passively
  passivePerHour: [0, 0, 2.5, 4.5], // passive points per hour by consistency level, before the gym multiplier
  passiveCapHours: 12,          // hours of passive income that can pile up uncollected
  focusMinLevel: 2,             // consistency level from which focus offers appear
  focusWindowDays: 21,          // trailing window the focus offer and muscle balance look at
  focusThreshold: 0.4,          // offer when the least trained muscle is below this share of the average load
  focusMult: 1.5,               // multiplier on exercises that train the focus muscle as a primary
  buddyRate: 0.15,              // bonus per buddy who also finishes
  buddyCap: 0.3,                // most buddy bonus per workout
  expansionBase: 800,           // price of the first room expansion
  expansionGrowth: 1.7,         // each expansion costs this much more than the previous one
  roomStartSize: 5,             // side of a new room in tiles
  roomMaxSize: 10,              // largest side a room can grow to
  extraFloorBase: 25000,        // price of the second floor
  extraFloorGrowth: 2,          // each further floor costs this much more than the previous one
  maxRooms: 4,                  // floors a gym can have
};

/** Largest side (in tiles) a room can be expanded to. */
export const roomMaxSize = TUNING.roomMaxSize;

/**
 * @typedef {{ type: 'normal'|'warmup'|'drop'|'super', kg: number, reps: number, done: boolean }} WorkoutSet
 * @typedef {{ key: string, label: string, value: number }} BreakdownLine
 * @typedef {{ exId: string, base: number, mult: number, focus: boolean, points: number }} ExercisePoints
 * @typedef {{ lines: BreakdownLine[], perExercise: ExercisePoints[], base: number, gymBonus: number,
 *             focusBonus: number, buddyBonus: number, durationBonus: number, total: number }} Breakdown
 * @typedef {{ byMuscle: Object<string, number>, vibe: number, dustPenalty: number, average: number }} Multipliers
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const sum = (list) => list.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------------------------
// Sets and loads

/**
 * Estimated one-rep max (Epley). A single counts as itself; reps above TUNING.oneRmRepCap add nothing.
 * @param {number} kg load moved per rep
 * @param {number} reps
 * @returns {number}
 */
export function est1RM(kg, reps) {
  const load = num(kg);
  const r = Math.min(num(reps), TUNING.oneRmRepCap);
  if (r === 0) return 0;
  return r <= 1 ? load : load * (1 + r / 30);
}

/**
 * Load moved per rep. Bodyweight exercises move bodyKg * bwFactor plus the added kg.
 * @param {{ bodyweight?: boolean, bwFactor?: number }} exercise
 * @param {{ kg: number }} set
 * @param {number} [bodyKg]
 * @returns {number} kg
 */
export function setLoad(exercise, set, bodyKg = TUNING.defaultBodyKg) {
  const added = num(set.kg);
  return exercise.bodyweight ? num(bodyKg) * (exercise.bwFactor ?? 1) + added : added;
}

/**
 * Best estimated 1RM per exercise over finished workouts (done sets only).
 * @param {Array} workouts
 * @param {number} [bodyKg]
 * @param {(id: string) => object} [exerciseLookup]
 * @returns {Object<string, number>} exId -> kg
 */
export function bestOneRMs(workouts, bodyKg = TUNING.defaultBodyKg, exerciseLookup = exerciseById) {
  const best = {};
  for (const workout of workouts) {
    for (const entry of workout.exercises) {
      const exercise = exerciseLookup(entry.exId);
      if (!exercise) continue;
      for (const set of entry.sets) {
        if (!set.done) continue;
        const rm = est1RM(setLoad(exercise, set, bodyKg), set.reps);
        if (rm > (best[entry.exId] || 0)) best[entry.exId] = rm;
      }
    }
  }
  return best;
}

/**
 * Intensity factor of a set: how close its estimated 1RM is to your best so far.
 * Neutral (1) without history; floors for very light sets; a small bonus for beating your best.
 * @param {number} rm estimated 1RM of the set
 * @param {number} [best] best estimated 1RM before this workout
 * @returns {number}
 */
export function intensityFactor(rm, best) {
  if (!best) return 1;
  const { intensityFloor: floor, intensityFloorRatio: lowRatio, intensityCeil: ceil } = TUNING;
  const ramp = floor + ((rm / best - lowRatio) / (1 - lowRatio)) * (1 - floor);
  return clamp(ramp, floor, ceil);
}

/**
 * Points of one set before any multiplier. Not done = 0.
 * @param {object} exercise entry of EXERCISES
 * @param {WorkoutSet} set
 * @param {number} bodyKg
 * @param {number} [best] best estimated 1RM for this exercise before this workout
 * @returns {number} fractional points
 */
export function setPoints(exercise, set, bodyKg, best) {
  if (!set.done) return 0;
  const load = setLoad(exercise, set, bodyKg);
  const reps = Math.min(num(set.reps), TUNING.repCap);
  if (load === 0 || reps === 0) return 0;
  const volume = TUNING.setScale * Math.pow(load * reps, TUNING.volumeExponent);
  const type = TUNING.typeFactor[set.type] ?? 1;
  return volume * type * intensityFactor(est1RM(load, set.reps), best);
}

// Best sets count in full, the tail decays: padding an exercise with extra sets pays less and less.
function exerciseBase(exercise, sets, bodyKg, best) {
  const scores = sets.map((s) => setPoints(exercise, s, bodyKg, best)).sort((a, b) => b - a);
  return sum(scores.map((p, i) => p * Math.pow(TUNING.setDecay, Math.max(0, i - TUNING.fullSets + 1))));
}

// The same exercise logged twice in one workout scores as one exercise.
function mergeByExercise(entries) {
  const merged = new Map();
  for (const entry of entries) {
    merged.set(entry.exId, [...(merged.get(entry.exId) || []), ...entry.sets]);
  }
  return [...merged].map(([exId, sets]) => ({ exId, sets }));
}

/**
 * Gym multiplier for one exercise: weighted mean of its muscles' multipliers (primary 1, secondary 0.5).
 * @param {{ primary: string[], secondary: string[] }} exercise
 * @param {Object<string, number>} byMuscle
 * @returns {number}
 */
export function exerciseMultiplier(exercise, byMuscle = {}) {
  const parts = [
    ...exercise.primary.map((m) => [m, TUNING.primaryWeight]),
    ...exercise.secondary.map((m) => [m, TUNING.secondaryWeight]),
  ];
  const weight = sum(parts.map(([, w]) => w));
  if (weight === 0) return 1;
  return sum(parts.map(([m, w]) => (byMuscle[m] ?? 1) * w)) / weight;
}

/**
 * Buddy bonus rate for a number of buddies who also finished.
 * @param {number} buddiesFinished
 * @returns {number} 0..TUNING.buddyCap
 */
export function buddyRate(buddiesFinished) {
  return Math.min(num(buddiesFinished) * TUNING.buddyRate, TUNING.buddyCap);
}

function durationBonus(workout, doneSets) {
  const minutes = num((workout.endedAt - workout.startedAt) / 60e3);
  const credited = Math.min(minutes, doneSets * TUNING.minutesPerSet, TUNING.durationCapMin);
  return Math.round(credited * TUNING.durationPerMin);
}

function breakdownLines(b, ctx) {
  const focusLabel = ctx.focus ? `Focus on ${MUSCLE_LABEL[ctx.focus.muscle].toLowerCase()} x${ctx.focus.mult}` : 'Focus';
  const friends = num(ctx.buddiesFinished) === 1 ? '1 friend' : `${num(ctx.buddiesFinished)} friends`;
  const lines = [
    { key: 'base', label: 'Sets and reps', value: b.base },
    { key: 'duration', label: 'Time in the gym', value: b.durationBonus },
    { key: 'gym', label: b.gymBonus < 0 ? 'Dusty gym' : 'Gym equipment', value: b.gymBonus },
    { key: 'focus', label: focusLabel, value: b.focusBonus },
    { key: 'buddy', label: `Trained with ${friends}`, value: b.buddyBonus },
  ];
  return lines.filter((l) => l.key === 'base' || l.value !== 0);
}

/**
 * Points for a workout, line by line. Only done sets count. All values are integers and
 * base + durationBonus + gymBonus + focusBonus + buddyBonus === total.
 * @param {{ startedAt: number, endedAt: number, exercises: Array<{ exId: string, sets: WorkoutSet[] }> }} workout
 * @param {{ bodyKg?: number, best1RM?: Object<string, number>, multipliers?: Multipliers,
 *           focus?: null | { muscle: string, mult: number }, buddiesFinished?: number,
 *           exerciseLookup?: (id: string) => object }} [ctx]
 *   best1RM: bests BEFORE this workout (bestOneRMs of the history); multipliers: gymMultipliers() result.
 * @returns {Breakdown}
 */
export function workoutPoints(workout, ctx = {}) {
  const lookup = ctx.exerciseLookup || exerciseById;
  const bodyKg = ctx.bodyKg ?? TUNING.defaultBodyKg;
  const byMuscle = ctx.multipliers ? ctx.multipliers.byMuscle : {};
  const entries = mergeByExercise(workout.exercises).filter((e) => lookup(e.exId));

  const perExercise = entries.map(({ exId, sets }) => {
    const exercise = lookup(exId);
    const base = Math.round(exerciseBase(exercise, sets, bodyKg, (ctx.best1RM || {})[exId]));
    const mult = exerciseMultiplier(exercise, byMuscle);
    const gym = Math.round(base * (mult - 1));
    const focus = Boolean(ctx.focus && exercise.primary.includes(ctx.focus.muscle));
    const focusPart = focus ? Math.round((base + gym) * (ctx.focus.mult - 1)) : 0;
    return { exId, base, mult: round4(mult), focus, gym, focusPart, points: base + gym + focusPart };
  }).filter((e) => e.base > 0);

  const doneSets = sum(entries.map((e) => e.sets.filter((s) => s.done).length));
  const totals = {
    base: sum(perExercise.map((e) => e.base)),
    gymBonus: sum(perExercise.map((e) => e.gym)),
    focusBonus: sum(perExercise.map((e) => e.focusPart)),
    durationBonus: perExercise.length ? durationBonus(workout, doneSets) : 0,
  };
  const beforeBuddy = totals.base + totals.gymBonus + totals.focusBonus + totals.durationBonus;
  const buddyBonus = Math.round(beforeBuddy * buddyRate(ctx.buddiesFinished));
  const result = { ...totals, buddyBonus, total: beforeBuddy + buddyBonus };
  return {
    lines: breakdownLines(result, ctx),
    perExercise: perExercise.map(({ exId, base, mult, focus, points }) => ({ exId, base, mult, focus, points })),
    ...result,
  };
}

// ---------------------------------------------------------------------------------------------
// Gym multipliers, dust, value

/** All placed items of a gym, across every room. */
const placedItems = (gym) => (gym && gym.rooms ? gym.rooms.flatMap((r) => r.items) : []);

// Largest first, each next contribution worth stackDecay of the previous weight.
function stackedBonus(contributions) {
  const sorted = [...contributions].sort((a, b) => b - a);
  const total = sum(sorted.map((c, i) => c * Math.pow(TUNING.stackDecay, i)));
  return Math.min(total, TUNING.muscleBonusCap);
}

function decorVibe(items) {
  const copies = {};
  let vibe = 0;
  for (const item of items) {
    if (!item.vibe) continue;
    const n = copies[item.id] || 0;
    vibe += item.vibe * Math.pow(TUNING.vibeRepeatDecay, n);
    copies[item.id] = n + 1;
  }
  return Math.min(vibe, TUNING.vibeCap);
}

/**
 * Per-muscle point multipliers of a gym: 1 + equipment (diminishing per muscle) + decor vibe (capped) - dust.
 * Only items placed in a room count, across all rooms.
 * @param {{ rooms: Array<{ items: Array<{ itemId: string }> }> }} gym
 * @param {(id: string) => object} catalogLookup
 * @param {number} [dust] 0..1 from dustLevel()
 * @returns {Multipliers}
 */
export function gymMultipliers(gym, catalogLookup = itemById, dust = 0) {
  const items = placedItems(gym).map((p) => catalogLookup(p.itemId)).filter(Boolean);
  const vibe = decorVibe(items);
  const dustPenalty = clamp(dust, 0, 1) * TUNING.dustMaxPenalty;
  const byMuscle = {};
  for (const muscle of MUSCLES) {
    const contributions = items.map((i) => (i.muscles && i.muscles[muscle]) || 0).filter((c) => c > 0);
    byMuscle[muscle] = round4(1 + stackedBonus(contributions) + vibe - dustPenalty);
  }
  const average = round4(sum(MUSCLES.map((m) => byMuscle[m])) / MUSCLES.length);
  return { byMuscle, vibe: round4(vibe), dustPenalty: round4(dustPenalty), average };
}

/**
 * Dust from the time of the last workout: 0 while clean, rising linearly to 1.
 * @param {number|null|undefined} lastWorkoutAt ms timestamp; nothing logged yet = clean
 * @param {number} t now (ms)
 * @returns {number} 0..1
 */
export function dustSince(lastWorkoutAt, t) {
  if (!lastWorkoutAt) return 0;
  const days = (t - lastWorkoutAt) / MS_DAY;
  return clamp((days - TUNING.dustCleanDays) / (TUNING.dustFullDays - TUNING.dustCleanDays), 0, 1);
}

/**
 * Dust level of the player's gym. One workout clears it.
 * @param {Array<{ endedAt: number }>} workouts
 * @param {number} t now (ms)
 * @returns {number} 0..1
 */
export function dustLevel(workouts, t) {
  const last = workouts.reduce((latest, w) => Math.max(latest, w.endedAt), 0);
  return dustSince(last, t);
}

// ---------------------------------------------------------------------------------------------
// Consistency, passive income

/**
 * Workouts per trailing 7-day block, oldest first; the last entry is the most recent 7 days.
 * @param {Array<{ endedAt: number }>} workouts
 * @param {number} t now (ms)
 * @param {number} weeks number of blocks
 * @returns {number[]}
 */
export function weeklyCounts(workouts, t, weeks) {
  const counts = new Array(weeks).fill(0);
  for (const w of workouts) {
    const age = t - w.endedAt;
    if (age < 0) continue;
    const block = Math.floor(age / MS_WEEK);
    if (block < weeks) counts[weeks - 1 - block] += 1;
  }
  return counts;
}

/**
 * How consistently the player trains right now.
 * @param {Array<{ endedAt: number }>} workouts
 * @param {number} t now (ms)
 * @returns {{ level: 0|1|2|3, label: string, workouts14: number, weeksActive: number, perWeek: number[] }}
 *   weeksActive: 7-day blocks in a row, counting back from now, with at least TUNING.activeWeekMin workouts.
 */
export function consistency(workouts, t) {
  const perWeek = weeklyCounts(workouts, t, TUNING.consistencyWeeks);
  const recent = [...perWeek].reverse();
  const workouts14 = recent[0] + recent[1];
  const firstQuiet = recent.findIndex((n) => n < TUNING.activeWeekMin);
  const weeksActive = firstQuiet === -1 ? recent.length : firstQuiet;
  const levels = TUNING.consistencyLevels;
  let level = 0;
  for (let i = 1; i < levels.length; i++) {
    if (workouts14 >= levels[i].workouts14 && weeksActive >= levels[i].weeksActive) level = i;
  }
  return { level, label: levels[level].label, workouts14, weeksActive, perWeek };
}

/**
 * Passive income: at Consistent or better the character trains on its own.
 * Rate = base by consistency level x average gym multiplier (dust included); piles up since
 * wallet.passiveSince, for at most TUNING.passiveCapHours.
 * @param {{ workouts: Array, gym: object, wallet: { passiveSince: number } }} state
 * @param {number} t now (ms)
 * @param {(id: string) => object} [catalogLookup]
 * @returns {{ active: boolean, ratePerHour: number, accrued: number, cappedAt: number, hoursAccrued: number }}
 */
export function passive(state, t, catalogLookup = itemById) {
  const { level } = consistency(state.workouts, t);
  const active = level >= TUNING.passiveMinLevel;
  const multipliers = gymMultipliers(state.gym, catalogLookup, dustLevel(state.workouts, t));
  const ratePerHour = active ? Math.round(TUNING.passivePerHour[level] * multipliers.average * 10) / 10 : 0;
  const since = state.wallet.passiveSince;
  const hoursAccrued = clamp((t - since) / MS_HOUR, 0, TUNING.passiveCapHours);
  return {
    active,
    ratePerHour,
    accrued: Math.floor(ratePerHour * hoursAccrued),
    cappedAt: since + TUNING.passiveCapHours * MS_HOUR,
    hoursAccrued,
  };
}

// ---------------------------------------------------------------------------------------------
// Focus offer

/**
 * Training load per muscle over a trailing window, in set-equivalents:
 * each done working set counts 1 for primary muscles and 0.5 for secondary ones. Warm-ups do not count.
 * @param {Array} workouts
 * @param {number} t now (ms)
 * @param {number} [days] window length
 * @param {(id: string) => object} [exerciseLookup]
 * @returns {Object<string, number>} muscle -> load, every muscle present
 */
export function muscleLoad(workouts, t, days = TUNING.focusWindowDays, exerciseLookup = exerciseById) {
  const load = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const workout of workouts) {
    const age = t - workout.endedAt;
    if (age < 0 || age >= days * MS_DAY) continue;
    for (const entry of workout.exercises) {
      const exercise = exerciseLookup(entry.exId);
      if (!exercise) continue;
      const sets = entry.sets.filter((s) => s.done && s.type !== 'warmup').length;
      for (const m of exercise.primary) load[m] += sets * TUNING.primaryWeight;
      for (const m of exercise.secondary) load[m] += sets * TUNING.secondaryWeight;
    }
  }
  return load;
}

/** Ids of the exercises that train a muscle as a primary. */
const exercisesFor = (muscle) => EXERCISES.filter((e) => e.primary.includes(muscle)).map((e) => e.id);

function focusReason(muscle, load) {
  const name = MUSCLE_LABEL[muscle];
  const weeks = Math.round(TUNING.focusWindowDays / 7);
  return load === 0
    ? `No ${name.toLowerCase()} training in the last ${weeks} weeks`
    : `${name} training is falling behind the rest`;
}

/**
 * The focus offer: when the player trains consistently but one muscle is left behind, offer a
 * multiplier on exercises that train it as a primary. Valid for the next workout.
 * Muscles without a primary exercise in the library are never offered. Ties go to MUSCLES order.
 * @param {{ workouts: Array }} state
 * @param {number} t now (ms)
 * @returns {null | { muscle: string, mult: number, exerciseIds: string[], reason: string, share: number }}
 *   share: the muscle's load relative to the average load (0..focusThreshold).
 */
export function focusOffer(state, t) {
  if (consistency(state.workouts, t).level < TUNING.focusMinLevel) return null;
  const load = muscleLoad(state.workouts, t);
  const candidates = MUSCLES.filter((m) => exercisesFor(m).length > 0);
  const mean = sum(candidates.map((m) => load[m])) / candidates.length;
  if (mean === 0) return null;
  const muscle = candidates.reduce((low, m) => (load[m] < load[low] ? m : low));
  const share = load[muscle] / mean;
  if (share >= TUNING.focusThreshold) return null;
  return {
    muscle,
    mult: TUNING.focusMult,
    exerciseIds: exercisesFor(muscle),
    reason: focusReason(muscle, load[muscle]),
    share: round4(share),
  };
}

// ---------------------------------------------------------------------------------------------
// Space and finishes

/**
 * Price of room expansion number n (0 = the first one ever bought).
 * @param {number} n expansions bought so far (gym.expansions)
 * @returns {number}
 */
export function expansionCost(n) {
  return Math.round(TUNING.expansionBase * Math.pow(TUNING.expansionGrowth, n));
}

/**
 * Price of the next floor for a gym that has nRooms floors.
 * @param {number} nRooms current number of rooms (>= 1)
 * @returns {number}
 */
export function extraFloorCost(nRooms) {
  return Math.round(TUNING.extraFloorBase * Math.pow(TUNING.extraFloorGrowth, Math.max(0, nRooms - 1)));
}

/** Price of a floor finish for a room: per tile. */
export const floorCost = (room, item) => item.price * room.w * room.d;

/** Price of a wall finish for a room: per wall panel, panels = w + d. */
export const wallCost = (room, item) => item.price * (room.w + room.d);

/**
 * Price of a floor or wall finish for a room.
 * @param {{ w: number, d: number }} room
 * @param {{ kind: 'floor'|'wall', price: number }} item
 * @returns {number}
 */
export const finishCost = (room, item) => (item.kind === 'floor' ? floorCost(room, item) : wallCost(room, item));

/** True when a room can still be expanded. */
export const canExpand = (room) => room.w < TUNING.roomMaxSize && room.d < TUNING.roomMaxSize;

// ---------------------------------------------------------------------------------------------
// Placement grid

const isWallItem = (item) => item.mount === 'wall';
const isPlaceable = (item) => Boolean(item && (item.kind === 'equipment' || item.kind === 'decor') && item.size);
const cellKey = (c) => `${c.x},${c.y}`;

/**
 * Cells an item covers. Floor items: tiles, rot 1 and 3 swap width and depth.
 * Wall items: size[0] panels along their wall; y = -1 is the back-right wall (panels run along x),
 * x = -1 the back-left wall (panels run along y). Rotation does not apply to wall items.
 * @param {{ size: [number, number], mount?: 'floor'|'wall' }} item
 * @param {number} x
 * @param {number} y
 * @param {number} [rot] 0..3
 * @returns {Array<{ x: number, y: number }>}
 */
export function footprint(item, x, y, rot = 0) {
  const [w, d] = item.size;
  const cells = [];
  if (isWallItem(item)) {
    for (let i = 0; i < w; i++) cells.push(y === -1 ? { x: x + i, y: -1 } : { x: -1, y: y + i });
    return cells;
  }
  const [fw, fd] = rot % 2 === 1 ? [d, w] : [w, d];
  for (let dx = 0; dx < fw; dx++) {
    for (let dy = 0; dy < fd; dy++) cells.push({ x: x + dx, y: y + dy });
  }
  return cells;
}

function occupiedCells(room, ignoreUid, catalogLookup) {
  const taken = new Set();
  for (const placed of room.items) {
    const item = catalogLookup(placed.itemId);
    if (placed.uid === ignoreUid || !isPlaceable(item)) continue;
    for (const c of footprint(item, placed.x, placed.y, placed.rot)) taken.add(cellKey(c));
  }
  return taken;
}

/**
 * Whether an item fits at a position: in bounds and not overlapping anything else in the room.
 * Floor items need x, y >= 0. Wall items need exactly one of x, y to be -1.
 * @param {{ w: number, d: number, items: Array }} room
 * @param {object} item catalog item
 * @param {number} x
 * @param {number} y
 * @param {number} rot 0..3
 * @param {string} [ignoreUid] placed item to ignore (the one being moved)
 * @param {(id: string) => object} [catalogLookup]
 * @returns {boolean}
 */
export function canPlace(room, item, x, y, rot, ignoreUid, catalogLookup = itemById) {
  if (!isPlaceable(item) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (![0, 1, 2, 3].includes(rot)) return false;
  const anchorOk = isWallItem(item) ? (x === -1) !== (y === -1) && x >= -1 && y >= -1 : x >= 0 && y >= 0;
  if (!anchorOk) return false;
  const cells = footprint(item, x, y, rot);
  if (!cells.every((c) => c.x < room.w && c.y < room.d)) return false;
  const taken = occupiedCells(room, ignoreUid, catalogLookup);
  return cells.every((c) => !taken.has(cellKey(c)));
}

// ---------------------------------------------------------------------------------------------
// Gym value

function spaceValue(rooms) {
  const steps = sum(rooms.map((r) => Math.max(0, Math.max(r.w, r.d) - TUNING.roomStartSize)));
  let value = 0;
  for (let n = 0; n < steps; n++) value += expansionCost(n);
  for (let n = 1; n < rooms.length; n++) value += extraFloorCost(n);
  return value;
}

/**
 * What a gym is worth: placed items, finishes at their per m² price, and the space it took to get
 * here (expansions inferred from room sizes, extra floors). Works for friends' gyms too.
 * @param {{ rooms: Array }} gym
 * @param {(id: string) => object} [catalogLookup]
 * @returns {number}
 */
export function gymValue(gym, catalogLookup = itemById) {
  const rooms = (gym && gym.rooms) || [];
  const price = (id) => { const item = catalogLookup(id); return item ? item.price : 0; };
  const items = sum(placedItems(gym).map((p) => price(p.itemId)));
  const finishes = sum(rooms.map((r) => price(r.floor) * r.w * r.d + price(r.wall) * (r.w + r.d)));
  return items + finishes + spaceValue(rooms);
}
