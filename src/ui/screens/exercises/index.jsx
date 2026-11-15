// Exercises tab: the library. Search, two filter rows (muscle, equipment), a result count, the list.
import { useState } from 'preact/hooks';
import { EXERCISES, MUSCLES, MUSCLE_LABEL, EQUIPMENT_LABEL, ExerciseIcon } from '../../../exercises/index.js';
import { Screen, List, ListRow, TextField, FilterChips, Button, EmptyState, nav } from '../../system/index.js';
import { ExerciseDetailPage } from './detail.jsx';

const SORTED = [...EXERCISES].sort((a, b) => a.name.localeCompare(b.name));
const MUSCLE_OPTIONS = MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }));
const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABEL).map(([value, label]) => ({ value, label }));

/** "Quads, glutes": sentence case for a list of muscle names. */
export const muscleNames = (muscles) => muscles.map((m, i) => (i ? MUSCLE_LABEL[m].toLowerCase() : MUSCLE_LABEL[m])).join(', ');

function matches(exercise, query, muscle, equipment) {
  if (muscle && !exercise.primary.includes(muscle) && !exercise.secondary.includes(muscle)) return false;
  if (equipment && exercise.equipment !== equipment) return false;
  if (!query) return true;
  const haystack = [exercise.name, EQUIPMENT_LABEL[exercise.equipment], ...exercise.primary.concat(exercise.secondary).map((m) => MUSCLE_LABEL[m])].join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const query = search.trim().toLowerCase();
  const filtered = Boolean(query || muscle || equipment);
  // With a muscle picked, exercises that train it first come before the ones that only assist.
  const results = SORTED.filter((e) => matches(e, query, muscle, equipment))
    .sort((a, b) => (muscle ? b.primary.includes(muscle) - a.primary.includes(muscle) : 0));
  const clear = () => { setSearch(''); setMuscle(null); setEquipment(null); };
  return (
    <Screen title="Exercises">
      <div class="ex-find">
        <div data-testid="exercise-search">
          <TextField label="Search exercises" hideLabel icon="magnifying-glass" type="search" placeholder="Name, muscle or equipment"
            value={search} onInput={setSearch} enterkeyhint="search" autocapitalize="off" autocomplete="off" spellcheck={false} />
        </div>
        <div data-testid="exercise-filter-muscle">
          <FilterChips label="Muscle group" options={MUSCLE_OPTIONS} value={muscle} onChange={(v) => setMuscle(v === muscle ? null : v)} />
        </div>
        <div data-testid="exercise-filter-equipment">
          <FilterChips label="Equipment" options={EQUIPMENT_OPTIONS} value={equipment} onChange={(v) => setEquipment(v === equipment ? null : v)} />
        </div>
      </div>
      <div class="ex-results">
        <div class="ex-results__head">
          <p class="t-foot c-2" role="status" data-testid="exercise-count">
            {filtered ? `${results.length} of ${EXERCISES.length} exercises` : `${EXERCISES.length} exercises`}
          </p>
          {filtered && results.length > 0 && <Button variant="plain" size="s" onClick={clear}>Clear filters</Button>}
        </div>
        {results.length ? (
          <List>
            {results.map((e) => (
              <ListRow key={e.id}
                leading={<ExerciseIcon id={e.id} size={48} />}
                title={<span data-testid={`exercise-${e.id}`}>{e.name}</span>}
                subtitle={`${muscleNames(e.primary)} · ${EQUIPMENT_LABEL[e.equipment]}`}
                chevron onClick={() => nav.push(ExerciseDetailPage, { id: e.id })}
              />
            ))}
          </List>
        ) : (
          <EmptyState icon="magnifying-glass" title="No exercises match"
            text="Try a different word, or drop a filter to widen the list."
            action={<Button variant="secondary" onClick={clear} data-testid="exercise-clear">Clear filters</Button>} />
        )}
      </div>
    </Screen>
  );
}
