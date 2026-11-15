// Exercise metadata. PURE DATA (no DOM, no Preact) so the core engine and Node tests can import it.
// ids are FROZEN. The exercise-art agent may add fields (cues, description) but not rename ids or muscles.
export const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];

export const MUSCLE_LABEL = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  core: 'Core', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
};

export const EQUIPMENT_LABEL = { barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Cable', machine: 'Machine', bodyweight: 'Bodyweight' };

// bodyweight: true -> load for volume/points = bodyKg * bwFactor + added kg (the kg field is "added weight").
// summary: one sentence, what it is and why to do it. cues: three coaching cues shown with the animation.
export const EXERCISES = [
  {
    id: 'bench-press', name: 'Bench Press', equipment: 'barbell', primary: ['chest'], secondary: ['triceps', 'shoulders'],
    summary: 'A barbell press from a flat bench that builds the chest, triceps and front of the shoulders.',
    cues: ['Pull your shoulder blades back and down', 'Lower the bar to your lower chest', 'Press until the bar is over your shoulders'],
  },
  {
    id: 'back-squat', name: 'Back Squat', equipment: 'barbell', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'],
    summary: 'A squat with the bar on your upper back that builds the legs and teaches you to brace under load.',
    cues: ['Keep the bar over mid-foot', 'Sit down until your thighs are level', 'Drive up through the whole foot'],
  },
  {
    id: 'deadlift', name: 'Deadlift', equipment: 'barbell', primary: ['hamstrings', 'back'], secondary: ['glutes', 'core'],
    summary: 'A barbell pull from the floor to standing that strengthens the whole back side of the body.',
    cues: ['Set the bar over mid-foot, shins close', 'Brace and keep your back flat', 'Push the floor away and stand tall'],
  },
  {
    id: 'overhead-press', name: 'Overhead Press', equipment: 'barbell', primary: ['shoulders'], secondary: ['triceps', 'core'],
    summary: 'A standing barbell press from the shoulders to overhead that builds the shoulders and a stable trunk.',
    cues: ['Squeeze your glutes and brace', 'Press the bar straight up, close to your face', 'Lock out with the bar over your shoulders'],
  },
  {
    id: 'pull-up', name: 'Pull-Up', equipment: 'bodyweight', primary: ['back'], secondary: ['biceps'], bodyweight: true, bwFactor: 1,
    summary: 'A bodyweight pull to a fixed bar that builds a wide, strong back and a solid grip.',
    cues: ['Start from a dead hang', 'Pull your elbows down to your ribs', 'Bring your chin over the bar, then lower slowly'],
  },
  {
    id: 'dumbbell-row', name: 'Dumbbell Row', equipment: 'dumbbell', primary: ['back'], secondary: ['biceps', 'shoulders'],
    summary: 'A one-arm row with a hand and knee on a bench that trains each side of the back on its own.',
    cues: ['Keep your back flat and hips square', 'Pull the dumbbell to your hip', 'Lower until your arm is straight'],
  },
  {
    id: 'dumbbell-curl', name: 'Dumbbell Curl', equipment: 'dumbbell', primary: ['biceps'], secondary: [],
    summary: 'A standing curl that isolates the biceps through a full range of motion.',
    cues: ['Keep your elbows at your sides', 'Curl without swinging your body', 'Lower slowly until your arms are straight'],
  },
  {
    id: 'cable-pushdown', name: 'Triceps Pushdown', equipment: 'cable', primary: ['triceps'], secondary: [],
    summary: 'A cable pushdown with a rope that isolates the triceps under constant tension.',
    cues: ['Pin your elbows to your sides', 'Push down until your arms are straight', 'Let the rope rise to chest height, no higher'],
  },
  {
    id: 'leg-press', name: 'Leg Press', equipment: 'machine', primary: ['quads'], secondary: ['glutes', 'calves'],
    summary: 'A machine press on an angled sled that loads the legs heavily while your back stays supported.',
    cues: ['Place your feet shoulder width on the plate', 'Lower until your knees pass 90 degrees', 'Press out without locking your knees'],
  },
  {
    id: 'hanging-leg-raise', name: 'Hanging Leg Raise', equipment: 'bodyweight', primary: ['core'], secondary: [], bodyweight: true, bwFactor: 0.35,
    summary: 'A leg raise from a dead hang that trains the abs and hip flexors and builds grip.',
    cues: ['Hang with straight arms and no swing', 'Raise your legs until they are level with your hips', 'Lower them slowly, do not drop'],
  },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);
