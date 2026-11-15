import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getState, setState, initStore } from '../src/core/store.js';
import { now, HOUR, DAY } from '../src/core/time.js';
import * as A from '../src/core/actions.js';
import { createInitialState } from '../src/core/seed.js';
import { TUNING, canPlace, expansionCost, extraFloorCost, workoutPoints, bestOneRMs, gymMultipliers } from '../src/core/economy.js';
import { CATALOG, itemById } from '../src/gym/catalog.js';

// Shop items are looked up by kind, never by id: the catalog is still growing. Starter ids are fixed.
const byArea = (a, b) => a.size[0] * a.size[1] - b.size[0] * b.size[1];
const floorItems = CATALOG.filter((i) => (i.kind === 'equipment' || i.kind === 'decor') && !i.starter && i.mount !== 'wall' && i.price > 0).sort(byArea);
const gear = floorItems.find((i) => i.kind === 'equipment');
const decor = floorItems.find((i) => i.kind === 'decor');
const paidFloor = CATALOG.find((i) => i.kind === 'floor' && !i.starter && i.price > 0);
const paidWall = CATALOG.find((i) => i.kind === 'wall' && !i.starter && i.price > 0);
const paidCosmetic = CATALOG.find((i) => i.kind === 'cosmetic' && !i.starter);
const starterCosmetic = CATALOG.find((i) => i.kind === 'cosmetic' && i.starter);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

// Frozen state: an action that mutates instead of copying throws.
const boot = (patch = (s) => s) => initStore(deepFreeze(patch(createInitialState(Date.now()))));
const limited = (points) => (s) => ({ ...s, settings: { ...s.settings, unlimited: false }, wallet: { ...s.wallet, points } });
const freeSpot = (room, item) => {
  for (let y = 0; y < room.d; y++) for (let x = 0; x < room.w; x++) if (canPlace(room, item, x, y, 0)) return { x, y };
  return null;
};
const room = (i = 0) => getState().gym.rooms[i];
const wallet = () => getState().wallet;

beforeEach(() => { boot(); });

// ---------------------------------------------------------------------------------------------
// Settings and test lab

test('settings actions patch settings only', () => {
  A.setStyle('arcade');
  A.setTheme('ocean');
  A.setAppearance('dark');
  A.setUnlimited(false);
  const { settings } = getState();
  assert.deepEqual([settings.style, settings.theme, settings.appearance, settings.unlimited], ['arcade', 'ocean', 'dark', false]);
  assert.equal(settings.bodyKg, 78);
  assert.equal(getState().workouts.length, createInitialState(Date.now()).workouts.length);
});

test('setBodyKg validates', () => {
  assert.deepEqual(A.setBodyKg(84.5), { ok: true });
  assert.equal(getState().settings.bodyKg, 84.5);
  for (const bad of [0, -5, 20, 400, NaN, '80']) assert.deepEqual(A.setBodyKg(bad), { ok: false, reason: 'invalid' });
  assert.equal(getState().settings.bodyKg, 84.5);
});

test('skipTime moves the app clock forward only', () => {
  const before = now();
  assert.ok(A.skipTime(3 * DAY).ok);
  assert.ok(now() - before >= 3 * DAY && now() - before < 3 * DAY + 5000);
  assert.equal(getState().settings.timeOffsetMs, 3 * DAY);
  A.skipTime(HOUR);
  assert.equal(getState().settings.timeOffsetMs, 3 * DAY + HOUR);
  for (const bad of [0, -HOUR, NaN]) assert.deepEqual(A.skipTime(bad), { ok: false, reason: 'invalid' });
});

test('skipping time builds dust, lowers multipliers and ends consistency; a workout cleans up', () => {
  assert.equal(A.selDust(), 0);
  assert.ok(A.selConsistency().level >= 2);
  A.skipTime(8.5 * DAY);
  assert.ok(A.selDust() > 0.4 && A.selDust() < 0.65);
  A.skipTime(10 * DAY);
  assert.equal(A.selDust(), 1);
  assert.equal(A.selMultipliers().dustPenalty, TUNING.dustMaxPenalty);
  assert.ok(A.selMultipliers().average < 1);
  assert.equal(A.selConsistency().level, 0);
  assert.equal(A.selPassive().active, false);
  assert.equal(A.selFocusOffer(), null);
  A.startWorkout();
  A.addExercise('bench-press');
  A.toggleSetDone(0, 0);
  const { workout } = A.finishWorkout();
  assert.equal(A.selDust(), 0);
  assert.ok(workout.points.gymBonus >= 0, 'the comeback workout is not punished for the dust it clears');
});

test('resetAll goes back to day one, keeps the look and undoes skipped time', () => {
  A.setStyle('varsity');
  A.setTheme('forest');
  A.setAppearance('dark');
  A.setUnlimited(false);
  A.skipTime(5 * DAY);
  A.buyExpansion();
  A.startWorkout();
  A.resetAll();
  const s = getState();
  assert.deepEqual([s.settings.style, s.settings.theme, s.settings.appearance], ['varsity', 'forest', 'dark']);
  assert.equal(s.settings.unlimited, true);
  assert.equal(s.settings.timeOffsetMs, 0);
  assert.equal(s.active, null);
  assert.equal(s.gym.expansions, 0);
  assert.equal(s.gym.rooms[0].w, 5);
  assert.equal(A.selDust(), 0);
});

