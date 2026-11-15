// Pure helpers and small hooks shared by the workout screens. No markup here.
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  useStore, getState, setState, now, TUNING, workoutPoints, bestOneRMs, gymMultipliers, est1RM, setLoad,
  startWorkout, addExercise, addSet, updateSet, setSetType,
} from '../../../core/index.js';
import { exerciseById, MUSCLE_LABEL } from '../../../exercises/index.js';
import { formatKg, timeAgo } from '../shared/index.jsx';

const MINUTES_PER_PLANNED_SET = 3;

/** Set types in menu order, with the mark shown in a set row and the one-line explanation. */
export const SET_TYPE_INFO = {
  normal: { mark: null, label: 'Normal', text: 'A working set. Counts in full.' },
  warmup: { mark: 'W', label: 'Warm-up', text: `A light set to get ready. Earns ${Math.round(TUNING.typeFactor.warmup * 100)}% of the points.` },
  drop: { mark: 'D', label: 'Drop set', text: `Less weight straight after a set, no rest. Earns ${Math.round((TUNING.typeFactor.drop - 1) * 100)}% more.` },
  super: { mark: 'S', label: 'Superset', text: `Back to back with another exercise. Earns ${Math.round((TUNING.typeFactor.super - 1) * 100)}% more.` },
};

/** Marks for a list of sets: normal sets count 1, 2, 3; the other types show their letter. */
export function setMarks(sets) {
  let n = 0;
  return sets.map((set) => SET_TYPE_INFO[set.type].mark || String(++n));
}

/** The app clock, re-read every `ms` while the component is mounted. */
export function useNow(ms = 1000) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setT(now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return t;
}

/** Re-renders the caller when the test lab skips time. Returns the offset so it can sit in hook dependencies. */
export const useClockOffset = () => useStore((s) => s.settings.timeOffsetMs);

/** Keeps the last non-null target so a sheet can animate out with its content. Returns [target, open, show, close]. */
export function useSheetTarget() {
  const [target, setTarget] = useState(null);
  const last = useRef(null);
  if (target !== null) last.current = target;
  return [last.current, target !== null, setTarget, () => setTarget(null)];
}

/** Counts from 0 to `value` once; jumps straight to it when motion is reduced. */
export function useCountUp(value, ms = 900) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setShown(value); return undefined; }
    let frame = 0;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, ms, reduced]);
  return shown;
}

// ---------------------------------------------------------------------------------------------
// Words

/** ["Noor", "Daan", "Sanne"] -> "Noor, Daan and Sanne". */
export function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const firstName = (name) => name.split(' ')[0];
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Last done 3 days ago", from timeAgo's wording. */
export function agoPhrase(prefix, ts) {
  const ago = timeAgo(ts);
  return `${prefix} ${/^\d/.test(ago) ? ago : ago[0].toLowerCase() + ago.slice(1)}`;
}

/** Who a workout belongs to: me or a friend, as { id, name, avatar, bodyKg }. */
export function personOf(state, userId) {
  if (userId === 'me') return { id: 'me', name: state.profile.name, avatar: state.avatar, bodyKg: state.settings.bodyKg };
  const friend = state.friends.find((f) => f.id === userId);
  return friend ? { ...friend, bodyKg: friend.bodyKg || TUNING.defaultBodyKg } : null;
}

/** "Noor and Daan" for a list of buddy ids as seen from the feed ("you" for me). */
export function buddyNames(state, ids) {
  const names = ids.map((id) => (id === 'me' ? 'you' : (personOf(state, id) || {}).name)).filter(Boolean);
  return joinNames(names.map((name) => (name === 'you' ? name : firstName(name))));
}

/** Primary muscles of a list of exercise ids, each once, in first-seen order: "Chest, shoulders and core". */
export function musclesLine(exIds) {
  const seen = [];
  for (const id of exIds) {
    const exercise = exerciseById(id);
    for (const m of exercise ? exercise.primary : []) if (!seen.includes(m)) seen.push(m);
  }
  const line = joinNames(seen.map((m) => MUSCLE_LABEL[m].toLowerCase()));
  return line ? line[0].toUpperCase() + line.slice(1) : '';
}

// ---------------------------------------------------------------------------------------------
// Sets

const loadText = (exercise, kg) => {
  if (!exercise.bodyweight) return `${formatKg(kg)} kg`;
  return kg > 0 ? `+${formatKg(kg)} kg` : 'Bodyweight';
};

/** One set as text: "80 kg x 8", "+2.5 kg x 8", "Bodyweight x 12". */
export const formatSet = (exercise, set) => `${loadText(exercise, set.kg)} x ${set.reps}`;

/** Working sets grouped by load: "80 kg x 8, 8, 6" or "80 kg x 8, 8 then 70 kg x 10". */
export function groupSets(exercise, sets) {
  const groups = [];
  for (const set of sets.filter((s) => s.type !== 'warmup')) {
    const tail = groups[groups.length - 1];
    if (tail && tail.kg === set.kg) tail.reps.push(set.reps);
    else groups.push({ kg: set.kg, reps: [set.reps] });
  }
  return groups.map((g) => `${loadText(exercise, g.kg)} x ${g.reps.join(', ')}`).join(' then ');
}

