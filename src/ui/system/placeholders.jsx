// Built-in tab placeholders: shown until a real screen is registered for the tab (see registry.js).
import { useState } from 'preact/hooks';
import { Screen } from './screen.jsx';
import { EmptyState, PointsPill, Avatar } from './content.jsx';
import { Sheet, FabMenu } from './overlays.jsx';
import { openControls } from './prototype-controls.jsx';
import { useStore } from '../../core/index.js';

const PENDING = {
  home: { title: 'Home', icon: 'house', text: 'Starting a workout and the friends feed land here.' },
  train: { title: 'Train', icon: 'barbell', text: 'Routines and the workout session land here.' },
  gym: { title: 'Gym', icon: 'storefront', text: 'Your room renders here. The menu button already works.' },
  progress: { title: 'Progress', icon: 'chart-bar', text: 'History, estimated 1RM and muscle balance land here.' },
  exercises: { title: 'Exercises', icon: 'books', text: 'The exercise library lands here.' },
};

/** The avatar button that opens the prototype controls sheet. The Home agent reuses it in its nav bar. */
export function ProfileButton() {
  const name = useStore((s) => (s.profile ? s.profile.name : ''));
  return (
    <button type="button" class="gb-profilebtn" aria-label="Profile and prototype controls" onClick={openControls}>
      <Avatar size={32} name={name} />
    </button>
  );
}

const GYM_PANELS = [
  { id: 'shop', label: 'Shop', icon: 'shopping-bag', text: 'Equipment, decor, finishes, space and cosmetics are sold here.' },
  { id: 'build', label: 'Build', icon: 'hammer', text: 'Place, move, rotate and store items on the room grid.' },
  { id: 'character', label: 'Character', icon: 't-shirt', text: 'Dress the avatar with the cosmetics you own.' },
  { id: 'rooms', label: 'Rooms', icon: 'door', text: 'Visit the gyms of friends and other people.' },
];

function GymPlaceholder() {
  const [panel, setPanel] = useState(null);
  const [last, setLast] = useState(GYM_PANELS[0]);
  const open = (p) => { setLast(p); setPanel(p.id); };
  const actions = GYM_PANELS.map((p) => ({ icon: p.icon, label: p.label, onClick: () => open(p) }));
  return (
    <Screen title="Gym" trailing={<PointsPill />} fab={<FabMenu label="Gym menu" icon="plus" actions={actions} />}>
      <EmptyState icon="storefront" title="Screen in progress" text={PENDING.gym.text} />
      <Sheet open={!!panel} onClose={() => setPanel(null)} title={last.label} detents={['medium', 'large']}>
        <EmptyState icon={last.icon} title="Screen in progress" text={last.text} />
      </Sheet>
    </Screen>
  );
}

function Pending({ id }) {
  const p = PENDING[id];
  const trailing = id === 'home' ? <><PointsPill /><ProfileButton /></> : undefined;
  return (
    <Screen title={p.title} trailing={trailing}>
      <EmptyState icon={p.icon} title="Screen in progress" text={p.text} />
    </Screen>
  );
}

export const PLACEHOLDERS = {
  home: () => <Pending id="home" />,
  train: () => <Pending id="train" />,
  gym: GymPlaceholder,
  progress: () => <Pending id="progress" />,
  exercises: () => <Pending id="exercises" />,
};
