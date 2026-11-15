import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNING, gymMultipliers, dustSince, dustLevel, weeklyCounts, consistency, passive, muscleLoad, focusOffer,
  expansionCost, extraFloorCost, floorCost, wallCost, finishCost, canExpand, roomMaxSize, footprint, canPlace, gymValue,
} from '../src/core/economy.js';
import { MUSCLES, EXERCISES } from '../src/exercises/data.js';
import { sets, set, workout, workoutsDaysAgo, starterGym, kittedGym, testLookup, T0, HOUR, DAY } from './_fixtures.mjs';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);
const gymWith = (...itemIds) => ({ rooms: [{ w: 8, d: 8, items: itemIds.map((itemId, i) => ({ uid: `u${i}`, itemId, x: 0, y: 0, rot: 0 })) }] });
const stateWith = (workouts, extra = {}) => ({ workouts, gym: starterGym(), wallet: { points: 0, lifetime: 0, passiveSince: T0 }, ...extra });

// ---------------------------------------------------------------------------------------------
// Gym multipliers

test('the day-one gym gives the bench a small chest bonus and nothing else', () => {
  const m = gymMultipliers(starterGym(), testLookup, 0);
  assert.equal(m.byMuscle.chest, 1.02);
  for (const muscle of MUSCLES.filter((x) => x !== 'chest')) assert.equal(m.byMuscle[muscle], 1);
  assert.equal(m.vibe, 0);
  assert.equal(m.dustPenalty, 0);
  assert.equal(m.average, 1.002);
  assert.deepEqual(Object.keys(m.byMuscle), MUSCLES);
});

test('an empty or missing gym multiplies by one', () => {
  for (const gym of [{ rooms: [] }, { rooms: [{ items: [] }] }, null, undefined]) {
    const m = gymMultipliers(gym, testLookup, 0);
    assert.equal(m.average, 1);
    assert.ok(MUSCLES.every((muscle) => m.byMuscle[muscle] === 1));
  }
});

test('stacking equipment for the same muscle has diminishing returns', () => {
  const one = gymMultipliers(gymWith('rack'), testLookup).byMuscle.quads;
  const two = gymMultipliers(gymWith('rack', 'rack'), testLookup).byMuscle.quads;
  const three = gymMultipliers(gymWith('rack', 'rack', 'rack'), testLookup).byMuscle.quads;
  near(one, 1.1);
  near(two, 1 + 0.1 + 0.1 * TUNING.stackDecay);
  near(three, 1 + 0.1 * (1 + TUNING.stackDecay + TUNING.stackDecay ** 2));
  assert.ok(two - one < one - 1);
  assert.ok(three - two < two - one);
});

test('the strongest piece counts in full, whatever the order of placement', () => {
  const a = gymMultipliers(gymWith('rack', 'leg-press'), testLookup).byMuscle;
  const b = gymMultipliers(gymWith('leg-press', 'rack'), testLookup).byMuscle;
  assert.deepEqual(a, b);
  near(a.quads, 1 + 0.12 + 0.1 * TUNING.stackDecay);
  near(a.glutes, 1 + 0.08 + 0.05 * TUNING.stackDecay);
  near(a.calves, 1.04);
});

test('the equipment bonus of one muscle is capped', () => {
  const many = gymMultipliers(gymWith(...Array(40).fill('leg-press')), testLookup).byMuscle.quads;
  assert.ok(many <= 1 + TUNING.muscleBonusCap + 1e-9);
  const strong = (id) => (id === 'monster' ? { id, kind: 'equipment', size: [1, 1], muscles: { quads: 0.5 } } : null);
  assert.equal(gymMultipliers(gymWith('monster', 'monster', 'monster'), strong).byMuscle.quads, 1 + TUNING.muscleBonusCap);
});

test('decor adds a small global vibe, copies of the same item count half each time, and vibe is capped', () => {
  const one = gymMultipliers(gymWith('plant'), testLookup);
  near(one.vibe, 0.01);
  assert.ok(MUSCLES.every((m) => one.byMuscle[m] === 1.01));
  near(gymMultipliers(gymWith('plant', 'plant'), testLookup).vibe, 0.015);
  near(gymMultipliers(gymWith('plant', 'plant', 'plant'), testLookup).vibe, 0.0175);
  near(gymMultipliers(gymWith('plant', 'speaker'), testLookup).vibe, 0.03);
  const lots = gymMultipliers(gymWith('plant', 'neon', 'mirror', 'speaker', 'rug', 'poster', 'neon', 'speaker', 'mirror', 'rug'), testLookup);
  assert.equal(lots.vibe, TUNING.vibeCap);
  assert.ok(gymMultipliers(gymWith(...Array(50).fill('plant')), testLookup).vibe < TUNING.vibeCap, 'one cheap item cannot reach the cap');
});

