// Small read-only pieces shared by the workout screens.
import { exerciseById } from '../../../exercises/index.js';
import { Badge, Points, PointsGlyph, List, ListRow } from '../../system/index.js';
import { formatKg } from '../shared/index.jsx';
import { SET_TYPE_INFO, formatSet } from './lib.js';

const TYPE_TONE = { normal: 'neutral', warmup: 'warn', drop: 'neutral', super: 'neutral' };

/** The mark of a set: its number, or W, D, S. Drop sets and supersets are filled so they read apart from numbers. */
export function SetBadge({ type, mark }) {
  return <Badge tone={TYPE_TONE[type]} solid={type === 'drop' || type === 'super'}>{mark}</Badge>;
}

/** The x1.5 marker on anything the focus offer pays extra for. */
export function FocusBadge({ mult }) {
  return <Badge tone="accent" solid icon="lightning">x{mult}</Badge>;
}

/** A points rate that may carry one decimal ("4.5"), drawn like Points. */
export function Rate({ value }) {
  return (
    <span class="gb-points gb-points--s wk-rate">
      <PointsGlyph size={14} />
      <span class="t-num">{formatKg(value)}</span>
      <span class="gb-sr">points</span>
    </span>
  );
}

/** The engine's breakdown, line by line, then the total. */
export function Breakdown({ points }) {
  return (
    <div class="wk-breakdown" data-testid="points-breakdown">
      {points.lines.map((line) => (
        <div key={line.key} class="wk-breakdown__line">
          <span class="t-body">{line.label}</span>
          <Points value={line.value} sign={line.key !== 'base'} />
        </div>
      ))}
      <div class="wk-breakdown__line wk-breakdown__total">
        <span class="t-headline">Total</span>
        <Points value={points.total} size="l" />
      </div>
    </div>
  );
}

/** Records set in one workout. records: entries of prList(). */
export function RecordList({ records }) {
  return (
    <List>
      {records.map((record) => {
        const exercise = exerciseById(record.exId);
        return (
          <ListRow
            key={record.exId} icon="trophy" title={exercise.name}
            subtitle={`${formatSet(exercise, record)}, estimated one-rep max ${formatKg(record.est1RM)} kg`}
            trailing={<Badge tone="points" solid>PR</Badge>}
          />
        );
      })}
    </List>
  );
}

/** The sets of one logged exercise as a small table: mark, load x reps. */
export function SetLog({ exercise, sets, marks }) {
  return (
    <ol class="wk-log__sets">
      {sets.map((set, i) => (
        <li key={i} class="wk-log__set">
          <SetBadge type={set.type} mark={marks[i]} />
          <span class="t-body wk-tnum">{formatSet(exercise, set)}</span>
          {set.type !== 'normal' && <span class="t-foot c-2">{SET_TYPE_INFO[set.type].label}</span>}
        </li>
      ))}
    </ol>
  );
}