// ---------------------------------------------------------------------------------------------
// Wallet and passive income

test('canAfford follows the balance, or always says yes in unlimited mode', () => {
  assert.ok(A.canAfford(10 ** 9), 'unlimited by default');
  boot(limited(500));
  assert.ok(A.canAfford(500));
  assert.ok(!A.canAfford(501));
});

test('collectPassive pays what piled up and restarts the clock', () => {
  const income = A.selPassive();
  assert.ok(income.active && income.accrued > 0);
  const before = wallet();
  const result = A.collectPassive();
  assert.deepEqual(result, { ok: true, collected: income.accrued });
  assert.equal(wallet().points, before.points + income.accrued);
  assert.equal(wallet().lifetime, before.lifetime + income.accrued);
  assert.ok(Math.abs(wallet().passiveSince - now()) < 5000);
  assert.deepEqual(A.collectPassive(), { ok: false, reason: 'nothing' });
  assert.equal(A.selPassive().accrued, 0);
});

test('passive income stops piling up at the cap', () => {
  A.collectPassive();
  A.skipTime(3 * HOUR);
  const rate = A.selPassive().ratePerHour;
  assert.equal(A.selPassive().accrued, Math.floor(rate * A.selPassive().hoursAccrued));
  A.skipTime(40 * HOUR);
  const capped = A.selPassive();
  assert.equal(capped.hoursAccrued, TUNING.passiveCapHours);
  assert.equal(capped.accrued, Math.floor(capped.ratePerHour * TUNING.passiveCapHours));
  assert.equal(A.collectPassive().collected, capped.accrued);
});

test('collectPassive does nothing for someone who is not consistent', () => {
  boot((s) => ({ ...s, workouts: s.workouts.slice(-1) }));
  const before = wallet();
  assert.deepEqual(A.collectPassive(), { ok: false, reason: 'inactive' });
  assert.equal(wallet(), before);
});

// ---------------------------------------------------------------------------------------------
// Shop

test('unlimited mode: purchases succeed and never deduct, even with an empty wallet', () => {
  boot((s) => ({ ...s, wallet: { ...s.wallet, points: 0 } }));
  const before = wallet();
  assert.deepEqual(A.buyItem(gear.id, 3), { ok: true, cost: gear.price * 3 });
  assert.ok(A.buyFinish(0, paidFloor.id).ok);
  assert.ok(A.buyExpansion().ok);
  assert.ok(A.buyExtraFloor().ok);
  assert.equal(wallet(), before, 'the wallet is untouched');
  assert.equal(getState().owned[gear.id], 3);
  assert.equal(room(0).floor, paidFloor.id);
  assert.equal(room(0).w, 6);
  assert.equal(getState().gym.rooms.length, 2);
});

test('unlimited mode: earnings still add to points and lifetime', () => {
  const before = wallet();
  A.startWorkout();
  A.addExercise('bench-press');
  A.toggleSetDone(0, 0);
  const { workout } = A.finishWorkout();
  assert.ok(workout.points.total > 0);
  assert.equal(wallet().points, before.points + workout.points.total);
  assert.equal(wallet().lifetime, before.lifetime + workout.points.total);
});

test('limited mode: buying deducts the exact price and fails without funds', () => {
  boot(limited(gear.price * 2 + 10));
  assert.deepEqual(A.buyItem(gear.id, 2), { ok: true, cost: gear.price * 2 });
  assert.equal(wallet().points, 10);
  assert.equal(getState().owned[gear.id], 2);
  const lifetime = wallet().lifetime;
  assert.deepEqual(A.buyItem(gear.id), { ok: false, reason: 'funds' });
  assert.equal(wallet().points, 10);
  assert.equal(getState().owned[gear.id], 2);
  assert.equal(wallet().lifetime, lifetime, 'spending never changes lifetime earnings');
});

test('buyItem validates its input', () => {
  assert.deepEqual(A.buyItem('no-such-item'), { ok: false, reason: 'unknown-item' });
  assert.deepEqual(A.buyItem(paidFloor.id), { ok: false, reason: 'needs-room' });
  assert.deepEqual(A.buyItem(paidWall.id), { ok: false, reason: 'needs-room' });
  for (const qty of [0, -1, 1.5, NaN]) assert.deepEqual(A.buyItem(gear.id, qty), { ok: false, reason: 'invalid' });
  assert.deepEqual(A.buyItem('bench-worn'), { ok: false, reason: 'not-for-sale' });
  assert.deepEqual(A.buyItem(starterCosmetic.id), { ok: false, reason: 'owned' });
  assert.equal(getState().owned['bench-worn'], 1);
});

test('decor is bought like equipment and lands in storage', () => {
  assert.equal(A.selUnplaced(decor.id), 0);
  assert.ok(A.buyItem(decor.id).ok);
  assert.ok(A.buyItem(decor.id).ok);
  assert.equal(getState().owned[decor.id], 2);
  assert.equal(A.selUnplaced(decor.id), 2);
});

test('a cosmetic is bought once', { skip: !paidCosmetic && 'the catalog has no paid cosmetic yet' }, () => {
  boot(limited(paidCosmetic.price));
  assert.deepEqual(A.equip(paidCosmetic.slot, paidCosmetic.id), { ok: false, reason: 'not-owned' });
  assert.ok(A.buyItem(paidCosmetic.id, 5).ok);
  assert.equal(getState().owned[paidCosmetic.id], 1);
  assert.equal(wallet().points, 0);
  assert.deepEqual(A.buyItem(paidCosmetic.id), { ok: false, reason: 'owned' });
  assert.ok(A.equip(paidCosmetic.slot, paidCosmetic.id).ok);
  assert.equal(getState().avatar[paidCosmetic.slot], paidCosmetic.id);
});

