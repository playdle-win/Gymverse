import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNING, est1RM, setLoad, setPoints, intensityFactor, bestOneRMs, exerciseMultiplier, buddyRate, workoutPoints,
} from '../src/core/economy.js';
import { exerciseById } from '../src/exercises/data.js';
import { set, sets, workout, T0, DAY } from './_fixtures.mjs';

const bench = exerciseById('bench-press');
const pullUp = exerciseById('pull-up');
const points = (exercises, ctx, minutes = 60) => workoutPoints(workout(exercises, T0, minutes), ctx);
const total = (exercises, ctx, minutes) => points(exercises, ctx, minutes).total;

test('est1RM follows Epley, treats a single as itself and caps the reps it counts', () => {
  assert.equal(est1RM(100, 1), 100);
  assert.equal(est1RM(100, 10), 100 * (1 + 10 / 30));
  assert.equal(est1RM(60, 6), 72);
  assert.equal(est1RM(100, TUNING.oneRmRepCap), est1RM(100, 40));
  assert.equal(est1RM(100, 0), 0);
  assert.equal(est1RM(0, 8), 0);
  assert.equal(est1RM(-20, 8), 0);
  assert.equal(est1RM(NaN, 8), 0);
});

test('est1RM never decreases with more weight or more reps', () => {
  for (let kg = 20; kg <= 200; kg += 20) {
    for (let reps = 1; reps < 20; reps++) {
      assert.ok(est1RM(kg, reps + 1) >= est1RM(kg, reps));
      assert.ok(est1RM(kg + 2.5, reps) > est1RM(kg, reps));
    }
  }
});

test('setLoad uses the bar weight, or body weight plus added weight for bodyweight exercises', () => {
  assert.equal(setLoad(bench, { kg: 80 }, 78), 80);
  assert.equal(setLoad(pullUp, { kg: 0 }, 78), 78);
  assert.equal(setLoad(pullUp, { kg: 10 }, 78), 88);
  assert.equal(setLoad(exerciseById('hanging-leg-raise'), { kg: 0 }, 80), 28);
  assert.equal(setLoad(pullUp, { kg: 0 }), TUNING.defaultBodyKg);
});

test('bestOneRMs takes the best done set per exercise', () => {
  const history = [
    workout([['bench-press', [set(60, 8), set(70, 5), set(200, 1, 'normal', false)]]], T0 - 3 * DAY),
    workout([['bench-press', [set(65, 8)]], ['pull-up', [set(0, 6)]]], T0 - DAY),
  ];
  const best = bestOneRMs(history, 80);
  assert.equal(best['bench-press'], est1RM(65, 8));
  assert.equal(best['pull-up'], est1RM(80, 6));
  assert.deepEqual(bestOneRMs([]), {});
});

test('only done sets earn points', () => {
  assert.equal(total([['bench-press', [set(80, 8, 'normal', false)]]]), 0);
  assert.equal(total([['bench-press', [set(80, 8), set(80, 8, 'normal', false)]]]), total([['bench-press', [set(80, 8)]]]));
  assert.equal(setPoints(bench, set(80, 8, 'normal', false), 78), 0);
});

test('an empty workout is worth nothing and still has a base line', () => {
  const b = points([]);
  assert.equal(b.total, 0);
  assert.deepEqual(b.lines, [{ key: 'base', label: 'Sets and reps', value: 0 }]);
  assert.deepEqual(b.perExercise, []);
});

test('sets with zero reps or zero load are worth nothing', () => {
  assert.equal(setPoints(bench, set(80, 0), 78), 0);
  assert.equal(setPoints(bench, set(0, 10), 78), 0);
  assert.ok(setPoints(pullUp, set(0, 5), 78) > 0, 'bodyweight alone is a load');
});

test('points never go down when a set gets heavier, longer, or when a set is added', () => {
  const ctx = { best1RM: { 'bench-press': 100, 'back-squat': 140 } };
  for (const kg of [20, 40, 60, 80, 100, 120]) {
    for (const reps of [1, 3, 5, 8, 12, 20, 30, 40]) {
      const here = total([['bench-press', sets(3, kg, reps)]], ctx);
      assert.ok(total([['bench-press', sets(3, kg + 2.5, reps)]], ctx) >= here, `heavier at ${kg}x${reps}`);
      assert.ok(total([['bench-press', sets(3, kg, reps + 1)]], ctx) >= here, `more reps at ${kg}x${reps}`);
      assert.ok(total([['bench-press', sets(4, kg, reps)]], ctx) > here, `extra set at ${kg}x${reps}`);
      assert.ok(total([['bench-press', sets(3, kg, reps)], ['back-squat', sets(1, kg, reps)]], ctx) > here, 'extra exercise');
    }
  }
});

