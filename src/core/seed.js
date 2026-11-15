// Seed content (docs/SPEC.md section 8). createInitialState is deterministic: the same nowMs gives the
// same state, driven by a seeded PRNG (never Math.random). Clock times use the local day so the
// history reads naturally ("yesterday 18:40").
import { CATALOG, itemById } from '../gym/catalog.js';
import { SHOWROOMS, starterRoom } from '../gym/showrooms.js';
import { exerciseById } from '../exercises/data.js';
import { TUNING, workoutPoints, bestOneRMs, gymMultipliers } from './economy.js';

const MS_MIN = 60e3;
const MS_HOUR = 3600e3;
const MS_DAY = 24 * MS_HOUR;

/** Version of the persisted state shape; a stored state with another version is discarded at boot. */
export const STATE_VERSION = 1;
/** Avatar palette keys (the renderer maps them to colours). */
export const SKIN_KEYS = ['s1', 's2', 's3', 's4', 's5'];
export const HAIR_COLOR_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5'];
/** Avatar slots filled with cosmetic catalog ids. */
export const AVATAR_SLOTS = ['hair', 'beard', 'top', 'bottom', 'shoes', 'accessory'];

// ---------------------------------------------------------------------------------------------
// Deterministic randomness

/** FNV-1a hash of a string to an unsigned 32-bit integer. */
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const rngFor = (key) => mulberry32(hashString(key));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const roundTo = (value, step) => Math.round(value / step) * step;

// ---------------------------------------------------------------------------------------------
// Training content

// Loads of the reference lifter (strength 1) in week 0 and what a week of training adds.
const LIFTS = {
  'bench-press': { start: 62.5, gain: 1.5, step: 2.5, sets: 4, reps: 8, warmup: true },
  'overhead-press': { start: 37.5, gain: 0.8, step: 2.5, sets: 4, reps: 8 },
  'cable-pushdown': { start: 25, gain: 1, step: 2.5, sets: 3, reps: 12, drop: true },
  'hanging-leg-raise': { start: 0, gain: 0, step: 2.5, sets: 3, reps: 12, superset: true },
  deadlift: { start: 100, gain: 2.5, step: 2.5, sets: 3, reps: 5, warmup: true },
  'pull-up': { start: 0, gain: 0.6, step: 2.5, sets: 4, reps: 8 },
  'dumbbell-row': { start: 26, gain: 0.7, step: 2, sets: 4, reps: 10 },
  'dumbbell-curl': { start: 12, gain: 0.35, step: 1, sets: 3, reps: 12, drop: true },
  'back-squat': { start: 80, gain: 2.5, step: 2.5, sets: 4, reps: 6, warmup: true },
  'leg-press': { start: 120, gain: 5, step: 5, sets: 3, reps: 10 },
};

const SESSIONS = {
  push: { routine: 'Push', names: ['Push day', 'Chest and shoulders'], morning: 'Morning push',
    lifts: ['bench-press', 'overhead-press', 'cable-pushdown', 'hanging-leg-raise'] },
  pull: { routine: 'Pull', names: ['Pull day', 'Back and biceps'], morning: 'Morning pull',
    lifts: ['deadlift', 'pull-up', 'dumbbell-row', 'dumbbell-curl'] },
  legs: { routine: 'Legs', names: ['Legs', 'Leg day'], morning: 'Morning legs',
    lifts: ['back-squat', 'leg-press', 'deadlift', 'hanging-leg-raise'] },
  full: { routine: 'Full Body', names: ['Full body', 'A bit of everything'], morning: 'Morning full body',
    lifts: ['back-squat', 'bench-press', 'dumbbell-row', 'overhead-press', 'hanging-leg-raise'] },
};

// Seven weeks, oldest first. days = days before the end of that week. Legs and full-body sessions
// stop after week four, so the last three weeks hold no quad work and the focus offer has a target.
const MY_WEEKS = [
  { days: [6, 4, 3, 1], kinds: ['push', 'pull', 'legs', 'full'] },
  { days: [5, 3, 1], kinds: ['push', 'pull', 'legs'] },
  { days: [6, 4, 3, 1], kinds: ['push', 'pull', 'full', 'push'] },
  { days: [5, 3, 1], kinds: ['pull', 'legs', 'push'] },
  { days: [6, 4, 3, 1], kinds: ['pull', 'push', 'pull', 'push'] },
  { days: [6, 4, 3, 1], kinds: ['pull', 'push', 'pull', 'push'] },
  { days: [5, 3, 1], kinds: ['pull', 'push', 'pull'] },
];
// Day (days ago) on which my session was shared with a friend.
const MY_BUDDY = { 3: 'lotte' };
const CURRENT_WEEK = MY_WEEKS.length - 1;

