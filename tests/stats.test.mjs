import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  workoutVolume, workoutMinutes, exerciseSeries, bestSet, prList, weeklyStats, muscleBalance, weeklyStreak, totals,
} from '../src/core/stats.js';
import { est1RM, consistency } from '../src/core/economy.js';
import { MUSCLES } from '../src/exercises/data.js';
import { set, sets, workout, workoutsDaysAgo, T0, DAY } from './_fixtures.mjs';

const history = () => [
  workout([['bench-press', [set(40, 10, 'warmup'), ...sets(3, 60, 8)]], ['pull-up', sets(2, 0, 6)]], T0 - 20 * DAY, 50, { id: 'a', points: { total: 300 } }),
  workout([['bench-press', [set(62.5, 8), set(62.5, 7), set(100, 1, 'normal', false)]]], T0 - 13 * DAY, 40, { id: 'b', points: { total: 200 } }),
  workout([['back-squat', sets(3, 80, 5)]], T0 - 9 * DAY, 30, { id: 'c', points: { total: 150 } }),
  workout([['bench-press', [set(60, 8), set(65, 8)]], ['pull-up', [set(5, 6)]]], T0 - 2 * DAY, 45, { id: 'd', points: { total: 250 } }),
];

test('workoutVolume sums load x reps over done working sets', () => {
  const [a, b] = history();
  assert.equal(workoutVolume(a, 80), 3 * 60 * 8 + 2 * 80 * 6);
  assert.equal(workoutVolume(b, 80), 62.5 * 8 + 62.5 * 7, 'the set that was not done does not count');
  assert.equal(workoutVolume(workout([['moon-walk', sets(3, 50, 5)]]), 80), 0);
  assert.equal(workoutVolume(workout([['bench-press', sets(2, 50, 10, 'warmup')]]), 80), 0);
});

test('workoutMinutes is the whole-minute duration', () => {
  assert.equal(workoutMinutes(history()[0]), 50);
  assert.equal(workoutMinutes({ startedAt: T0, endedAt: T0 - 5 }), 0);
});

test('exerciseSeries has one point per workout that trained the exercise, oldest first', () => {
  const series = exerciseSeries(history(), 'bench-press', 80);
  assert.deepEqual(series.map((p) => p.workoutId), ['a', 'b', 'd']);
  assert.deepEqual(series.map((p) => p.t), [T0 - 20 * DAY, T0 - 13 * DAY, T0 - 2 * DAY]);
  assert.equal(series[0].est1RM, est1RM(60, 8));
  assert.deepEqual(series[0].topSet, { kg: 60, reps: 8, load: 60, est1RM: est1RM(60, 8) });
  assert.equal(series[0].volume, 3 * 60 * 8);
  assert.equal(series[0].sets, 3, 'warm-ups are not working sets');
  assert.equal(series[1].est1RM, est1RM(62.5, 8), 'the undone single is ignored');
  assert.equal(series[2].topSet.kg, 65);
  assert.deepEqual(exerciseSeries(history(), 'leg-press', 80), []);
  assert.deepEqual(exerciseSeries(history(), 'moon-walk', 80), []);
});

test('exerciseSeries uses body weight for bodyweight exercises', () => {
  const series = exerciseSeries(history(), 'pull-up', 80);
  assert.equal(series[0].topSet.load, 80);
  assert.equal(series[0].topSet.kg, 0);
  assert.equal(series[1].topSet.load, 85);
  assert.equal(series[1].est1RM, est1RM(85, 6));
  assert.equal(series[0].volume, 2 * 80 * 6);
});

test('bestSet is the set with the highest estimated 1RM', () => {
  assert.deepEqual(bestSet(history(), 'bench-press', 80), { kg: 65, reps: 8, load: 65, est1RM: est1RM(65, 8), t: T0 - 2 * DAY, workoutId: 'd' });
  assert.equal(bestSet(history(), 'back-squat', 80).workoutId, 'c');
  assert.equal(bestSet(history(), 'leg-press', 80), null);
  const tie = [workout([['bench-press', [set(60, 8)]]], T0 - 5 * DAY, 30, { id: 'first' }), workout([['bench-press', [set(60, 8)]]], T0 - DAY, 30, { id: 'second' })];
  assert.equal(bestSet(tie, 'bench-press').workoutId, 'first', 'a tie goes to the earliest');
});

