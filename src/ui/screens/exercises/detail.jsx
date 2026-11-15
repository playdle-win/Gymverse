// One exercise: the movement, the muscles, how to do it, your numbers, and what your gym adds to it.
import { useState } from 'preact/hooks';
import {
  useStore, exerciseSeries, bestSet, exerciseMultiplier, selMultipliers, selFocusOffer,
} from '../../../core/index.js';
import { exerciseById, ExerciseAnim, MuscleFigure, MUSCLE_LABEL, EQUIPMENT_LABEL } from '../../../exercises/index.js';
import {
  Screen, Section, List, ListRow, Card, Stat, StatRow, IconButton, Button, Badge, nav, usePage, useMediaQuery,
} from '../../system/index.js';
import { timeAgo, formatKg } from '../shared/index.jsx';
import { ExerciseProgressPage } from '../progress/exercise.jsx';
import { setParts, mult, listWords } from '../progress/format.js';

const lowerNames = (muscles) => listWords(muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()));

/** A legend key in the exact tone the muscle figure paints with. tone: 'pri' | 'sec'. */
function ToneKey({ tone }) {
  return <svg class="gbx ex-key" width="12" height="12" aria-hidden="true"><rect class={`gbx-${tone}`} width="12" height="12" /></svg>;
}

function Hero({ id }) {
  const page = usePage();
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [playing, setPlaying] = useState(true);
  return (
    <Card padded={false} class="ex-hero">
      <ExerciseAnim id={id} size={264} playing={playing && page.active} />
      {!still && (
        <span class="ex-hero__control">
          <IconButton icon={playing ? 'pause' : 'play'} weight="fill" variant="quiet" label={playing ? 'Pause animation' : 'Play animation'}
            data-testid="exercise-playpause" onClick={() => setPlaying(!playing)} />
        </span>
      )}
    </Card>
  );
}

function Muscles({ exercise }) {
  return (
    <Section title="Muscles">
      <div class="ex-muscles">
        <MuscleFigure primary={exercise.primary} secondary={exercise.secondary} size={196} />
        <dl class="ex-muscles__names">
          <div>
            <dt class="t-foot c-2"><ToneKey tone="pri" />Primary</dt>
            <dd class="t-headline">{exercise.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</dd>
          </div>
          {exercise.secondary.length > 0 && (
            <div>
              <dt class="t-foot c-2"><ToneKey tone="sec" />Secondary</dt>
              <dd class="t-headline">{exercise.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt class="t-foot c-2">Equipment</dt>
            <dd class="t-headline">{EQUIPMENT_LABEL[exercise.equipment]}</dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}

function YourNumbers({ exercise }) {
  const workouts = useStore((s) => s.workouts);
  const bodyKg = useStore((s) => s.settings.bodyKg);
  const series = exerciseSeries(workouts, exercise.id, bodyKg);
  if (!series.length) {
    return (
      <Section title="Your numbers">
        <p class="t-body c-2">You have not logged {exercise.name} yet. Add it to a workout and your best set, estimated 1RM and history show up here.</p>
        <div><Button variant="secondary" size="m" onClick={() => nav.select('train')}>Go to Train</Button></div>
      </Section>
    );
  }
  const best = bestSet(workouts, exercise.id, bodyKg);
  const latest = series[series.length - 1];
  return (
    <Section title="Your numbers">
      <div class="pg-stats">
        <StatRow>
          <Stat {...setParts(exercise, best)} label="Best set" />
          <Stat value={formatKg(latest.est1RM)} unit="kg" label="Estimated 1RM" />
        </StatRow>
        <StatRow>
          <Stat value={timeAgo(latest.t)} label="Last performed" />
          <Stat value={series.length} label={series.length === 1 ? 'Session' : 'Sessions'} />
        </StatRow>
      </div>
      <List>
        <ListRow icon="trend-up" title={<span data-testid="exercise-progress-link">Progress over time</span>} chevron
          onClick={() => nav.push(ExerciseProgressPage, { id: exercise.id })} />
      </List>
    </Section>
  );
}

function InYourGym({ exercise }) {
  useStore((s) => s.gym);
  useStore((s) => s.workouts);
  useStore((s) => s.settings.timeOffsetMs);
  const multipliers = selMultipliers();
  const value = Math.round(exerciseMultiplier(exercise, multipliers.byMuscle) * 100) / 100;
  const offer = selFocusOffer();
  const focused = offer && offer.exerciseIds.includes(exercise.id);
  const muscles = [...exercise.primary, ...exercise.secondary];
  const dusty = multipliers.dustPenalty > 0;
  const source = dusty && value < 1 ? 'in your dusty gym' : multipliers.vibe > 0 ? 'from your equipment and decor' : 'from your equipment';
  return (
    <Section title="In your gym" action={{ label: 'Open gym', onClick: () => nav.select('gym') }}>
      <div class="ex-gym">
        <div class="ex-gym__value" data-testid="exercise-multiplier">
          <span class="t-num t-num-l">{mult(value)}</span>
          <span class="t-callout c-2">{value === 1 ? 'no bonus yet' : source}</span>
        </div>
        <p class="t-body">
          {value > 1 && `Points you earn on ${exercise.name} are multiplied by ${value.toFixed(2)}. `}
          {value < 1 && `Points you earn on ${exercise.name} are cut to ${value.toFixed(2)} of normal. `}
          Equipment for {lowerNames(muscles)} raises this{exercise.secondary.length ? ', with primary muscles counting double' : ''}.
          {dusty && ` Dust is taking ${multipliers.dustPenalty.toFixed(2)} off every muscle until your next workout.`}
        </p>
      </div>
      <dl class="pg-facts">
        {muscles.map((m) => (
          <div key={m} class="pg-fact">
            <dt class="t-callout">{MUSCLE_LABEL[m]}<span class="c-2">, {exercise.primary.includes(m) ? 'primary' : 'secondary'}</span></dt>
            <dd class="pg-fact__value"><span class="t-headline pg-tabular">{mult(multipliers.byMuscle[m])}</span></dd>
          </div>
        ))}
      </dl>
      {focused && (
        <div class="pg-callout" data-testid="exercise-focus">
          <div class="pg-callout__head">
            <h3 class="t-headline">Focus offer on {MUSCLE_LABEL[offer.muscle].toLowerCase()}</h3>
            <Badge tone="points" icon="lightning">x{offer.mult}</Badge>
          </div>
          <p class="t-callout c-2">{offer.reason}. This exercise earns x{offer.mult} points in your next workout, on top of the gym multiplier.</p>
        </div>
      )}
    </Section>
  );
}

/** Pushed page for one exercise. props: { id } (exercise id). */
export function ExerciseDetailPage({ id }) {
  const exercise = exerciseById(id);
  return (
    <Screen title={exercise.name} large>
      <div class="ex-intro">
        <Hero id={id} />
        <p class="t-body">{exercise.summary}</p>
      </div>
      <Muscles exercise={exercise} />
      <Section title="How to do it">
        <ol class="ex-cues">
          {exercise.cues.map((cue, i) => (
            <li key={cue} class="ex-cues__item">
              <span class="t-num t-num-m c-3" aria-hidden="true">{i + 1}</span>
              <span class="t-body">{cue}</span>
            </li>
          ))}
        </ol>
      </Section>
      <YourNumbers exercise={exercise} />
      <InYourGym exercise={exercise} />
    </Screen>
  );
}
