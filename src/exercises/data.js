// Exercise metadata. PURE DATA (no DOM, no Preact) so the core engine and Node tests can import it.
// ids are FROZEN. The exercise-art agent may add fields (cues, description) but not rename ids or muscles.
export const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];

export const MUSCLE_LABEL = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  core: 'Core', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
};

export const EQUIPMENT_LABEL = { barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Cable', machine: 'Machine', bodyweight: 'Bodyweight' };

// bodyweight: true -> load for volume/points = bodyKg * bwFactor + added kg (the kg field is "added weight").
export const EXERCISES = [
  { id: 'bench-press',    name: 'Bench Press',        equipment: 'barbell',    primary: ['chest'],              secondary: ['triceps', 'shoulders'] },
  { id: 'back-squat',     name: 'Back Squat',         equipment: 'barbell',    primary: ['quads', 'glutes'],    secondary: ['hamstrings', 'core'] },
  { id: 'deadlift',       name: 'Deadlift',           equipment: 'barbell',    primary: ['hamstrings', 'back'], secondary: ['glutes', 'core'] },
  { id: 'overhead-press', name: 'Overhead Press',     equipment: 'barbell',    primary: ['shoulders'],          secondary: ['triceps', 'core'] },
  { id: 'pull-up',        name: 'Pull-Up',            equipment: 'bodyweight', primary: ['back'],               secondary: ['biceps'], bodyweight: true, bwFactor: 1 },
  { id: 'dumbbell-row',   name: 'Dumbbell Row',       equipment: 'dumbbell',   primary: ['back'],               secondary: ['biceps', 'shoulders'] },
  { id: 'dumbbell-curl',  name: 'Dumbbell Curl',      equipment: 'dumbbell',   primary: ['biceps'],             secondary: [] },
  { id: 'cable-pushdown', name: 'Triceps Pushdown',   equipment: 'cable',      primary: ['triceps'],            secondary: [] },
  { id: 'leg-press',      name: 'Leg Press',          equipment: 'machine',    primary: ['quads'],              secondary: ['glutes', 'calves'] },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', equipment: 'bodyweight', primary: ['core'],             secondary: [], bodyweight: true, bwFactor: 0.35 },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);
