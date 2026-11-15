// Formatting and small pure helpers for the Progress and Exercises screens. No DOM, no store.
import { WEEK, DAY } from '../../../core/index.js';
import { formatInt } from '../../system/index.js';
import { formatKg } from '../shared/index.jsx';

export const PERIODS = [
  { value: '4w', label: '4 weeks', weeks: 4, phrase: 'the last 4 weeks' },
  { value: '8w', label: '8 weeks', weeks: 8, phrase: 'the last 8 weeks' },
  { value: 'all', label: 'All', weeks: null, phrase: 'all your training' },
];

export const periodById = (id) => PERIODS.find((p) => p.value === id) || PERIODS[0];

/** First millisecond a period covers; everything counts for "All". */
export const periodStart = (period, t) => (period.weeks ? t - period.weeks * WEEK : -Infinity);

/** Days a period covers, for the muscle balance window. "All" reaches back to the first workout. */
export function periodDays(period, workouts, t) {
  if (period.weeks) return period.weeks * 7;
  const first = workouts.reduce((min, w) => Math.min(min, w.endedAt), t);
  return Math.ceil((t - first) / DAY) + 1;
}

export const kg = (value) => `${formatKg(value)} kg`;

/** "+3.2 kg", "-1 kg", or null when the change rounds to nothing. */
export function signedKg(delta) {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return null;
  return `${rounded > 0 ? '+' : '-'}${formatKg(Math.abs(rounded))} kg`;
}

/** "23%"; a real but tiny share reads "<1%" so it is never shown as nothing. */
export const percent = (share) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`);

/** "x1.02": multipliers move in hundredths, so two decimals is the real resolution. */
export const mult = (value) => `x${value.toFixed(2)}`;

/** "Sat 14 Nov" */
export const weekdayDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

/** Weight of a set as people say it: "72.5 kg", "BW", "BW + 2.5 kg". */
function weightLabel(exercise, addedKg) {
  if (!exercise.bodyweight) return kg(addedKg);
  return addedKg > 0 ? `BW + ${kg(addedKg)}` : 'BW';
}

/** One set: "72.5 kg x 8", "BW + 2.5 kg x 8". */
export const setLabel = (exercise, set) => `${weightLabel(exercise, set.kg)} x ${set.reps}`;

/** A set split for a Stat: the weight as the figure, the rest as its unit. { value: '72.5', unit: 'kg x 8' } */
export function setParts(exercise, set) {
  const lifted = !exercise.bodyweight || set.kg > 0;
  const value = exercise.bodyweight ? (set.kg > 0 ? `BW + ${formatKg(set.kg)}` : 'BW') : formatKg(set.kg);
  return { value, unit: `${lifted ? 'kg ' : ''}x ${set.reps}` };
}

const TYPE_NOTE = { warmup: 'warm-up', drop: 'drop set', super: 'superset' };

/**
 * The done sets of one session, runs of the same weight folded together.
 * @returns {Array<{ text: string, note?: string }>} e.g. [{ text: '57.5 kg x 10', note: 'warm-up' }, { text: '115 kg x 5, 5, 5' }]
 */
export function setGroups(exercise, sets) {
  const groups = [];
  for (const set of sets.filter((s) => s.done)) {
    const last = groups[groups.length - 1];
    if (last && last.kg === set.kg && last.type === set.type) last.reps.push(set.reps);
    else groups.push({ kg: set.kg, type: set.type, reps: [set.reps] });
  }
  return groups.map((g) => ({ text: `${weightLabel(exercise, g.kg)} x ${g.reps.join(', ')}`, note: TYPE_NOTE[g.type] }));
}

/** "Back Squat and Leg Press", "A, B and C". */
export function listWords(words) {
  if (words.length < 2) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * A y-axis that lands on round numbers.
 * @returns {{ lo: number, hi: number, ticks: number[], format: (v: number) => string }}
 */
export function niceScale(min, max, target = 4) {
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw * 0.999);
  let lo = Math.floor(min / step + 1e-9) * step;
  let hi = Math.ceil(max / step - 1e-9) * step;
  if (lo === hi) { lo -= step; hi += step; }
  if (min >= 0) lo = Math.max(0, lo);
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const format = (v) => (Number.isInteger(step) ? formatInt(v) : v.toFixed(step * 10 % 1 ? 2 : 1));
  return { lo, hi, ticks, format };
}
