// Store mutations and live selectors. Every rule lives in economy.js; this file only reads the store
// and the clock, checks preconditions and writes the next state.
// Actions that can fail return { ok: true, ...details } or { ok: false, reason } and never throw.
import { getState, setState, initStore, clearPersisted } from './store.js';
import { now } from './time.js';
import { itemById } from '../gym/catalog.js';
import { exerciseById } from '../exercises/data.js';
import {
  TUNING, workoutPoints, bestOneRMs, gymMultipliers, consistency, dustLevel, passive, focusOffer,
  expansionCost, extraFloorCost, finishCost, canExpand, canPlace,
} from './economy.js';
import { createInitialState, SKIN_KEYS, HAIR_COLOR_KEYS, AVATAR_SLOTS } from './seed.js';

/** Set types a workout set can have. */
export const SET_TYPES = ['normal', 'warmup', 'drop', 'super'];
// Avatar slots that may be left empty.
const EMPTY_OK_SLOTS = ['hair', 'beard', 'accessory'];
const ROOM_NAMES = ['Ground floor', 'First floor', 'Second floor', 'Third floor'];
const STARTER_FLOOR = 'floor-concrete';
const STARTER_WALL = 'wall-bare';
const MAX_KG = 1000;
const MAX_REPS = 200;

const ok = (details) => ({ ok: true, ...details });
const fail = (reason) => ({ ok: false, reason });
const replaceAt = (list, index, value) => list.map((v, i) => (i === index ? value : v));