test('each set past the full ones adds less than the one before', () => {
  const gains = [];
  for (let n = 1; n <= 14; n++) {
    gains.push(total([['bench-press', sets(n, 80, 8)]], {}, 0) - total([['bench-press', sets(n - 1, 80, 8)]], {}, 0));
  }
  gains.forEach((g) => assert.ok(g >= 0));
  // Whole points: allow one point of rounding between neighbours, none over a longer stretch.
  for (let n = 1; n < gains.length; n++) assert.ok(gains[n] <= gains[n - 1] + 1, `set ${n + 1} adds no more than set ${n}`);
  assert.ok(Math.abs(gains[TUNING.fullSets - 1] - gains[0]) <= 1, 'the first sets count in full');
  assert.ok(gains[TUNING.fullSets] < gains[0], 'the first set past the full ones adds less');
  assert.ok(gains[TUNING.fullSets + 3] < gains[TUNING.fullSets] * 0.6);
  const six = total([['bench-press', sets(6, 80, 8)]], {}, 0);
  assert.ok(total([['bench-press', sets(30, 80, 8)]], {}, 0) < six * 1.6, 'thirty sets earn far less than five times six sets');
});

test('volume is sublinear: double the reps or the load gives far less than double the points', () => {
  const one = setPoints(bench, set(60, 10), 78);
  assert.ok(setPoints(bench, set(60, 20), 78) < one * 1.5);
  assert.ok(setPoints(bench, set(120, 10), 78) < one * 1.5);
  assert.ok(setPoints(bench, set(120, 10), 78) > one);
});

test('reps beyond the cap add nothing', () => {
  assert.equal(setPoints(bench, set(40, TUNING.repCap), 78), setPoints(bench, set(40, TUNING.repCap + 50), 78));
});

test('set types rank warm-up < normal < drop and superset', () => {
  const of = (type) => setPoints(bench, set(80, 8, type), 78);
  assert.ok(of('warmup') < of('normal') * 0.5, 'warm-ups count little');
  assert.ok(of('normal') < of('drop'));
  assert.ok(of('normal') < of('super'));
  assert.ok(of('drop') <= of('normal') * 1.25, 'drop sets count only slightly more');
  assert.ok(of('super') <= of('normal') * 1.25, 'supersets count only slightly more');
  assert.ok(total([['bench-press', sets(3, 80, 8, 'warmup')]]) < total([['bench-press', sets(3, 80, 8)]]));
});

test('intensity: no history is neutral, light sets floor out, a record gets a capped bonus', () => {
  assert.equal(intensityFactor(80, undefined), 1);
  assert.equal(intensityFactor(100, 100), 1);
  assert.equal(intensityFactor(50, 100), TUNING.intensityFloor);
  assert.equal(intensityFactor(10, 100), TUNING.intensityFloor);
  assert.equal(intensityFactor(200, 100), TUNING.intensityCeil);
  assert.ok(Math.abs(intensityFactor(75, 100) - 0.8) < 1e-9);
  for (let rm = 10; rm < 150; rm += 5) assert.ok(intensityFactor(rm + 5, 100) >= intensityFactor(rm, 100));
});

test('intensity: the same set is worth more the closer it is to your best', () => {
  const session = [['bench-press', sets(3, 60, 8)]];
  const near = total(session, { best1RM: { 'bench-press': 80 } });
  const far = total(session, { best1RM: { 'bench-press': 140 } });
  const fresh = total(session, {});
  assert.ok(near > far);
  assert.ok(fresh >= near, 'no history never scores below a set under your best');
  const record = total(session, { best1RM: { 'bench-press': 60 } });
  assert.ok(record > fresh, 'beating your best pays a bonus');
  assert.ok(record <= fresh * TUNING.intensityCeil + 3);
});

test('light high-rep padding scores well below honest work of the same tonnage', () => {
  const ctx = { best1RM: { 'bench-press': 95 } };
  const honest = total([['bench-press', sets(5, 75, 8)]], ctx);
  const padding = total([['bench-press', sets(5, 20, 30)]], ctx);
  assert.ok(padding < honest * 0.75, `${padding} vs ${honest}`);
});

