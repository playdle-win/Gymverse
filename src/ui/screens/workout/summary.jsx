// What the finished workout earned and what it did to the game. Shown in the session cover.
import { useState } from 'preact/hooks';
import {
  useStore, TUNING, prList, workoutVolume, workoutMinutes, selConsistency, selPassive, routineFromWorkout,
} from '../../../core/index.js';
import { Screen, Section, List, ListRow, Button, Badge, Stat, StatRow, PointsGlyph, nav, toast, formatInt } from '../../system/index.js';
import { useCountUp, countSets, plural } from './lib.js';
import { Breakdown, RecordList, Rate } from './parts.jsx';

function GameEffects({ before }) {
  const level = selConsistency();
  const income = selPassive();
  const nextLevel = TUNING.consistencyLevels[level.level + 1];
  const streak = level.weeksActive > 0
    ? `${plural(level.weeksActive, 'active week')} in a row`
    : `${plural(level.workouts14, 'workout')} in the last 14 days`;
  return (
    <List>
      <ListRow
        icon="fire" title={level.label}
        subtitle={nextLevel ? `${streak}. Next level: ${nextLevel.label}` : `${streak}. This is the top level`}
        trailing={level.level > before.level ? <Badge tone="good" icon="arrow-up">Level up</Badge> : null}
      />
      {before.dust > 0 && <ListRow icon="broom" title="Dust cleared" subtitle="Your equipment pays in full again" />}
      {income.active && (
        <ListRow icon="coins" title="Passive income" subtitle="Your character trains while you are away" trailing={<span class="wk-inline"><Rate value={income.ratePerHour} /><span class="t-foot c-2">an hour</span></span>} />
      )}
    </List>
  );
}

/** props: workout (the finished Workout), before: { dust, level, fromRoutine } read just before finishing. */
export function Summary({ workout, before }) {
  const workouts = useStore((s) => s.workouts);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const [saved, setSaved] = useState(false);
  const shown = useCountUp(workout.points.total);
  const records = prList(workouts, bodyKg).filter((record) => record.workoutId === workout.id);

  const save = () => {
    const result = routineFromWorkout(workout.id);
    if (!result.ok) return;
    setSaved(true);
    toast(`Saved as the routine ${workout.name}`, { icon: 'check-circle' });
  };
  const toGym = () => { nav.select('gym'); nav.dismiss(); };

  return (
    <Screen
      title="Workout complete" large={false} class="wk-summary"
      footer={(
        <div class="wk-pair">
          <Button variant="secondary" block icon="storefront" onClick={toGym} data-testid="summary-gym">Go to my gym</Button>
          <Button block onClick={nav.dismiss} data-testid="summary-done">Done</Button>
        </div>
      )}
    >
      <div class="wk-hero" data-testid="summary">
        <p class="t-callout c-2">{workout.name}</p>
        <p class="wk-hero__points">
          <PointsGlyph size={44} />
          <span class="t-num wk-hero__num" aria-hidden="true" data-testid="summary-total">{formatInt(shown)}</span>
          <span class="gb-sr">{formatInt(workout.points.total)}</span>
        </p>
        <p class="t-foot c-2">Points earned</p>
      </div>
      <StatRow>
        <Stat value={workoutMinutes(workout)} unit="min" label="Duration" />
        <Stat value={formatInt(workoutVolume(workout, bodyKg))} unit="kg" label="Volume" />
        <Stat value={countSets(workout.exercises)} label="Sets" />
      </StatRow>
      <Section title="Where the points came from"><Breakdown points={workout.points} /></Section>
      {records.length > 0 && <Section title={records.length === 1 ? 'New record' : 'New records'}><RecordList records={records} /></Section>}
      <Section title="In your gym"><GameEffects before={before} /></Section>
      {!before.fromRoutine && (
        <Button variant="quiet" block icon={saved ? 'check' : 'list-bullets'} disabled={saved} onClick={save} data-testid="summary-save">
          {saved ? 'Saved to your routines' : 'Save as routine'}
        </Button>
      )}
    </Screen>
  );
}
