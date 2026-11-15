import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, mulberry32, hashString, STATE_VERSION, SKIN_KEYS, HAIR_COLOR_KEYS, AVATAR_SLOTS } from '../src/core/seed.js';
import { consistency, dustLevel, dustSince, focusOffer, passive, workoutPoints, bestOneRMs, gymMultipliers, gymValue } from '../src/core/economy.js';
import { totals, exerciseSeries } from '../src/core/stats.js';
import { CATALOG, itemById } from '../src/gym/catalog.js';
import { starterRoom } from '../src/gym/showrooms.js';
import { exerciseById } from '../src/exercises/data.js';
import { T0, HOUR, DAY } from './_fixtures.mjs';

// Several moments of the day and of the year: the seed must hold its promises at any of them.
const MOMENTS = [T0, T0 + 11 * HOUR + 17 * 60e3, T0 - 9.5 * HOUR, T0 + 13 * HOUR, Date.UTC(2027, 2, 1, 0, 5), Date.UTC(2026, 5, 30, 23, 55)];
const LEG_MUSCLES = ['quads', 'hamstrings', 'glutes', 'calves'];
// The ten exercise ids that are frozen in src/exercises/data.js.
const CORE_EXERCISES = ['bench-press', 'back-squat', 'deadlift', 'overhead-press', 'pull-up', 'dumbbell-row', 'dumbbell-curl', 'cable-pushdown', 'leg-press', 'hanging-leg-raise'];
const DASHES = /[\u2013\u2014]/;
const state = createInitialState(T0);
const everyone = [...state.friends, ...state.strangers];
const allWorkouts = [...state.workouts, ...state.feed];

test('the PRNG is deterministic and well spread', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const first = Array.from({ length: 5 }, () => a());
  assert.deepEqual(first, Array.from({ length: 5 }, () => b()));
  assert.notDeepEqual(first, Array.from({ length: 5 }, mulberry32(43)));
  const many = Array.from({ length: 2000 }, mulberry32(7));
  assert.ok(many.every((v) => v >= 0 && v < 1));
  const mean = many.reduce((n, v) => n + v, 0) / many.length;
  assert.ok(mean > 0.45 && mean < 0.55);
  assert.equal(hashString('sanne'), hashString('sanne'));
  assert.notEqual(hashString('sanne'), hashString('sanna'));
});

test('createInitialState is deterministic', () => {
  assert.deepEqual(createInitialState(T0), createInitialState(T0));
  assert.deepEqual(createInitialState(MOMENTS[1]), createInitialState(MOMENTS[1]));
});

test('a later now shifts the history with it, content unchanged', () => {
  const later = createInitialState(T0 + 7 * DAY);
  assert.deepEqual(later.workouts.map((w) => w.exercises), state.workouts.map((w) => w.exercises));
  assert.deepEqual(later.workouts.map((w) => w.points.total), state.workouts.map((w) => w.points.total));
  // Local days can be 23 or 25 hours long around a clock change, so allow an hour of slack.
  later.workouts.forEach((w, i) => assert.ok(Math.abs(w.endedAt - state.workouts[i].endedAt - 7 * DAY) <= HOUR));
});