/** A routine entry's plan in a few words: "4 x 8 at 72.5 kg, 1 warm-up". */
export function planSummary(exercise, sets) {
  const working = sets.filter((s) => s.type !== 'warmup');
  const warmups = sets.length - working.length;
  const tail = warmups ? `, ${plural(warmups, 'warm-up')}` : '';
  if (!working.length) return warmups ? plural(warmups, 'warm-up set') : 'No sets yet';
  const sameKg = working.every((s) => s.kg === working[0].kg);
  const sameReps = working.every((s) => s.reps === working[0].reps);
  if (sameKg && sameReps) {
    const load = exercise.bodyweight && working[0].kg === 0 ? '' : ` at ${loadText(exercise, working[0].kg)}`;
    return `${working.length} x ${working[0].reps}${load}${tail}`;
  }
  return `${groupSets(exercise, working)}${tail}`;
}

/** The set with the highest estimated 1RM, or null. */
export function bestSetOf(exercise, sets, bodyKg) {
  let best = null, bestRm = -1;
  for (const set of sets) {
    const rm = est1RM(setLoad(exercise, set, bodyKg), set.reps);
    if (rm > bestRm) { best = set; bestRm = rm; }
  }
  return best;
}

/** The exercises that earned the most in a finished workout, with their best set as text. */
export function topLifts(workout, bodyKg, count = 3) {
  const earned = Object.fromEntries(((workout.points && workout.points.perExercise) || []).map((e) => [e.exId, e.points]));
  return workout.exercises
    .map((entry, order) => ({ entry, order, exercise: exerciseById(entry.exId) }))
    .filter((item) => item.exercise && item.entry.sets.length)
    .sort((a, b) => (earned[b.entry.exId] || 0) - (earned[a.entry.exId] || 0) || a.order - b.order)
    .slice(0, count)
    .map(({ entry, exercise }) => ({ exId: entry.exId, name: exercise.name, best: formatSet(exercise, bestSetOf(exercise, entry.sets, bodyKg)) }));
}

export const countSets = (exercises) => exercises.reduce((n, entry) => n + entry.sets.length, 0);
export const countDone = (exercises) => exercises.reduce((n, entry) => n + entry.sets.filter((s) => s.done).length, 0);

/** Only the ticked sets, the way the engine logs a workout. */
export const doneOnly = (exercises) => exercises
  .map((entry) => ({ exId: entry.exId, sets: entry.sets.filter((s) => s.done) }))
  .filter((entry) => entry.sets.length > 0);

// ---------------------------------------------------------------------------------------------
// Scoring (the same context finishWorkout builds)

/** Context for workoutPoints, from the live state. */
export function scoringCtx(state, focus, buddies) {
  return {
    bodyKg: state.settings.bodyKg,
    best1RM: bestOneRMs(state.workouts, state.settings.bodyKg),
    multipliers: gymMultipliers(state.gym),
    focus,
    buddiesFinished: buddies,
  };
}

/** What the session would pay if it were finished at time t. */
export function livePoints(active, ctx, t) {
  return workoutPoints({ ...active, endedAt: t, exercises: doneOnly(active.exercises) }, ctx);
}

/** Planned sets of a routine and the minutes they usually take. */
export const routineMinutes = (routine) => countSets(routine.exercises) * MINUTES_PER_PLANNED_SET;

/** Points for finishing every planned set of a routine at its planned loads. */
export function routinePoints(routine, ctx) {
  const exercises = routine.exercises.map((entry) => ({ exId: entry.exId, sets: entry.sets.map((set) => ({ ...set, done: true })) }));
  return workoutPoints({ startedAt: 0, endedAt: routineMinutes(routine) * 60e3, exercises }, ctx).total;
}

/** Where a focus offer is best spent: the routine with the most sets on it, else its first exercise. */
export function focusStart(offer, routines) {
  const setsOnFocus = (routine) => countSets(routine.exercises.filter((entry) => offer.exerciseIds.includes(entry.exId)));
  const routine = routines.reduce((top, r) => (setsOnFocus(r) > (top ? setsOnFocus(top) : 0) ? r : top), null);
  if (routine) return { label: routine.name, routineId: routine.id };
  const exercise = exerciseById(offer.exerciseIds[0]);
  return { label: exercise.name, exId: exercise.id };
}

/** True when the routine holds an exercise the offer pays extra for. */
export const routineHitsFocus = (routine, offer) => Boolean(offer) && routine.exercises.some((entry) => offer.exerciseIds.includes(entry.exId));

// ---------------------------------------------------------------------------------------------
// Session edits the engine has no action for

/** Rename the session in progress. The engine sets the name only at the start, so this writes it directly. */
export function renameActive(name) {
  const clean = name.trim().slice(0, 40);
  if (!clean || !getState().active) return false;
  setState((s) => ({ ...s, active: { ...s.active, name: clean } }));
  return true;
}

/** Start a session with the same exercises and sets as a finished workout. Built from the public actions. */
export function repeatWorkout(workout) {
  const started = startWorkout({ name: workout.name });
  if (!started.ok) return started;
  workout.exercises.filter((entry) => exerciseById(entry.exId)).forEach((entry, exIdx) => {
    addExercise(entry.exId);
    entry.sets.forEach((set, setIdx) => {
      if (setIdx > 0) addSet(exIdx);
      setSetType(exIdx, setIdx, set.type);
      updateSet(exIdx, setIdx, { kg: set.kg, reps: set.reps });
    });
  });
  return started;
}
