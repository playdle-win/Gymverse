// Progress statistics. PURE functions over finished workouts (oldest first); no store, no clock.
// Only done sets count. Warm-up sets count toward the 1RM estimate but not toward volume or balance.
import { MUSCLES, exerciseById } from '../exercises/data.js';
import { TUNING, est1RM, setLoad, muscleLoad, weeklyCounts } from './economy.js';

const MS_WEEK = 7 * 24 * 3600e3;

const doneSets = (entry) => entry.sets.filter((s) => s.done);
const workingSets = (entry) => doneSets(entry).filter((s) => s.type !== 'warmup');

// A done set with its derived numbers.
function describeSet(exercise, set, bodyKg) {
  const load = setLoad(exercise, set, bodyKg);
  return { kg: set.kg, reps: set.reps, load, est1RM: est1RM(load, set.reps) };
}

// The strongest of a list of described sets: highest estimated 1RM, heavier load on a tie.
function strongest(described) {
  return described.reduce((best, s) => (!best || s.est1RM > best.est1RM || (s.est1RM === best.est1RM && s.load > best.load) ? s : best), null);
}

function entryVolume(exercise, entry, bodyKg) {
  return workingSets(entry).reduce((v, s) => v + setLoad(exercise, s, bodyKg) * s.reps, 0);
}

/**
 * Volume of a workout in kg (load x reps over done working sets).
 * @param {{ exercises: Array }} workout
 * @param {number} [bodyKg]
 * @returns {number}
 */
export function workoutVolume(workout, bodyKg = TUNING.defaultBodyKg) {
  return workout.exercises.reduce((v, entry) => {
    const exercise = exerciseById(entry.exId);
    return exercise ? v + entryVolume(exercise, entry, bodyKg) : v;
  }, 0);
}

/** Duration of a workout in whole minutes. */
export const workoutMinutes = (workout) => Math.max(0, Math.round((workout.endedAt - workout.startedAt) / 60e3));

/**
 * History of one exercise, one point per workout that trained it, oldest first.
 * @param {Array} workouts
 * @param {string} exId
 * @param {number} [bodyKg]
 * @returns {Array<{ t: number, workoutId: string, est1RM: number, topSet: { kg: number, reps: number, load: number, est1RM: number },
 *                   volume: number, sets: number }>}
 *   est1RM: best estimate of that day; topSet: the set it came from; sets: done working sets.
 */
export function exerciseSeries(workouts, exId, bodyKg = TUNING.defaultBodyKg) {
  const exercise = exerciseById(exId);
  if (!exercise) return [];
  const series = [];
  for (const workout of workouts) {
    const entries = workout.exercises.filter((e) => e.exId === exId);
    const described = entries.flatMap((e) => doneSets(e).map((s) => describeSet(exercise, s, bodyKg)));
    const topSet = strongest(described);
    if (!topSet) continue;
    series.push({
      t: workout.endedAt,
      workoutId: workout.id,
      est1RM: topSet.est1RM,
      topSet,
      volume: entries.reduce((v, e) => v + entryVolume(exercise, e, bodyKg), 0),
      sets: entries.reduce((n, e) => n + workingSets(e).length, 0),
    });
  }
  return series;
}

/**
 * The best set ever logged for an exercise (highest estimated 1RM; the earliest one on a tie).
 * @param {Array} workouts
 * @param {string} exId
 * @param {number} [bodyKg]
 * @returns {null | { kg: number, reps: number, load: number, est1RM: number, t: number, workoutId: string }}
 */
export function bestSet(workouts, exId, bodyKg = TUNING.defaultBodyKg) {
  const best = exerciseSeries(workouts, exId, bodyKg)
    .reduce((top, point) => (!top || point.est1RM > top.est1RM ? point : top), null);
  return best ? { ...best.topSet, t: best.t, workoutId: best.workoutId } : null;
}

/**
 * Personal records: every time a workout beat the previous best estimated 1RM of an exercise.
 * The first time an exercise is logged sets the baseline and is not a record. Newest first.
 * @param {Array} workouts
 * @param {number} [bodyKg]
 * @returns {Array<{ exId: string, t: number, workoutId: string, kg: number, reps: number, load: number,
 *                   est1RM: number, previous: number }>}
 */