test('items in every room count; items that are only owned do not exist for the gym', () => {
  const gym = { rooms: [
    { items: [{ uid: 'a', itemId: 'rack', x: 0, y: 0, rot: 0 }] },
    { items: [{ uid: 'b', itemId: 'ab-bench', x: 0, y: 0, rot: 0 }, { uid: 'c', itemId: 'plant', x: 3, y: 3, rot: 0 }] },
  ] };
  const m = gymMultipliers(gym, testLookup).byMuscle;
  near(m.quads, 1.11);
  near(m.core, 1.11);
  near(m.chest, 1.01);
});

test('unknown item ids and finishes placed by mistake are ignored', () => {
  const m = gymMultipliers(gymWith('rack', 'ghost-item', 'floor-rubber'), testLookup);
  near(m.byMuscle.quads, 1.1);
  assert.equal(m.vibe, 0);
});

test('dust subtracts from every muscle, up to the maximum penalty', () => {
  const clean = gymMultipliers(gymWith('rack'), testLookup, 0);
  const half = gymMultipliers(gymWith('rack'), testLookup, 0.5);
  const full = gymMultipliers(gymWith('rack'), testLookup, 1);
  near(half.dustPenalty, TUNING.dustMaxPenalty / 2);
  near(full.dustPenalty, TUNING.dustMaxPenalty);
  for (const muscle of MUSCLES) {
    near(full.byMuscle[muscle], clean.byMuscle[muscle] - TUNING.dustMaxPenalty);
    assert.ok(half.byMuscle[muscle] < clean.byMuscle[muscle] && half.byMuscle[muscle] > full.byMuscle[muscle]);
  }
  assert.ok(full.average < clean.average);
  assert.equal(gymMultipliers(gymWith('rack'), testLookup, 7).dustPenalty, TUNING.dustMaxPenalty, 'dust is clamped to 0..1');
  assert.equal(gymMultipliers(gymWith('rack'), testLookup, -2).dustPenalty, 0);
});

test('average is the mean over all ten muscles', () => {
  const m = gymMultipliers(kittedGym(), testLookup, 0.3);
  near(m.average, MUSCLES.reduce((n, muscle) => n + m.byMuscle[muscle], 0) / MUSCLES.length, 1e-4);
  assert.ok(m.average > 1.1);
});

// ---------------------------------------------------------------------------------------------
// Dust

test('dust curve: clean for three days, full at fourteen, linear in between', () => {
  assert.equal(dustSince(T0, T0), 0);
  assert.equal(dustSince(T0 - 2 * DAY, T0), 0);
  assert.equal(dustSince(T0 - 3 * DAY, T0), 0);
  assert.ok(dustSince(T0 - 3 * DAY - HOUR, T0) > 0);
  near(dustSince(T0 - 8.5 * DAY, T0), 0.5);
  near(dustSince(T0 - 14 * DAY, T0), 1);
  assert.equal(dustSince(T0 - 40 * DAY, T0), 1);
  for (let d = 0; d < 20; d += 0.5) assert.ok(dustSince(T0 - (d + 0.5) * DAY, T0) >= dustSince(T0 - d * DAY, T0));
});

test('dust uses the most recent workout, and one workout clears it', () => {
  const old = workoutsDaysAgo([30, 20, 12]);
  near(dustLevel(old, T0), (12 - 3) / 11);
  assert.equal(dustLevel([...old, ...workoutsDaysAgo([0.1])], T0), 0);
  assert.equal(dustLevel(workoutsDaysAgo([12, 30, 20].reverse()), T0), dustLevel(old, T0), 'order does not matter');
});

test('a gym nobody has trained in yet is clean', () => {
  assert.equal(dustLevel([], T0), 0);
  assert.equal(dustSince(null, T0), 0);
  assert.equal(dustSince(undefined, T0), 0);
});

// ---------------------------------------------------------------------------------------------
// Consistency