test('the state has the shape of the spec and survives a JSON round trip', () => {
  assert.equal(state.v, STATE_VERSION);
  assert.deepEqual(Object.keys(state), ['v', 'settings', 'profile', 'wallet', 'avatar', 'owned', 'gym', 'workouts', 'active', 'routines', 'friends', 'strangers', 'feed']);
  assert.deepEqual(state.settings, { style: 'studio', theme: 'ember', appearance: 'auto', unlimited: true, timeOffsetMs: 0, bodyKg: 78 });
  assert.equal(state.profile.id, 'me');
  assert.equal(state.active, null);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test('my history: about seven weeks, three to four sessions a week, oldest first, all in the past', () => {
  const { workouts } = state;
  assert.ok(workouts.length >= 21 && workouts.length <= 28, `${workouts.length} workouts`);
  for (let i = 1; i < workouts.length; i++) assert.ok(workouts[i].endedAt > workouts[i - 1].endedAt);
  const span = (T0 - workouts[0].endedAt) / DAY;
  assert.ok(span > 42 && span <= 50, `history spans ${span} days`);
  const { perWeek } = consistency(workouts, T0);
  assert.ok(perWeek.slice(1).every((n) => n === 3 || n === 4), `per week: ${perWeek}`);
  for (const w of workouts) {
    assert.equal(w.userId, 'me');
    assert.ok(w.endedAt < T0 && w.startedAt < w.endedAt);
    const minutes = (w.endedAt - w.startedAt) / 60e3;
    assert.ok(minutes >= 35 && minutes <= 80, `${minutes} minutes`);
  }
  assert.equal(new Set(workouts.map((w) => w.id)).size, workouts.length);
});

test('my loads rise slowly over the weeks', () => {
  for (const exId of ['bench-press', 'deadlift', 'overhead-press', 'dumbbell-row']) {
    const series = exerciseSeries(state.workouts, exId, 78);
    assert.ok(series.length >= 5, `${exId} has a history`);
    const first = series[0].topSet.kg;
    const last = series[series.length - 1].topSet.kg;
    assert.ok(last > first, `${exId} went up`);
    assert.ok(last <= first * 1.3, `${exId} went up believably (${first} to ${last})`);
  }
});

test('each of the ten core exercises has a history, so every chart has something to show', () => {
  for (const id of CORE_EXERCISES) {
    assert.ok(exerciseById(id), id);
    assert.ok(exerciseSeries(state.workouts, id, 78).length >= 2, id);
  }
});

test('the seed promises hold at any time of day: last workout yesterday, no dust, consistent, focus on a leg muscle', () => {
  for (const t of MOMENTS) {
    const s = createInitialState(t);
    const last = s.workouts[s.workouts.length - 1];
    const idleHours = (t - last.endedAt) / HOUR;
    assert.ok(idleHours > 0 && idleHours < 48, `last workout ${idleHours} hours ago`);
    assert.equal(dustLevel(s.workouts, t), 0);
    assert.ok(consistency(s.workouts, t).level >= 2);
    const offer = focusOffer(s, t);
    assert.ok(offer, 'there is a focus offer');
    assert.ok(LEG_MUSCLES.includes(offer.muscle), `focus on ${offer.muscle}`);
    assert.ok(offer.exerciseIds.length > 0);
    const income = passive(s, t);
    assert.ok(income.active);
    assert.ok(income.accrued > 0, 'there is passive income waiting to be collected');
    assert.ok(s.feed.every((w) => w.endedAt < t));
  }
});

test('legs are trained less than the upper body', () => {
  const setsFor = (ids) => state.workouts.flatMap((w) => w.exercises).filter((e) => ids.includes(e.exId)).reduce((n, e) => n + e.sets.length, 0);
  const legs = setsFor(['back-squat', 'leg-press']);
  const upper = setsFor(['bench-press', 'overhead-press', 'pull-up', 'dumbbell-row']);
  assert.ok(legs > 0);
  assert.ok(legs < upper / 3);
});

test('every exercise id in workouts and routines exists', () => {
  const ids = [...allWorkouts, ...state.routines].flatMap((x) => x.exercises.map((e) => e.exId));
  assert.ok(ids.length > 100);
  for (const id of ids) assert.ok(exerciseById(id), id);
});

test('every set is well formed', () => {
  for (const w of allWorkouts) {
    assert.ok(w.exercises.length >= 3);
    for (const e of w.exercises) {
      assert.ok(e.sets.length >= 1);
      for (const s of e.sets) {
        assert.ok(['normal', 'warmup', 'drop', 'super'].includes(s.type));
        assert.ok(Number.isFinite(s.kg) && s.kg >= 0);
        assert.ok(Number.isInteger(s.reps) && s.reps >= 1);
        assert.equal(s.done, true);
      }
    }
  }
  const types = new Set(allWorkouts.flatMap((w) => w.exercises.flatMap((e) => e.sets.map((s) => s.type))));
  assert.deepEqual([...types].sort(), ['drop', 'normal', 'super', 'warmup'], 'every set type appears somewhere');
});

test('every item id in gyms, finishes, owned and avatars exists in the catalog', () => {
  const gyms = [state.gym, ...everyone.map((p) => p.gym)];
  for (const gym of gyms) {
    assert.ok(gym.rooms.length >= 1);
    for (const room of gym.rooms) {
      assert.equal(itemById(room.floor).kind, 'floor');
      assert.equal(itemById(room.wall).kind, 'wall');
      assert.ok(room.w >= 5 && room.d >= 5);
      for (const placed of room.items) {
        const item = itemById(placed.itemId);
        assert.ok(item && item.size, placed.itemId);
        assert.ok(['equipment', 'decor'].includes(item.kind));
        assert.ok([0, 1, 2, 3].includes(placed.rot));
      }
    }
    const uids = gym.rooms.flatMap((r) => r.items.map((p) => p.uid));
    assert.equal(new Set(uids).size, uids.length, 'uids are unique inside a gym');
  }
  for (const id of Object.keys(state.owned)) assert.ok(itemById(id), id);
  for (const avatar of [state.avatar, ...everyone.map((p) => p.avatar)]) {
    assert.ok(SKIN_KEYS.includes(avatar.skin));
    assert.ok(HAIR_COLOR_KEYS.includes(avatar.hairColor));
    for (const slot of AVATAR_SLOTS) {
      assert.ok(slot in avatar, `avatar has a ${slot} slot`);
      if (avatar[slot] === null) continue;
      const item = itemById(avatar[slot]);
      assert.equal(item.kind, 'cosmetic');
      assert.equal(item.slot, slot);
    }
  }
});

test('I start in the day-one gym and own exactly the starter items', () => {
  assert.deepEqual(state.gym, { rooms: [starterRoom()], active: 0, expansions: 0 });
  assert.deepEqual(Object.keys(state.owned).sort(), CATALOG.filter((i) => i.starter).map((i) => i.id).sort());
  assert.equal(state.owned['bench-worn'], 1);
  assert.equal(state.owned['floor-concrete'], 1);
  assert.equal(state.owned['wall-bare'], 1);
  assert.equal(gymValue(state.gym), 0);
  for (const slot of AVATAR_SLOTS) {
    if (state.avatar[slot]) assert.ok(itemById(state.avatar[slot]).starter, 'I wear starter cosmetics only');
  }
  for (const id of Object.values(state.avatar).filter((v) => v && itemById(v))) assert.ok(state.owned[id], `${id} is owned`);
});

test('the wallet holds what the history earned', () => {
  const earned = state.workouts.reduce((n, w) => n + w.points.total, 0);
  assert.equal(state.wallet.points, earned);
  assert.equal(state.wallet.lifetime, earned);
  assert.equal(totals(state.workouts, T0).points, earned);
  assert.ok(state.wallet.passiveSince < T0);
});

test('three to four routines with valid template sets', () => {
  assert.ok(state.routines.length >= 3 && state.routines.length <= 4);
  assert.equal(new Set(state.routines.map((r) => r.id)).size, state.routines.length);
  for (const routine of state.routines) {
    assert.ok(routine.name.length > 0);
    assert.ok(routine.exercises.length >= 3);
    for (const entry of routine.exercises) {
      for (const s of entry.sets) assert.deepEqual(Object.keys(s), ['type', 'kg', 'reps']);
    }
  }
  const routineIds = state.routines.map((r) => r.id);
  assert.ok(state.workouts.every((w) => routineIds.includes(w.routineId)));
});

test('six friends and six strangers with real names, unique ids and handles', () => {
  assert.equal(state.friends.length, 6);
  assert.equal(state.strangers.length, 6);
  assert.equal(new Set(everyone.map((p) => p.id)).size, 12);
  assert.equal(new Set(everyone.map((p) => p.handle)).size, 12);
  assert.equal(new Set(everyone.map((p) => p.name)).size, 12);
  for (const person of everyone) {
    assert.match(person.name, /^\S+ \S+/, 'first and last name');
    assert.doesNotMatch(person.name, /doe|acme|test|user/i);
    assert.doesNotMatch(person.name, DASHES);
    assert.match(person.handle, /^[a-z0-9.]+$/);
    assert.ok(Number.isInteger(person.streakWeeks) && person.streakWeeks >= 0);
    assert.ok(person.lastWorkoutAt <= T0);
    assert.ok(person.bodyKg > 40 && person.strength > 0);
  }
  assert.notEqual(state.profile.name, '');
});

test('exactly one friend has let the gym go dusty, and strangers vary', () => {
  const dusty = state.friends.filter((f) => dustSince(f.lastWorkoutAt, T0) >= 1);
  assert.equal(dusty.length, 1);
  assert.equal(dusty[0].streakWeeks, 0);
  assert.ok(!state.feed.some((w) => w.userId === dusty[0].id), 'the dusty friend has not posted lately');
  const clean = state.friends.filter((f) => dustSince(f.lastWorkoutAt, T0) === 0);
  assert.equal(clean.length, 5);
  assert.ok(state.strangers.some((p) => dustSince(p.lastWorkoutAt, T0) > 0));
  assert.ok(state.strangers.some((p) => dustSince(p.lastWorkoutAt, T0) === 0));
});

test('avatars are varied', () => {
  const looks = new Set(everyone.map((p) => JSON.stringify(p.avatar)));
  assert.ok(looks.size >= 6, `${looks.size} distinct looks`);
});

test('the feed: friends only, newest first, the last ten days, unique ids', () => {
  const friendIds = state.friends.map((f) => f.id);
  assert.ok(state.feed.length >= 15);
  assert.equal(new Set(state.feed.map((w) => w.id)).size, state.feed.length);
  for (let i = 1; i < state.feed.length; i++) assert.ok(state.feed[i].endedAt <= state.feed[i - 1].endedAt);
  for (const w of state.feed) {
    assert.ok(friendIds.includes(w.userId));
    assert.ok(T0 - w.endedAt < 10.5 * DAY && w.endedAt < T0);
    assert.ok(Number.isInteger(w.kudos) && w.kudos >= 0);
    assert.equal(typeof w.kudosByMe, 'boolean');
    assert.ok(w.name.length > 0);
    assert.doesNotMatch(w.name, DASHES);
  }
  assert.ok(state.feed.some((w) => w.kudosByMe) && state.feed.some((w) => !w.kudosByMe));
  for (const friend of state.friends) {
    const newest = state.feed.find((w) => w.userId === friend.id);
    if (newest) assert.equal(friend.lastWorkoutAt, newest.endedAt);
  }
});

test('shared sessions list each other, happen at the same time and carry the buddy bonus', () => {
  const byId = Object.fromEntries(everyone.map((p) => [p.id, p]));
  const shared = allWorkouts.filter((w) => w.buddies.length > 0);
  assert.ok(shared.length >= 4);
  assert.ok(shared.some((w) => w.userId === 'me'), 'one of my sessions was with a friend');
  for (const w of shared) {
    assert.ok(w.points.buddyBonus > 0);
    for (const buddyId of w.buddies) {
      assert.ok(buddyId === 'me' || byId[buddyId], buddyId);
      const theirs = allWorkouts.find((o) => o.userId === buddyId && o.endedAt === w.endedAt);
      assert.ok(theirs, `${buddyId} has the matching workout`);
      assert.ok(theirs.buddies.includes(w.userId));
      assert.equal(theirs.startedAt, w.startedAt);
    }
  }
  assert.ok(allWorkouts.filter((w) => w.buddies.length === 0).every((w) => w.points.buddyBonus === 0));
});

test('every seeded workout stores an integer Breakdown that adds up', () => {
  for (const w of allWorkouts) {
    const b = w.points;
    assert.ok(Number.isInteger(b.total) && b.total > 150 && b.total < 900, `${w.id}: ${b.total}`);
    assert.equal(b.base + b.gymBonus + b.focusBonus + b.durationBonus + b.buddyBonus, b.total);
    assert.equal(b.lines.reduce((n, l) => n + l.value, 0), b.total);
    assert.equal(b.perExercise.length, w.exercises.length);
    for (const line of b.lines) assert.doesNotMatch(line.label, DASHES);
  }
});

test('my seeded points are exactly what workoutPoints gives for the history before each workout', () => {
  const multipliers = gymMultipliers(state.gym, itemById, 0);
  state.workouts.forEach((w, i) => {
    const expected = workoutPoints(w, {
      bodyKg: 78, best1RM: bestOneRMs(state.workouts.slice(0, i), 78), multipliers, buddiesFinished: w.buddies.length,
    });
    assert.deepEqual(w.points, expected, w.id);
  });
});

test('no dashes in any seeded user-facing string', () => {
  const strings = [state.profile.name, ...state.routines.map((r) => r.name), ...allWorkouts.map((w) => w.name), ...everyone.map((p) => p.name),
    ...state.gym.rooms.map((r) => r.name)];
  for (const s of strings) assert.doesNotMatch(s, DASHES);
});