// strength scales the reference lifter's loads; beard marks who may wear one; idleDays is the time since
// the last workout for people without feed sessions (16 days = a dusty gym).
// sessions: [daysAgo, kind, partner?]. Partners list each other on the same day with the same kind.
const FRIENDS = [
  { id: 'sanne', name: 'Sanne de Vries', handle: 'sannedv', bodyKg: 62, strength: 0.62, streakWeeks: 11,
    sessions: [[0, 'pull'], [2, 'legs', 'jeroen'], [3, 'push'], [5, 'pull'], [7, 'legs'], [9, 'push']] },
  { id: 'jeroen', beard: true, name: 'Jeroen Peeters', handle: 'jeroenp', bodyKg: 88, strength: 1.2, streakWeeks: 6,
    sessions: [[1, 'push'], [2, 'legs', 'sanne'], [4, 'pull'], [6, 'push'], [8, 'full']] },
  { id: 'lotte', name: 'Lotte Janssens', handle: 'lottejanssens', bodyKg: 66, strength: 0.7, streakWeeks: 4,
    sessions: [[0, 'full'], [3, 'push', 'me'], [6, 'pull'], [9, 'legs']] },
  { id: 'daan', beard: true, name: 'Daan Vermeulen', handle: 'daanvermeulen', bodyKg: 81, strength: 0.95, streakWeeks: 0,
    idleDays: 16, sessions: [] },
  { id: 'noor', name: 'Noor El Idrissi', handle: 'noor.lifts', bodyKg: 58, strength: 0.55, streakWeeks: 3,
    sessions: [[1, 'full'], [4, 'legs', 'matteo'], [8, 'full']] },
  { id: 'matteo', beard: true, name: 'Matteo Conti', handle: 'matteoconti', bodyKg: 79, strength: 1.05, streakWeeks: 8,
    sessions: [[0, 'push'], [1, 'pull'], [4, 'legs', 'noor'], [5, 'push'], [7, 'pull'], [9, 'full']] },
];

const STRANGERS = [
  { id: 'fleur', name: 'Fleur Maes', handle: 'fleurmaes', bodyKg: 60, strength: 0.6, streakWeeks: 14, idleDays: 0.4 },
  { id: 'thijs', beard: true, name: 'Thijs van den Berg', handle: 'thijsvdb', bodyKg: 92, strength: 1.3, streakWeeks: 22, idleDays: 1.2 },
  { id: 'aiko', name: 'Aiko Tanaka', handle: 'aiko.t', bodyKg: 54, strength: 0.5, streakWeeks: 2, idleDays: 2.6 },
  { id: 'kwame', beard: true, name: 'Kwame Mensah', handle: 'kwamemensah', bodyKg: 84, strength: 1.15, streakWeeks: 9, idleDays: 0.8 },
  { id: 'freya', name: 'Freya Lindqvist', handle: 'freyalindqvist', bodyKg: 68, strength: 0.8, streakWeeks: 1, idleDays: 5.5 },
  { id: 'wout', beard: true, name: 'Wout Desmet', handle: 'woutdesmet', bodyKg: 76, strength: 0.9, streakWeeks: 5, idleDays: 1.7 },
];

// The planned sets of a lift for a lifter in a given training week: optional warm-up, then straight sets.
function plannedSets(exId, week, strength) {
  const lift = LIFTS[exId];
  const kg = Math.max(0, roundTo((lift.start + lift.gain * week) * strength, lift.step));
  const reps = exerciseById(exId).bodyweight ? lift.reps - 3 + Math.floor(week / 2) : lift.reps;
  const warmup = lift.warmup ? [{ type: 'warmup', kg: roundTo(kg * 0.5, lift.step), reps: 10 }] : [];
  return [...warmup, ...Array.from({ length: lift.sets }, () => ({ type: 'normal', kg, reps }))];
}

// What actually happened: reps fade in later sets, sometimes a drop set or a superset.
function performedSets(exId, week, strength, rng) {
  const lift = LIFTS[exId];
  const supersetted = Boolean(lift.superset) && rng() < 0.35;
  let working = 0;
  const done = plannedSets(exId, week, strength).map((set) => {
    if (set.type === 'warmup') return { ...set, done: true };
    working += 1;
    const fade = (working >= 3 && rng() < 0.45 ? 1 : 0) + (working >= 4 && rng() < 0.4 ? 1 : 0);
    return { type: supersetted ? 'super' : 'normal', kg: set.kg, reps: set.reps - fade, done: true };
  });
  if (lift.drop && rng() < 0.5) {
    const last = done[done.length - 1];
    done.push({ type: 'drop', kg: roundTo(last.kg * 0.7, lift.step), reps: last.reps, done: true });
  }
  return done;
}