test('buyFinish charges per square metre of the room and applies the finish', () => {
  const floorPrice = paidFloor.price * 25;
  const wallPrice = paidWall.price * 10;
  boot(limited(floorPrice + wallPrice));
  assert.deepEqual(A.buyFinish(0, paidFloor.id), { ok: true, cost: floorPrice });
  assert.deepEqual(A.buyFinish(0, paidWall.id), { ok: true, cost: wallPrice });
  assert.equal(wallet().points, 0);
  assert.equal(room().floor, paidFloor.id);
  assert.equal(room().wall, paidWall.id);
  assert.equal(getState().owned[paidFloor.id], 1);
  assert.equal(getState().owned[paidWall.id], 1);
});

test('buyFinish costs more in a bigger room, fails without funds, and an owned finish is free to reapply', () => {
  boot((s) => limited(paidFloor.price * 36 - 1)({ ...s, gym: { ...s.gym, rooms: [{ ...s.gym.rooms[0], w: 6, d: 6 }] } }));
  assert.deepEqual(A.buyFinish(0, paidFloor.id), { ok: false, reason: 'funds' });
  assert.equal(room().floor, 'floor-concrete');
  setState((s) => ({ ...s, wallet: { ...s.wallet, points: paidFloor.price * 36 } }));
  assert.deepEqual(A.buyFinish(0, paidFloor.id), { ok: true, cost: paidFloor.price * 36 });
  assert.ok(A.applyFinish(0, 'floor', 'floor-concrete').ok);
  assert.deepEqual(A.buyFinish(0, paidFloor.id), { ok: true, cost: 0 });
  assert.equal(room().floor, paidFloor.id);
  assert.equal(wallet().points, 0);
});

test('buyFinish validates its input', () => {
  assert.deepEqual(A.buyFinish(7, paidFloor.id), { ok: false, reason: 'unknown-room' });
  assert.deepEqual(A.buyFinish(0, gear.id), { ok: false, reason: 'not-a-finish' });
  assert.deepEqual(A.buyFinish(0, 'no-such-item'), { ok: false, reason: 'not-a-finish' });
});

test('applyFinish needs an owned finish of the right kind', () => {
  assert.deepEqual(A.applyFinish(0, 'floor', paidFloor.id), { ok: false, reason: 'not-owned' });
  assert.deepEqual(A.applyFinish(0, 'wall', paidFloor.id), { ok: false, reason: 'wrong-kind' });
  assert.deepEqual(A.applyFinish(0, 'ceiling', paidFloor.id), { ok: false, reason: 'wrong-kind' });
  assert.deepEqual(A.applyFinish(3, 'floor', 'floor-concrete'), { ok: false, reason: 'unknown-room' });
  A.buyFinish(0, paidWall.id);
  assert.ok(A.applyFinish(0, 'wall', 'wall-bare').ok);
  assert.equal(room().wall, 'wall-bare');
  assert.ok(A.applyFinish(0, 'wall', paidWall.id).ok);
  assert.equal(room().wall, paidWall.id);
});

test('expansions grow the room by one tile each way at a rising price, up to the cap', () => {
  const steps = TUNING.roomMaxSize - TUNING.roomStartSize;
  const budget = Array.from({ length: steps }, (_, n) => expansionCost(n)).reduce((a, b) => a + b, 0);
  boot(limited(budget));
  const placedBefore = room().items;
  for (let n = 0; n < steps; n++) {
    assert.deepEqual(A.buyExpansion(), { ok: true, cost: expansionCost(n) });
    assert.equal(room().w, TUNING.roomStartSize + n + 1);
    assert.equal(room().d, TUNING.roomStartSize + n + 1);
    assert.equal(getState().gym.expansions, n + 1);
  }
  assert.equal(wallet().points, 0);
  assert.deepEqual(room().items, placedBefore, 'placed items stay where they are');
  assert.deepEqual(A.buyExpansion(), { ok: false, reason: 'max-size' });
});

test('an expansion that cannot be paid changes nothing', () => {
  boot(limited(expansionCost(0) - 1));
  assert.deepEqual(A.buyExpansion(), { ok: false, reason: 'funds' });
  assert.equal(room().w, 5);
  assert.equal(getState().gym.expansions, 0);
});

test('an extra floor is a new empty starter-size room that becomes active', () => {
  boot(limited(extraFloorCost(1) + extraFloorCost(2)));
  assert.deepEqual(A.buyExtraFloor(), { ok: true, cost: 25000 });
  const { gym } = getState();
  assert.equal(gym.rooms.length, 2);
  assert.equal(gym.active, 1);
  assert.deepEqual(gym.rooms[1], { id: 'r2', name: 'First floor', w: 5, d: 5, floor: 'floor-concrete', wall: 'wall-bare', items: [] });
  assert.deepEqual(A.buyExtraFloor(), { ok: true, cost: 50000 });
  assert.equal(wallet().points, 0);
  assert.deepEqual(A.buyExtraFloor(), { ok: false, reason: 'funds' });
  assert.equal(getState().gym.rooms.length, 3);
});