// First free "<prefix><n>" id.
function freshId(prefix, taken) {
  let n = taken.length + 1;
  while (taken.includes(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

// ---------------------------------------------------------------------------------------------
// Selectors (read the live store and clock)

/** Copies of an item that are owned but not placed in any room. */
export function selUnplaced(itemId) {
  const s = getState();
  const placed = s.gym.rooms.reduce((n, room) => n + room.items.filter((p) => p.itemId === itemId).length, 0);
  return Math.max(0, (s.owned[itemId] || 0) - placed);
}

/** Current dust level of my gym, 0..1. */
export const selDust = () => dustLevel(getState().workouts, now());

/** Current gym multipliers, dust included. */
export const selMultipliers = () => gymMultipliers(getState().gym, itemById, selDust());

/** Passive income right now: { active, ratePerHour, accrued, cappedAt, hoursAccrued }. */
export const selPassive = () => passive(getState(), now());

/** Consistency right now: { level, label, workouts14, weeksActive, perWeek }. */
export const selConsistency = () => consistency(getState().workouts, now());

/** The focus offer for the next workout, or null. During a session read state.active.focus instead. */
export const selFocusOffer = () => focusOffer(getState(), now());

/** My best estimated 1RM per exercise: { exId: kg }. */
export const selBestOneRMs = () => bestOneRMs(getState().workouts, getState().settings.bodyKg);

/**
 * What I did last time for an exercise.
 * @param {string} exId
 * @returns {null | { t: number, workoutId: string, sets: Array<{ type: string, kg: number, reps: number }> }}
 */
export function selLastTime(exId) {
  const { workouts } = getState();
  for (let i = workouts.length - 1; i >= 0; i--) {
    const sets = workouts[i].exercises.filter((e) => e.exId === exId).flatMap((e) => e.sets);
    if (sets.length) {
      return { t: workouts[i].endedAt, workoutId: workouts[i].id, sets: sets.map(({ type, kg, reps }) => ({ type, kg, reps })) };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Settings and test lab

const patchSettings = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

/** Art direction: 'studio' | 'arcade' | 'varsity'. */
export const setStyle = (style) => patchSettings({ style });
/** Colour theme id. */
export const setTheme = (theme) => patchSettings({ theme });
/** Appearance: 'auto' | 'light' | 'dark'. */
export const setAppearance = (appearance) => patchSettings({ appearance });
/** Test lab: with unlimited points purchases succeed and never deduct. */
export const setUnlimited = (unlimited) => patchSettings({ unlimited: Boolean(unlimited) });

/** Test lab: move the app clock forward by ms (dust builds up, passive income accrues). */
export function skipTime(ms) {
  if (!(ms > 0)) return fail('invalid');
  patchSettings({ timeOffsetMs: getState().settings.timeOffsetMs + ms });
  return ok();
}

/** Body weight in kg, used for bodyweight exercises. */
export function setBodyKg(kg) {
  if (!Number.isFinite(kg) || kg < 30 || kg > 250) return fail('invalid');
  patchSettings({ bodyKg: kg });
  return ok();
}

/** Test lab: back to day one. Keeps the look (style, theme, appearance); the skipped time is undone. */
export function resetAll() {
  const { style, theme, appearance } = getState().settings || {};
  clearPersisted();
  // Date.now() on purpose: the fresh state has no time offset, so the app clock equals the real clock.
  const fresh = createInitialState(Date.now());
  const look = Object.fromEntries(Object.entries({ style, theme, appearance }).filter(([, v]) => v));
  initStore({ ...fresh, settings: { ...fresh.settings, ...look } });
}

// ---------------------------------------------------------------------------------------------
// Wallet

/** Whether a price can be paid right now (always in unlimited mode). */
export function canAfford(cost) {
  const s = getState();
  return s.settings.unlimited || s.wallet.points >= cost;
}

const paid = (s, cost) => (s.settings.unlimited ? s.wallet : { ...s.wallet, points: s.wallet.points - cost });
const earned = (wallet, points) => ({ ...wallet, points: wallet.points + points, lifetime: wallet.lifetime + points });

// Pays cost and applies the change in one store update. Unlimited mode never deducts.
function purchase(cost, change) {
  if (!canAfford(cost)) return fail('funds');
  setState((s) => change({ ...s, wallet: paid(s, cost) }));
  return ok({ cost });
}

/** Collect the passive income that has piled up and restart its clock. */
export function collectPassive() {
  const t = now();
  const income = passive(getState(), t);
  if (!income.active) return fail('inactive');
  if (income.accrued <= 0) return fail('nothing');
  setState((s) => ({ ...s, wallet: { ...earned(s.wallet, income.accrued), passiveSince: t } }));
  return ok({ collected: income.accrued });
}

// ---------------------------------------------------------------------------------------------
// Shop

const withOwned = (s, itemId, count) => ({ ...s, owned: { ...s.owned, [itemId]: count } });
const withRoom = (s, roomIdx, change) => ({ ...s, gym: { ...s.gym, rooms: replaceAt(s.gym.rooms, roomIdx, change(s.gym.rooms[roomIdx])) } });

/**
 * Buy equipment or decor (qty copies, they go to storage) or a cosmetic (once).
 * Floors and walls are bought per room with buyFinish.
 */
export function buyItem(itemId, qty = 1) {
  const item = itemById(itemId);
  if (!item) return fail('unknown-item');
  if (item.kind === 'floor' || item.kind === 'wall') return fail('needs-room');
  if (!Number.isInteger(qty) || qty < 1) return fail('invalid');
  const have = getState().owned[itemId] || 0;
  if (item.kind === 'cosmetic') {
    return have ? fail('owned') : purchase(item.price, (s) => withOwned(s, itemId, 1));
  }
  if (item.starter) return fail('not-for-sale');
  return purchase(item.price * qty, (s) => withOwned(s, itemId, have + qty));
}

/**
 * Buy a floor or wall finish for a room (price per m² of that room) and apply it.
 * A finish that is already owned is applied for free.
 */
export function buyFinish(roomIdx, itemId) {
  const s = getState();
  const room = s.gym.rooms[roomIdx];
  const item = itemById(itemId);
  if (!room) return fail('unknown-room');
  if (!item || (item.kind !== 'floor' && item.kind !== 'wall')) return fail('not-a-finish');
  const cost = s.owned[itemId] ? 0 : finishCost(room, item);
  return purchase(cost, (next) => withRoom(withOwned(next, itemId, 1), roomIdx, (r) => ({ ...r, [item.kind]: itemId })));
}

/** Grow the active room by one tile in both directions. The price rises with every expansion bought. */
export function buyExpansion() {
  const { gym } = getState();
  if (!canExpand(gym.rooms[gym.active])) return fail('max-size');
  return purchase(expansionCost(gym.expansions), (s) => {
    const grown = withRoom(s, s.gym.active, (r) => ({ ...r, w: r.w + 1, d: r.d + 1 }));
    return { ...grown, gym: { ...grown.gym, expansions: grown.gym.expansions + 1 } };
  });
}

/** Add a new empty floor to the gym and make it the active room. */
export function buyExtraFloor() {
  const { rooms } = getState().gym;
  if (rooms.length >= TUNING.maxRooms) return fail('max-rooms');
  const size = TUNING.roomStartSize;
  const room = {
    id: freshId('r', rooms.map((r) => r.id)), name: ROOM_NAMES[rooms.length],
    w: size, d: size, floor: STARTER_FLOOR, wall: STARTER_WALL, items: [],
  };
  return purchase(extraFloorCost(rooms.length), (s) => ({ ...s, gym: { ...s.gym, rooms: [...s.gym.rooms, room], active: s.gym.rooms.length } }));
}

// ---------------------------------------------------------------------------------------------
// Build

/** Place an owned, unplaced copy of an item in a room. Returns the new placed item's uid. */
export function placeItem(roomIdx, itemId, x, y, rot = 0) {
  const { gym } = getState();
  const room = gym.rooms[roomIdx];
  const item = itemById(itemId);
  if (!room) return fail('unknown-room');
  if (!item) return fail('unknown-item');
  if (selUnplaced(itemId) < 1) return fail('none-in-storage');
  if (!canPlace(room, item, x, y, rot)) return fail('blocked');
  const uid = freshId('i', gym.rooms.flatMap((r) => r.items.map((p) => p.uid)));
  setState((s) => withRoom(s, roomIdx, (r) => ({ ...r, items: [...r.items, { uid, itemId, x, y, rot }] })));
  return ok({ uid });
}

/** Move or rotate a placed item inside its room. */
export function moveItem(roomIdx, uid, x, y, rot) {
  const room = getState().gym.rooms[roomIdx];
  const placed = room && room.items.find((p) => p.uid === uid);
  if (!placed) return fail('unknown-item');
  const nextRot = rot ?? placed.rot;
  if (!canPlace(room, itemById(placed.itemId), x, y, nextRot, uid)) return fail('blocked');
  setState((s) => withRoom(s, roomIdx, (r) => ({ ...r, items: r.items.map((p) => (p.uid === uid ? { ...p, x, y, rot: nextRot } : p)) })));
  return ok();
}

/** Take a placed item out of the room and back into storage (it stays owned). */
export function storeItem(roomIdx, uid) {
  const room = getState().gym.rooms[roomIdx];
  if (!room || !room.items.some((p) => p.uid === uid)) return fail('unknown-item');
  setState((s) => withRoom(s, roomIdx, (r) => ({ ...r, items: r.items.filter((p) => p.uid !== uid) })));
  return ok();
}

/** Apply an owned floor or wall finish to a room. */
export function applyFinish(roomIdx, kind, itemId) {
  const s = getState();
  const item = itemById(itemId);
  if (!s.gym.rooms[roomIdx]) return fail('unknown-room');
  if ((kind !== 'floor' && kind !== 'wall') || !item || item.kind !== kind) return fail('wrong-kind');
  if (!s.owned[itemId]) return fail('not-owned');
  setState((next) => withRoom(next, roomIdx, (r) => ({ ...r, [kind]: itemId })));
  return ok();
}

/** Switch the room shown and edited. */
export function setActiveRoom(roomIdx) {
  if (!getState().gym.rooms[roomIdx]) return fail('unknown-room');
  setState((s) => ({ ...s, gym: { ...s.gym, active: roomIdx } }));
  return ok();
}

// ---------------------------------------------------------------------------------------------
// Avatar

const patchAvatar = (patch) => setState((s) => ({ ...s, avatar: { ...s.avatar, ...patch } }));

/** Wear an owned cosmetic in its slot. id null takes off hair, beard or accessory. */
export function equip(slot, id) {
  if (!AVATAR_SLOTS.includes(slot)) return fail('unknown-slot');
  if (id == null) {
    if (!EMPTY_OK_SLOTS.includes(slot)) return fail('required');
    patchAvatar({ [slot]: null });
    return ok();
  }
  const item = itemById(id);
  if (!item || item.kind !== 'cosmetic' || item.slot !== slot) return fail('wrong-slot');
  if (!getState().owned[id]) return fail('not-owned');
  patchAvatar({ [slot]: id });
  return ok();
}

/** Skin tone: one of SKIN_KEYS. */
export function setSkin(key) {
  if (!SKIN_KEYS.includes(key)) return fail('invalid');
  patchAvatar({ skin: key });
  return ok();
}

/** Hair colour: one of HAIR_COLOR_KEYS. */
export function setHairColor(key) {
  if (!HAIR_COLOR_KEYS.includes(key)) return fail('invalid');
  patchAvatar({ hairColor: key });
  return ok();
}

// ---------------------------------------------------------------------------------------------
// Workout session

/** Name for a session started without one, from the local hour (0..23). */
export function defaultWorkoutName(hour) {
  if (hour < 12) return 'Morning workout';
  return hour < 17 ? 'Afternoon workout' : 'Evening workout';
}

// The next set of an exercise: repeat the previous working set, else what last time had at this
// position, else last time's first working set, else an empty default.
function nextSet(exId, sets) {
  const previous = sets[sets.length - 1];
  const last = selLastTime(exId);
  const lastSame = last && last.sets[sets.length];
  if (previous && previous.type !== 'warmup') return { type: 'normal', kg: previous.kg, reps: previous.reps, done: false };
  if (lastSame) return { ...lastSame, done: false };
  const source = (last && last.sets.find((set) => set.type !== 'warmup')) || previous || { kg: 0, reps: 8 };
  return { type: 'normal', kg: source.kg, reps: source.reps, done: false };
}

// A routine's sets, with last time's numbers where the same set was logged then.
function routineSets(entry) {
  const last = selLastTime(entry.exId);
  return entry.sets.map((set, i) => {
    const then = last && last.sets[i];
    const source = then && then.type === set.type ? then : set;
    return { type: set.type, kg: source.kg, reps: source.reps, done: false };
  });
}

/**
 * Start a session: empty, or from a routine; optionally with friends.
 * The focus offer of this moment is stored on the session and paid out at the finish.
 * @param {{ routineId?: string, buddies?: string[], name?: string }} [options]
 */
export function startWorkout({ routineId, buddies = [], name } = {}) {
  const s = getState();
  if (s.active) return fail('already-active');
  const routine = routineId ? s.routines.find((r) => r.id === routineId) : null;
  if (routineId && !routine) return fail('unknown-routine');
  if (!buddies.every((id) => s.friends.some((f) => f.id === id))) return fail('unknown-friend');
  const t = now();
  const active = {
    id: freshId('w-me-', s.workouts.map((w) => w.id)), userId: 'me',
    name: name || (routine ? routine.name : defaultWorkoutName(new Date(t).getHours())),
    routineId: routine ? routine.id : null,
    startedAt: t, buddies: [...new Set(buddies)], focus: focusOffer(s, t),
    exercises: routine ? routine.exercises.map((entry) => ({ exId: entry.exId, sets: routineSets(entry) })) : [],
  };
  setState((next) => ({ ...next, active }));
  return ok({ id: active.id });
}

// Applies a change to the session's exercise list; fails when there is no session.
function editExercises(change) {
  const { active } = getState();
  if (!active) return fail('no-active');
  const exercises = change(active.exercises);
  if (!exercises) return fail('unknown-target');
  setState((s) => ({ ...s, active: { ...s.active, exercises } }));
  return ok();
}

// Applies a change to one exercise's sets; change returns null when its target does not exist.
const editSets = (exIdx, change) => editExercises((exercises) => {
  const entry = exercises[exIdx];
  const sets = entry && change(entry.sets, entry);
  return sets ? replaceAt(exercises, exIdx, { ...entry, sets }) : null;
});

const editSet = (exIdx, setIdx, change) => editSets(exIdx, (sets) => (sets[setIdx] ? replaceAt(sets, setIdx, change(sets[setIdx])) : null));

/** Add an exercise to the session with one prefilled set. */
export function addExercise(exId) {
  if (!exerciseById(exId)) return fail('unknown-exercise');
  return editExercises((exercises) => [...exercises, { exId, sets: [nextSet(exId, [])] }]);
}

/** Remove an exercise (by position) from the session. */
export const removeExercise = (exIdx) => editExercises((exercises) => (exercises[exIdx] ? exercises.filter((_, i) => i !== exIdx) : null));

/** Add a set, prefilled from the previous set or from last time's numbers. */
export const addSet = (exIdx) => editSets(exIdx, (sets, entry) => [...sets, nextSet(entry.exId, sets)]);

/**
 * Change the kg and/or reps of a set.
 * @param {number} exIdx
 * @param {number} setIdx
 * @param {{ kg?: number, reps?: number }} patch
 */
export function updateSet(exIdx, setIdx, patch) {
  const { kg, reps } = patch;
  if (kg !== undefined && !(Number.isFinite(kg) && kg >= 0 && kg <= MAX_KG)) return fail('invalid');
  if (reps !== undefined && !(Number.isInteger(reps) && reps >= 0 && reps <= MAX_REPS)) return fail('invalid');
  return editSet(exIdx, setIdx, (set) => ({ ...set, ...(kg !== undefined && { kg }), ...(reps !== undefined && { reps }) }));
}

/** Remove a set (by position). */
export const removeSet = (exIdx, setIdx) => editSets(exIdx, (sets) => (sets[setIdx] ? sets.filter((_, i) => i !== setIdx) : null));

/** Tick or untick a set. Only done sets earn points and are kept at the finish. */
export const toggleSetDone = (exIdx, setIdx) => editSet(exIdx, setIdx, (set) => ({ ...set, done: !set.done }));

/** Set the type of a set: one of SET_TYPES. */
export function setSetType(exIdx, setIdx, type) {
  if (!SET_TYPES.includes(type)) return fail('invalid');
  return editSet(exIdx, setIdx, (set) => ({ ...set, type }));
}

/** Throw the session away. */
export function discardWorkout() {
  if (!getState().active) return fail('no-active');
  setState((s) => ({ ...s, active: null }));
  return ok();
}

// Only what was done goes into the history.
const doneExercises = (exercises) => exercises
  .map((entry) => ({ exId: entry.exId, sets: entry.sets.filter((set) => set.done) }))
  .filter((entry) => entry.sets.length > 0);

// A buddy's version of my session: same exercises and times, loads scaled to their strength.
function buddyWorkout(mine, friend) {
  const scale = friend.strength || 1;
  const bodyKg = friend.bodyKg || TUNING.defaultBodyKg;
  const draft = {
    id: `${mine.id}-${friend.id}`, userId: friend.id, name: mine.name,
    startedAt: mine.startedAt, endedAt: mine.endedAt,
    buddies: ['me', ...mine.buddies.filter((id) => id !== friend.id)],
    exercises: mine.exercises.map((entry) => ({
      exId: entry.exId,
      sets: entry.sets.map((set) => ({ ...set, kg: Math.round((set.kg * scale) / 2.5) * 2.5 })),
    })),
    kudos: 0, kudosByMe: false,
  };
  const ctx = { bodyKg, multipliers: gymMultipliers(friend.gym, itemById, 0), buddiesFinished: mine.buddies.length };
  return { ...draft, points: workoutPoints(draft, ctx) };
}

/**
 * Finish the session: score it, pay it out, log it. Buddies finish too: their workouts join the
 * feed and the buddy bonus applies. The workout cleans the gym, so it is scored without dust.
 * @returns {{ ok: true, workout: object } | { ok: false, reason: string }} workout.points is the Breakdown
 */
export function finishWorkout() {
  const s = getState();
  if (!s.active) return fail('no-active');
  const exercises = doneExercises(s.active.exercises);
  if (!exercises.length) return fail('no-sets');
  const t = now();
  const { focus, ...session } = s.active;
  const draft = { ...session, endedAt: t, exercises, kudos: 0, kudosByMe: false };
  const workout = {
    ...draft,
    points: workoutPoints(draft, {
      bodyKg: s.settings.bodyKg,
      best1RM: bestOneRMs(s.workouts, s.settings.bodyKg),
      multipliers: gymMultipliers(s.gym, itemById, 0),
      focus,
      buddiesFinished: draft.buddies.length,
    }),
  };
  const buddies = s.friends.filter((f) => draft.buddies.includes(f.id));
  // Income that was already running keeps its clock; income that starts with this workout starts now.
  const passiveSince = passive(s, t).active ? s.wallet.passiveSince : t;
  setState((next) => ({
    ...next,
    active: null,
    workouts: [...next.workouts, workout],
    wallet: { ...earned(next.wallet, workout.points.total), passiveSince },
    feed: [...buddies.map((friend) => buddyWorkout(workout, friend)), ...next.feed],
    friends: next.friends.map((f) => (draft.buddies.includes(f.id) ? { ...f, lastWorkoutAt: t } : f)),
  }));
  return ok({ workout });
}

// ---------------------------------------------------------------------------------------------
// Routines

const templateSets = (sets) => sets.map(({ type, kg, reps }) => ({ type, kg, reps }));

/**
 * Create a routine, or replace the one with the same id.
 * @param {{ id?: string, name: string, exercises: Array<{ exId: string, sets: Array }> }} routine
 */
export function saveRoutine(routine) {
  const name = (routine.name || '').trim();
  const exercises = routine.exercises || [];
  if (!name) return fail('name-required');
  if (!exercises.length) return fail('empty');
  if (!exercises.every((entry) => exerciseById(entry.exId))) return fail('unknown-exercise');
  const { routines } = getState();
  const id = routine.id || freshId('r-', routines.map((r) => r.id));
  const saved = { id, name, exercises: exercises.map((entry) => ({ exId: entry.exId, sets: templateSets(entry.sets) })) };
  const exists = routines.some((r) => r.id === id);
  setState((s) => ({ ...s, routines: exists ? s.routines.map((r) => (r.id === id ? saved : r)) : [...s.routines, saved] }));
  return ok({ id });
}

/** Delete a routine. */
export function deleteRoutine(id) {
  if (!getState().routines.some((r) => r.id === id)) return fail('unknown-routine');
  setState((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }));
  return ok();
}

/** Save one of my finished workouts as a routine. */
export function routineFromWorkout(workoutId, name) {
  const workout = getState().workouts.find((w) => w.id === workoutId);
  if (!workout) return fail('unknown-workout');
  return saveRoutine({ name: name || workout.name, exercises: workout.exercises });
}

// ---------------------------------------------------------------------------------------------
// Social

/** Give or take back my kudos on a feed workout. */
export function toggleKudos(workoutId) {
  if (!getState().feed.some((w) => w.id === workoutId)) return fail('unknown-workout');
  setState((s) => ({
    ...s,
    feed: s.feed.map((w) => (w.id === workoutId ? { ...w, kudosByMe: !w.kudosByMe, kudos: w.kudos + (w.kudosByMe ? -1 : 1) } : w)),
  }));
  return ok();
}