test('weeklyCounts buckets by trailing 7-day blocks, oldest first', () => {
  const counts = weeklyCounts(workoutsDaysAgo([0, 1, 6.9, 7, 13.9, 14, 55.9, 56, 80]), T0, 8);
  assert.deepEqual(counts, [1, 0, 0, 0, 0, 1, 2, 3]);
  assert.deepEqual(weeklyCounts([], T0, 3), [0, 0, 0]);
  assert.deepEqual(weeklyCounts(workoutsDaysAgo([-1]), T0, 2), [0, 0], 'workouts in the future are ignored');
});

test('consistency levels at their boundaries', () => {
  const level = (days) => consistency(workoutsDaysAgo(days), T0).level;
  assert.equal(level([]), 0);
  assert.equal(level([1]), 0);
  assert.equal(level([1, 20]), 0, 'a workout outside 14 days does not count');
  assert.equal(level([1, 2]), 1);
  assert.equal(level([1, 13.9]), 1);
  assert.equal(level([1, 14]), 0, 'exactly 14 days ago is outside the window');
  assert.equal(level([1, 2, 3]), 1);
  assert.equal(level([1, 2, 3, 4]), 1, 'four workouts in one week are not two active weeks');
  assert.equal(level([1, 2, 3, 8]), 1, 'three plus one is not two active weeks');
  assert.equal(level([1, 3, 8, 10]), 2);
  assert.equal(level([1, 3, 5, 8, 10, 12]), 2, 'six in 14 days without four active weeks stays Consistent');
  assert.equal(level([1, 3, 5, 8, 10, 12, 15, 17, 22]), 2, 'the fourth week back has one workout');
  assert.equal(level([1, 3, 5, 8, 10, 12, 15, 17, 22, 24]), 3);
  assert.equal(level([1, 3, 8, 10, 12, 15, 17, 22, 24]), 2, 'four active weeks but only five workouts in 14 days');
});

test('consistency reports its inputs and labels', () => {
  const c = consistency(workoutsDaysAgo([1, 3, 5, 8, 10, 12, 15, 17, 22, 24, 30]), T0);
  assert.deepEqual(c, { level: 3, label: 'Locked in', workouts14: 6, weeksActive: 4, perWeek: [0, 0, 0, 1, 2, 2, 3, 3] });
  assert.equal(consistency([], T0).label, 'Off');
  assert.equal(consistency(workoutsDaysAgo([1, 2]), T0).label, 'Warming up');
  assert.equal(consistency(workoutsDaysAgo([1, 3, 8, 10]), T0).label, 'Consistent');
  assert.equal(consistency([], T0).perWeek.length, TUNING.consistencyWeeks);
  for (const { label } of TUNING.consistencyLevels) assert.doesNotMatch(label, /[\u2013\u2014]/);
});

test('consistency fades when training stops', () => {
  const history = workoutsDaysAgo([1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26]);
  const levels = [0, 3, 6, 10, 15].map((later) => consistency(history, T0 + later * DAY).level);
  assert.equal(levels[0], 3);
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1]);
  assert.equal(levels[levels.length - 1], 0);
});

// ---------------------------------------------------------------------------------------------
// Passive income

const consistentDays = [1, 3, 8, 10];
const lockedInDays = [1, 3, 5, 8, 10, 12, 15, 17, 22, 24];

test('no passive income below Consistent', () => {
  const p = passive(stateWith(workoutsDaysAgo([1, 2]), { wallet: { passiveSince: T0 - 10 * HOUR } }), T0, testLookup);
  assert.deepEqual({ active: p.active, ratePerHour: p.ratePerHour, accrued: p.accrued }, { active: false, ratePerHour: 0, accrued: 0 });
});

test('passive rate is the base of the consistency level times the average gym multiplier', () => {
  const at = (days, gym) => passive(stateWith(workoutsDaysAgo(days), { gym }), T0, testLookup).ratePerHour;
  const average = gymMultipliers(starterGym(), testLookup, 0).average;
  near(at(consistentDays, starterGym()), Math.round(TUNING.passivePerHour[2] * average * 10) / 10);
  near(at(lockedInDays, starterGym()), Math.round(TUNING.passivePerHour[3] * average * 10) / 10);
  assert.ok(at(lockedInDays, starterGym()) > at(consistentDays, starterGym()));
  assert.ok(at(lockedInDays, kittedGym()) > at(lockedInDays, starterGym()), 'a better gym earns more');
});