test('a gym has a maximum number of floors', () => {
  for (let n = 1; n < TUNING.maxRooms; n++) assert.ok(A.buyExtraFloor().ok);
  assert.deepEqual(A.buyExtraFloor(), { ok: false, reason: 'max-rooms' });
  assert.equal(new Set(getState().gym.rooms.map((r) => r.id)).size, TUNING.maxRooms);
});

test('the next expansion grows the active room, and its price counts every expansion bought', () => {
  A.buyExpansion();
  A.buyExtraFloor();
  assert.deepEqual(A.buyExpansion(), { ok: true, cost: expansionCost(1) });
  assert.equal(room(0).w, 6);
  assert.equal(room(1).w, 6);
  assert.ok(A.setActiveRoom(0).ok);
  assert.equal(getState().gym.active, 0);
  assert.deepEqual(A.setActiveRoom(5), { ok: false, reason: 'unknown-room' });
});

// ---------------------------------------------------------------------------------------------
// Build

test('placing needs an owned copy that is not placed yet', () => {
  const spot = freeSpot(room(), gear);
  assert.deepEqual(A.placeItem(0, gear.id, spot.x, spot.y, 0), { ok: false, reason: 'none-in-storage' });
  assert.deepEqual(A.placeItem(0, 'bench-worn', 0, 0, 0), { ok: false, reason: 'none-in-storage' }, 'the only bench is already placed');
  A.buyItem(gear.id);
  const placed = A.placeItem(0, gear.id, spot.x, spot.y, 0);
  assert.ok(placed.ok);
  assert.deepEqual(room().items.find((p) => p.uid === placed.uid), { uid: placed.uid, itemId: gear.id, x: spot.x, y: spot.y, rot: 0 });
  assert.equal(A.selUnplaced(gear.id), 0);
  assert.deepEqual(A.placeItem(0, gear.id, 0, 0, 0), { ok: false, reason: 'none-in-storage' });
});

test('placing is refused where it does not fit', () => {
  A.buyItem(decor.id, 3);
  assert.deepEqual(A.placeItem(0, decor.id, 2, 1, 0), { ok: false, reason: 'blocked' }, 'the bench stands there');
  assert.deepEqual(A.placeItem(0, decor.id, 2, 2, 0), { ok: false, reason: 'blocked' });
  assert.deepEqual(A.placeItem(0, decor.id, 9, 9, 0), { ok: false, reason: 'blocked' });
  assert.deepEqual(A.placeItem(0, decor.id, 0, 0, 7), { ok: false, reason: 'blocked' });
  assert.deepEqual(A.placeItem(4, decor.id, 0, 0, 0), { ok: false, reason: 'unknown-room' });
  assert.deepEqual(A.placeItem(0, 'no-such-item', 0, 0, 0), { ok: false, reason: 'unknown-item' });
  assert.equal(room().items.length, 1);
  assert.equal(A.selUnplaced(decor.id), 3);
});

test('placed items get unique uids, also after storing one', () => {
  A.buyItem(decor.id, 4);
  const a = A.placeItem(0, decor.id, 0, 0, 0).uid;
  const b = A.placeItem(0, decor.id, 4, 4, 0).uid;
  A.storeItem(0, a);
  const c = A.placeItem(0, decor.id, 0, 4, 0).uid;
  A.buyExtraFloor();
  const d = A.placeItem(1, decor.id, 0, 0, 0).uid;
  const uids = getState().gym.rooms.flatMap((r) => r.items.map((p) => p.uid));
  assert.equal(new Set(uids).size, uids.length);
  assert.ok(uids.includes(b) && uids.includes(c) && uids.includes(d));
  assert.equal(A.selUnplaced(decor.id), 1, 'copies placed in any room are counted');
});

test('moveItem moves and rotates inside the room, and refuses collisions', () => {
  A.buyItem(decor.id);
  const { uid } = A.placeItem(0, decor.id, 0, 0, 0);
  assert.ok(A.moveItem(0, uid, 4, 4, 1).ok);
  assert.deepEqual(room().items.find((p) => p.uid === uid), { uid, itemId: decor.id, x: 4, y: 4, rot: 1 });
  assert.ok(A.moveItem(0, uid, 3, 4).ok, 'rotation is kept when not given');
  assert.equal(room().items.find((p) => p.uid === uid).rot, 1);
  assert.deepEqual(A.moveItem(0, uid, 2, 1, 0), { ok: false, reason: 'blocked' });
  assert.deepEqual(A.moveItem(0, uid, -3, 0, 0), { ok: false, reason: 'blocked' });
  assert.deepEqual(A.moveItem(0, 'nope', 0, 0, 0), { ok: false, reason: 'unknown-item' });
  assert.deepEqual(A.moveItem(9, uid, 0, 0, 0), { ok: false, reason: 'unknown-item' });
  assert.ok(A.moveItem(0, 'i1', 2, 2, 0).ok, 'the bench can slide over its own tiles');
});

test('storeItem puts an item back into storage and it stays owned', () => {
  assert.ok(A.storeItem(0, 'i1').ok);
  assert.equal(room().items.length, 0);
  assert.equal(getState().owned['bench-worn'], 1);
  assert.equal(A.selUnplaced('bench-worn'), 1);
  assert.deepEqual(A.storeItem(0, 'i1'), { ok: false, reason: 'unknown-item' });
  assert.ok(A.placeItem(0, 'bench-worn', 0, 0, 1).ok, 'and can be placed again, rotated');
  assert.equal(A.selUnplaced('bench-worn'), 0);
});

