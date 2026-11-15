import { useEffect, useRef, useState } from 'preact/hooks';
import { exerciseById } from './data.js';
import { MOVES } from './moves.jsx';
import { Stage, tintOf } from './stage.jsx';
import { onFrame, onFreeze, frozenPhase, stepRate } from './clock.js';

const REDUCED = '(prefers-reduced-motion: reduce)';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia(REDUCED).matches);
  useEffect(() => {
    const mq = matchMedia(REDUCED);
    const update = () => setReduced(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useOnScreen(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return visible;
}

function useFrozenPhase() {
  const [pinned, setPinned] = useState(frozenPhase);
  useEffect(() => onFreeze(setPinned), []);
  return pinned;
}

const STEP_PROBE_FRAMES = 30;

// Phase of the rep (0..1). Advances only while `run` is true and resumes where it stopped.
// The style's step rate is re-read from the element now and then so a style switch is picked up.
function usePhase(ref, seconds, run) {
  const elapsed = useRef(0);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    let fps = 0;
    let frames = 0;
    return onFrame((dt) => {
      if (frames++ % STEP_PROBE_FRAMES === 0) fps = stepRate(ref.current);
      elapsed.current = (elapsed.current + dt) % seconds;
      const shown = fps ? Math.floor(elapsed.current * fps) / fps : elapsed.current;
      setT(shown / seconds);
    });
  }, [run, seconds]);
  return t;
}

// Looping animation of one exercise. Pauses when off screen or when `playing` is false;
// with reduced motion it shows the mid-rep pose instead.
export function ExerciseAnim({ id, size = 240, playing = true }) {
  const move = MOVES[id];
  const ex = exerciseById(id);
  const root = useRef(null);
  const visible = useOnScreen(root);
  const reduced = useReducedMotion();
  const pinned = useFrozenPhase();
  const t = usePhase(root, move.seconds, playing && visible && !reduced && pinned === null);
  const phase = pinned ?? (reduced ? move.still : t);
  return <Stage move={move} t={phase} size={size} tint={tintOf(ex.primary, ex.secondary)} label={`${ex.name}, animated demonstration`} rootRef={root} />;
}
