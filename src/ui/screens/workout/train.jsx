// Train: start a workout, and build, browse and edit routines.
import { useMemo, useRef, useState } from 'preact/hooks';
import { useStore, getState, now, focusOffer, selLastTime, saveRoutine, deleteRoutine } from '../../../core/index.js';
import { exerciseById, ExerciseIcon } from '../../../exercises/index.js';
import {
  Screen, Section, Card, Button, IconButton, Points, PointsPill, Stat, StatRow, Sheet, List, ListRow, TextField,
  EmptyState, nav, usePage, toast, confirm,
} from '../../system/index.js';
import { ExerciseDetailPage } from '../exercises/detail.jsx';
import {
  plural, agoPhrase, musclesLine, planSummary, setMarks, countSets, scoringCtx, routinePoints, routineMinutes,
  routineHitsFocus, useSheetTarget, useClockOffset,
} from './lib.js';
import { FocusBadge } from './parts.jsx';
import { SetRow, SetColumns, SetTypeSheet } from './sets.jsx';
import { ExercisePicker } from './picker.jsx';
import { StartBlock } from './start.jsx';
import { openSession, startAndOpen } from './session.jsx';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;

/** The focus offer and scoring context of this moment, recomputed when the history or the gym changes. */
function useEstimates() {
  const workouts = useStore((s) => s.workouts);
  const gym = useStore((s) => s.gym);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const offset = useClockOffset();
  return useMemo(() => {
    const offer = focusOffer({ workouts }, now());
    return { offer, ctx: scoringCtx(getState(), offer, 0) };
  }, [workouts, gym, bodyKg, offset]);
}

const lastDone = (workouts, routineId) => {
  for (let i = workouts.length - 1; i >= 0; i--) if (workouts[i].routineId === routineId) return workouts[i].endedAt;
  return null;
};

function RoutineCard({ routine, offer, ctx, workouts }) {
  const done = lastDone(workouts, routine.id);
  return (
    <Card onClick={() => nav.push(RoutinePage, { id: routine.id })} class="wk-routine" data-testid="routine-card">
      <span class="wk-routine__head">
        <span class="t-headline t-truncate wk-grow">{routine.name}</span>
        {routineHitsFocus(routine, offer) && <FocusBadge mult={offer.mult} />}
        <Points value={routinePoints(routine, ctx)} />
      </span>
      <span class="t-callout c-2">{musclesLine(routine.exercises.map((e) => e.exId))}</span>
      <span class="t-foot c-2">{plural(routine.exercises.length, 'exercise')}, {done ? agoPhrase('last done', done) : 'not done yet'}</span>
    </Card>
  );
}

