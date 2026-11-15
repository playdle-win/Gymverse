// Balance checks: the numbers in docs/ECONOMY.md come from here.
// Print the full report with:  GB_BALANCE=1 node --test tests/balance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING, workoutPoints, gymMultipliers, expansionCost, extraFloorCost } from '../src/core/economy.js';
import { CATALOG, itemById } from '../src/gym/catalog.js';
import { SAMPLES, BESTS, starterGym, kittedGym, testLookup } from './_fixtures.mjs';

const WORKOUTS_PER_WEEK = 4;
const LIFTERS = [
  ['Beginner hour', 'beginnerHour', 'beginner', 70],
  ['Intermediate hour', 'intermediateHour', 'intermediate', 78],
  ['Advanced hour', 'advancedHour', 'advanced', 88],
  ['Junk volume hour', 'junkVolume', 'intermediate', 78],
  ['Quick 20 minutes', 'quickTwenty', 'intermediate', 78],
];

// One of everything the live shop sells, placed. Room space is ignored: this is the ceiling.
const liveKittedGym = () => ({
  rooms: [{ items: CATALOG.filter((i) => i.size).map((i, n) => ({ uid: `k${n}`, itemId: i.id, x: 0, y: 0, rot: 0 })) }],
});

function report() {
  const gyms = {
    dayOne: gymMultipliers(starterGym(), testLookup, 0),
    kitted: gymMultipliers(kittedGym(), testLookup, 0),
    liveKitted: gymMultipliers(liveKittedGym(), itemById, 0),
    dusty: gymMultipliers(starterGym(), testLookup, 1),
  };
  const score = (key, lifter, bodyKg, extra) => workoutPoints(SAMPLES[key](), { bodyKg, best1RM: BESTS[lifter], ...extra }).total;
  const workouts = LIFTERS.map(([label, key, lifter, bodyKg]) => ({
    label,
    dayOne: score(key, lifter, bodyKg, { multipliers: gyms.dayOne }),
    kitted: score(key, lifter, bodyKg, { multipliers: gyms.kitted }),
    liveKitted: score(key, lifter, bodyKg, { multipliers: gyms.liveKitted }),
    withBuddy: score(key, lifter, bodyKg, { multipliers: gyms.dayOne, buddiesFinished: 1 }),
    firstTime: workoutPoints(SAMPLES[key](), { bodyKg, multipliers: gyms.dayOne }).total,
  }));
  const reference = workouts[1].dayOne;
  const passive = TUNING.consistencyLevels.map(({ label }, level) => {
    const rate = TUNING.passivePerHour[level] * gyms.dayOne.average;
    return { label, perHour: rate, perDay: Math.floor(rate * 24), perDayOneCollect: Math.floor(rate * TUNING.passiveCapHours), shareOfWorkout: (rate * 24) / reference };
  });
  const weeklyTraining = WORKOUTS_PER_WEEK * reference;
  const weeklyPassive = 7 * passive[3].perDay;
  const weekly = weeklyTraining + weeklyPassive;
  const expansionsToCap = Array.from({ length: TUNING.roomMaxSize - TUNING.roomStartSize }, (_, n) => expansionCost(n)).reduce((a, b) => a + b, 0);
  const prices = [
    ['Starter gear', 480], ['Squat rack', 2400], ['Top machine', 9000], ['Rubber floor, 5x5 room (24 per m²)', 24 * 25],
    ['First expansion', expansionCost(0)], ['Third expansion', expansionCost(2)], ['All expansions of one room', expansionsToCap], ['Second floor', extraFloorCost(1)],
  ].map(([label, price]) => ({ label, price, workouts: price / reference, weeks: price / weekly }));
  return { gyms, workouts, reference, passive, weeklyTraining, weeklyPassive, weekly, prices };
}

const r = report();
const row = (label) => r.workouts.find((w) => w.label === label);

if (process.env.GB_BALANCE) {
  const pct = (v) => `${Math.round(v * 100)}%`;
  console.log('\nGym multipliers (average over muscles)');
  console.table(Object.fromEntries(Object.entries(r.gyms).map(([k, g]) => [k, { average: g.average, vibe: g.vibe, dustPenalty: g.dustPenalty }])));
  console.log('Workout points');
  console.table(r.workouts);
  console.log(`Passive income on the day-one gym (reference workout = ${r.reference})`);
  console.table(r.passive.map((p) => ({ ...p, perHour: p.perHour.toFixed(2), shareOfWorkout: pct(p.shareOfWorkout) })));
  console.log(`Weekly income at ${WORKOUTS_PER_WEEK} workouts: training ${r.weeklyTraining} + passive ${r.weeklyPassive} = ${r.weekly}`);
  console.table(r.prices.map((p) => ({ ...p, workouts: p.workouts.toFixed(1), weeks: p.weeks.toFixed(1) })));
}