test('prList lists every time a best was beaten, newest first, without first-time baselines', () => {
  const records = prList(history(), 80);
  assert.deepEqual(records.map((r) => [r.exId, r.workoutId]), [['bench-press', 'd'], ['pull-up', 'd'], ['bench-press', 'b']]);
  const latest = records[0];
  assert.equal(latest.est1RM, est1RM(65, 8));
  assert.equal(latest.previous, est1RM(62.5, 8));
  assert.equal(latest.kg, 65);
  assert.equal(latest.reps, 8);
  assert.ok(records.every((r) => r.est1RM > r.previous));
  assert.deepEqual(prList([], 80), []);
  assert.deepEqual(prList([history()[2]], 80), [], 'a first session sets baselines only');
});

test('weeklyStats buckets workouts, volume, minutes and points into trailing weeks', () => {
  const weeks = weeklyStats(history(), T0, 4, 80);
  assert.equal(weeks.length, 4);
  assert.deepEqual(weeks.map((w) => w.workouts), [0, 1, 2, 1]);
  assert.deepEqual(weeks.map((w) => w.points), [0, 300, 350, 250]);
  assert.deepEqual(weeks.map((w) => w.minutes), [0, 50, 70, 45]);
  assert.equal(weeks[3].volume, 60 * 8 + 65 * 8 + 85 * 6);
  assert.equal(weeks[3].end, T0);
  assert.equal(weeks[3].start, T0 - 7 * DAY);
  assert.equal(weeks[0].start, T0 - 28 * DAY);
  for (let i = 1; i < weeks.length; i++) assert.equal(weeks[i].start, weeks[i - 1].end);
});

test('weeklyStats agrees with the consistency blocks', () => {
  const workouts = workoutsDaysAgo([0.5, 2, 6.99, 7.01, 13, 20, 27, 41, 55.9]);
  assert.deepEqual(weeklyStats(workouts, T0, 8).map((w) => w.workouts), consistency(workouts, T0).perWeek);
  assert.equal(weeklyStats(workoutsDaysAgo([90]), T0, 8).reduce((n, w) => n + w.workouts, 0), 0);
});

test('muscleBalance gives load and share per muscle: primary full, secondary half', () => {
  const balance = muscleBalance([history()[3]], T0);
  assert.deepEqual(balance.map((b) => b.muscle), MUSCLES);
  const of = (muscle) => balance.find((b) => b.muscle === muscle);
  assert.equal(of('chest').load, 2);
  assert.equal(of('triceps').load, 1);
  assert.equal(of('back').load, 1);
  assert.equal(of('biceps').load, 0.5);
  assert.equal(of('quads').load, 0);
  const total = 2 + 1 + 1 + 1 + 0.5;
  assert.equal(of('chest').share, 2 / total);
  assert.ok(Math.abs(balance.reduce((n, b) => n + b.share, 0) - 1) < 1e-9);
});

test('muscleBalance respects its window and handles no training', () => {
  assert.equal(muscleBalance(history(), T0, 5).find((b) => b.muscle === 'quads').load, 0);
  assert.equal(muscleBalance(history(), T0, 21).find((b) => b.muscle === 'quads').load, 3);
  assert.ok(muscleBalance([], T0).every((b) => b.load === 0 && b.share === 0));
});

test('weeklyStreak counts 7-day blocks in a row with a workout, back from now', () => {
  assert.equal(weeklyStreak([], T0), 0);
  assert.equal(weeklyStreak(workoutsDaysAgo([1]), T0), 1);
  assert.equal(weeklyStreak(workoutsDaysAgo([8]), T0), 0, 'nothing in the last 7 days');
  assert.equal(weeklyStreak(workoutsDaysAgo([1, 8, 15, 22]), T0), 4);
  assert.equal(weeklyStreak(workoutsDaysAgo([1, 8, 22, 29]), T0), 2, 'the gap ends the streak');
  assert.equal(weeklyStreak(workoutsDaysAgo(Array.from({ length: 30 }, (_, i) => i * 7 + 1)), T0), 30, 'not limited to eight weeks');
});

test('totals add up the whole history', () => {
  const t = totals(history(), T0, 80);
  assert.equal(t.workouts, 4);
  assert.equal(t.sets, 3 + 2 + 2 + 3 + 2 + 1);
  assert.equal(t.minutes, 50 + 40 + 30 + 45);
  assert.equal(t.points, 900);
  assert.equal(t.volume, history().reduce((v, w) => v + workoutVolume(w, 80), 0));
  assert.equal(t.streakWeeks, 3);
  assert.deepEqual(totals([], T0), { workouts: 0, sets: 0, volume: 0, minutes: 0, points: 0, streakWeeks: 0 });
});