export function TrainScreen() {
  const routines = useStore((s) => s.routines);
  const workouts = useStore((s) => s.workouts);
  const { offer, ctx } = useEstimates();
  const create = () => nav.push(RoutineEditorPage, {});
  return (
    <Screen title="Train" trailing={<PointsPill />}>
      <StartBlock />
      <Section
        title="Routines" action={{ label: 'New routine', onClick: create }}
        footnote={routines.length ? 'Points are an estimate for finishing every planned set.' : undefined}
      >
        {routines.length ? (
          <div class="wk-feed">
            {routines.map((routine) => <RoutineCard key={routine.id} routine={routine} offer={offer} ctx={ctx} workouts={workouts} />)}
          </div>
        ) : (
          <EmptyState
            icon="list-bullets" title="No routines yet" text="Save the exercises you repeat as a routine and start them with one tap."
            action={<Button variant="secondary" icon="plus" onClick={create}>New routine</Button>}
          />
        )}
      </Section>
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// One routine

export function RoutinePage({ id }) {
  const found = useStore((s) => s.routines.find((r) => r.id === id));
  const workouts = useStore((s) => s.workouts);
  const active = useStore((s) => s.active);
  const page = usePage();
  const { offer, ctx } = useEstimates();
  const [menuOpen, setMenuOpen] = useState(false);
  // A deleted routine keeps its last frame while the page slides away.
  const last = useRef(found);
  if (found) last.current = found;
  const routine = last.current;
  if (!routine) return <Screen title="Routine" />;

  const done = lastDone(workouts, routine.id);
  const edit = () => { setMenuOpen(false); nav.push(RoutineEditorPage, { id: routine.id }); };
  const duplicate = () => {
    setMenuOpen(false);
    const copy = saveRoutine({ name: `${routine.name} copy`, exercises: routine.exercises });
    if (copy.ok) toast(`Duplicated as ${routine.name} copy`, { icon: 'copy' });
  };
  const remove = async () => {
    setMenuOpen(false);
    const sure = await confirm({
      title: `Delete ${routine.name}?`, message: 'Workouts you logged with it stay in your history.',
      confirmLabel: 'Delete routine', destructive: true,
    });
    if (!sure) return;
    deleteRoutine(routine.id);
    page.pop();
    toast('Routine deleted', { icon: 'trash' });
  };
  const footer = active
    ? <Button variant="secondary" block icon="play" onClick={openSession}>Resume the workout in progress</Button>
    : <Button block icon="play" onClick={() => startAndOpen({ routineId: routine.id })} data-testid="routine-start">Start routine</Button>;

  return (
    <Screen
      title={routine.name} footer={footer}
      trailing={<IconButton icon="dots-three" weight="bold" label="Routine options" variant="quiet" size="s" onClick={() => setMenuOpen(true)} data-testid="routine-menu" />}
    >
      <div class="wk-stack" data-testid="routine-page">
        <StatRow>
          <Stat value={countSets(routine.exercises)} label="Sets" />
          <Stat value={routineMinutes(routine)} unit="min" label="Estimated time" />
          <Stat value={<Points value={routinePoints(routine, ctx)} size="l" />} label="Estimated points" />
        </StatRow>
        <p class="t-callout c-2">
          {musclesLine(routine.exercises.map((e) => e.exId))}. {done ? agoPhrase('Last done', done) : 'Not done yet'}.
        </p>
      </div>
      <Section title="Exercises" action={{ label: 'Edit', onClick: edit }}>
        <List>
          {routine.exercises.map((entry, i) => {
            const exercise = exerciseById(entry.exId);
            return (
              <ListRow
                key={i} leading={<ExerciseIcon id={entry.exId} size={44} />} title={exercise.name} subtitle={planSummary(exercise, entry.sets)}
                trailing={offer && offer.exerciseIds.includes(entry.exId) ? <FocusBadge mult={offer.mult} /> : null}
                chevron onClick={() => nav.push(ExerciseDetailPage, { id: entry.exId })}
              />
            );
          })}
        </List>
      </Section>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={routine.name} detents={['auto']}>
        <List variant="plain">
          <ListRow icon="pencil-simple" title="Edit routine" onClick={edit} />
          <ListRow icon="copy" title="Duplicate routine" onClick={duplicate} />
          <ListRow icon="trash" tone="bad" title="Delete routine" onClick={remove} />
        </List>
      </Sheet>
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// Editor

// Planned sets for an exercise new to a routine: what was logged last time, else three empty working sets.
function starterSets(exId) {
  const last = selLastTime(exId);
  if (last) return last.sets.map(({ type, kg, reps }) => ({ type, kg, reps }));
  return Array.from({ length: DEFAULT_SETS }, () => ({ type: 'normal', kg: 0, reps: DEFAULT_REPS }));
}

const replaceAt = (list, index, value) => list.map((item, i) => (i === index ? value : item));

function EditorExercise({ entry, index, count, onMove, onRemove, onSets, onType }) {
  const exercise = exerciseById(entry.exId);
  const marks = setMarks(entry.sets);
  const addSet = () => {
    const previous = entry.sets[entry.sets.length - 1];
    const next = previous && previous.type !== 'warmup' ? { ...previous, type: 'normal' } : { type: 'normal', kg: previous ? previous.kg : 0, reps: DEFAULT_REPS };
    onSets([...entry.sets, next]);
  };
  return (
    <section class="wk-ex" aria-label={exercise.name} data-testid="editor-exercise">
      <header class="wk-ex__head">
        <span class="wk-ex__title">
          <ExerciseIcon id={entry.exId} size={44} />
          <span class="wk-ex__text">
            <span class="t-headline t-truncate">{exercise.name}</span>
            <span class="t-foot c-2">{musclesLine([entry.exId])}</span>
          </span>
        </span>
        <IconButton icon="arrow-up" size="s" label={`Move ${exercise.name} up`} disabled={index === 0} onClick={() => onMove(-1)} />
        <IconButton icon="arrow-down" size="s" label={`Move ${exercise.name} down`} disabled={index === count - 1} onClick={() => onMove(1)} />
        <IconButton icon="trash" size="s" label={`Remove ${exercise.name}`} onClick={onRemove} />
      </header>
      <div class="wk-sets wk-sets--plan">
        <SetColumns bodyweight={exercise.bodyweight} />
        {entry.sets.map((set, setIdx) => (
          <SetRow
            key={setIdx} set={set} mark={marks[setIdx]} index={setIdx}
            onType={() => onType(setIdx)} onChange={(patch) => onSets(replaceAt(entry.sets, setIdx, { ...set, ...patch }))}
          />
        ))}
      </div>
      <div><Button variant="plain" size="m" icon="plus" onClick={addSet}>Add set</Button></div>
    </section>
  );
}

/** props: { id } to edit a routine; without it, a new routine. */
export function RoutineEditorPage({ id }) {
  const page = usePage();
  const [draft, setDraft] = useState(() => {
    const source = id ? getState().routines.find((r) => r.id === id) : null;
    return source ? { name: source.name, exercises: source.exercises } : { name: '', exercises: [] };
  });
  const [dirty, setDirty] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [typeTarget, typeOpen, showType, closeType] = useSheetTarget();

  const change = (patch) => { setDraft({ ...draft, ...patch }); setDirty(true); };
  const setEntry = (index, entry) => change({ exercises: replaceAt(draft.exercises, index, entry) });
  const move = (index, step) => {
    const exercises = [...draft.exercises];
    [exercises[index], exercises[index + step]] = [exercises[index + step], exercises[index]];
    change({ exercises });
  };
  const leave = async () => {
    const sure = !dirty || await confirm({
      title: 'Discard your changes?', message: 'The routine stays as it was.',
      confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', destructive: true,
    });
    if (sure) page.pop();
  };
  const save = () => {
    if (!draft.name.trim()) { setNameError('Give the routine a name'); return; }
    const exercises = draft.exercises.filter((entry) => entry.sets.length > 0);
    if (!exercises.length) { toast('Add an exercise with at least one set', { icon: 'info' }); return; }
    const result = saveRoutine({ id, name: draft.name, exercises });
    if (!result.ok) return;
    page.pop();
    toast('Routine saved', { icon: 'check-circle' });
  };

  const typeEntry = typeTarget ? draft.exercises[typeTarget.exIdx] : null;
  const typeSet = typeEntry ? typeEntry.sets[typeTarget.setIdx] : null;
  const setTypeOf = (type) => setEntry(typeTarget.exIdx, { ...typeEntry, sets: replaceAt(typeEntry.sets, typeTarget.setIdx, { ...typeSet, type }) });
  const removeSet = () => setEntry(typeTarget.exIdx, { ...typeEntry, sets: typeEntry.sets.filter((_, i) => i !== typeTarget.setIdx) });

  return (
    <Screen
      title={id ? 'Edit routine' : 'New routine'} large={false}
      leading={<IconButton icon="caret-left" weight="bold" label="Back" variant="quiet" size="s" onClick={leave} />}
      trailing={<Button size="s" onClick={save} data-testid="routine-save">Save</Button>}
    >
      <TextField
        label="Name" placeholder="Upper body" value={draft.name} error={nameError} maxLength={40} enterkeyhint="done" autocapitalize="sentences"
        onInput={(name) => { setNameError(null); change({ name }); }} data-testid="routine-name"
      />
      {draft.exercises.map((entry, index) => (
        <EditorExercise
          key={`${index}-${entry.exId}`} entry={entry} index={index} count={draft.exercises.length}
          onMove={(step) => move(index, step)}
          onRemove={() => change({ exercises: draft.exercises.filter((_, i) => i !== index) })}
          onSets={(sets) => setEntry(index, { ...entry, sets })}
          onType={(setIdx) => showType({ exIdx: index, setIdx })}
        />
      ))}
      {draft.exercises.length ? (
        <Button variant="secondary" block icon="plus" onClick={() => setPickerOpen(true)} data-testid="editor-add-exercise">Add exercise</Button>
      ) : (
        <EmptyState
          icon="barbell" title="Add the exercises you repeat" text="Plan the sets, weights and reps. You can still change them in every workout."
          action={<Button icon="plus" onClick={() => setPickerOpen(true)} data-testid="editor-add-exercise">Add exercise</Button>}
        />
      )}
      <ExercisePicker
        open={pickerOpen} onClose={() => setPickerOpen(false)} inUse={draft.exercises.map((e) => e.exId)}
        onAdd={(ids) => change({ exercises: [...draft.exercises, ...ids.map((exId) => ({ exId, sets: starterSets(exId) }))] })}
      />
      <SetTypeSheet
        open={typeOpen} onClose={closeType} target={typeSet ? { set: typeSet, index: typeTarget.setIdx } : null}
        onPick={setTypeOf} onRemove={removeSet}
      />
    </Screen>
  );
}