test('set order inside an exercise does not matter', () => {
  const a = [set(40, 10, 'warmup'), set(80, 8), set(80, 7), set(60, 12, 'drop'), ...sets(5, 70, 8)];
  const b = [...a].reverse();
  assert.equal(total([['bench-press', a]]), total([['bench-press', b]]));
});

test('the same exercise logged twice scores as one exercise', () => {
  const split = points([['bench-press', sets(4, 80, 8)], ['pull-up', sets(3, 0, 8)], ['bench-press', sets(4, 80, 8)]]);
  const joined = points([['bench-press', sets(8, 80, 8)], ['pull-up', sets(3, 0, 8)]]);
  assert.equal(split.total, joined.total);
  assert.deepEqual(split.perExercise.map((e) => e.exId), ['bench-press', 'pull-up']);
});

test('unknown exercises are ignored', () => {
  assert.equal(total([['moon-walk', sets(3, 80, 8)]]), 0);
  assert.equal(total([['moon-walk', sets(3, 80, 8)], ['bench-press', sets(3, 80, 8)]]), total([['bench-press', sets(3, 80, 8)]]));
});

test('exerciseMultiplier weighs primary muscles twice as much as secondary ones', () => {
  assert.equal(exerciseMultiplier(bench, {}), 1);
  const viaPrimary = exerciseMultiplier(bench, { chest: 1.2 });
  const viaSecondary = exerciseMultiplier(bench, { triceps: 1.2 });
  assert.ok(Math.abs(viaPrimary - 1.1) < 1e-9);
  assert.ok(Math.abs(viaSecondary - 1.05) < 1e-9);
  assert.equal(exerciseMultiplier(exerciseById('dumbbell-curl'), { biceps: 1.3 }), 1.3);
});

test('gym multipliers raise the matching exercises only', () => {
  const session = [['bench-press', sets(4, 80, 8)], ['back-squat', sets(4, 100, 5)]];
  const plain = points(session);
  const boosted = points(session, { multipliers: { byMuscle: { chest: 1.3 } } });
  assert.equal(boosted.base, plain.base);
  assert.equal(plain.gymBonus, 0);
  assert.ok(boosted.gymBonus > 0);
  assert.equal(boosted.total, plain.total + boosted.gymBonus);
  assert.equal(boosted.perExercise[1].points, plain.perExercise[1].points, 'squat is untouched by a chest bonus');
  assert.equal(boosted.perExercise[0].mult, 1.15);
});

test('a dusty gym shows up as a negative gym line', () => {
  const b = points([['bench-press', sets(4, 80, 8)]], { multipliers: { byMuscle: { chest: 0.8, triceps: 0.8, shoulders: 0.8 } } });
  assert.ok(b.gymBonus < 0);
  assert.equal(b.lines.find((l) => l.key === 'gym').label, 'Dusty gym');
  assert.equal(b.total, b.base + b.durationBonus + b.gymBonus);
});

test('the focus offer multiplies exercises that train the muscle as a primary, and nothing else', () => {
  const session = [['back-squat', sets(4, 100, 5)], ['leg-press', sets(3, 160, 10)], ['deadlift', sets(3, 120, 5)], ['bench-press', sets(3, 80, 8)]];
  const plain = points(session);
  const focused = points(session, { focus: { muscle: 'quads', mult: 1.5 } });
  assert.deepEqual(focused.perExercise.map((e) => e.focus), [true, true, false, false]);
  const expected = Math.round(plain.perExercise[0].points * 0.5) + Math.round(plain.perExercise[1].points * 0.5);
  assert.equal(focused.focusBonus, expected);
  assert.equal(focused.total, plain.total + expected);
  assert.equal(focused.lines.find((l) => l.key === 'focus').label, 'Focus on quads x1.5');
  assert.equal(points(session, { focus: null }).focusBonus, 0);
});

