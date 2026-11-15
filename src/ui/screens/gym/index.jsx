// The Gym tab: the room fills the screen; a light HUD floats over it; Shop, Build, Character and Rooms hang off one button.
// Three states: my room (view), my room (build), someone else's room (visiting). All changes go through core actions.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as core from '../../../core/index.js';
import { GymCanvas, itemById } from '../../../gym/index.js';
import { Screen, FabMenu, Button, toast, useHideTabBar, useMediaQuery } from '../../system/index.js';
import { useGymLook } from '../shared/index.jsx';
import { Balance, PassiveChip, MultiplierChip, DustBanner, FloorSwitcher, VisitTitle, VisitFacts, LeaveButton } from './hud.jsx';
import { ShopSheet } from './shop.jsx';
import { BuildTray, BuildActions } from './build.jsx';
import { CharacterSheet } from './character.jsx';
import { RoomsSheet } from './rooms.jsx';
import { MultipliersSheet } from './multipliers.jsx';
import { boostsOf, boostLabel, categoryOf, formatMultiplier, formatPercent, roomSizeLabel, useNow } from './lib.js';

const { useStore, getState, DAY } = core;
const TRAINED_RECENTLY = 3 * DAY;
const ROOM_MARGIN = 8;

// Pixels of the stage covered by the floating UI above and below the room, so the engine can centre the room in the rest.
function useRoomInsets(top, bottom) {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const next = { top: top.current.offsetTop + top.current.offsetHeight + ROOM_MARGIN, right: 0, bottom: bottom.current.offsetHeight + ROOM_MARGIN, left: 0 };
      setInsets((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(top.current);
    observer.observe(bottom.current);
    return () => observer.disconnect();
  }, []);
  return insets;
}

// What placing an item just did for the gym, for the build status line.
function placedMessage(item) {
  const now = core.selMultipliers();
  if (item.kind === 'decor') return `${item.name} placed. Vibe is now +${formatPercent(now.vibe)}.`;
  const best = boostsOf(item)[0];
  return `${item.name} placed. ${best.label} now ${formatMultiplier(now.byMuscle[best.muscle])}.`;
}

