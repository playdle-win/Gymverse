// Registers one root component per tab. Owned by the manager; screen agents only edit their own area folder.
import { registerScreen } from '../system/index.js';
import { HomeScreen, TrainScreen } from './workout/index.jsx';
import { ProgressScreen } from './progress/index.jsx';
import { ExercisesScreen } from './exercises/index.jsx';
import { GymScreen } from './gym/index.jsx';

const screens = { home: HomeScreen, train: TrainScreen, gym: GymScreen, progress: ProgressScreen, exercises: ExercisesScreen };
for (const [tab, Component] of Object.entries(screens)) if (Component) registerScreen(tab, Component);
