// Progress tab: summary first (period totals, consistency, balance), detail after (records, exercises, history).
import { useMemo, useState } from 'preact/hooks';
import {
  useStore, now, WEEK, TUNING, consistency, weeklyStats, weeklyStreak, muscleBalance, prList, exerciseSeries,
  workoutVolume, workoutMinutes, selPassive, selMultipliers, selFocusOffer,
} from '../../../core/index.js';
import { EXERCISES, MUSCLE_LABEL, exerciseById, ExerciseIcon, MuscleFigure } from '../../../exercises/index.js';
import {
  Screen, Section, List, ListRow, Stat, StatRow, Segmented, Points, PointsGlyph, Badge, Button, EmptyState, Icon,
  nav, formatInt, cx,
} from '../../system/index.js';
import { shortDate, formatMinutes } from '../shared/index.jsx';
import { WorkoutDetailPage } from '../workout/detail.jsx';
import { PERIODS, periodById, periodStart, periodDays, kg, signedKg, percent, setLabel, listWords } from './format.js';
import { WeekBars, Sparkline } from './charts.jsx';
import { ExerciseProgressPage } from './exercise.jsx';

export { ExerciseProgressPage };

const RECORDS_SHOWN = 5;

/** A passive income rate with the coin. */
function Rate({ value }) {
  return (
    <span class="pg-rate">
      <PointsGlyph size={15} />
      <span class="t-strong">{value}</span><span class="gb-sr"> points</span>
    </span>
  );
}

function Duration({ minutes }) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return (
    <>
      {h > 0 && <>{h}<span class="gb-stat__unit">h</span></>}
      {(m > 0 || h === 0) && <>{h > 0 && ' '}{m}<span class="gb-stat__unit">min</span></>}
    </>
  );
}

const sumPeriod = (workouts, bodyKg) => ({
  workouts: workouts.length,
  volume: workouts.reduce((v, w) => v + workoutVolume(w, bodyKg), 0),
  minutes: workouts.reduce((m, w) => m + workoutMinutes(w), 0),
});

function Overview({ workouts, bodyKg, period, t }) {
  const start = periodStart(period, t);
  const current = sumPeriod(workouts.filter((w) => w.endedAt >= start), bodyKg);
  const before = period.weeks ? sumPeriod(workouts.filter((w) => w.endedAt < start && w.endedAt >= start - period.weeks * WEEK), bodyKg) : null;
  // Only compare when the history reaches back over the whole earlier window; a half-empty window flatters the change.
  const compared = before && workouts[0].endedAt <= start - period.weeks * WEEK;
  const more = current.workouts - (compared ? before.workouts : 0);
  const volumeChange = compared && before.volume > 0 ? Math.round((current.volume / before.volume - 1) * 100) : 0;
  const delta = (n, suffix = '') => (compared && n !== 0 ? { text: `${n > 0 ? '+' : '-'}${Math.abs(n)}${suffix}`, tone: n > 0 ? 'good' : undefined } : undefined);
  const streak = weeklyStreak(workouts, t);
  return (
    <div class="pg-overview">
      <div data-testid="progress-period">
        <Segmented label="Period" options={PERIODS.map(({ value, label }) => ({ value, label }))} value={period.value} onChange={period.onChange} />
      </div>
      <div class="pg-stats">
        <StatRow>
          <Stat value={current.workouts} label="Workouts" delta={delta(more)} />
          <Stat value={formatInt(current.volume)} unit="kg" label="Volume" delta={delta(volumeChange, '%')} />
        </StatRow>
        <StatRow>
          <Stat value={<Duration minutes={current.minutes} />} label="Time trained" />
          <Stat value={streak} unit={streak === 1 ? 'week' : 'weeks'} label="Weekly streak" />
        </StatRow>
      </div>
      {compared && (more !== 0 || volumeChange !== 0) && <p class="t-foot c-2">Changes compare with the {period.weeks} weeks before.</p>}
    </div>
  );
}

function Fact({ label, have, need }) {
  const met = have >= need;
  return (
    <div class="pg-fact">
      <dt class="t-callout">{label}</dt>
      <dd class="pg-fact__value">
        {met && <Icon class="c-good" name="check-circle" weight="fill" size={18} label="Met" />}
        <span class="t-headline pg-tabular">{have}</span>
        <span class="t-foot c-2 pg-tabular">needs {need}</span>
      </dd>
    </div>
  );
}

