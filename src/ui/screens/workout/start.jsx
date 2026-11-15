// The top of Home and Train: start a workout, or pick up the one in progress.
import { useStore } from '../../../core/index.js';
import { Button } from '../../system/index.js';
import { formatClock } from '../shared/index.jsx';
import { useNow, countSets, countDone, plural } from './lib.js';
import { openSession, startAndOpen } from './session.jsx';

function Resume({ active }) {
  const t = useNow(1000);
  const total = countSets(active.exercises), done = countDone(active.exercises);
  return (
    <div class="wk-start" data-testid="resume">
      <div class="wk-resume">
        <div class="wk-grow">
          <p class="t-headline t-truncate">{active.name}</p>
          <p class="t-foot c-2">{total ? `In progress, ${done} of ${plural(total, 'set')} done` : 'In progress, no exercises yet'}</p>
        </div>
        <span class="t-num t-num-l" role="timer" aria-label="Elapsed time">{formatClock(t - active.startedAt)}</span>
      </div>
      <Button block icon="play" onClick={openSession} data-testid="resume-workout">Resume workout</Button>
    </div>
  );
}

/** children: extra start actions shown under the primary button (Home adds routine and friends). */
export function StartBlock({ children }) {
  const active = useStore((s) => s.active);
  if (active) return <Resume active={active} />;
  return (
    <div class="wk-start">
      <Button block icon="play" onClick={() => startAndOpen()} data-testid="start-empty">Start empty workout</Button>
      {children}
    </div>
  );
}
