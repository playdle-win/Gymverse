// The full-screen workout session, presented over the tabs with nav.present. It can be minimised and resumed;
// when the workout is finished the same cover shows the summary.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  useStore, getState, now, buddyRate, workoutVolume, selLastTime, selDust, selConsistency,
  startWorkout, addExercise, removeExercise, addSet, updateSet, removeSet, toggleSetDone, setSetType,
  discardWorkout, finishWorkout,
} from '../../../core/index.js';
import { exerciseById, ExerciseIcon, MUSCLE_LABEL } from '../../../exercises/index.js';
import {
  NavBar, Button, IconButton, Icon, Points, EmptyState, Sheet, List, ListRow, nav, toast, confirm, formatInt,
} from '../../system/index.js';
import { PageContext } from '../../system/nav.js';
import { PersonAvatar, formatClock } from '../shared/index.jsx';
import { ExerciseDetailPage } from '../exercises/detail.jsx';
import {
  useNow, useSheetTarget, setMarks, groupSets, countSets, countDone, doneOnly, scoringCtx, livePoints,
  buddyNames, plural, renameActive,
} from './lib.js';
import { FocusBadge } from './parts.jsx';
import { SetRow, SetColumns, SetTypeSheet } from './sets.jsx';
import { ExercisePicker } from './picker.jsx';
import { Summary } from './summary.jsx';

const FRESH_MS = 700;

// When the last set was ticked, kept outside the component so it survives minimising the session.
let restMark = null;

/** Show the session in progress. */
export function openSession() {
  nav.present(WorkoutCover);
}

/** Start a workout (see startWorkout) and open it. `then` runs between the two, for adding a first exercise. */
export function startAndOpen(options, then) {
  const started = startWorkout(options);
  if (!started.ok && started.reason !== 'already-active') { toast('That workout could not be started'); return; }
  if (started.ok && then) then();
  openSession();
}

/** The cover: the running session, then its summary. */
export function WorkoutCover() {
  const active = useStore((s) => s.active);
  const [summary, setSummary] = useState(null);
  // A discarded session keeps its last frame while the cover slides away.
  const last = useRef(active);
  if (active) last.current = active;
  // The workout can end from outside the session (the test lab resets to day one): close the cover with it.
  useEffect(() => { if (!active && !summary) nav.dismiss(); }, [active, summary]);
  if (summary) return <Summary workout={summary.workout} before={summary.before} />;
  return last.current ? <Session active={last.current} onFinished={setSummary} /> : null;
}