function Consistency({ workouts, bodyKg, t }) {
  const [picked, setPicked] = useState(null);
  const state = consistency(workouts, t);
  const weeks = weeklyStats(workouts, t, TUNING.consistencyWeeks, bodyKg);
  const levels = TUNING.consistencyLevels;
  const top = state.level === levels.length - 1;
  const target = levels[top ? state.level : state.level + 1];
  const rateAt = (level) => Math.round(TUNING.passivePerHour[level] * selMultipliers().average * 10) / 10;
  const earning = state.level >= TUNING.passiveMinLevel;
  const shown = picked ?? weeks.length - 1;
  const weekName = (i) => (i === weeks.length - 1 ? 'Last 7 days' : `Week from ${shortDate(weeks[i].start)}`);
  const weekText = (i) => `${weekName(i)}: ${weeks[i].workouts} ${weeks[i].workouts === 1 ? 'workout' : 'workouts'}`;
  const labels = weeks.map((w, i) => (i === weeks.length - 1 ? 'Last 7 days' : i % 2 ? shortDate(w.start) : ''));
  const activeWeeks = weeks.filter((w) => w.workouts >= TUNING.activeWeekMin).length;
  return (
    <Section title="Consistency">
      <div class="pg-level">
        <ol class="pg-levels" aria-label={`Consistency level ${state.level + 1} of ${levels.length}: ${state.label}`}>
          {levels.map((level, i) => (
            <li key={level.label} class={cx('pg-levels__step', i <= state.level && 'is-reached', i === state.level && 'is-current')}>
              <span class="pg-levels__bar" />
              <span class="t-caption">{level.label}</span>
            </li>
          ))}
        </ol>
        <p class="t-body">
          {earning
            ? <>You are <strong class="t-strong">{state.label.toLowerCase()}</strong>. Your character trains while you are away and earns <Rate value={selPassive().ratePerHour} /> an hour, for up to {TUNING.passiveCapHours} hours at a time.</>
            : <>{state.level ? 'You are ' : 'Consistency is '}<strong class="t-strong">{state.label.toLowerCase()}</strong>. Your character starts training on its own, and earning points while you are away, once you are consistent.</>}
        </p>
      </div>
      <div class="pg-plot">
        <div class="pg-plot__head">
          <span class="t-headline pg-tabular">{weeks[shown].workouts} {weeks[shown].workouts === 1 ? 'workout' : 'workouts'}</span>
          <span class="t-foot c-2">{weekName(shown)}</span>
        </div>
        <WeekBars weeks={weeks} labels={labels} threshold={TUNING.activeWeekMin} selected={picked} onSelect={setPicked}
          summary={`Workouts per week over the last ${weeks.length} weeks, oldest first: ${weeks.map((w) => w.workouts).join(', ')}. ${activeWeeks} of ${weeks.length} were active weeks with at least ${TUNING.activeWeekMin} workouts.`}
          valueText={weekText} />
        <p class="pg-key t-foot c-2">
          <svg class="pg-key__line" width="18" height="8" aria-hidden="true"><line class="pg-chart__threshold" x1="0" x2="18" y1="4.5" y2="4.5" /></svg>
          An active week has {TUNING.activeWeekMin} or more workouts
        </p>
      </div>
      <div class="pg-next">
        <h3 class="t-headline">{top ? `Holding ${state.label.toLowerCase()}` : `Next level: ${target.label}`}</h3>
        <p class="t-callout c-2">
          {top && 'This is the highest level. It lasts while you keep both of these up.'}
          {!top && state.level + 1 >= TUNING.passiveMinLevel && <>{earning ? 'It raises' : 'It starts'} passive income {earning ? 'to' : 'at'} <Rate value={rateAt(state.level + 1)} /> an hour.</>}
          {!top && state.level + 1 < TUNING.passiveMinLevel && 'The step before consistent, where passive income starts.'}
        </p>
        <dl class="pg-facts">
          <Fact label="Workouts in the last 14 days" have={state.workouts14} need={target.workouts14} />
          {target.weeksActive > 0 && <Fact label="Active weeks in a row" have={state.weeksActive} need={target.weeksActive} />}
        </dl>
      </div>
    </Section>
  );
}

const hasPrimaryExercise = (muscle) => EXERCISES.some((e) => e.primary.includes(muscle));

