// One exercise over time: a line chart with a metric switch and scrubbing, the key numbers, every session.
import { useState } from 'preact/hooks';
import { useStore, now, WEEK, exerciseSeries, bestSet } from '../../../core/index.js';
import { exerciseById, ExerciseIcon, MUSCLE_LABEL, EQUIPMENT_LABEL } from '../../../exercises/index.js';
import { Screen, Section, List, ListRow, Stat, StatRow, Segmented, EmptyState, nav, formatInt, cx } from '../../system/index.js';
import { shortDate, formatKg } from '../shared/index.jsx';
import { WorkoutDetailPage } from '../workout/detail.jsx';
import { ExerciseDetailPage } from '../exercises/detail.jsx';
import { signedKg, setLabel, setParts, setGroups, weekdayDate, listWords } from './format.js';
import { LineChart } from './charts.jsx';

const METRICS = [
  { value: 'est1RM', label: 'Est. 1RM', name: 'estimated 1RM', get: (p) => p.est1RM, format: formatKg },
  { value: 'top', label: 'Top set', name: 'top set weight', get: (p) => p.topSet.load, format: formatKg },
  { value: 'volume', label: 'Volume', name: 'volume', get: (p) => p.volume, format: formatInt },
];

/** "+6.3 kg", "-120 kg" or null, in the metric's own rounding. */
function signed(metric, delta) {
  if (metric.format === formatKg) return signedKg(delta);
  const rounded = Math.round(delta);
  return rounded ? `${rounded > 0 ? '+' : '-'}${formatInt(Math.abs(rounded))} kg` : null;
}

function Sets({ exercise, sets }) {
  return (
    <span class="pg-sets t-callout">
      {setGroups(exercise, sets).map((group, i) => (
        <span key={i} class="pg-sets__group pg-tabular">{group.text}{group.note && <span class="c-3"> {group.note}</span>}</span>
      ))}
    </span>
  );
}

/** Pushed page. props: { id } (exercise id). */
export function ExerciseProgressPage({ id }) {
  const workouts = useStore((s) => s.workouts);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const [metricId, setMetricId] = useState('est1RM');
  const [picked, setPicked] = useState(null);
  const exercise = exerciseById(id);
  const series = exerciseSeries(workouts, id, bodyKg);
  const guide = (
    <List>
      <ListRow leading={<ExerciseIcon id={id} size={44} />} title={<span data-testid="exercise-guide-link">Exercise guide</span>}
        subtitle={`${listWords(exercise.primary.map((m, i) => (i ? MUSCLE_LABEL[m].toLowerCase() : MUSCLE_LABEL[m])))}, ${EQUIPMENT_LABEL[exercise.equipment].toLowerCase()}`}
        chevron onClick={() => nav.push(ExerciseDetailPage, { id })} />
    </List>
  );
  if (!series.length) {
    return (
      <Screen title={exercise.name}>
        <EmptyState icon="trend-up" title="No sessions yet" text={`Log ${exercise.name} in a workout and its chart starts here.`} />
        {guide}
      </Screen>
    );
  }

  const metric = METRICS.find((m) => m.value === metricId);
  const points = series.map((p) => ({ t: p.t, v: metric.get(p) }));
  const shown = Math.min(picked ?? series.length - 1, series.length - 1);
  const first = series[0], latest = series[series.length - 1], session = series[shown];
  const change = signed(metric, points[shown].v - points[0].v);
  const best = bestSet(workouts, id, bodyKg);
  const weeks = Math.max(1, (now() - first.t) / WEEK);
  const values = points.map((p) => p.v);
  const describe = (i) => `${shortDate(series[i].t)}: ${metric.format(points[i].v)} kg, top set ${setLabel(exercise, series[i].topSet)}`;
  const setsOf = (workoutId) => workouts.find((w) => w.id === workoutId).exercises.filter((e) => e.exId === id).flatMap((e) => e.sets);

  return (
    <Screen title={exercise.name}>
      <div class="pg-detail">
        <div data-testid="exercise-metric">
          <Segmented label="Metric" options={METRICS.map(({ value, label }) => ({ value, label }))} value={metricId}
            onChange={(value) => { setMetricId(value); setPicked(null); }} />
        </div>
        <div class="pg-readout" data-testid="exercise-readout" aria-live="off">
          <div class="pg-readout__value">
            <span class="t-num t-num-l">{metric.format(points[shown].v)}</span>
            <span class="t-headline c-2">kg</span>
          </div>
          <p class="t-callout pg-tabular">{weekdayDate(session.t)}, top set {setLabel(exercise, session.topSet)}</p>
          <p class={cx('t-foot pg-tabular', change && points[shown].v > points[0].v ? 'c-good' : 'c-2')}>
            {shown === 0 ? (series.length > 1 ? 'First session' : 'One session so far. The line starts with your next one.') : `${change || 'No change'} since ${shortDate(first.t)}`}
          </p>
        </div>
        <LineChart points={points} selected={picked === null ? null : shown} onSelect={setPicked} valueText={describe}
          summary={`${exercise.name}, ${metric.name} per session. ${series.length} ${series.length === 1 ? 'session' : 'sessions'} from ${shortDate(first.t)} to ${shortDate(latest.t)}. Latest ${metric.format(values[values.length - 1])} kg, lowest ${metric.format(Math.min(...values))} kg, highest ${metric.format(Math.max(...values))} kg.`} />
        {exercise.bodyweight && (
          <p class="t-foot c-2">
            Load counts {exercise.bwFactor === 1 ? 'your body weight' : `${Math.round(exercise.bwFactor * 100)}% of your body weight`} ({formatKg(bodyKg)} kg) plus any added weight.
          </p>
        )}
      </div>

      <div class="pg-stats">
        <StatRow>
          <Stat {...setParts(exercise, best)} label={`Best set, ${shortDate(best.t)}`} />
          <Stat value={formatKg(latest.est1RM)} unit="kg" label="Estimated 1RM" />
        </StatRow>
        <StatRow>
          <Stat value={series.length} label={series.length === 1 ? 'Session' : 'Sessions'} />
          <Stat value={(series.length / weeks).toFixed(1)} unit="a week" label="Average frequency" />
        </StatRow>
      </div>

      {guide}

      <Section title="Sessions" footnote={`Each row shows the ${metric.name} of that session.`}>
        <List>
          {[...series].reverse().map((p) => (
            <ListRow key={p.workoutId}
              title={<span class="pg-tabular" data-testid={`session-${p.workoutId}`}>{weekdayDate(p.t)}</span>}
              value={`${metric.format(metric.get(p))} kg`}
              chevron onClick={() => nav.push(WorkoutDetailPage, { id: p.workoutId })}>
              <Sets exercise={exercise} sets={setsOf(p.workoutId)} />
            </ListRow>
          ))}
        </List>
      </Section>
    </Screen>
  );
}