test('passive income accrues with time since the last collection and stops at the cap', () => {
  const workouts = workoutsDaysAgo(lockedInDays);
  const after = (hours) => passive(stateWith(workouts, { wallet: { passiveSince: T0 - hours * HOUR } }), T0, testLookup);
  const rate = after(1).ratePerHour;
  assert.equal(after(0).accrued, 0);
  assert.equal(after(1).accrued, Math.floor(rate));
  assert.equal(after(6).accrued, Math.floor(rate * 6));
  assert.equal(after(6).hoursAccrued, 6);
  assert.equal(after(TUNING.passiveCapHours).accrued, Math.floor(rate * TUNING.passiveCapHours));
  assert.equal(after(30).accrued, after(TUNING.passiveCapHours).accrued, 'nothing piles up past the cap');
  assert.equal(after(30).hoursAccrued, TUNING.passiveCapHours);
  assert.equal(after(6).cappedAt, T0 - 6 * HOUR + TUNING.passiveCapHours * HOUR);
  assert.ok(Number.isInteger(after(7.3).accrued));
  for (let h = 0; h < 20; h++) assert.ok(after(h + 1).accrued >= after(h).accrued);
});

test('a clock set in the future accrues nothing', () => {
  const p = passive(stateWith(workoutsDaysAgo(lockedInDays), { wallet: { passiveSince: T0 + 2 * HOUR } }), T0, testLookup);
  assert.equal(p.accrued, 0);
  assert.equal(p.hoursAccrued, 0);
});

test('dust lowers the passive rate', () => {
  const workouts = workoutsDaysAgo([1, 2, 5, 6, 8, 9, 12, 13]);
  const state = stateWith(workouts, { gym: kittedGym() });
  const clean = passive(state, T0, testLookup);
  const dusty = passive(state, T0 + 4.5 * DAY, testLookup);
  assert.ok(dusty.active, 'still consistent five and a half days after the last workout');
  assert.ok(dustLevel(workouts, T0 + 4.5 * DAY) > 0);
  assert.ok(dusty.ratePerHour < clean.ratePerHour);
});

// ---------------------------------------------------------------------------------------------
// Focus offer

const upperOnly = [['bench-press', sets(4, 70, 8)], ['pull-up', sets(4, 0, 8)], ['overhead-press', sets(3, 40, 8)],
  ['dumbbell-curl', sets(3, 12, 12)], ['cable-pushdown', sets(3, 30, 12)], ['hanging-leg-raise', sets(3, 0, 12)]];
const everything = EXERCISES.map((e) => [e.id, sets(3, 40, 8)]);

test('muscleLoad counts done working sets: primary full, secondary half, inside the window only', () => {
  const history = [
    workout([['bench-press', [set(40, 10, 'warmup'), ...sets(4, 70, 8), set(70, 8, 'normal', false)]]], T0 - DAY),
    workout([['back-squat', sets(2, 100, 5)]], T0 - 30 * DAY),
  ];
  const load = muscleLoad(history, T0);
  assert.equal(load.chest, 4);
  assert.equal(load.triceps, 2);
  assert.equal(load.shoulders, 2);
  assert.equal(load.quads, 0);
  assert.deepEqual(Object.keys(load), MUSCLES);
  assert.equal(muscleLoad(history, T0, 60).quads, 2);
  assert.equal(muscleLoad(history, T0, 60).hamstrings, 1);
});

test('no focus offer without consistency', () => {
  assert.equal(focusOffer({ workouts: [] }, T0), null);
  assert.equal(focusOffer({ workouts: workoutsDaysAgo([1, 2], T0, upperOnly) }, T0), null);
  assert.equal(focusOffer({ workouts: workoutsDaysAgo([1, 2, 3, 4], T0, upperOnly) }, T0), null, 'one busy week is not consistent');
});

test('a consistent lifter who skips legs is offered the neglected muscle', () => {
  const offer = focusOffer({ workouts: workoutsDaysAgo(consistentDays, T0, upperOnly) }, T0);
  assert.equal(offer.muscle, 'quads');
  assert.equal(offer.mult, TUNING.focusMult);
  assert.deepEqual(offer.exerciseIds, ['back-squat', 'leg-press']);
  assert.equal(offer.share, 0);
  assert.equal(offer.reason, 'No quads training in the last 3 weeks');
});

