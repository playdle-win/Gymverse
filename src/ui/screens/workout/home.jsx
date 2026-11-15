// Home: start a workout, the focus offer, how training feeds the gym, and the friends timeline.
import { useMemo, useState } from 'preact/hooks';
import {
  useStore, getState, now, DAY, TUNING, focusOffer, consistency, passive, dustLevel, buddyRate,
  workoutVolume, workoutMinutes, toggleKudos, addExercise,
} from '../../../core/index.js';
import { exerciseById } from '../../../exercises/index.js';
import {
  Screen, Section, Card, Button, Badge, Icon, Points, PointsPill, ProfileButton, Stat, StatRow, Sheet, List, ListRow,
  EmptyState, nav, formatInt,
} from '../../system/index.js';
import { PersonAvatar, timeAgo } from '../shared/index.jsx';
import {
  joinNames, firstName, plural, agoPhrase, personOf, buddyNames, topLifts, countSets, focusStart, routineHitsFocus,
  useClockOffset,
} from './lib.js';
import { FocusBadge, Rate } from './parts.jsx';
import { StartBlock } from './start.jsx';
import { startAndOpen } from './session.jsx';
import { WorkoutDetailPage } from './detail.jsx';

const FEED_DAYS = 14;
const FEED_PAGE = 8;

// ---------------------------------------------------------------------------------------------
// Start sheets

function RoutineSheet({ open, onClose }) {
  const routines = useStore((s) => s.routines);
  const workouts = useStore((s) => s.workouts);
  useClockOffset();
  const offer = focusOffer({ workouts }, now());
  const start = (routineId) => { onClose(); startAndOpen({ routineId }); };
  const toTrain = () => { onClose(); nav.select('train'); };
  return (
    <Sheet open={open} onClose={onClose} title="Start from a routine" detents={['medium', 'large']}>
      {routines.length ? (
        <List variant="plain">
          {routines.map((routine) => (
            <ListRow
              key={routine.id} title={routine.name}
              subtitle={`${plural(routine.exercises.length, 'exercise')}, ${plural(countSets(routine.exercises), 'set')}`}
              trailing={routineHitsFocus(routine, offer) ? <FocusBadge mult={offer.mult} /> : null}
              chevron onClick={() => start(routine.id)}
            />
          ))}
        </List>
      ) : (
        <EmptyState icon="list-bullets" title="No routines yet" text="Build one on the Train tab and start it from here." action={<Button variant="secondary" onClick={toTrain}>Go to Train</Button>} />
      )}
    </Sheet>
  );
}

