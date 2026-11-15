// Kit gallery: every component in its states. Wide windows show the three art directions side by side;
// phone-width windows show the current one. Build: node build.mjs --dev kit  ->  dist/dev-kit.html
import { render } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import { bootStore, useStore, setTheme, setAppearance, setStyle } from '../src/core/index.js';
import {
  PointsGlyph, Button, IconButton, Segmented, FilterChips, Toggle, Slider, Stepper, NumberField, TextField,
  Section, List, ListRow, Card, Stat, StatRow, Points, PointsPill, Badge, Avatar, EmptyState, Skeleton, ProgressRing, Meter,
  Sheet, confirm, toast, Fab, FabMenu, NavBar, TabBar, STYLES, THEMES, applyRootAttributes, useThemeColors, useMediaQuery, nav,
  Screen, AppShell, ProfileButton, registerScreen,
} from '../src/ui/system/index.js';
import { DialogHost, ToastHost } from '../src/ui/system/overlays.jsx';

const MUSCLES = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Quads', 'Glutes'];
const noop = () => {};

function Block({ title, children }) {
  return (
    <div class="kit-block">
      <h3 class="kit-block__title">{title}</h3>
      {children}
    </div>
  );
}
const Row = ({ children }) => <div class="kit-row">{children}</div>;

