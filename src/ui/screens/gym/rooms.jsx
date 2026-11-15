// Rooms: friends' gyms and other people's gyms, each one card. A tap visits.
import { useState } from 'preact/hooks';
import { useStore, gymValue, dustSince } from '../../../core/index.js';
import { Sheet, Segmented, Card, Points, Badge, Icon } from '../../system/index.js';
import { PersonAvatar, RoomThumb } from '../shared/index.jsx';

const TABS = [{ value: 'friends', label: 'Friends' }, { value: 'strangers', label: 'Explore' }];

function PersonCard({ person, t, onVisit }) {
  const first = person.gym.rooms[0], floors = person.gym.rooms.length;
  const dusty = dustSince(person.lastWorkoutAt, t) > 0;
  return (
    <Card class="gy-person" padded={false} onClick={() => onVisit(person)} data-testid={`room-${person.id}`}>
      <span class="gy-person__room"><RoomThumb room={first} avatar={person.avatar} width={128} height={104} /></span>
      <span class="gy-person__body">
        <span class="gy-person__who">
          <PersonAvatar person={person} size={36} />
          <span class="gy-person__names">
            <span class="t-headline t-truncate">{person.name}</span>
            <span class="t-caption c-2 t-truncate">@{person.handle}</span>
          </span>
        </span>
        <span class="gy-person__facts">
          <Points value={gymValue(person.gym)} size="s" />
          <span class="t-caption c-2">gym value{floors > 1 ? `, ${floors} floors` : ''}</span>
        </span>
        <span class="gy-person__facts">
          <span class="gy-fact t-caption"><Icon name="fire" size={14} weight="fill" /> {person.streakWeeks > 0 ? `${person.streakWeeks} week streak` : 'No streak'}</span>
          {dusty && <Badge tone="warn" icon="broom">Dusty</Badge>}
        </span>
      </span>
    </Card>
  );
}

export function RoomsSheet({ open, onClose, t, onVisit }) {
  const [tab, setTab] = useState('friends');
  const friends = useStore((s) => s.friends), strangers = useStore((s) => s.strangers);
  const people = tab === 'friends' ? friends : strangers;
  return (
    <Sheet open={open} onClose={onClose} title="Rooms" detents={['large']}>
      <div class="gy-rooms" data-testid="rooms">
        <div class="gy-sticky"><Segmented label="Whose rooms" options={TABS} value={tab} onChange={setTab} /></div>
        {people.map((person) => <PersonCard key={person.id} person={person} t={t} onVisit={onVisit} />)}
      </div>
    </Sheet>
  );
}