function FriendsSheet({ open, onClose }) {
  const friends = useStore((s) => s.friends);
  const routines = useStore((s) => s.routines);
  const [picked, setPicked] = useState([]);
  useClockOffset();
  const toggle = (id) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const start = (routineId) => { onClose(); startAndOpen({ routineId, buddies: picked }); setPicked([]); };
  const names = joinNames(friends.filter((f) => picked.includes(f.id)).map((f) => firstName(f.name)));
  const bonus = Math.round(buddyRate(picked.length) * 100);
  const each = Math.round(TUNING.buddyRate * 100), cap = Math.round(TUNING.buddyCap * 100);
  return (
    <Sheet open={open} onClose={onClose} title="Train with friends" detents={['large']}>
      <div class="wk-stack wk-stack--loose" data-testid="friends-sheet">
        <p class="t-callout c-2">Everyone who finishes earns {each}% more for each friend, up to {cap}%.</p>
        <Section title="Who is joining">
          <List variant="plain">
            {friends.map((friend) => (
              <ListRow
                key={friend.id} leading={<PersonAvatar person={friend} size={40} />} title={friend.name}
                subtitle={friend.lastWorkoutAt ? agoPhrase('Trained', friend.lastWorkoutAt) : 'No workouts yet'}
                selected={picked.includes(friend.id)} onClick={() => toggle(friend.id)}
              >
                <span class="gb-sr">{picked.includes(friend.id) ? 'Selected' : 'Not selected'}</span>
              </ListRow>
            ))}
          </List>
        </Section>
        <Section title="Then start" footnote={picked.length ? `With ${names}: ${bonus}% more when you all finish.` : 'Pick at least one friend first.'}>
          <Button block icon="play" disabled={!picked.length} onClick={() => start()} data-testid="friends-start-empty">Start empty workout</Button>
          {routines.length > 0 && (
            <List variant="plain">
              {routines.map((routine) => (
                <ListRow
                  key={routine.id} title={`Start ${routine.name}`} subtitle={`${plural(routine.exercises.length, 'exercise')}, ${plural(countSets(routine.exercises), 'set')}`}
                  chevron disabled={!picked.length} onClick={() => start(routine.id)}
                />
              ))}
            </List>
          )}
        </Section>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------
// Focus offer and game status

function FocusCard() {
  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const active = useStore((s) => s.active);
  useClockOffset();
  const offer = focusOffer({ workouts }, now());
  if (!offer || active) return null;
  const pick = focusStart(offer, routines);
  const names = offer.exerciseIds.map((id) => exerciseById(id).name);
  const listed = names.length > 3 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : joinNames(names);
  const start = () => (pick.routineId ? startAndOpen({ routineId: pick.routineId }) : startAndOpen({}, () => addExercise(pick.exId)));
  return (
    <Card class="wk-focus" data-testid="focus-offer">
      <div class="wk-focus__head">
        <div class="wk-grow">
          <p class="t-headline">{offer.reason}</p>
          <p class="t-foot c-2">{listed} {names.length === 1 ? 'earns' : 'earn'} x{offer.mult} points in your next workout.</p>
        </div>
        <FocusBadge mult={offer.mult} />
      </div>
      <Button variant="secondary" size="m" block icon="play" onClick={start} data-testid="focus-start">Start with {pick.label}</Button>
    </Card>
  );
}

function GameStatus() {
  const workouts = useStore((s) => s.workouts);
  // Passive income depends on the gym and the wallet too; subscribing keeps the line current.
  useStore((s) => s.gym); useStore((s) => s.wallet);
  useClockOffset();
  const t = now();
  const level = consistency(workouts, t);
  const income = passive(getState(), t);
  const dust = dustLevel(workouts, t);
  const thisWeek = level.perWeek[level.perWeek.length - 1];
  const goal = TUNING.consistencyLevels[TUNING.passiveMinLevel];
  return (
    <div class="wk-status" data-testid="game-status">
      <p class="wk-status__main">
        <Icon class={income.active ? 'c-accent' : 'c-3'} name="fire" weight={income.active ? 'fill' : 'regular'} size={20} />
        <span class="t-headline">{level.level ? level.label : 'Consistency off'}</span>
        <span class="t-callout c-2">{plural(thisWeek, 'workout')} this week</span>
      </p>
      {income.active ? (
        <p class="t-foot c-2">Your character earns <Rate value={income.ratePerHour} /> an hour in your gym.</p>
      ) : (
        <p class="t-foot c-2">Train {goal.workouts14} times in 14 days and your character starts earning points for you.</p>
      )}
      {dust > 0 && (
        <p class="wk-line t-foot c-warn" data-testid="dust-warning">
          <Icon name="broom" size={16} />
          <span>Your gym is gathering dust and pays {Math.round(dust * TUNING.dustMaxPenalty * 100)}% less. One workout clears it.</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Timeline

function Post({ workout, person, mine }) {
  const lifts = topLifts(workout, person.bodyKg);
  const extra = workout.exercises.length - lifts.length;
  const buddies = workout.buddies.length ? buddyNames(getState(), workout.buddies) : '';
  return (
    <Card padded={false} class="wk-post" data-testid="feed-post" data-mine={mine ? 'true' : undefined}>
      <button type="button" class="wk-post__tap" onClick={() => nav.push(WorkoutDetailPage, { id: workout.id })} aria-label={`${mine ? 'Your' : `${person.name}'s`} workout ${workout.name}, ${formatInt(workout.points.total)} points, ${timeAgo(workout.endedAt)}. Open details`}>
        <span class="wk-post__head">
          <PersonAvatar person={person} size={40} />
          <span class="wk-post__who">
            <span class="wk-post__name"><span class="t-headline t-truncate">{person.name}</span>{mine && <Badge tone="accent">You</Badge>}</span>
            <span class="t-foot c-2 t-truncate">{workout.name}</span>
          </span>
          <span class="wk-post__side">
            <Points value={workout.points.total} sign />
            <span class="t-caption c-3">{timeAgo(workout.endedAt)}</span>
          </span>
        </span>
        <StatRow>
          <Stat value={workoutMinutes(workout)} unit="min" label="Duration" />
          <Stat value={formatInt(workoutVolume(workout, person.bodyKg))} unit="kg" label="Volume" />
          <Stat value={countSets(workout.exercises)} label="Sets" />
        </StatRow>
        <span class="wk-post__lifts t-foot c-2">
          {lifts.map((lift, i) => (
            <>
              <span key={lift.exId} class="wk-nowrap">{lift.name} <span class="wk-ink wk-tnum">{lift.best}</span>{i < lifts.length - 1 || extra > 0 ? ',' : ''}</span>{' '}
            </>
          ))}
          {extra > 0 && <span class="wk-nowrap">{extra} more</span>}
        </span>
        {buddies && <span class="wk-line t-foot c-2"><Icon name="users" size={16} /><span>With {buddies}</span></span>}
      </button>
      {(!mine || workout.kudos > 0) && (
        <div class="wk-post__foot">
          {mine ? <span /> : (
            <Button
              variant={workout.kudosByMe ? 'secondary' : 'quiet'} size="s" icon="hand-fist" aria-pressed={workout.kudosByMe ? 'true' : 'false'}
              onClick={() => toggleKudos(workout.id)} data-testid="kudos"
            >
              {workout.kudosByMe ? 'Kudos given' : 'Give kudos'}
            </Button>
          )}
          <span class="t-foot c-2 wk-tnum">{workout.kudos > 0 ? plural(workout.kudos, 'kudos', 'kudos') : 'Be the first'}</span>
        </div>
      )}
    </Card>
  );
}

function Timeline() {
  const feed = useStore((s) => s.feed);
  const workouts = useStore((s) => s.workouts);
  // Names and faces come from these slices; subscribing redraws the posts when a look changes.
  useStore((s) => s.friends); useStore((s) => s.avatar);
  const [limit, setLimit] = useState(FEED_PAGE);
  const offset = useClockOffset();
  const posts = useMemo(() => {
    const since = now() - FEED_DAYS * DAY;
    const mine = workouts.filter((w) => w.endedAt >= since);
    return [...feed, ...mine].sort((a, b) => b.endedAt - a.endedAt);
  }, [feed, workouts, offset]);
  const state = getState();
  const shown = posts.slice(0, limit).map((workout) => ({ workout, person: personOf(state, workout.userId) })).filter((p) => p.person);
  return (
    <Section title="Friends">
      {shown.length ? (
        <div class="wk-feed">
          {shown.map(({ workout, person }) => <Post key={workout.id} workout={workout} person={person} mine={workout.userId === 'me'} />)}
          {posts.length > limit && <Button variant="quiet" block onClick={() => setLimit(limit + FEED_PAGE)} data-testid="feed-more">Show earlier workouts</Button>}
        </div>
      ) : (
        <EmptyState icon="users" title="Nothing here yet" text="Workouts from you and your friends show up here once they are finished." />
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------

export function HomeScreen() {
  const [sheet, setSheet] = useState(null);
  return (
    <Screen title="Home" trailing={<><PointsPill /><ProfileButton /></>}>
      <div class="wk-stack wk-stack--loose">
        <StartBlock>
          <div class="wk-start__more">
            <Button variant="quiet" size="m" block icon="list-bullets" onClick={() => setSheet('routine')} data-testid="start-routine">From a routine</Button>
            <Button variant="quiet" size="m" block icon="users" onClick={() => setSheet('friends')} data-testid="start-friends">With friends</Button>
          </div>
        </StartBlock>
        <GameStatus />
      </div>
      <FocusCard />
      <Timeline />
      <RoutineSheet open={sheet === 'routine'} onClose={() => setSheet(null)} />
      <FriendsSheet open={sheet === 'friends'} onClose={() => setSheet(null)} />
    </Screen>
  );
}
