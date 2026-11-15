// The exercise picker: search, muscle filter, multi-select. Used by the session and the routine editor.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { EXERCISES, MUSCLES, MUSCLE_LABEL, EQUIPMENT_LABEL, ExerciseIcon } from '../../../exercises/index.js';
import { Sheet, TextField, FilterChips, List, ListRow, Button, EmptyState } from '../../system/index.js';
import { joinNames, plural } from './lib.js';
import { FocusBadge } from './parts.jsx';

const ALL = 'all';
const trains = (exercise, muscle) => exercise.primary.includes(muscle) || exercise.secondary.includes(muscle);
const MUSCLE_OPTIONS = [
  { value: ALL, label: 'All' },
  ...MUSCLES.filter((m) => EXERCISES.some((e) => trains(e, m))).map((m) => ({ value: m, label: MUSCLE_LABEL[m] })),
];

const matches = (exercise, query, muscle) => {
  const words = `${exercise.name} ${EQUIPMENT_LABEL[exercise.equipment]} ${exercise.primary.join(' ')}`.toLowerCase();
  return (muscle === ALL || trains(exercise, muscle)) && query.toLowerCase().split(/\s+/).every((word) => words.includes(word));
};

/**
 * props: open, onClose, onAdd(exIds in the order they were picked), focus (the offer, or null),
 * inUse (exercise ids already in the workout or routine).
 */
export function ExercisePicker({ open, onClose, onAdd, focus, inUse = [] }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState(ALL);
  const [picked, setPicked] = useState([]);
  useEffect(() => { if (open) { setQuery(''); setMuscle(ALL); setPicked([]); } }, [open]);
  const shown = useMemo(() => EXERCISES.filter((e) => matches(e, query.trim(), muscle)), [query, muscle]);
  const toggle = (id) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const add = () => { onAdd(picked); onClose(); };

  return (
    <Sheet open={open} onClose={onClose} title="Add exercises" detents={['large']}>
      <div class="wk-picker" data-testid="exercise-picker">
        <TextField
          hideLabel label="Search exercises" placeholder="Search exercises" icon="magnifying-glass" type="search"
          value={query} onInput={setQuery} enterkeyhint="search" autocapitalize="off" autocomplete="off"
        />
        <FilterChips label="Muscle group" options={MUSCLE_OPTIONS} value={muscle} onChange={setMuscle} />
        <div class="wk-picker__list gb-scroll">
          {shown.length ? (
            <List variant="plain">
              {shown.map((exercise) => {
                const on = picked.includes(exercise.id);
                const pays = focus && focus.exerciseIds.includes(exercise.id);
                const where = joinNames(exercise.primary.map((m, i) => (i ? MUSCLE_LABEL[m].toLowerCase() : MUSCLE_LABEL[m])));
                return (
                  <ListRow
                    key={exercise.id} leading={<ExerciseIcon id={exercise.id} size={44} />}
                    title={exercise.name} subtitle={inUse.includes(exercise.id) ? `${where}, already added` : where}
                    trailing={pays ? <FocusBadge mult={focus.mult} /> : null}
                    selected={on} onClick={() => toggle(exercise.id)}
                  >
                    <span class="gb-sr">{on ? 'Selected' : 'Not selected'}</span>
                  </ListRow>
                );
              })}
            </List>
          ) : (
            <EmptyState icon="magnifying-glass" title="No exercises match" text="Try another name, or show all muscle groups." />
          )}
        </div>
        <Button block disabled={!picked.length} onClick={add} data-testid="picker-add">
          {picked.length ? `Add ${plural(picked.length, 'exercise')}` : 'Select exercises to add'}
        </Button>
      </div>
    </Sheet>
  );
}