test('the offer goes to the muscle with the lowest load, not just an untrained one', () => {
  const pushHeavy = [['bench-press', sets(1, 70, 8)], ['pull-up', sets(5, 0, 8)], ['overhead-press', sets(5, 40, 8)], ['dumbbell-curl', sets(5, 12, 12)],
    ['cable-pushdown', sets(5, 30, 12)], ['hanging-leg-raise', sets(5, 0, 12)], ['back-squat', sets(5, 80, 6)], ['deadlift', sets(5, 100, 5)]];
  const offer = focusOffer({ workouts: workoutsDaysAgo(consistentDays, T0, pushHeavy) }, T0);
  assert.equal(offer.muscle, 'chest');
  assert.deepEqual(offer.exerciseIds, ['bench-press']);
  assert.ok(offer.share > 0 && offer.share < TUNING.focusThreshold);
  assert.equal(offer.reason, 'Chest training is falling behind the rest');
  assert.doesNotMatch(offer.reason, /[\u2013\u2014]/);
});

test('no focus offer when training is balanced', () => {
  assert.equal(focusOffer({ workouts: workoutsDaysAgo(consistentDays, T0, everything) }, T0), null);
});

test('the offer disappears once the neglected muscle is trained', () => {
  const history = workoutsDaysAgo(consistentDays, T0, upperOnly);
  assert.equal(focusOffer({ workouts: history }, T0).muscle, 'quads');
  const legDays = [['back-squat', sets(5, 90, 6)], ['leg-press', sets(5, 150, 10)], ['deadlift', sets(5, 110, 5)]];
  const caughtUp = [...history, ...workoutsDaysAgo([0.5, 0.2], T0, legDays)];
  assert.equal(focusOffer({ workouts: caughtUp }, T0), null);
});

test('old leg training outside the window does not hide the neglect', () => {
  const longAgo = workoutsDaysAgo([25, 30], T0, [['back-squat', sets(5, 100, 5)], ['leg-press', sets(5, 150, 10)]]);
  const offer = focusOffer({ workouts: [...longAgo, ...workoutsDaysAgo(consistentDays, T0, upperOnly)] }, T0);
  assert.equal(offer.muscle, 'quads');
});

test('a muscle no exercise trains as a primary is never offered', () => {
  const hasPrimary = (muscle) => EXERCISES.some((e) => e.primary.includes(muscle));
  const noCalfWork = EXERCISES.filter((e) => e.id !== 'leg-press').map((e) => [e.id, sets(3, 40, 8)]);
  const offer = focusOffer({ workouts: workoutsDaysAgo(consistentDays, T0, noCalfWork) }, T0);
  assert.ok(offer === null || hasPrimary(offer.muscle));
  const legsOffer = focusOffer({ workouts: workoutsDaysAgo(consistentDays, T0, upperOnly) }, T0);
  assert.ok(legsOffer.exerciseIds.length > 0);
  assert.ok(legsOffer.exerciseIds.every((id) => EXERCISES.find((e) => e.id === id).primary.includes(legsOffer.muscle)));
});

// ---------------------------------------------------------------------------------------------
// Space and finishes

test('expansion cost starts near 800 and grows by about 1.7 each time', () => {
  assert.equal(expansionCost(0), 800);
  assert.equal(expansionCost(1), 1360);
  assert.equal(expansionCost(2), 2312);
  for (let n = 0; n < 12; n++) {
    assert.ok(Number.isInteger(expansionCost(n)));
    assert.ok(expansionCost(n + 1) > expansionCost(n));
    near(expansionCost(n + 1) / expansionCost(n), TUNING.expansionGrowth, 0.01);
  }
});

test('the second floor costs 25,000 and every further floor twice the previous', () => {
  assert.equal(extraFloorCost(1), 25000);
  assert.equal(extraFloorCost(2), 50000);
  assert.equal(extraFloorCost(3), 100000);
});

test('finishes are priced per square metre: floors per tile, walls per panel', () => {
  const room = { w: 6, d: 5 };
  assert.equal(floorCost(room, testLookup('floor-rubber')), 24 * 30);
  assert.equal(wallCost(room, testLookup('wall-brick')), 30 * 11);
  assert.equal(finishCost(room, testLookup('floor-rubber')), 720);
  assert.equal(finishCost(room, testLookup('wall-brick')), 330);
  assert.equal(finishCost(room, testLookup('floor-concrete')), 0);
});

