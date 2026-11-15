import { exerciseById } from './data.js';
import { MOVES } from './moves.jsx';
import { Stage } from './stage.jsx';

// Static key pose, drawn heavier and cropped tight so it reads at 40 to 56 px.
export function ExerciseIcon({ id, size = 44 }) {
  const move = MOVES[id];
  return <Stage move={move} t={move.icon.t} size={size} icon label={exerciseById(id).name} />;
}
