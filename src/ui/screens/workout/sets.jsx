// The editable set row and the set-type sheet, used by the session and by the routine editor.
import { SET_TYPES } from '../../../core/index.js';
import { NumberField, Sheet, List, ListRow } from '../../system/index.js';
import { SET_TYPE_INFO } from './lib.js';
import { SetBadge } from './parts.jsx';

/** Column titles for a list of SetRows. `done` adds the tick column. */
export function SetColumns({ bodyweight, done = false }) {
  return (
    <div class="wk-sets__cols t-caption c-3" aria-hidden="true">
      <span>Set</span>
      <span>{bodyweight ? 'Added weight' : 'Weight'}</span>
      <span>Reps</span>
      {done && <span>Done</span>}
    </div>
  );
}

/**
 * One set: type mark (opens the type sheet), kg, reps, and an optional trailing control (the done tick).
 * onChange receives { kg } or { reps }; an emptied field counts as 0.
 */
export function SetRow({ set, mark, index, done = false, fresh = false, onType, onChange, trailing }) {
  const n = index + 1;
  return (
    <div class="wk-set" data-done={done ? 'true' : undefined} data-fresh={fresh ? 'true' : undefined} data-testid="set-row">
      <button type="button" class="wk-set__type" onClick={onType} aria-label={`Set ${n}, ${SET_TYPE_INFO[set.type].label}. Change set type`} data-testid="set-type">
        <SetBadge type={set.type} mark={mark} />
      </button>
      <NumberField size="m" hideLabel label={`Set ${n} weight in kg`} unit="kg" decimal max={1000} value={set.kg} onChange={(kg) => onChange({ kg: kg === null ? 0 : kg })} />
      <NumberField size="m" hideLabel label={`Set ${n} reps`} max={200} value={set.reps} onChange={(reps) => onChange({ reps: reps === null ? 0 : reps })} />
      {trailing}
    </div>
  );
}

/** Pick the type of a set, or remove it. target: { set, index } (kept by the caller while the sheet closes). */
export function SetTypeSheet({ open, onClose, target, onPick, onRemove }) {
  const set = target ? target.set : null;
  const pick = (type) => { onPick(type); onClose(); };
  return (
    <Sheet open={open} onClose={onClose} title="Set type" detents={['auto']}>
      {set && (
        <div class="wk-stack">
          <List variant="plain" role="radiogroup" aria-label="Set type">
            {SET_TYPES.map((type) => (
              <ListRow
                key={type} role="radio" selected={set.type === type}
                leading={<SetBadge type={type} mark={SET_TYPE_INFO[type].mark || '1'} />}
                title={SET_TYPE_INFO[type].label} subtitle={SET_TYPE_INFO[type].text}
                onClick={() => pick(type)}
              />
            ))}
          </List>
          <List variant="plain">
            <ListRow icon="trash" tone="bad" title="Remove set" onClick={() => { onRemove(); onClose(); }} />
          </List>
        </div>
      )}
    </Sheet>
  );
}