export function prList(workouts, bodyKg = TUNING.defaultBodyKg) {
  const exIds = [...new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exId)))];
  const records = [];
  for (const exId of exIds) {
    let previous = 0;
    for (const point of exerciseSeries(workouts, exId, bodyKg)) {
      if (previous > 0 && point.est1RM > previous) {
        records.push({ exId, t: point.t, workoutId: point.workoutId, ...point.topSet, previous });
      }
      previous = Math.max(previous, point.est1RM);
    }
  }
  return records.sort((a, b) => b.t - a.t);
}

/**
 * Per-week activity over trailing 7-day blocks ending at t, oldest first (same blocks as consistency()).
 * @param {Array} workouts
 * @param {number} t now (ms)
 * @param {number} [weeks]
 * @param {number} [bodyKg]
 * @returns {Array<{ start: number, end: number, workouts: number, volume: number, minutes: number, points: number }>}
 */
export function weeklyStats(workouts, t, weeks = TUNING.consistencyWeeks, bodyKg = TUNING.defaultBodyKg) {
  const blocks = Array.from({ length: weeks }, (_, i) => ({
    start: t - (weeks - i) * MS_WEEK, end: t - (weeks - 1 - i) * MS_WEEK, workouts: 0, volume: 0, minutes: 0, points: 0,
  }));
  for (const workout of workouts) {
    const age = t - workout.endedAt;
    const index = weeks - 1 - Math.floor(age / MS_WEEK);
    if (age < 0 || index < 0) continue;
    const block = blocks[index];
    block.workouts += 1;
    block.volume += workoutVolume(workout, bodyKg);
    block.minutes += workoutMinutes(workout);
    block.points += workout.points ? workout.points.total : 0;
  }
  return blocks;
}

/**
 * Muscle balance over a trailing window: training load per muscle in set-equivalents
 * (primary 1, secondary 0.5) and its share of the total. MUSCLES order.
 * @param {Array} workouts
 * @param {number} t now (ms)
 * @param {number} [days]
 * @returns {Array<{ muscle: string, load: number, share: number }>}
 */
export function muscleBalance(workouts, t, days = TUNING.focusWindowDays) {
  const load = muscleLoad(workouts, t, days);
  const total = MUSCLES.reduce((n, m) => n + load[m], 0);
  return MUSCLES.map((muscle) => ({ muscle, load: load[muscle], share: total ? load[muscle] / total : 0 }));
}

/**
 * Weekly streak: 7-day blocks in a row, counting back from t, with at least one workout.
 * @param {Array<{ endedAt: number }>} workouts
 * @param {number} t now (ms)
 * @returns {number}
 */
export function weeklyStreak(workouts, t) {
  if (!workouts.length) return 0;
  const oldest = workouts.reduce((min, w) => Math.min(min, w.endedAt), t);
  const weeks = Math.floor(Math.max(0, t - oldest) / MS_WEEK) + 1;
  const recent = weeklyCounts(workouts, t, weeks).reverse();
  const firstEmpty = recent.findIndex((n) => n === 0);
  return firstEmpty === -1 ? recent.length : firstEmpty;
}

/**
 * Lifetime totals.
 * @param {Array} workouts
 * @param {number} t now (ms)
 * @param {number} [bodyKg]
 * @returns {{ workouts: number, sets: number, volume: number, minutes: number, points: number, streakWeeks: number }}
 */
export function totals(workouts, t, bodyKg = TUNING.defaultBodyKg) {
  return {
    workouts: workouts.length,
    sets: workouts.reduce((n, w) => n + w.exercises.reduce((k, e) => k + workingSets(e).length, 0), 0),
    volume: workouts.reduce((v, w) => v + workoutVolume(w, bodyKg), 0),
    minutes: workouts.reduce((m, w) => m + workoutMinutes(w), 0),
    points: workouts.reduce((p, w) => p + (w.points ? w.points.total : 0), 0),
    streakWeeks: weeklyStreak(workouts, t),
  };
}