test('a solid hour earns 300 to 600 points before multipliers, whatever the lifter', () => {
  for (const label of ['Beginner hour', 'Intermediate hour', 'Advanced hour']) {
    const { dayOne } = row(label);
    assert.ok(dayOne >= 300 && dayOne <= 600, `${label}: ${dayOne}`);
  }
});

test('stronger lifters earn more, but effort counts more than strength', () => {
  const [beginner, intermediate, advanced] = ['Beginner hour', 'Intermediate hour', 'Advanced hour'].map((l) => row(l).dayOne);
  assert.ok(beginner < intermediate && intermediate < advanced);
  assert.ok(advanced < beginner * 2, `advanced ${advanced} vs beginner ${beginner}`);
});

test('junk volume and short sessions earn clearly less than a solid hour', () => {
  assert.ok(row('Junk volume hour').dayOne < r.reference * 0.5, `junk: ${row('Junk volume hour').dayOne}`);
  assert.ok(row('Quick 20 minutes').dayOne < r.reference * 0.45, `quick: ${row('Quick 20 minutes').dayOne}`);
  assert.ok(row('Quick 20 minutes').dayOne > 60, 'a short session is still worth logging');
});

test('logging an exercise for the first time is scored neutrally, close to a normal session', () => {
  for (const w of r.workouts.slice(0, 3)) assert.ok(Math.abs(w.firstTime - w.dayOne) < w.dayOne * 0.1, `${w.label}: ${w.firstTime} vs ${w.dayOne}`);
});

test('a fully kitted gym pays noticeably more than day one, within the caps', () => {
  const ceiling = 1 + TUNING.muscleBonusCap + TUNING.vibeCap;
  for (const gym of [r.gyms.kitted, r.gyms.liveKitted]) {
    assert.ok(gym.average >= 1 && gym.average <= ceiling);
    assert.ok(Object.values(gym.byMuscle).every((m) => m <= ceiling + 1e-9));
  }
  const ratio = row('Intermediate hour').kitted / row('Intermediate hour').dayOne;
  assert.ok(ratio > 1.15 && ratio < 1.7, `kitted pays ${ratio.toFixed(2)}x`);
  assert.ok(row('Intermediate hour').liveKitted >= row('Intermediate hour').dayOne);
});

test('a fully dusty gym costs a quarter of the multiplier', () => {
  assert.ok(Math.abs(r.gyms.dayOne.average - r.gyms.dusty.average - TUNING.dustMaxPenalty) < 1e-9);
});

test('passive income is meaningful but clearly less than training', () => {
  const [off, warming, consistent, lockedIn] = r.passive;
  assert.equal(off.perDay, 0);
  assert.equal(warming.perDay, 0);
  assert.ok(consistent.perDay > 0 && consistent.perDay < lockedIn.perDay);
  assert.ok(lockedIn.shareOfWorkout >= 0.15 && lockedIn.shareOfWorkout <= 0.35, `top level: ${lockedIn.shareOfWorkout.toFixed(2)} of a workout per day`);
  assert.ok(consistent.shareOfWorkout >= 0.08 && consistent.shareOfWorkout < lockedIn.shareOfWorkout);
  assert.ok(r.weeklyPassive < r.weeklyTraining * 0.55, `weekly passive ${r.weeklyPassive} vs training ${r.weeklyTraining}`);
});

test('prices are reachable: starter gear in a session or two, the second floor in months', () => {
  const weeks = (label) => r.prices.find((p) => p.label === label).weeks;
  assert.ok(r.prices.find((p) => p.label === 'Starter gear').workouts < 2);
  assert.ok(weeks('First expansion') < 1);
  assert.ok(weeks('Squat rack') > 0.5 && weeks('Squat rack') < 2.5);
  assert.ok(weeks('Top machine') > 2 && weeks('Top machine') < 6);
  assert.ok(weeks('Second floor') > 6 && weeks('Second floor') < 16);
});