test('equipment only counts for the multipliers once it is placed', () => {
  const muscle = Object.keys(gear.muscles)[0];
  const before = A.selMultipliers().byMuscle[muscle];
  A.buyItem(gear.id);
  assert.equal(A.selMultipliers().byMuscle[muscle], before);
  const spot = freeSpot(room(), gear);
  A.placeItem(0, gear.id, spot.x, spot.y, 0);
  assert.ok(A.selMultipliers().byMuscle[muscle] > before);
});

// ---------------------------------------------------------------------------------------------
// Avatar

test('equip wears owned cosmetics in their own slot', () => {
  assert.ok(A.equip(starterCosmetic.slot, starterCosmetic.id).ok);
  assert.equal(getState().avatar[starterCosmetic.slot], starterCosmetic.id);
  const otherSlot = starterCosmetic.slot === 'shoes' ? 'top' : 'shoes';
  assert.deepEqual(A.equip(otherSlot, starterCosmetic.id), { ok: false, reason: 'wrong-slot' });
  assert.deepEqual(A.equip('hat', starterCosmetic.id), { ok: false, reason: 'unknown-slot' });
  assert.deepEqual(A.equip('top', gear.id), { ok: false, reason: 'wrong-slot' });
  assert.deepEqual(A.equip('top', 'no-such-item'), { ok: false, reason: 'wrong-slot' });
});

test('hair, beard and accessory can be taken off; clothes cannot', () => {
  for (const slot of ['hair', 'beard', 'accessory']) {
    assert.ok(A.equip(slot, null).ok);
    assert.equal(getState().avatar[slot], null);
  }
  for (const slot of ['top', 'bottom', 'shoes']) assert.deepEqual(A.equip(slot, null), { ok: false, reason: 'required' });
});

test('skin and hair colour take palette keys only', () => {
  assert.ok(A.setSkin('s5').ok);
  assert.ok(A.setHairColor('h1').ok);
  assert.equal(getState().avatar.skin, 's5');
  assert.equal(getState().avatar.hairColor, 'h1');
  assert.deepEqual(A.setSkin('s9'), { ok: false, reason: 'invalid' });
  assert.deepEqual(A.setHairColor('#ff0000'), { ok: false, reason: 'invalid' });
  assert.equal(getState().avatar.skin, 's5');
});

// ---------------------------------------------------------------------------------------------
// Workout session

test('a full session: start, add, log sets, finish, get paid', () => {
  boot(limited(1000));
  const history = getState().workouts;
  const lastBench = A.selLastTime('bench-press');

  assert.deepEqual(A.startWorkout({ name: 'Lunch lift' }), { ok: true, id: getState().active.id });
  assert.equal(getState().active.name, 'Lunch lift');
  assert.deepEqual(getState().active.exercises, []);

  assert.ok(A.addExercise('bench-press').ok);
  const first = getState().active.exercises[0].sets[0];
  assert.deepEqual(first, { ...lastBench.sets[0], done: false }, 'the first set mirrors last time');

  assert.ok(A.updateSet(0, 0, { kg: 40, reps: 10 }).ok);
  assert.ok(A.setSetType(0, 0, 'warmup').ok);
  assert.ok(A.toggleSetDone(0, 0).ok);
  assert.ok(A.addSet(0).ok);
  assert.ok(A.updateSet(0, 1, { kg: 75 }).ok);
  assert.ok(A.updateSet(0, 1, { reps: 8 }).ok);
  assert.ok(A.toggleSetDone(0, 1).ok);
  assert.ok(A.addSet(0).ok);
  assert.deepEqual(getState().active.exercises[0].sets[2], { type: 'normal', kg: 75, reps: 8, done: false }, 'a new set repeats the previous working set');
  assert.ok(A.toggleSetDone(0, 2).ok);
  assert.ok(A.addSet(0).ok, 'a fourth set that stays unticked');

  assert.ok(A.addExercise('pull-up').ok);
  assert.ok(A.toggleSetDone(1, 0).ok);
  assert.ok(A.addExercise('dumbbell-curl').ok, 'an exercise without any done set');

  const before = wallet();
  const result = A.finishWorkout();
  assert.ok(result.ok);
  const { workout } = result;
  const s = getState();

  assert.equal(s.active, null);
  assert.equal(s.workouts.length, history.length + 1);
  assert.equal(s.workouts[s.workouts.length - 1], workout);
  assert.deepEqual(workout.exercises.map((e) => [e.exId, e.sets.length]), [['bench-press', 3], ['pull-up', 1]], 'only done sets and exercises with done sets are kept');
  assert.equal(workout.userId, 'me');
  assert.equal(workout.name, 'Lunch lift');
  assert.ok(workout.endedAt >= workout.startedAt);
  assert.ok(!('focus' in workout));
  assert.ok(!s.workouts.slice(0, -1).some((w) => w.id === workout.id));

  const expected = workoutPoints(workout, {
    bodyKg: 78, best1RM: bestOneRMs(history, 78), multipliers: gymMultipliers(s.gym, itemById, 0), focus: null, buddiesFinished: 0,
  });
  assert.deepEqual(workout.points, expected);
  assert.ok(workout.points.total > 0);
  assert.equal(wallet().points, before.points + workout.points.total);
  assert.equal(wallet().lifetime, before.lifetime + workout.points.total);
  assert.equal(A.selLastTime('bench-press').workoutId, workout.id);
});