test('buddy bonus is 15% per buddy and stops at 30%', () => {
  assert.equal(buddyRate(0), 0);
  assert.equal(buddyRate(1), 0.15);
  assert.equal(buddyRate(2), 0.3);
  assert.equal(buddyRate(5), 0.3);
  const session = [['bench-press', sets(4, 80, 8)], ['pull-up', sets(4, 0, 8)]];
  const solo = points(session);
  const one = points(session, { buddiesFinished: 1 });
  const two = points(session, { buddiesFinished: 2 });
  const three = points(session, { buddiesFinished: 3 });
  assert.equal(solo.buddyBonus, 0);
  assert.equal(one.buddyBonus, Math.round(solo.total * 0.15));
  assert.equal(two.buddyBonus, Math.round(solo.total * 0.3));
  assert.equal(three.total, two.total);
  assert.equal(one.lines.find((l) => l.key === 'buddy').label, 'Trained with 1 friend');
  assert.equal(two.lines.find((l) => l.key === 'buddy').label, 'Trained with 2 friends');
});

test('the duration term is modest, needs sets to back it up and is capped', () => {
  const session = [['bench-press', sets(4, 80, 8)]];
  assert.equal(points(session, {}, 0).durationBonus, 0);
  const tenMin = points(session, {}, 10).durationBonus;
  assert.equal(tenMin, Math.round(10 * TUNING.durationPerMin));
  const idle = points(session, {}, 600).durationBonus;
  assert.equal(idle, Math.round(4 * TUNING.minutesPerSet * TUNING.durationPerMin), 'four sets justify 14 minutes, not ten hours');
  const marathon = points([['bench-press', sets(40, 80, 8)], ['back-squat', sets(40, 100, 5)]], {}, 600);
  assert.equal(marathon.durationBonus, Math.round(TUNING.durationCapMin * TUNING.durationPerMin));
  const hour = points([['bench-press', sets(5, 80, 8)], ['back-squat', sets(5, 100, 5)], ['pull-up', sets(5, 0, 8)], ['overhead-press', sets(5, 45, 8)]], {}, 60);
  assert.ok(hour.durationBonus < hour.total * 0.15, 'duration stays a small part of the total');
  assert.equal(points([['bench-press', [set(80, 8, 'normal', false)]]], {}, 60).durationBonus, 0);
});

test('the breakdown is made of integers that add up, and its lines sum to the total', () => {
  const session = [
    ['bench-press', [set(40, 10, 'warmup'), ...sets(4, 82.5, 7)]],
    ['back-squat', sets(4, 102.5, 5)],
    ['dumbbell-curl', [...sets(3, 13, 11), set(9, 11, 'drop')]],
    ['hanging-leg-raise', sets(3, 0, 13, 'super')],
  ];
  const b = points(session, {
    bodyKg: 81.3,
    best1RM: { 'bench-press': 101.7, 'back-squat': 119.2, 'dumbbell-curl': 17.9 },
    multipliers: { byMuscle: { chest: 1.137, quads: 1.212, glutes: 1.08, biceps: 1.05, core: 0.97 } },
    focus: { muscle: 'quads', mult: 1.5 },
    buddiesFinished: 2,
  }, 57);
  for (const key of ['base', 'gymBonus', 'focusBonus', 'buddyBonus', 'durationBonus', 'total']) assert.ok(Number.isInteger(b[key]), key);
  for (const e of b.perExercise) assert.ok(Number.isInteger(e.base) && Number.isInteger(e.points));
  assert.equal(b.base + b.gymBonus + b.focusBonus + b.durationBonus + b.buddyBonus, b.total);
  assert.equal(b.perExercise.reduce((n, e) => n + e.points, 0) + b.durationBonus + b.buddyBonus, b.total);
  assert.equal(b.perExercise.reduce((n, e) => n + e.base, 0), b.base);
  assert.equal(b.lines.reduce((n, l) => n + l.value, 0), b.total);
  assert.deepEqual(b.lines.map((l) => l.key), ['base', 'duration', 'gym', 'focus', 'buddy']);
  for (const line of b.lines) assert.doesNotMatch(line.label, /[\u2013\u2014]/);
});

test('lines without a value are left out', () => {
  const b = points([['bench-press', sets(3, 80, 8)]], {}, 0);
  assert.deepEqual(b.lines.map((l) => l.key), ['base']);
});

test('body weight matters for bodyweight exercises only', () => {
  const pull = [['pull-up', sets(3, 0, 8)]];
  assert.ok(total(pull, { bodyKg: 95 }) > total(pull, { bodyKg: 60 }));
  const press = [['bench-press', sets(3, 80, 8)]];
  assert.equal(total(press, { bodyKg: 95 }), total(press, { bodyKg: 60 }));
});