function Column({ style }) {
  const theme = useStore((s) => s.settings.theme);
  const [seg, setSeg] = useState('week');
  const [chip, setChip] = useState('Chest');
  const [on, setOn] = useState(true);
  const [rest, setRest] = useState(90);
  const [sets, setSets] = useState(4);
  const [kg, setKg] = useState(82.5);
  const [reps, setReps] = useState(8);
  const [name, setName] = useState('Push day');
  const [routine, setRoutine] = useState('strength');
  return (
    <div class="kit-col" data-style={style.id} data-gbtheme={theme}>
      <header class="kit-col__head">
        <h2 class="t-large">{style.name}</h2>
        <p class="t-callout c-2">{style.blurb}</p>
      </header>

      <Block title="Type">
        <p class="t-title">Chest and triceps</p>
        <p class="t-headline">Bench Press, 4 sets</p>
        <p class="t-body">Lower the bar to mid chest, pause, then press back up until your elbows lock.</p>
        <p class="t-foot c-2">Last trained 3 days ago</p>
        <Row><span class="t-num t-num-xl">82.5</span><span class="t-num t-num-l">1,240</span><span class="t-num t-num-m">8 x 3</span><span class="t-label c-2">Volume</span></Row>
      </Block>

      <Block title="Buttons">
        <Button block icon="play">Start workout</Button>
        <Row><Button variant="secondary" size="m" icon="plus">Add exercise</Button><Button variant="quiet" size="m">Cancel</Button></Row>
        <Row><Button variant="plain" size="m">See all routines</Button><Button variant="destructive" size="m" icon="trash">Delete</Button></Row>
        <Row><Button size="m" loading>Saving</Button><Button size="m" disabled>Finish</Button><Button variant="secondary" size="s">Edit</Button><Button variant="quiet" size="s" icon="copy">Copy</Button></Row>
        <Row>
          <IconButton icon="dots-three" weight="bold" label="More" />
          <IconButton icon="gear" label="Settings" variant="quiet" />
          <IconButton icon="heart" weight="fill" label="Like" variant="tinted" />
          <IconButton icon="plus" weight="bold" label="Add set" variant="primary" />
          <IconButton icon="x" weight="bold" label="Close" variant="quiet" size="s" />
          <IconButton icon="share-network" label="Share" variant="quiet" disabled />
        </Row>
      </Block>

      <Block title="Selection">
        <Segmented label="Range" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value={seg} onChange={setSeg} />
        <FilterChips label="Muscle" options={MUSCLES} value={chip} onChange={setChip} />
        <Row>
          <Toggle label="Rest timer" checked={on} onChange={setOn} />
          <Toggle label="Sound" checked={!on} onChange={(v) => setOn(!v)} />
          <Toggle label="Locked" checked disabled onChange={noop} />
          <Stepper label="sets" value={sets} onChange={setSets} min={1} max={10} />
        </Row>
        <Slider label="Rest seconds" min={30} max={240} step={15} value={rest} onInput={setRest} />
      </Block>

      <Block title="Fields">
        <div class="kit-grid2">
          <NumberField label="Weight" unit="kg" decimal value={kg} onChange={setKg} />
          <NumberField label="Reps" value={reps} onChange={setReps} />
        </div>
        <div class="kit-setrow">
          <Badge tone="accent">W</Badge>
          <NumberField size="m" hideLabel label="Warm-up weight" unit="kg" decimal value={40} onChange={noop} />
          <NumberField size="m" hideLabel label="Warm-up reps" value={12} onChange={noop} />
          <IconButton icon="check" weight="bold" label="Mark set done" variant="primary" />
        </div>
        <TextField label="Routine name" value={name} onInput={setName} placeholder="Push day" />
        <TextField label="Search" icon="magnifying-glass" value="" onInput={noop} placeholder="Find an exercise" type="search" />
        <TextField label="Handle" value="victor!" onInput={noop} error="Use letters, numbers and underscores only." />
      </Block>

      <Block title="List">
        <List>
          <ListRow icon="barbell" title="Bench Press" subtitle="Chest, triceps, shoulders" value="82.5 kg" chevron onClick={noop} />
          <ListRow leading={<Avatar size={36} name="Sanne de Vries" />} title="Sanne de Vries" subtitle="Leg day, 54 min" trailing={<Points value={412} sign />} />
          <ListRow icon="timer" title="Rest timer" trailing={<Toggle label="Rest timer" checked={on} onChange={setOn} />} />
          <ListRow title="Units" value="Metric" chevron onClick={noop} />
          <ListRow icon="trash" tone="bad" title="Delete routine" onClick={noop} />
        </List>
        <List role="radiogroup" aria-label="Focus">
          <ListRow role="radio" title="Strength" subtitle="Heavy sets of 3 to 6" selected={routine === 'strength'} onClick={() => setRoutine('strength')} />
          <ListRow role="radio" title="Hypertrophy" subtitle="Moderate sets of 8 to 12" selected={routine === 'size'} onClick={() => setRoutine('size')} />
        </List>
      </Block>

      <Block title="Card, stats, points">
        <Card>
          <div class="kit-cardhead">
            <div><p class="t-headline">Upper body A</p><p class="t-foot c-2">6 exercises, about 55 min</p></div>
            <Badge tone="accent" icon="lightning">x1.5 legs</Badge>
          </div>
          <StatRow>
            <Stat value="12,480" unit="kg" label="Volume" />
            <Stat value="104" unit="kg" label="Est. 1RM" delta={{ text: '+2.5 kg', tone: 'good' }} />
            <Stat value="3" label="Week streak" />
          </StatRow>
          <Card><p class="t-foot c-2">A card inside a card gives up its surface.</p></Card>
        </Card>
        <Row>
          <PointsPill value={12480} unlimited={false} />
          <PointsPill unlimited />
          <Points value={2400} />
          <Points value={365} sign size="l" />
        </Row>
        <Row>
          <Badge>Dusty</Badge><Badge tone="accent">New</Badge><Badge tone="good" icon="check-circle">Consistent</Badge>
          <Badge tone="warn">2 days left</Badge><Badge tone="bad">Missed</Badge><Badge tone="points" solid>PR</Badge><Badge tone="accent" solid>Live</Badge>
        </Row>
      </Block>

      <Block title="Avatar, progress">
        <Row>
          <Avatar size={28} name="Jeroen Bakker" /><Avatar size={36} name="Lotte Peeters" /><Avatar size={44} name="Mats Janssens" ring />
          <Avatar size={64} name="Victor" />
          <ProgressRing value={0.72} size={64} label="Weekly goal"><span class="t-num">3/4</span></ProgressRing>
          <ProgressRing value={0.4} size={44} stroke={6} tone="points" label="Passive income"><PointsGlyph size={18} /></ProgressRing>
        </Row>
        <div class="kit-meters">
          <Meter value={0.66} label="Chest" /><Meter value={0.3} tone="warn" label="Dust" /><Meter value={0.9} tone="good" label="Consistency" />
        </div>
      </Block>

      <Block title="Empty and loading">
        <EmptyState icon="barbell" title="No routines yet" text="Save the exercises you repeat as a routine and start it with one tap." action={<Button size="m" icon="plus">Create routine</Button>} />
        <div class="kit-skeleton">
          <Skeleton shape="circle" w={44} h={44} />
          <div><Skeleton shape="text" w="60%" h={14} /><Skeleton shape="text" w="85%" h={12} /></div>
        </div>
      </Block>

      <Block title="Bars and floating actions">
        <div class="kit-stage kit-stage--nav">
          <NavBar showTitle title="Bench Press" solid leading={<IconButton icon="caret-left" weight="bold" label="Back" variant="quiet" size="s" />} trailing={<><PointsPill unlimited /><IconButton icon="dots-three" weight="bold" label="More" /></>} />
        </div>
        <div class="kit-stage kit-stage--fab">
          <FabMenu label="Gym menu" actions={[
            { icon: 'shopping-bag', label: 'Shop', onClick: noop }, { icon: 'hammer', label: 'Build', onClick: noop },
            { icon: 't-shirt', label: 'Character', onClick: noop }, { icon: 'door', label: 'Rooms', onClick: noop },
          ]} />
        </div>
        <div class="kit-stage kit-stage--nav"><Fab extended icon="play" label="Start workout" onClick={noop} /></div>
        <div class="kit-stage kit-stage--tabs"><TabBar /></div>
      </Block>
    </div>
  );
}