test('starting from a routine prefills its sets with last time numbers', () => {
  const routine = getState().routines.find((r) => r.exercises.some((e) => e.exId === 'bench-press'));
  assert.ok(A.startWorkout({ routineId: routine.id }).ok);
  const { active } = getState();
  assert.equal(active.name, routine.name);
  assert.equal(active.routineId, routine.id);
  assert.deepEqual(active.exercises.map((e) => e.exId), routine.exercises.map((e) => e.exId));
  active.exercises.forEach((entry, i) => {
    const template = routine.exercises[i].sets;
    const last = A.selLastTime(entry.exId).sets;
    assert.equal(entry.sets.length, template.length);
    entry.sets.forEach((s, j) => {
      assert.equal(s.done, false);
      assert.equal(s.type, template[j].type);
      const source = last[j] && last[j].type === template[j].type ? last[j] : template[j];
      assert.deepEqual([s.kg, s.reps], [source.kg, source.reps]);
    });
  });
});

test('a session without a name gets one, and starting twice is refused', () => {
  assert.ok(A.startWorkout().ok);
  assert.match(getState().active.name, /^(Morning|Afternoon|Evening) workout$/);
  assert.deepEqual(A.startWorkout(), { ok: false, reason: 'already-active' });
  assert.equal(A.defaultWorkoutName(7), 'Morning workout');
  assert.equal(A.defaultWorkoutName(13), 'Afternoon workout');
  assert.equal(A.defaultWorkoutName(20), 'Evening workout');
});

test('startWorkout validates routine and buddies', () => {
  assert.deepEqual(A.startWorkout({ routineId: 'r-nope' }), { ok: false, reason: 'unknown-routine' });
  assert.deepEqual(A.startWorkout({ buddies: ['sanne', 'nobody'] }), { ok: false, reason: 'unknown-friend' });
  assert.deepEqual(A.startWorkout({ buddies: [getState().strangers[0].id] }), { ok: false, reason: 'unknown-friend' });
  assert.equal(getState().active, null);
});

test('addSet prefills: last time at that position after a warm-up, a default without any history', () => {
  A.startWorkout();
  A.addExercise('deadlift');
  const last = A.selLastTime('deadlift').sets;
  assert.equal(last[0].type, 'warmup', 'the seed warms up on deadlifts');
  assert.equal(getState().active.exercises[0].sets[0].type, 'warmup');
  A.addSet(0);
  assert.deepEqual(getState().active.exercises[0].sets[1], { ...last[1], done: false }, 'not a copy of the warm-up');

  boot((s) => ({ ...s, workouts: [] }));
  A.startWorkout();
  A.addExercise('back-squat');
  assert.deepEqual(getState().active.exercises[0].sets, [{ type: 'normal', kg: 0, reps: 8, done: false }]);
  A.updateSet(0, 0, { kg: 60, reps: 5 });
  A.addSet(0);
  assert.deepEqual(getState().active.exercises[0].sets[1], { type: 'normal', kg: 60, reps: 5, done: false });
});

test('session edits validate their targets and values', () => {
  for (const call of [() => A.addExercise('bench-press'), () => A.addSet(0), () => A.removeSet(0, 0), () => A.removeExercise(0),
    () => A.toggleSetDone(0, 0), () => A.updateSet(0, 0, { kg: 50 }), () => A.setSetType(0, 0, 'drop'), () => A.discardWorkout(), () => A.finishWorkout()]) {
    assert.deepEqual(call(), { ok: false, reason: 'no-active' });
  }
  A.startWorkout();
  assert.deepEqual(A.addExercise('moon-walk'), { ok: false, reason: 'unknown-exercise' });
  A.addExercise('bench-press');
  assert.deepEqual(A.addSet(3), { ok: false, reason: 'unknown-target' });
  assert.deepEqual(A.toggleSetDone(0, 9), { ok: false, reason: 'unknown-target' });
  assert.deepEqual(A.removeSet(0, 9), { ok: false, reason: 'unknown-target' });
  assert.deepEqual(A.removeExercise(2), { ok: false, reason: 'unknown-target' });
  assert.deepEqual(A.setSetType(0, 0, 'giant'), { ok: false, reason: 'invalid' });
  for (const patch of [{ kg: -1 }, { kg: NaN }, { kg: 5000 }, { reps: 2.5 }, { reps: -1 }, { reps: 1000 }, { kg: '80' }]) {
    assert.deepEqual(A.updateSet(0, 0, patch), { ok: false, reason: 'invalid' });
  }
  const before = getState().active.exercises[0].sets[0];
  assert.ok(A.updateSet(0, 0, {}).ok);
  assert.deepEqual(getState().active.exercises[0].sets[0], before);
});