function NameField({ name }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft !== null) renameActive(draft);
    setDraft(null);
  };
  const shown = draft === null ? name : draft;
  return (
    <label class="wk-namebox">
      <input
        class="wk-name" aria-label="Workout name" value={shown} size={Math.max(4, shown.length)} maxLength={40}
        enterkeyhint="done" autocomplete="off" data-testid="session-name"
        onInput={(e) => setDraft(e.currentTarget.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      <Icon class="c-3" name="pencil-simple" size={14} />
    </label>
  );
}

function Buddies({ ids }) {
  const friends = useStore((s) => s.friends).filter((f) => ids.includes(f.id));
  const bonus = Math.round(buddyRate(friends.length) * 100);
  return (
    <div class="wk-buddies" data-testid="session-buddies">
      <span class="wk-buddies__faces">{friends.map((f) => <PersonAvatar key={f.id} person={f} size={32} />)}</span>
      <p class="t-callout wk-grow">
        With {buddyNames(getState(), ids)}
        <span class="t-foot c-2 wk-block">Everyone earns {bonus}% more when you all finish.</span>
      </p>
    </div>
  );
}

function ExerciseBlock({ entry, exIdx, focus, fresh, onDetail, onMenu, onType, onToggle }) {
  const exercise = exerciseById(entry.exId);
  const last = selLastTime(entry.exId);
  const marks = setMarks(entry.sets);
  const pays = focus && exercise.primary.includes(focus.muscle);
  return (
    <section class="wk-ex" aria-label={exercise.name} data-testid="session-exercise">
      <header class="wk-ex__head">
        <button type="button" class="wk-ex__title" onClick={() => onDetail(entry.exId)} aria-label={`${exercise.name}. How to do it`}>
          <ExerciseIcon id={entry.exId} size={44} />
          <span class="wk-ex__text">
            <span class="wk-ex__name"><span class="t-headline t-truncate">{exercise.name}</span>{pays && <FocusBadge mult={focus.mult} />}</span>
            <span class="t-foot c-2">{last ? `Last time ${groupSets(exercise, last.sets)}` : 'First time you log this one'}</span>
          </span>
        </button>
        <IconButton icon="dots-three" weight="bold" label={`${exercise.name} options`} onClick={() => onMenu(exIdx)} data-testid="exercise-menu" />
      </header>
      <div class="wk-sets">
        <SetColumns bodyweight={exercise.bodyweight} done />
        {entry.sets.map((set, setIdx) => (
          <SetRow
            key={setIdx} set={set} mark={marks[setIdx]} index={setIdx} done={set.done} fresh={fresh === `${exIdx}:${setIdx}`}
            onType={() => onType({ exIdx, setIdx })}
            onChange={(patch) => updateSet(exIdx, setIdx, patch)}
            trailing={(
              <IconButton
                icon="check" weight="bold" variant={set.done ? 'primary' : 'quiet'} aria-pressed={set.done ? 'true' : 'false'}
                label={`Set ${setIdx + 1} done`} onClick={() => onToggle(exIdx, setIdx)} data-testid="set-done"
              />
            )}
          />
        ))}
      </div>
      <div><Button variant="plain" size="m" icon="plus" onClick={() => addSet(exIdx)} data-testid="add-set">Add set</Button></div>
    </section>
  );
}

function Session({ active, onFinished }) {
  const t = useNow(1000);
  const workouts = useStore((s) => s.workouts);
  const gym = useStore((s) => s.gym);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [typeTarget, typeOpen, showType, closeType] = useSheetTarget();
  const [exTarget, exOpen, showExMenu, closeExMenu] = useSheetTarget();
  const [detail, setDetail] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [restSince, setRestSince] = useState(restMark && restMark.id === active.id ? restMark.since : null);
  useEffect(() => {
    if (!fresh) return undefined;
    const timer = setTimeout(() => setFresh(null), FRESH_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  // The exercise page can link to other tabs and pages. They live under this cover, so following one minimises the session.
  useEffect(() => {
    if (!detail) return undefined;
    const opened = nav.getState();
    return nav.subscribe((next) => {
      if (next.tab === opened.tab && next.stacks === opened.stacks) return;
      setDetail(null);
      nav.dismiss();
    });
  }, [detail]);

  const ctx = useMemo(() => scoringCtx(getState(), active.focus, active.buddies.length), [workouts, gym, bodyKg, active.focus, active.buddies.length]);
  const points = livePoints(active, ctx, t);
  const volume = workoutVolume({ exercises: doneOnly(active.exercises) }, bodyKg);
  const subPage = useMemo(() => ({ tabId: null, depth: 1, active: true, cover: true, pop: () => setDetail(null) }), []);

  const markRest = (since) => { restMark = { id: active.id, since }; setRestSince(since); };
  const toggle = (exIdx, setIdx) => {
    const set = getState().active.exercises[exIdx].sets[setIdx];
    if (!set.done && set.reps === 0) { toast('Enter the reps first', { icon: 'info' }); return; }
    toggleSetDone(exIdx, setIdx);
    if (!set.done) { markRest(now()); setFresh(`${exIdx}:${setIdx}`); }
  };

  const finish = async () => {
    const live = getState().active;
    const total = countSets(live.exercises), done = countDone(live.exercises);
    if (!done) { toast('Tick a set you have done, then finish', { icon: 'info' }); return; }
    const open = total - done;
    const goOn = open === 0 || await confirm({
      title: 'Finish workout?',
      message: `${open === 1 ? '1 set is' : `${open} sets are`} not ticked and will not be saved.`,
      confirmLabel: 'Finish anyway', cancelLabel: 'Keep going',
    });
    if (!goOn) return;
    const before = { dust: selDust(), level: selConsistency().level, fromRoutine: Boolean(live.routineId) };
    const result = finishWorkout();
    if (!result.ok) return;
    restMark = null;
    onFinished({ workout: result.workout, before });
  };

  const discard = async () => {
    setMenuOpen(false);
    const done = countDone(getState().active.exercises);
    const sure = done === 0 || await confirm({
      title: 'Discard this workout?', message: `${plural(done, 'ticked set')} will be lost.`,
      confirmLabel: 'Discard workout', cancelLabel: 'Keep going', destructive: true,
    });
    if (!sure) return;
    restMark = null;
    discardWorkout();
    nav.dismiss();
  };

  const removeEntry = async (exIdx) => {
    closeExMenu();
    const entry = getState().active.exercises[exIdx];
    const done = entry.sets.filter((s) => s.done).length;
    const sure = done === 0 || await confirm({
      title: `Remove ${exerciseById(entry.exId).name}?`, message: `${plural(done, 'ticked set')} will be lost.`,
      confirmLabel: 'Remove exercise', destructive: true,
    });
    if (sure) removeExercise(exIdx);
  };

  const typeSet = typeTarget && active.exercises[typeTarget.exIdx] ? active.exercises[typeTarget.exIdx].sets[typeTarget.setIdx] : null;
  const menuEntry = exTarget !== null ? active.exercises[exTarget] : null;
  const menuExercise = menuEntry ? exerciseById(menuEntry.exId) : null;

  return (
    <section class="gb-screen wk-session" aria-label="Workout in progress" data-testid="session">
      <NavBar
        showTitle
        leading={<IconButton icon="caret-down" weight="bold" label="Minimise workout" variant="quiet" size="s" onClick={nav.dismiss} data-testid="session-minimise" />}
        title={<NameField name={active.name} />}
        trailing={(
          <>
            <IconButton icon="dots-three" weight="bold" label="Workout options" size="s" onClick={() => setMenuOpen(true)} data-testid="session-menu" />
            <Button size="s" onClick={finish} data-testid="session-finish">Finish</Button>
          </>
        )}
      />
      <div class="gb-screen__body gb-scroll">
        <div class="wk-top">
          <div class="wk-meter">
            <div class="wk-meter__cell">
              <span class="t-num wk-meter__clock" role="timer" aria-label="Elapsed time" data-testid="session-clock">{formatClock(t - active.startedAt)}</span>
              <span class="t-foot c-2">Elapsed</span>
            </div>
            <div class="wk-meter__cell">
              <span class="t-num t-num-m">{formatInt(volume)}<span class="gb-stat__unit">kg</span></span>
              <span class="t-foot c-2">Volume</span>
            </div>
            <div class="wk-meter__cell wk-meter__cell--end">
              <span key={points.total} class="wk-tick" data-testid="session-points"><Points value={points.total} size="l" /></span>
              <span class="t-foot c-2">Points so far</span>
            </div>
          </div>
          {restSince !== null && (
            <div class="wk-rest">
              <Button variant="quiet" size="s" icon="timer" onClick={() => markRest(now())} aria-label={`Rest ${formatClock(t - restSince)}. Restart the rest timer`} data-testid="rest-timer">
                Rest <span class="wk-tnum">{formatClock(t - restSince)}</span>
              </Button>
              <span class="t-foot c-2">Tap to restart</span>
            </div>
          )}
        </div>
        <div class="gb-screen__content gb-screen__content--padded">
          {active.buddies.length > 0 && <Buddies ids={active.buddies} />}
          {active.focus && (
            <p class="wk-line t-callout" data-testid="session-focus">
              <FocusBadge mult={active.focus.mult} />
              <span>Extra points for {MUSCLE_LABEL[active.focus.muscle].toLowerCase()} exercises</span>
            </p>
          )}
          {active.exercises.map((entry, exIdx) => (
            <ExerciseBlock
              key={`${exIdx}-${entry.exId}`} entry={entry} exIdx={exIdx} focus={active.focus} fresh={fresh}
              onDetail={setDetail} onMenu={showExMenu} onType={showType} onToggle={toggle}
            />
          ))}
          {active.exercises.length ? (
            <Button variant="secondary" block icon="plus" onClick={() => setPickerOpen(true)} data-testid="add-exercise">Add exercise</Button>
          ) : (
            <EmptyState
              icon="barbell" title="What are you training?" text="Add your first exercise and tick the sets as you go. The clock is already running."
              action={<Button icon="plus" onClick={() => setPickerOpen(true)} data-testid="add-exercise">Add exercise</Button>}
            />
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen} onClose={() => setPickerOpen(false)} focus={active.focus}
        inUse={active.exercises.map((e) => e.exId)} onAdd={(ids) => ids.forEach((id) => addExercise(id))}
      />
      <SetTypeSheet
        open={typeOpen} onClose={closeType} target={typeSet ? { set: typeSet, index: typeTarget.setIdx } : null}
        onPick={(type) => setSetType(typeTarget.exIdx, typeTarget.setIdx, type)}
        onRemove={() => removeSet(typeTarget.exIdx, typeTarget.setIdx)}
      />
      <Sheet open={exOpen} onClose={closeExMenu} title={menuExercise ? menuExercise.name : 'Exercise'} detents={['auto']}>
        {menuExercise && (
          <List variant="plain">
            <ListRow icon="info" title="How to do it" subtitle="Movement, muscles and cues" chevron onClick={() => { closeExMenu(); setDetail(menuEntry.exId); }} />
            <ListRow icon="trash" tone="bad" title="Remove exercise" onClick={() => removeEntry(exTarget)} data-testid="remove-exercise" />
          </List>
        )}
      </Sheet>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Workout" detents={['auto']}>
        <List variant="plain">
          <ListRow icon="trash" tone="bad" title="Discard workout" subtitle="Nothing from this workout is saved" onClick={discard} />
        </List>
      </Sheet>

      {detail && (
        <div class="wk-subpage">
          <PageContext.Provider value={subPage}><ExerciseDetailPage id={detail} /></PageContext.Provider>
        </div>
      )}
    </section>
  );
}