function Swatches() {
  const c = useThemeColors();
  const keys = ['bg', 'bgRaised', 'bgSunken', 'ink', 'ink2', 'ink3', 'accent', 'accentText', 'good', 'warn', 'bad', 'points'];
  return (
    <div class="kit-swatches">
      {keys.map((k) => <span key={k} class="kit-chip"><i style={{ background: c[k] }} />{k} {c[k]}</span>)}
    </div>
  );
}

function Kit() {
  const settings = useStore((s) => s.settings);
  const wide = useMediaQuery('(min-width: 1100px)');
  const [sheet, setSheet] = useState(false);
  useLayoutEffect(() => {
    applyRootAttributes(settings);
    // side by side: each column scopes its own style, so the root must not claim one
    if (wide) document.documentElement.removeAttribute('data-style');
  }, [settings.style, settings.theme, settings.appearance, wide]);
  const columns = wide ? STYLES : STYLES.filter((s) => s.id === settings.style);
  const ask = async () => {
    const ok = await confirm({ title: 'Delete Upper body A?', message: 'The routine is removed. Workouts you logged with it stay in your history.', confirmLabel: 'Delete', destructive: true });
    toast(ok ? 'Routine deleted' : 'Kept the routine', { icon: 'check-circle' });
  };
  return (
    <div class="kit gb-scroll">
      <div class="kit-top">
        <FilterChips label="Theme" bleed={false} options={THEMES.map((t) => ({ value: t.id, label: t.name }))} value={settings.theme} onChange={setTheme} />
        <div class="kit-top__row">
          <Segmented label="Appearance" options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} value={settings.appearance} onChange={setAppearance} />
          {!wide && <Segmented label="Style" options={STYLES.map((s) => ({ value: s.id, label: s.name }))} value={settings.style} onChange={setStyle} />}
        </div>
        <div class="kit-top__row">
          <Button id="kit-sheet" variant="quiet" size="s" onClick={() => setSheet(true)}>Open sheet</Button>
          <Button id="kit-dialog" variant="quiet" size="s" onClick={ask}>Open dialog</Button>
          <Button id="kit-toast" variant="quiet" size="s" onClick={() => toast('Skipped 7 days', { icon: 'check-circle' })}>Show toast</Button>
        </div>
        <Swatches />
      </div>
      <div class="kit-cols">{columns.map((s) => <Column key={s.id} style={s} />)}</div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add exercise">
        <Section title="Recent">
          <List>
            <ListRow icon="barbell" title="Back Squat" subtitle="Quads, glutes" chevron onClick={noop} />
            <ListRow icon="barbell" title="Deadlift" subtitle="Hamstrings, back" chevron onClick={noop} />
            <ListRow icon="barbell" title="Overhead Press" subtitle="Shoulders" chevron onClick={noop} />
          </List>
        </Section>
      </Sheet>
      <div id="gb-overlays" class="gb-overlays" />
      <DialogHost />
      <ToastHost />
    </div>
  );
}

// ---- demo mode: dist/dev-kit.html?demo renders the real shell with sample screens built only from the kit ----
const FEED = [
  { name: 'Sanne de Vries', when: '2 h ago', title: 'Leg day', min: 54, volume: '9,860', sets: 21, points: 412 },
  { name: 'Mats Janssens', when: 'Yesterday', title: 'Push, heavy', min: 67, volume: '11,240', sets: 24, points: 538 },
  { name: 'Aiko Tanaka', when: 'Yesterday', title: 'Pull and core', min: 48, volume: '7,415', sets: 19, points: 351 },
];
const ROUTINES = [
  { name: 'Upper body A', detail: '6 exercises, about 55 min' },
  { name: 'Lower body', detail: '5 exercises, about 50 min' },
  { name: 'Pull and core', detail: '5 exercises, about 45 min' },
];
const LIFTS = [
  { name: 'Bench Press', muscles: 'Chest, triceps, shoulders', plan: '4 sets of 6 to 8', kg: '82.5' },
  { name: 'Overhead Press', muscles: 'Shoulders, triceps', plan: '3 sets of 8', kg: '50' },
  { name: 'Dumbbell Row', muscles: 'Back, biceps', plan: '4 sets of 10', kg: '32' },
  { name: 'Pull-Up', muscles: 'Back, biceps', plan: '3 sets to failure', kg: '+5' },
  { name: 'Triceps Pushdown', muscles: 'Triceps', plan: '3 sets of 12', kg: '27.5' },
];