test('sets and exercises can be removed, types changed, ticks undone', () => {
  A.startWorkout();
  A.addExercise('bench-press');
  A.addExercise('pull-up');
  A.addSet(0);
  A.addSet(0);
  A.updateSet(0, 1, { kg: 77.5, reps: 6 });
  assert.ok(A.removeSet(0, 0).ok);
  assert.equal(getState().active.exercises[0].sets.length, 2);
  assert.equal(getState().active.exercises[0].sets[0].kg, 77.5);
  for (const type of A.SET_TYPES) {
    assert.ok(A.setSetType(0, 0, type).ok);
    assert.equal(getState().active.exercises[0].sets[0].type, type);
  }
  A.toggleSetDone(0, 0);
  assert.equal(getState().active.exercises[0].sets[0].done, true);
  A.toggleSetDone(0, 0);
  assert.equal(getState().active.exercises[0].sets[0].done, false);
  assert.ok(A.removeExercise(0).ok);
  assert.deepEqual(getState().active.exercises.map((e) => e.exId), ['pull-up']);
});

test('a session without a done set cannot be finished, only discarded', () => {
  const before = getState();
  A.startWorkout();
  A.addExercise('bench-press');
  assert.deepEqual(A.finishWorkout(), { ok: false, reason: 'no-sets' });
  assert.ok(getState().active, 'the session is still open');
  assert.ok(A.discardWorkout().ok);
  assert.equal(getState().active, null);
  assert.equal(getState().workouts, before.workouts);
  assert.equal(getState().wallet, before.wallet);
});

test('training with friends: they finish too, their workouts join the feed, everyone gets the bonus', () => {
  const feedBefore = getState().feed;
  assert.ok(A.startWorkout({ buddies: ['sanne', 'jeroen', 'sanne'], name: 'Trio' }).ok);
  assert.deepEqual(getState().active.buddies, ['sanne', 'jeroen']);
  A.addExercise('bench-press');
  A.addSet(0);
  A.toggleSetDone(0, 0);
  A.toggleSetDone(0, 1);
  A.addExercise('pull-up');
  A.toggleSetDone(1, 0);
  const { workout } = A.finishWorkout();
  const b = workout.points;
  assert.equal(b.buddyBonus, Math.round((b.base + b.gymBonus + b.focusBonus + b.durationBonus) * 0.3));
  assert.ok(b.buddyBonus > 0);

  const { feed, friends } = getState();
  assert.equal(feed.length, feedBefore.length + 2);
  const theirs = feed.slice(0, 2);
  assert.deepEqual(theirs.map((w) => w.userId).sort(), ['jeroen', 'sanne']);
  for (const w of theirs) {
    assert.ok(w.buddies.includes('me'));
    assert.equal(w.buddies.length, 2);
    assert.ok(!w.buddies.includes(w.userId));
    assert.equal(w.startedAt, workout.startedAt);
    assert.equal(w.endedAt, workout.endedAt);
    assert.deepEqual(w.exercises.map((e) => e.exId), workout.exercises.map((e) => e.exId));
    assert.ok(w.points.buddyBonus > 0);
    assert.equal(w.points.base + w.points.gymBonus + w.points.focusBonus + w.points.durationBonus + w.points.buddyBonus, w.points.total);
    assert.equal(w.kudos, 0);
    assert.equal(friends.find((f) => f.id === w.userId).lastWorkoutAt, workout.endedAt);
  }
  assert.equal(new Set(feed.map((w) => w.id)).size, feed.length);
  const sanne = theirs.find((w) => w.userId === 'sanne');
  assert.ok(sanne.exercises[0].sets[0].kg < workout.exercises[0].sets[0].kg, 'loads are scaled to the friend');
  assert.equal(sanne.exercises[0].sets[0].kg % 2.5, 0);
});

test('the focus offer of the moment the session started is paid out at the finish', () => {
  const offer = A.selFocusOffer();
  assert.ok(offer);
  A.startWorkout();
  assert.deepEqual(getState().active.focus, offer);
  for (const [i, exId] of [offer.exerciseIds[0], 'bench-press'].entries()) {
    A.addExercise(exId);
    A.addSet(i);
    A.toggleSetDone(i, 0);
    A.toggleSetDone(i, 1);
  }
  const { workout } = A.finishWorkout();
  const [focused, other] = workout.points.perExercise;
  assert.equal(focused.focus, true);
  assert.equal(other.focus, false);
  assert.ok(workout.points.focusBonus > 0);
  assert.equal(workout.points.focusBonus, Math.round(focused.base * focused.mult * 0.5));
  assert.ok(workout.points.lines.some((l) => l.key === 'focus'));
});

test('no focus bonus without an offer', () => {
  boot((s) => ({ ...s, workouts: s.workouts.slice(-1) }));
  assert.equal(A.selFocusOffer(), null);
  A.startWorkout();
  assert.equal(getState().active.focus, null);
  A.addExercise('back-squat');
  A.toggleSetDone(0, 0);
  assert.equal(A.finishWorkout().workout.points.focusBonus, 0);
});

test('finishing keeps a running passive clock, and starts it when the workout makes me consistent', () => {
  const running = wallet().passiveSince;
  A.startWorkout();
  A.addExercise('bench-press');
  A.toggleSetDone(0, 0);
  A.finishWorkout();
  assert.equal(wallet().passiveSince, running, 'income that was already accruing is not lost');

  // Two sessions last week and one this week: one more makes two active weeks.
  boot((s) => {
    const t = Date.now();
    const age = (w) => (t - w.endedAt) / DAY;
    const lastWeek = s.workouts.filter((w) => age(w) > 7 && age(w) < 14).slice(0, 2);
    return { ...s, workouts: [...lastWeek, s.workouts[s.workouts.length - 1]], wallet: { ...s.wallet, passiveSince: t - 30 * DAY } };
  });
  assert.equal(A.selPassive().active, false);
  A.startWorkout();
  A.addExercise('bench-press');
  A.toggleSetDone(0, 0);
  A.finishWorkout();
  assert.equal(A.selPassive().active, true);
  assert.ok(now() - wallet().passiveSince < 5000, 'the clock starts at the finish');
  assert.equal(A.selPassive().accrued, 0, 'no back pay for the weeks before');
});