const sessionExercises = (kind, week, strength, rng) =>
  SESSIONS[kind].lifts.map((exId) => ({ exId, sets: performedSets(exId, week, strength, rng) }));

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

// When a session happened. Everyone in a shared session gets the same key, so the same times.
function sessionTiming(ids, daysAgo, nowMs) {
  const rng = rngFor(`${[...ids].sort().join('+')}:${daysAgo}`);
  const morning = rng() < 0.25;
  const hour = morning ? 6.75 + rng() * 1.75 : 17.25 + rng() * 2.25;
  const minutes = 46 + Math.floor(rng() * 20);
  const planned = startOfDay(nowMs) - daysAgo * MS_DAY + Math.round(hour * 60) * MS_MIN;
  const endedAt = Math.min(planned, nowMs - 40 * MS_MIN);
  return { startedAt: endedAt - minutes * MS_MIN, endedAt, morning };
}

const sessionName = (kind, morning, rng) => (morning ? SESSIONS[kind].morning : pick(rng, SESSIONS[kind].names));

// Scores workouts in time order so each one is measured against the lifter's bests before it.
function scoreInOrder(workouts, ctxFor) {
  const scored = [];
  for (const workout of [...workouts].sort((a, b) => a.endedAt - b.endedAt)) {
    scored.push({ ...workout, points: workoutPoints(workout, ctxFor(workout, scored)) });
  }
  return scored;
}

// ---------------------------------------------------------------------------------------------
// Me

function myWorkouts(nowMs, gym) {
  const rng = rngFor('me');
  const multipliers = gymMultipliers(gym, itemById, 0);
  const drafts = MY_WEEKS.flatMap((plan, week) => plan.days.map((offset, i) => {
    const daysAgo = (CURRENT_WEEK - week) * 7 + offset;
    const kind = plan.kinds[i];
    const buddies = MY_BUDDY[daysAgo] ? [MY_BUDDY[daysAgo]] : [];
    const timing = sessionTiming(['me', ...buddies], daysAgo, nowMs);
    return {
      userId: 'me', name: sessionName(kind, timing.morning, rng), routineId: `r-${kind}`,
      startedAt: timing.startedAt, endedAt: timing.endedAt, buddies,
      exercises: sessionExercises(kind, week, 1, rng),
      kudos: daysAgo <= 14 ? 1 + Math.floor(rng() * 5) : Math.floor(rng() * 3), kudosByMe: false,
    };
  }));
  return scoreInOrder(drafts, (workout, earlier) => ({
    bodyKg: TUNING.defaultBodyKg, best1RM: bestOneRMs(earlier, TUNING.defaultBodyKg), multipliers,
    buddiesFinished: workout.buddies.length,
  })).map((workout, i) => ({ id: `w-me-${String(i + 1).padStart(2, '0')}`, ...workout }));
}

const myRoutines = () => Object.entries(SESSIONS).map(([kind, session]) => ({
  id: `r-${kind}`,
  name: session.routine,
  exercises: session.lifts.map((exId) => ({ exId, sets: plannedSets(exId, CURRENT_WEEK, 1) })),
}));

const cosmeticsFor = (slot) => CATALOG.filter((item) => item.kind === 'cosmetic' && item.slot === slot);

// Day-one look: the starter cosmetic of each slot, nothing where the catalog has none.
function starterAvatar() {
  const avatar = { skin: 's2', hairColor: 'h3' };
  for (const slot of AVATAR_SLOTS) {
    const starter = cosmeticsFor(slot).find((item) => item.starter);
    avatar[slot] = starter ? starter.id : null;
  }
  return avatar;
}

// Everything flagged starter is owned from day one; equipment as many times as the starter room places it.
function starterOwned(room) {
  const owned = {};
  for (const item of CATALOG.filter((i) => i.starter)) {
    owned[item.id] = Math.max(1, room.items.filter((p) => p.itemId === item.id).length);
  }
  return owned;
}

// ---------------------------------------------------------------------------------------------
// Friends and strangers

// Built from whatever cosmetics the catalog has per slot, so it stays valid as the shop grows.
// Beards go to the people flagged for one, accessories to about half; the rest keep the slot's
// day-one option (or nothing when the catalog has none).
function randomAvatar(rng, spec) {
  const avatar = { skin: pick(rng, SKIN_KEYS), hairColor: pick(rng, HAIR_COLOR_KEYS) };
  for (const slot of AVATAR_SLOTS) {
    const options = cosmeticsFor(slot);
    const roll = rng();
    const plain = (slot === 'beard' && !(spec.beard && roll < 0.7)) || (slot === 'accessory' && roll < 0.5);
    const choice = plain ? options.find((item) => item.starter) : options[Math.floor(rng() * options.length)];
    avatar[slot] = choice ? choice.id : null;
  }
  return avatar;
}