function Balance({ workouts, period, t }) {
  const balance = muscleBalance(workouts, t, periodDays(period, workouts, t));
  const ranked = [...balance].sort((a, b) => b.share - a.share);
  const peak = ranked[0].share;
  const heat = Object.fromEntries(balance.map((b) => [b.muscle, peak ? b.share / peak : 0]));
  // Only muscles an exercise trains first can be called neglected: the others cannot be picked on purpose.
  const least = [...ranked].reverse().find((b) => hasPrimaryExercise(b.muscle));
  const offer = selFocusOffer();
  const offered = offer && offer.muscle === least.muscle;
  const offerLine = offer && `${offer.reason}. ${listWords(offer.exerciseIds.map((id) => exerciseById(id).name))} earn x${offer.mult} points in your next workout.`;
  return (
    <Section title="Muscle balance">
      <p class="t-callout c-2">Share of your working sets in {period.phrase}. A set counts fully for its primary muscles and half for secondary ones.</p>
      <div class="pg-balance">
        <MuscleFigure values={heat} size={184} />
        <ol class="pg-rank">
          {ranked.map((b) => (
            <li key={b.muscle} class="pg-rank__row">
              <span class="t-foot">{MUSCLE_LABEL[b.muscle]}</span>
              <span class="pg-rank__track">{b.share > 0 && <span class="pg-rank__bar" style={{ width: `${(b.share / peak) * 100}%` }} />}</span>
              <span class="t-foot c-2 pg-tabular">{percent(b.share)}</span>
            </li>
          ))}
        </ol>
      </div>
      {peak > 0 && (
        <div class="pg-callout" data-testid="balance-callout">
          <div class="pg-callout__head">
            <h3 class="t-headline">Least trained: {MUSCLE_LABEL[least.muscle]}</h3>
            {offered && <Badge tone="points" icon="lightning">x{offer.mult}</Badge>}
          </div>
          <p class="t-callout c-2">
            {offered ? offerLine : `${MUSCLE_LABEL[least.muscle]} got ${percent(least.share)} of your sets in ${period.phrase}.`}
          </p>
        </div>
      )}
      {offer && !offered && (
        <div class="pg-callout" data-testid="balance-offer">
          <div class="pg-callout__head">
            <h3 class="t-headline">Focus offer: {MUSCLE_LABEL[offer.muscle]}</h3>
            <Badge tone="points" icon="lightning">x{offer.mult}</Badge>
          </div>
          <p class="t-callout c-2">{offerLine}</p>
        </div>
      )}
    </Section>
  );
}

function RecordRow({ record }) {
  const exercise = exerciseById(record.exId);
  return (
    <ListRow
      leading={<ExerciseIcon id={record.exId} size={44} />}
      title={<span data-testid={`record-${record.exId}`}>{exercise.name}</span>}
      subtitle={`${setLabel(exercise, record)} on ${shortDate(record.t)}`}
      trailing={(
        <span class="pg-figure">
          <span class="t-body pg-tabular">{kg(record.est1RM)}</span>
          <span class="t-foot c-good pg-tabular">{signedKg(record.est1RM - record.previous) || 'New best'}</span>
        </span>
      )}
      chevron onClick={() => nav.push(ExerciseProgressPage, { id: record.exId })}
    />
  );
}

const RECORDS_NOTE = 'A record is a new best estimated 1RM. The gain is measured against your previous best.';

/** Every record of the period, pushed from the Records section. props: { periodId } */
export function RecordsPage({ periodId }) {
  const workouts = useStore((s) => s.workouts);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const period = periodById(periodId);
  const records = prList(workouts, bodyKg).filter((r) => r.t >= periodStart(period, now()));
  return (
    <Screen title="Records">
      <Section footnote={RECORDS_NOTE}>
        <p class="t-callout c-2">{records.length} {records.length === 1 ? 'record' : 'records'} in {period.phrase}, newest first.</p>
        <List>{records.map((r) => <RecordRow key={r.exId + r.t} record={r} />)}</List>
      </Section>
    </Screen>
  );
}

function Records({ workouts, bodyKg, period, t }) {
  const records = prList(workouts, bodyKg).filter((r) => r.t >= periodStart(period, t));
  const more = records.length > RECORDS_SHOWN;
  return (
    <Section title="Records" footnote={records.length ? RECORDS_NOTE : undefined}
      action={more ? { label: `See all ${records.length}`, onClick: () => nav.push(RecordsPage, { periodId: period.value }) } : undefined}>
      {records.length
        ? <List>{records.slice(0, RECORDS_SHOWN).map((r) => <RecordRow key={r.exId + r.t} record={r} />)}</List>
        : <p class="t-callout c-2">No new records in {period.phrase}. Beat your best estimated 1RM on any exercise and it lands here.</p>}
    </Section>
  );
}

/** One row per logged exercise: where its estimated 1RM stands and how it moved over the period. */
function exerciseTrends(workouts, bodyKg, start) {
  return EXERCISES.map((exercise) => {
    const series = exerciseSeries(workouts, exercise.id, bodyKg);
    if (!series.length) return null;
    const inPeriod = series.filter((p) => p.t >= start);
    const before = series.filter((p) => p.t < start);
    const points = [...before.slice(-1), ...inPeriod];
    const latest = series[series.length - 1];
    return {
      exercise, latest, sessions: inPeriod.length,
      spark: points.map((p) => p.est1RM),
      change: inPeriod.length && points.length > 1 ? latest.est1RM - points[0].est1RM : null,
    };
  }).filter(Boolean).sort((a, b) => b.latest.t - a.latest.t);
}