test('rooms can expand until they reach the maximum size', () => {
  assert.equal(roomMaxSize, TUNING.roomMaxSize);
  assert.ok(canExpand({ w: 5, d: 5 }));
  assert.ok(canExpand({ w: roomMaxSize - 1, d: roomMaxSize - 1 }));
  assert.ok(!canExpand({ w: roomMaxSize, d: roomMaxSize }));
  assert.ok(!canExpand({ w: roomMaxSize, d: 6 }));
});

// ---------------------------------------------------------------------------------------------
// Placement

const rack = testLookup('rack');          // 2 x 2
const press = testLookup('leg-press');    // 2 x 3
const plant = testLookup('plant');        // 1 x 1
const neon = testLookup('neon');          // wall, 2 panels
const poster = testLookup('poster');      // wall, 1 panel
const cells = (list) => list.map((c) => `${c.x},${c.y}`).sort();
const emptyRoom = (w = 5, d = 5) => ({ w, d, items: [] });
const place = (room, ...placed) => ({ ...room, items: placed.map(([uid, itemId, x, y, rot = 0]) => ({ uid, itemId, x, y, rot })) });
const fits = (room, item, x, y, rot = 0, ignore) => canPlace(room, item, x, y, rot, ignore, testLookup);

test('footprint covers w x d tiles and swaps them for rot 1 and 3', () => {
  assert.deepEqual(cells(footprint(press, 1, 1, 0)), ['1,1', '1,2', '1,3', '2,1', '2,2', '2,3']);
  assert.deepEqual(cells(footprint(press, 1, 1, 2)), cells(footprint(press, 1, 1, 0)));
  assert.deepEqual(cells(footprint(press, 1, 1, 1)), ['1,1', '1,2', '2,1', '2,2', '3,1', '3,2']);
  assert.deepEqual(cells(footprint(press, 1, 1, 3)), cells(footprint(press, 1, 1, 1)));
  assert.deepEqual(footprint(plant, 4, 0), [{ x: 4, y: 0 }]);
});

test('footprint of a wall item is a run of panels along its wall', () => {
  assert.deepEqual(footprint(neon, 2, -1, 0), [{ x: 2, y: -1 }, { x: 3, y: -1 }]);
  assert.deepEqual(footprint(neon, -1, 2, 0), [{ x: -1, y: 2 }, { x: -1, y: 3 }]);
  assert.deepEqual(footprint(neon, 2, -1, 1), footprint(neon, 2, -1, 0), 'rotation does not apply on walls');
});

test('canPlace keeps floor items inside the room', () => {
  const room = emptyRoom();
  assert.ok(fits(room, rack, 0, 0));
  assert.ok(fits(room, rack, 3, 3));
  assert.ok(!fits(room, rack, 4, 3));
  assert.ok(!fits(room, rack, 3, 4));
  assert.ok(!fits(room, rack, -1, 0));
  assert.ok(!fits(room, rack, 0, -1));
  assert.ok(!fits(room, rack, 5, 5));
  assert.ok(fits(room, plant, 4, 4));
  assert.ok(!fits(room, plant, 5, 0));
});

test('canPlace accounts for rotation', () => {
  const room = emptyRoom(5, 5);
  assert.ok(fits(room, press, 3, 2, 0), '2 wide, 3 deep fits at x 3');
  assert.ok(!fits(room, press, 3, 3, 0), '3 deep does not fit from y 3');
  assert.ok(fits(room, press, 2, 3, 1), 'rotated: 3 wide, 2 deep');
  assert.ok(!fits(room, press, 3, 2, 1), 'rotated: 3 wide does not fit from x 3');
  assert.ok(fits(room, press, 3, 2, 2));
  assert.ok(fits(room, press, 2, 3, 3));
  const narrow = emptyRoom(2, 5);
  assert.ok(fits(narrow, press, 0, 0, 0));
  assert.ok(!fits(narrow, press, 0, 0, 1));
});

test('canPlace rejects overlaps and allows touching', () => {
  const room = place(emptyRoom(6, 6), ['a', 'rack', 2, 2]);
  assert.ok(!fits(room, plant, 2, 2));
  assert.ok(!fits(room, plant, 3, 3));
  assert.ok(!fits(room, rack, 1, 1));
  assert.ok(!fits(room, rack, 3, 3));
  assert.ok(fits(room, rack, 0, 2));
  assert.ok(fits(room, rack, 4, 2));
  assert.ok(fits(room, plant, 4, 4));
  const rotated = place(emptyRoom(6, 6), ['p', 'leg-press', 0, 0, 1]);
  assert.ok(!fits(rotated, plant, 2, 1), 'the rotated press covers x 0..2, y 0..1');
  assert.ok(fits(rotated, plant, 0, 2));
});