export function GymScreen() {
  const gym = useStore((s) => s.gym);
  const avatar = useStore((s) => s.avatar);
  const workouts = useStore((s) => s.workouts);
  useStore((s) => s.wallet.passiveSince);
  const look = useGymLook();
  const t = useNow();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [mode, setMode] = useState('view');
  const [sheet, setSheet] = useState(null);
  const [shopAt, setShopAt] = useState({ category: 'equipment', itemId: null });
  const [visit, setVisit] = useState(null);
  const [placing, setPlacing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [queued, setQueued] = useState(null);
  const [flash, setFlash] = useState(null);
  const canvas = useRef(null), topUi = useRef(null), bottomUi = useRef(null);
  const insets = useRoomInsets(topUi, bottomUi);

  const building = mode === 'build' && !visit;
  useHideTabBar(building);

  const rooms = visit ? visit.person.gym.rooms : gym.rooms;
  const activeFloor = visit ? visit.floor : gym.active;
  const room = rooms[activeFloor];
  const myDust = core.dustLevel(workouts, t);
  const multipliers = useMemo(() => core.gymMultipliers(gym, itemById, myDust), [gym, myDust]);
  const income = core.selPassive();
  const lastWorkoutAt = workouts.reduce((latest, w) => Math.max(latest, w.endedAt), 0);
  const guests = useMemo(() => (visit ? [{ id: 'me', avatar }] : []), [visit && visit.person.id, avatar]);

  // A queued item gets its ghost once the canvas is in build mode and has the current room. Preact runs this
  // effect before the canvas has synced its props, so the ghost starts a frame later.
  useEffect(() => {
    if (!queued || !building) return undefined;
    const frame = requestAnimationFrame(() => { canvas.current.beginPlacement(queued); setQueued(null); });
    return () => cancelAnimationFrame(frame);
  }, [queued, building, room]);

  // Finishing a workout brings the gym back to your own room, so "Go to my gym" never lands in a friend's gym.
  useEffect(() => { setVisit(null); }, [workouts.length]);

  const closeSheet = () => setSheet(null);
  const openShop = (category, itemId = null) => { setShopAt({ category, itemId }); setFlash(null); setSheet('shop'); };
  const enterBuild = (itemId) => { setSheet(null); setVisit(null); setFlash(null); setMode('build'); if (itemId) setQueued(itemId); };
  const leaveBuild = () => { setMode('view'); setPlacing(null); setSelected(null); setQueued(null); setFlash(null); };
  const startVisit = (person) => { setSheet(null); setMode('view'); setVisit({ person, floor: 0 }); };
  const switchFloor = (index) => {
    if (visit) { setVisit({ ...visit, floor: index }); return; }
    if (building) canvas.current.cancel();
    core.setActiveRoom(index);
  };

  const canPlaceHere = (itemId, x, y, rot, ignoreUid) => {
    const live = getState().gym;
    return core.canPlace(live.rooms[live.active], itemById(itemId), x, y, rot, ignoreUid);
  };
  const onTap = ({ uid, itemId }) => {
    if (visit || !uid) return;
    const item = itemById(itemId);
    if (item.kind !== 'equipment') { toast(`${item.name}: +${formatPercent(item.vibe)} vibe`, { icon: 'sparkle' }); return; }
    canvas.current.sendAvatarTo(uid);
    toast(`${item.name}: ${boostLabel(boostsOf(item)[0])}`, { icon: 'lightning' });
  };
  const onPlace = ({ itemId, x, y, rot }) => {
    if (!core.placeItem(getState().gym.active, itemId, x, y, rot).ok) { canvas.current.cancel(); setFlash('That spot is taken. Try another one.'); return; }
    setFlash(placedMessage(itemById(itemId)));
    if (core.selUnplaced(itemId) > 0) setQueued(itemId);
  };
  const onMove = ({ uid, x, y, rot }) => { core.moveItem(getState().gym.active, uid, x, y, rot); };
  const onStore = ({ uid }) => {
    const stored = room.items.find((p) => p.uid === uid);
    if (core.storeItem(getState().gym.active, uid).ok && stored) setFlash(`${itemById(stored.itemId).name} is back in storage.`);
  };
  const pickFromTray = (itemId) => { setFlash(null); canvas.current.beginPlacement(itemId); };
  const applyFinish = (kind, itemId) => {
    if (core.applyFinish(getState().gym.active, kind, itemId).ok) setFlash(kind === 'floor' ? `${itemById(itemId).name} laid.` : `${itemById(itemId).name} is on the walls.`);
  };

  // Test hook for scripted flows and screenshots: window.gymtab.core is the engine API, the rest drives this screen.
  const hook = useRef(null);
  hook.current = { open: (name, category, itemId) => (name === 'shop' ? openShop(category || shopAt.category, itemId) : setSheet(name)), build: enterBuild, done: leaveBuild, visit: (id) => startVisit([...getState().friends, ...getState().strangers].find((p) => p.id === id)), leave: () => setVisit(null) };
  useEffect(() => {
    window.gymtab = { core, canvas: () => canvas.current, ui: (action, ...args) => hook.current[action](...args) };
    return () => { delete window.gymtab; };
  }, []);

  const leading = visit ? <VisitTitle person={visit.person} /> : building ? (
    <span class="gy-buildtitle">
      <span class="t-headline">Build</span>
      <span class="t-caption c-2" data-testid="build-size">{room.name}, {roomSizeLabel(room)}</span>
    </span>
  ) : (
    <span class="gy-hud">
      <MultiplierChip multipliers={multipliers} onClick={() => setSheet('multipliers')} />
      <PassiveChip income={income} />
    </span>
  );
  const trailing = visit ? <LeaveButton onClick={() => setVisit(null)} />
    : building ? <Button size="s" onClick={leaveBuild} data-testid="build-done">Done</Button>
      : <span class="gy-hud"><Balance /></span>;
  const menu = [
    { icon: 'shopping-bag', label: 'Shop', onClick: () => setSheet('shop') },
    { icon: 'hammer', label: 'Build', onClick: () => enterBuild() },
    { icon: 't-shirt', label: 'Character', onClick: () => setSheet('character') },
    { icon: 'door', label: 'Rooms', onClick: () => setSheet('rooms') },
  ];

  return (
    <Screen class="gy-screen" title="Gym" scroll={false} leading={leading} trailing={trailing} fab={building || visit ? null : <FabMenu label="Open the gym menu" actions={menu} />}>
      <div class="gy-room" data-mode={visit ? 'visit' : mode}>
        <GymCanvas
          key={visit ? visit.person.id : 'mine'} ref={canvas} room={room} style={look.style} palette={look.palette} insets={insets} reducedMotion={reducedMotion}
          avatar={visit ? visit.person.avatar : avatar} guests={guests}
          dust={visit ? core.dustSince(visit.person.lastWorkoutAt, t) : myDust}
          training={visit ? t - visit.person.lastWorkoutAt < TRAINED_RECENTLY : income.active}
          mode={building ? 'build' : 'view'} canPlace={canPlaceHere}
          onTap={onTap} onSelect={setSelected} onPlacementChange={setPlacing} onPlace={onPlace} onMove={onMove} onStore={onStore}
          label={visit ? `The gym of ${visit.person.name}` : 'Your gym'}
        />
      </div>

      <div class="gy-top" ref={topUi}>
        {rooms.length > 1 && <FloorSwitcher rooms={rooms} active={activeFloor} onChange={switchFloor} />}
        {visit && <VisitFacts value={core.gymValue(visit.person.gym)} streakWeeks={visit.person.streakWeeks} dusty={core.dustSince(visit.person.lastWorkoutAt, t) > 0} />}
        {!visit && !building && myDust > 0 && <DustBanner multipliers={multipliers} lastWorkoutAt={lastWorkoutAt} t={t} />}
      </div>

      <div class="gy-bottom" data-build={building ? 'true' : 'false'} ref={bottomUi}>
        {building && (
          <>
            <BuildActions
              room={room} placing={placing} selected={selected} flash={flash}
              onPlace={() => canvas.current.commitPlacement()} onRotate={() => canvas.current.rotate()}
              onCancel={() => canvas.current.cancel()} onStore={() => canvas.current.store()}
            />
            <BuildTray room={room} placingId={placing && !placing.uid ? placing.itemId : null} onPick={pickFromTray} onFinish={applyFinish} onShop={(category) => openShop(category)} />
          </>
        )}
      </div>

      <ShopSheet open={sheet === 'shop'} onClose={closeSheet} at={shopAt} setAt={setShopAt} onPlace={enterBuild} />
      <CharacterSheet open={sheet === 'character'} onClose={closeSheet} />
      <RoomsSheet open={sheet === 'rooms'} onClose={closeSheet} t={t} onVisit={startVisit} />
      <MultipliersSheet
        open={sheet === 'multipliers'} onClose={closeSheet} multipliers={multipliers}
        onShop={(itemId) => openShop(categoryOf(itemById(itemId)), itemId)} onPlace={enterBuild}
      />
    </Screen>
  );
}