const isPlaceable = (item) => Boolean(item && item.size && (item.kind === 'equipment' || item.kind === 'decor'));
const finishOr = (id, kind, fallback) => { const item = itemById(id); return item && item.kind === kind ? id : fallback; };

// A private copy of a showroom with anything the catalog does not know removed.
function sanitizeGym(showroom) {
  const base = starterRoom();
  const rooms = (showroom && showroom.rooms && showroom.rooms.length ? showroom.rooms : [base]).map((room) => ({
    ...room,
    floor: finishOr(room.floor, 'floor', base.floor),
    wall: finishOr(room.wall, 'wall', base.wall),
    items: room.items.filter((placed) => isPlaceable(itemById(placed.itemId))).map((placed) => ({ ...placed })),
  }));
  return { rooms };
}

// People take showrooms in key order and wrap around when there are fewer showrooms than people.
function showroomFor(index) {
  const keys = Object.keys(SHOWROOMS);
  return sanitizeGym(keys.length ? SHOWROOMS[keys[index % keys.length]] : null);
}

function buildPerson(spec, index, nowMs) {
  return {
    id: spec.id, name: spec.name, handle: spec.handle,
    avatar: randomAvatar(rngFor(`avatar:${spec.id}`), spec),
    gym: showroomFor(index),
    streakWeeks: spec.streakWeeks,
    lastWorkoutAt: nowMs - Math.round((spec.idleDays ?? 0) * MS_DAY),
    bodyKg: spec.bodyKg,
    strength: spec.strength,
  };
}

function friendWorkouts(spec, person, nowMs) {
  const rng = rngFor(`feed:${spec.id}`);
  const multipliers = gymMultipliers(person.gym, itemById, 0);
  const drafts = spec.sessions.map(([daysAgo, kind, partner]) => {
    const buddies = partner ? [partner] : [];
    const timing = sessionTiming([spec.id, ...buddies], daysAgo, nowMs);
    return {
      id: `w-${spec.id}-${daysAgo}`, userId: spec.id, name: sessionName(kind, timing.morning, rng),
      startedAt: timing.startedAt, endedAt: timing.endedAt, buddies,
      exercises: sessionExercises(kind, CURRENT_WEEK, spec.strength, rng),
      kudos: 1 + Math.floor(rng() * 11), kudosByMe: rng() < 0.3,
    };
  });
  return scoreInOrder(drafts, (workout, earlier) => ({
    bodyKg: spec.bodyKg, best1RM: bestOneRMs(earlier, spec.bodyKg), multipliers,
    buddiesFinished: workout.buddies.length,
  }));
}

// ---------------------------------------------------------------------------------------------

/**
 * The state a new install starts with: seven weeks of my training history, routines, the day-one
 * gym, six friends with a feed of recent workouts and six strangers to visit.
 * Deterministic for a given nowMs.
 * @param {number} nowMs the current time (ms); history is laid out backwards from here
 * @returns {object} state as described in docs/SPEC.md section 4. Additions to that shape:
 *   workouts carry { kudos, kudosByMe }; friends carry { bodyKg, strength } (used to simulate buddy workouts).
 */
export function createInitialState(nowMs) {
  const room = starterRoom();
  const gym = { rooms: [room], active: 0, expansions: 0 };
  const workouts = myWorkouts(nowMs, gym);
  const earned = workouts.reduce((total, w) => total + w.points.total, 0);

  const friends = FRIENDS.map((spec, i) => buildPerson(spec, i, nowMs));
  const feed = FRIENDS.flatMap((spec, i) => friendWorkouts(spec, friends[i], nowMs)).sort((a, b) => b.endedAt - a.endedAt);
  const lastSeen = (person) => feed.find((w) => w.userId === person.id);

  return {
    v: STATE_VERSION,
    settings: { style: 'studio', theme: 'ember', appearance: 'auto', unlimited: true, timeOffsetMs: 0, bodyKg: TUNING.defaultBodyKg },
    profile: { id: 'me', name: 'Victor', handle: 'victor' },
    wallet: { points: earned, lifetime: earned, passiveSince: nowMs - 5 * MS_HOUR },
    avatar: starterAvatar(),
    owned: starterOwned(room),
    gym,
    workouts,
    active: null,
    routines: myRoutines(),
    friends: friends.map((person) => (lastSeen(person) ? { ...person, lastWorkoutAt: lastSeen(person).endedAt } : person)),
    strangers: STRANGERS.map((spec, i) => buildPerson(spec, FRIENDS.length + i, nowMs)),
    feed,
  };
}