test('canPlace ignores the item being moved', () => {
  const room = place(emptyRoom(5, 5), ['a', 'rack', 1, 1], ['b', 'plant', 4, 4]);
  assert.ok(!fits(room, rack, 2, 2));
  assert.ok(fits(room, rack, 2, 2, 0, 'a'));
  assert.ok(fits(room, rack, 1, 1, 0, 'a'));
  assert.ok(!fits(room, rack, 3, 3, 0, 'a'), 'still blocked by the plant');
  assert.ok(!fits(room, rack, 2, 2, 0, 'b'));
});

test('canPlace puts wall items on exactly one wall, inside its length', () => {
  const room = emptyRoom(5, 4);
  assert.ok(fits(room, neon, 0, -1));
  assert.ok(fits(room, neon, 3, -1));
  assert.ok(!fits(room, neon, 4, -1), 'two panels do not fit from the last column');
  assert.ok(fits(room, neon, -1, 2));
  assert.ok(!fits(room, neon, -1, 3), 'the left wall is only 4 panels long');
  assert.ok(fits(room, poster, 4, -1));
  assert.ok(fits(room, poster, -1, 3));
  assert.ok(!fits(room, poster, 5, -1));
  assert.ok(!fits(room, neon, -1, -1), 'the corner is not a wall position');
  assert.ok(!fits(room, neon, 1, 1), 'a wall item cannot stand on the floor');
  assert.ok(!fits(room, neon, -2, 1));
  assert.ok(!fits(room, neon, 1, -2));
});

test('wall items block each other on the same wall only, and never the floor', () => {
  const room = place(emptyRoom(5, 5), ['n', 'neon', 1, -1], ['r', 'rack', 1, 0]);
  assert.ok(!fits(room, poster, 1, -1));
  assert.ok(!fits(room, poster, 2, -1));
  assert.ok(!fits(room, neon, 0, -1));
  assert.ok(fits(room, poster, 0, -1));
  assert.ok(fits(room, neon, 3, -1));
  assert.ok(fits(room, neon, -1, 1), 'the other wall is free');
  assert.ok(fits(room, plant, 0, 0), 'floor tiles under a wall item are free');
  assert.ok(fits(room, neon, 1, -1, 0, 'n'));
});

test('canPlace rejects bad input', () => {
  const room = emptyRoom();
  assert.ok(!fits(room, rack, 0.5, 0));
  assert.ok(!fits(room, rack, 0, NaN));
  assert.ok(!fits(room, rack, 0, 0, 4));
  assert.ok(!fits(room, rack, 0, 0, -1));
  assert.ok(!fits(room, rack, 0, 0, 1.5));
  assert.ok(!fits(room, testLookup('floor-rubber'), 0, 0), 'finishes are not placeable');
  assert.ok(!fits(room, undefined, 0, 0));
  assert.ok(!fits(room, plant, 0, -1), 'a floor item cannot hang on a wall');
});

test('canPlace skips placed items the catalog does not know', () => {
  const room = place(emptyRoom(), ['g', 'ghost-item', 0, 0]);
  assert.ok(fits(room, rack, 0, 0));
});

// ---------------------------------------------------------------------------------------------
// Gym value

test('the day-one gym is worth nothing', () => {
  assert.equal(gymValue(starterGym(), testLookup), 0);
  assert.equal(gymValue({ rooms: [] }, testLookup), 0);
});

test('gym value adds placed items, finishes per square metre, expansions and floors', () => {
  const gym = { rooms: [
    { w: 7, d: 7, floor: 'floor-rubber', wall: 'wall-brick', items: [{ uid: 'a', itemId: 'rack' }, { uid: 'b', itemId: 'plant' }, { uid: 'c', itemId: 'ghost-item' }] },
    { w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare', items: [{ uid: 'd', itemId: 'neon' }] },
  ] };
  const items = 2400 + 180 + 600;
  const finishes = 24 * 49 + 30 * 14;
  const space = expansionCost(0) + expansionCost(1) + extraFloorCost(1);
  assert.equal(gymValue(gym, testLookup), items + finishes + space);
  assert.ok(gymValue(kittedGym(), testLookup) > 20000);
});
