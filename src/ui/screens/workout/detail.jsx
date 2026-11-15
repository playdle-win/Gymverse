// One finished workout: mine or a friend's.
import { useRef, useState } from 'preact/hooks';
import { useStore, getState, prList, workoutVolume, workoutMinutes, routineFromWorkout } from '../../../core/index.js';
import { exerciseById, ExerciseIcon } from '../../../exercises/index.js';
import { Screen, Section, Button, Badge, Icon, Points, Stat, StatRow, nav, toast, formatInt } from '../../system/index.js';
import { PersonAvatar, timeAgo } from '../shared/index.jsx';
import { ExerciseDetailPage } from '../exercises/detail.jsx';
import { personOf, buddyNames, setMarks, countSets, repeatWorkout, useClockOffset } from './lib.js';
import { Breakdown, RecordList, SetLog } from './parts.jsx';
import { openSession } from './session.jsx';

const whenText = (ts) => {
  const date = new Date(ts);
  const day = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} at ${time}`;
};

function LoggedExercise({ entry, earned }) {
  const exercise = exerciseById(entry.exId);
  return (
    <li class="wk-log__ex">
      <button type="button" class="wk-ex__title" onClick={() => nav.push(ExerciseDetailPage, { id: entry.exId })} aria-label={`${exercise.name}. How to do it`}>
        <ExerciseIcon id={entry.exId} size={44} />
        <span class="wk-ex__text">
          <span class="wk-ex__name"><span class="t-headline t-truncate">{exercise.name}</span>{earned && earned.focus && <Badge tone="accent" icon="lightning">Focus</Badge>}</span>
          {earned && <Points value={earned.points} size="s" sign />}
        </span>
        <Icon class="c-3" name="caret-right" size={14} weight="bold" />
      </button>
      <SetLog exercise={exercise} sets={entry.sets} marks={setMarks(entry.sets)} />
    </li>
  );
}

/** Pushed page showing one finished workout. props: { id } where id is a workout id found in state.workouts or state.feed. */
export function WorkoutDetailPage({ id }) {
  const found = useStore((s) => s.workouts.find((w) => w.id === id) || s.feed.find((w) => w.id === id));
  const active = useStore((s) => s.active);
  const [saved, setSaved] = useState(false);
  useClockOffset();
  const last = useRef(found);
  if (found) last.current = found;
  const workout = last.current;
  if (!workout) return <Screen title="Workout" />;

  const state = getState();
  const mine = workout.userId === 'me';
  const person = personOf(state, workout.userId) || { name: 'Someone', avatar: state.avatar, bodyKg: state.settings.bodyKg };
  const history = mine ? state.workouts : state.feed.filter((w) => w.userId === workout.userId);
  const records = prList(history, person.bodyKg).filter((record) => record.workoutId === workout.id);
  const earned = Object.fromEntries(workout.points.perExercise.map((e) => [e.exId, e]));
  const entries = workout.exercises.filter((entry) => exerciseById(entry.exId));

  const repeat = () => {
    if (active) { toast('Finish the workout in progress first', { icon: 'info' }); return; }
    if (repeatWorkout(workout).ok) openSession();
  };
  const save = () => {
    if (!routineFromWorkout(workout.id).ok) return;
    setSaved(true);
    toast(`Saved as the routine ${workout.name}`, { icon: 'check-circle' });
  };

  return (
    <Screen title={workout.name} large={false}>
      <div class="wk-stack wk-stack--loose" data-testid="workout-detail">
        <div class="wk-post__head">
          <PersonAvatar person={person} size={48} />
          <div class="wk-post__who">
            <p class="wk-post__name"><span class="t-headline t-truncate">{person.name}</span>{mine && <Badge tone="accent">You</Badge>}</p>
            <p class="t-foot c-2">{whenText(workout.endedAt)}</p>
          </div>
          <div class="wk-post__side">
            <Points value={workout.points.total} size="l" />
            <span class="t-caption c-3">{timeAgo(workout.endedAt)}</span>
          </div>
        </div>
        <StatRow>
          <Stat value={workoutMinutes(workout)} unit="min" label="Duration" />
          <Stat value={formatInt(workoutVolume(workout, person.bodyKg))} unit="kg" label="Volume" />
          <Stat value={countSets(workout.exercises)} label="Sets" />
        </StatRow>
        {workout.buddies.length > 0 && <p class="wk-line t-callout c-2"><Icon name="users" size={18} /><span>Trained with {buddyNames(state, workout.buddies)}</span></p>}
      </div>
      {records.length > 0 && <Section title={records.length === 1 ? 'New record' : 'New records'}><RecordList records={records} /></Section>}
      <Section title="Exercises">
        <ol class="wk-log">{entries.map((entry, i) => <LoggedExercise key={i} entry={entry} earned={earned[entry.exId]} />)}</ol>
      </Section>
      <Section title="Points"><Breakdown points={workout.points} /></Section>
      {mine && (
        <div class="wk-stack">
          <Button block icon="arrow-clockwise" onClick={repeat} data-testid="repeat-workout">Repeat this workout</Button>
          <Button variant="quiet" block icon={saved ? 'check' : 'list-bullets'} disabled={saved} onClick={save} data-testid="save-routine">
            {saved ? 'Saved to your routines' : 'Save as routine'}
          </Button>
        </div>
      )}
    </Screen>
  );
}