test('selLastTime returns the most recent sets of an exercise', () => {
  const last = A.selLastTime('leg-press');
  const source = [...getState().workouts].reverse().find((w) => w.exercises.some((e) => e.exId === 'leg-press'));
  assert.equal(last.workoutId, source.id);
  assert.equal(last.t, source.endedAt);
  assert.deepEqual(last.sets, source.exercises.find((e) => e.exId === 'leg-press').sets.map(({ type, kg, reps }) => ({ type, kg, reps })));
  assert.equal(A.selLastTime('moon-walk'), null);
});

test('selBestOneRMs covers every exercise in the history', () => {
  const best = A.selBestOneRMs();
  assert.deepEqual(best, bestOneRMs(getState().workouts, 78));
  assert.ok(best['bench-press'] > 70 && best['bench-press'] < 120);
});

// ---------------------------------------------------------------------------------------------
// Routines

test('saveRoutine creates, then replaces by id', () => {
  const count = getState().routines.length;
  const created = A.saveRoutine({ name: '  Arms  ', exercises: [{ exId: 'dumbbell-curl', sets: [{ type: 'normal', kg: 12, reps: 12, done: true }] }] });
  assert.ok(created.ok);
  const saved = getState().routines.find((r) => r.id === created.id);
  assert.deepEqual(saved, { id: created.id, name: 'Arms', exercises: [{ exId: 'dumbbell-curl', sets: [{ type: 'normal', kg: 12, reps: 12 }] }] });
  assert.equal(getState().routines.length, count + 1);

  const updated = A.saveRoutine({ ...saved, name: 'Arms and abs', exercises: [...saved.exercises, { exId: 'hanging-leg-raise', sets: [{ type: 'super', kg: 0, reps: 10 }] }] });
  assert.deepEqual(updated, { ok: true, id: created.id });
  assert.equal(getState().routines.length, count + 1);
  assert.equal(getState().routines.find((r) => r.id === created.id).exercises.length, 2);

  const second = A.saveRoutine({ name: 'Another', exercises: saved.exercises });
  assert.notEqual(second.id, created.id);
  assert.equal(new Set(getState().routines.map((r) => r.id)).size, count + 2);
});

test('saveRoutine validates', () => {
  const exercises = [{ exId: 'bench-press', sets: [{ type: 'normal', kg: 60, reps: 8 }] }];
  assert.deepEqual(A.saveRoutine({ name: '   ', exercises }), { ok: false, reason: 'name-required' });
  assert.deepEqual(A.saveRoutine({ name: 'Empty', exercises: [] }), { ok: false, reason: 'empty' });
  assert.deepEqual(A.saveRoutine({ name: 'Odd', exercises: [{ exId: 'moon-walk', sets: [] }] }), { ok: false, reason: 'unknown-exercise' });
});

test('deleteRoutine removes it', () => {
  const [first] = getState().routines;
  assert.ok(A.deleteRoutine(first.id).ok);
  assert.ok(!getState().routines.some((r) => r.id === first.id));
  assert.deepEqual(A.deleteRoutine(first.id), { ok: false, reason: 'unknown-routine' });
});

test('routineFromWorkout turns a finished workout into a startable routine', () => {
  const source = getState().workouts[getState().workouts.length - 1];
  const made = A.routineFromWorkout(source.id, 'Like yesterday');
  assert.ok(made.ok);
  const routine = getState().routines.find((r) => r.id === made.id);
  assert.equal(routine.name, 'Like yesterday');
  assert.deepEqual(routine.exercises.map((e) => [e.exId, e.sets.length]), source.exercises.map((e) => [e.exId, e.sets.length]));
  assert.ok(routine.exercises.every((e) => e.sets.every((s) => !('done' in s))));
  const unnamed = A.routineFromWorkout(source.id);
  assert.equal(getState().routines.find((r) => r.id === unnamed.id).name, source.name);
  assert.deepEqual(A.routineFromWorkout('w-nope'), { ok: false, reason: 'unknown-workout' });
  assert.ok(A.startWorkout({ routineId: made.id }).ok);
});

// ---------------------------------------------------------------------------------------------
// Social

test('toggleKudos gives and takes back one kudos', () => {
  const target = getState().feed.find((w) => !w.kudosByMe);
  const others = getState().feed.filter((w) => w.id !== target.id);
  assert.ok(A.toggleKudos(target.id).ok);
  const given = getState().feed.find((w) => w.id === target.id);
  assert.deepEqual([given.kudos, given.kudosByMe], [target.kudos + 1, true]);
  assert.deepEqual(getState().feed.filter((w) => w.id !== target.id), others, 'other posts are untouched');
  A.toggleKudos(target.id);
  assert.deepEqual(getState().feed.find((w) => w.id === target.id), target);
  assert.deepEqual(A.toggleKudos('w-nope'), { ok: false, reason: 'unknown-workout' });
  assert.deepEqual(A.toggleKudos(getState().workouts[0].id), { ok: false, reason: 'unknown-workout' }, 'no kudos for yourself');
});