function DemoHome() {
  const [liked, setLiked] = useState({});
  return (
    <Screen title="Home" trailing={<><PointsPill /><ProfileButton /></>}>
      <div class="kit-stack">
        <Button block icon="play" onClick={() => nav.present(DemoSession)}>Start empty workout</Button>
        <div class="kit-grid2">
          <Button variant="quiet" size="m" icon="list-bullets" onClick={() => nav.select('train')}>From a routine</Button>
          <Button variant="quiet" size="m" icon="users">With friends</Button>
        </div>
      </div>
      <Card>
        <div class="kit-cardhead kit-cardhead--flush">
          <div><p class="t-headline">Legs are falling behind</p><p class="t-foot c-2">Train quads or hamstrings next and those sets earn more.</p></div>
          <Badge tone="accent" solid icon="lightning">x1.5</Badge>
        </div>
      </Card>
      <Section title="Friends">
        {FEED.map((p) => (
          <Card key={p.name}>
            <div class="kit-post">
              <Avatar size={44} name={p.name} />
              <div class="kit-post__who"><p class="t-headline">{p.name}</p><p class="t-foot c-2">{p.title}, {p.when}</p></div>
              <Points value={p.points} sign />
            </div>
            <StatRow>
              <Stat value={p.min} unit="min" label="Duration" />
              <Stat value={p.volume} unit="kg" label="Volume" />
              <Stat value={p.sets} label="Sets" />
            </StatRow>
            <div class="kit-post__foot">
              <IconButton icon="heart" weight={liked[p.name] ? 'fill' : 'regular'} label={`Like ${p.name}'s workout`} variant={liked[p.name] ? 'tinted' : 'plain'} onClick={() => setLiked({ ...liked, [p.name]: !liked[p.name] })} />
              <IconButton icon="chat-circle" label="Comment" />
            </div>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

function DemoRoutine({ routine }) {
  return (
    <Screen title={routine.name} trailing={<IconButton icon="dots-three" weight="bold" label="Routine options" />} footer={<Button block icon="play" onClick={() => nav.present(DemoSession)}>Start routine</Button>}>
      <StatRow>
        <Stat value="12,480" unit="kg" label="Last volume" />
        <Stat value="55" unit="min" label="Usual length" />
        <Stat value="9" label="Times done" />
      </StatRow>
      <Section title="Exercises" action={{ label: 'Edit', onClick: noop }}>
        <List>{LIFTS.map((l) => <ListRow key={l.name} icon="barbell" title={l.name} subtitle={l.plan} value={`${l.kg} kg`} />)}</List>
      </Section>
    </Screen>
  );
}

function DemoTrain() {
  return (
    <Screen title="Train" trailing={<IconButton icon="plus" weight="bold" label="Create routine" variant="quiet" size="s" />}>
      <Button block icon="play" onClick={() => nav.present(DemoSession)}>Start empty workout</Button>
      <Section title="Routines" action={{ label: 'New routine', onClick: noop }}>
        <List>{ROUTINES.map((r) => <ListRow key={r.name} title={r.name} subtitle={r.detail} chevron onClick={() => nav.push(DemoRoutine, { routine: r })} />)}</List>
      </Section>
    </Screen>
  );
}

function DemoSession() {
  const [done, setDone] = useState({ 0: true });
  const finish = async () => {
    if (await confirm({ title: 'Finish workout?', message: '3 of 4 sets are done. Unfinished sets are not counted.', confirmLabel: 'Finish' })) nav.dismiss();
  };
  return (
    <Screen title="Upper body A" large={false} leading={<Button variant="plain" size="s" onClick={nav.dismiss}>Cancel</Button>} trailing={<Button size="s" onClick={finish}>Finish</Button>}>
      <StatRow>
        <Stat size="l" value="24:18" label="Elapsed" />
        <Stat size="l" value="3,460" unit="kg" label="Volume so far" />
      </StatRow>
      <Section title="Bench Press" action={{ label: 'History', onClick: noop }}>
        <div class="kit-sets">
          {[['W', 40, 12], ['1', 80, 8], ['2', 82.5, 8], ['3', 82.5, 6]].map(([type, kg, reps], i) => (
            <div key={i} class="kit-setrow">
              <Badge tone={type === 'W' ? 'warn' : 'neutral'}>{type}</Badge>
              <NumberField size="m" hideLabel label={`Set ${type} weight`} unit="kg" decimal value={kg} onChange={noop} />
              <NumberField size="m" hideLabel label={`Set ${type} reps`} value={reps} onChange={noop} />
              <IconButton icon="check" weight="bold" label={`Mark set ${type} done`} variant={done[i] ? 'primary' : 'quiet'} onClick={() => setDone({ ...done, [i]: !done[i] })} />
            </div>
          ))}
        </div>
        <Button variant="secondary" size="m" icon="plus">Add set</Button>
      </Section>
      <Button variant="quiet" block icon="plus">Add exercise</Button>
    </Screen>
  );
}

function DemoProgress() {
  const [range, setRange] = useState('month');
  return (
    <Screen title="Progress">
      <Segmented label="Range" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value={range} onChange={setRange} />
      <StatRow>
        <Stat size="l" value="14" label="Workouts" delta={{ text: '+2 vs last month', tone: 'good' }} />
        <Stat size="l" value="3" unit="wk" label="Streak" />
      </StatRow>
      <Section title="Muscle balance">
        <div class="kit-balance">
          {[['Chest', 0.86], ['Back', 0.78], ['Shoulders', 0.64], ['Quads', 0.31], ['Hamstrings', 0.22]].map(([m, v]) => (
            <div key={m} class="kit-balance__row"><span class="t-callout">{m}</span><Meter value={v} tone={v < 0.35 ? 'warn' : 'accent'} label={m} /></div>
          ))}
        </div>
      </Section>
      <Section title="Best lifts">
        <List>{LIFTS.slice(0, 3).map((l) => <ListRow key={l.name} title={l.name} subtitle="Estimated 1RM" value={`${l.kg} kg`} chevron onClick={noop} />)}</List>
      </Section>
    </Screen>
  );
}

function DemoExercises() {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('All');
  const shown = LIFTS.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()) && (muscle === 'All' || l.muscles.includes(muscle)));
  return (
    <Screen title="Exercises">
      <div class="kit-stack">
        <TextField label="Search exercises" hideLabel icon="magnifying-glass" type="search" value={q} onInput={setQ} placeholder="Search exercises" enterkeyhint="search" />
        <FilterChips label="Muscle" options={MUSCLES} value={muscle} onChange={setMuscle} />
      </div>
      {shown.length
        ? <List>{shown.map((l) => <ListRow key={l.name} icon="barbell" title={l.name} subtitle={l.muscles} chevron onClick={noop} />)}</List>
        : <EmptyState icon="magnifying-glass" title="Nothing matches" text="Try a shorter search or another muscle." action={<Button variant="secondary" size="m" onClick={() => { setQ(''); setMuscle('All'); }}>Clear filters</Button>} />}
    </Screen>
  );
}

const GYM_ACTIONS = [
  { icon: 'shopping-bag', label: 'Shop' }, { icon: 'hammer', label: 'Build' }, { icon: 't-shirt', label: 'Character' }, { icon: 'door', label: 'Rooms' },
].map((a) => ({ ...a, onClick: () => toast(`${a.label} opened`) }));

// scroll={false}: the children own the whole stage, as the gym canvas will
function DemoGym() {
  return (
    <Screen title="Gym" scroll={false} trailing={<PointsPill />} fab={<FabMenu label="Gym menu" actions={GYM_ACTIONS} />}>
      <div class="kit-room"><p class="t-foot c-2">Canvas area: full stage, minus the top and bottom insets</p></div>
    </Screen>
  );
}

function Demo() {
  const settings = useStore((s) => s.settings);
  useLayoutEffect(() => applyRootAttributes(settings), [settings.style, settings.theme, settings.appearance]);
  return <AppShell />;
}

const demo = window.location.search.includes('demo');
if (demo) {
  registerScreen('home', DemoHome);
  registerScreen('train', DemoTrain);
  registerScreen('gym', DemoGym);
  registerScreen('progress', DemoProgress);
  registerScreen('exercises', DemoExercises);
}
bootStore();
nav.start();
render(demo ? <Demo /> : <Kit />, document.getElementById('app'));