function ExerciseTrends({ workouts, bodyKg, period, t }) {
  const trends = exerciseTrends(workouts, bodyKg, periodStart(period, t));
  const changeText = (trend) => {
    if (!trend.sessions) return 'No workouts';
    if (trend.change === null) return 'First workout';
    return signedKg(trend.change) || 'No change';
  };
  return (
    <Section title="Exercises" footnote={`Estimated 1RM from your latest workout, with its change over ${period.phrase}.`}>
      <List>
        {trends.map((trend) => (
          <ListRow key={trend.exercise.id}
            leading={<ExerciseIcon id={trend.exercise.id} size={44} />}
            title={<span data-testid={`exercise-progress-${trend.exercise.id}`}>{trend.exercise.name}</span>}
            subtitle={`Est. 1RM ${kg(trend.latest.est1RM)}`}
            trailing={(
              <span class="pg-figure">
                {trend.sessions > 0 && <Sparkline values={trend.spark} />}
                <span class={cx('t-foot pg-tabular', trend.change > 0.05 ? 'c-good' : 'c-2')}>{changeText(trend)}</span>
              </span>
            )}
            chevron onClick={() => nav.push(ExerciseProgressPage, { id: trend.exercise.id })}
          />
        ))}
      </List>
    </Section>
  );
}

/** Finished workouts of the period, newest first, in the same trailing 7-day blocks the consistency chart uses. */
function historyWeeks(workouts, start, t) {
  const weeks = [];
  for (const workout of [...workouts].reverse()) {
    if (workout.endedAt < start) break;
    const index = Math.floor((t - workout.endedAt) / WEEK);
    const last = weeks[weeks.length - 1];
    if (last && last.index === index) last.workouts.push(workout);
    else weeks.push({ index, start: t - (index + 1) * WEEK, workouts: [workout] });
  }
  return weeks;
}

function History({ workouts, bodyKg, period, t }) {
  const weeks = historyWeeks(workouts, periodStart(period, t), t);
  return (
    <Section title="History">
      {!weeks.length && <p class="t-callout c-2">No workouts in {period.phrase}.</p>}
      {weeks.map((week) => (
        <div key={week.index} class="pg-week">
          <div class="pg-week__head">
            <h3 class="t-headline">{week.index === 0 ? 'Last 7 days' : `Week from ${shortDate(week.start)}`}</h3>
            <span class="t-foot c-2">{week.workouts.length} {week.workouts.length === 1 ? 'workout' : 'workouts'}</span>
          </div>
          <List>
            {week.workouts.map((w) => {
              const date = new Date(w.endedAt);
              return (
                <ListRow key={w.id}
                  leading={(
                    <span class="pg-date">
                      <span class="gb-sr">{shortDate(w.endedAt)}</span>
                      <span class="t-num t-num-m" aria-hidden="true">{date.getDate()}</span>
                      <span class="t-caption c-2" aria-hidden="true">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
                    </span>
                  )}
                  title={<span data-testid={`history-${w.id}`}>{w.name}</span>}
                  subtitle={`${formatMinutes(workoutMinutes(w))} · ${formatInt(workoutVolume(w, bodyKg))} kg`}
                  trailing={<Points value={w.points ? w.points.total : 0} size="s" />}
                  chevron onClick={() => nav.push(WorkoutDetailPage, { id: w.id })}
                />
              );
            })}
          </List>
        </div>
      ))}
    </Section>
  );
}

export function ProgressScreen() {
  const workouts = useStore((s) => s.workouts);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const offset = useStore((s) => s.settings.timeOffsetMs);
  const gym = useStore((s) => s.gym);
  const [periodId, setPeriodId] = useState('4w');
  const t = useMemo(() => now(), [workouts, offset, gym]);
  if (!workouts.length) {
    return (
      <Screen title="Progress">
        <EmptyState icon="chart-bar" title="Nothing to chart yet"
          text="Finish a workout and your totals, records and history start building here."
          action={<Button variant="secondary" onClick={() => nav.select('train')}>Go to Train</Button>} />
      </Screen>
    );
  }
  const period = { ...periodById(periodId), onChange: setPeriodId };
  const shared = { workouts, bodyKg, period, t };
  return (
    <Screen title="Progress">
      <Overview {...shared} />
      <Consistency {...shared} />
      <Balance {...shared} />
      <Records {...shared} />
      <ExerciseTrends {...shared} />
      <History {...shared} />
    </Screen>
  );
}
