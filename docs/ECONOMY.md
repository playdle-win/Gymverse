# GymBros economy

Source of truth: `src/core/economy.js` (pure functions, one `TUNING` object). Every number below is measured by
`tests/balance.test.mjs`; reprint the tables with `GB_BALANCE=1 node --test tests/balance.test.mjs`.

## Formulas in plain words

**Workout points.** Only done sets count.

1. *Set* = `setScale x (load x reps) ^ volumeExponent x type factor x intensity factor`. Load is the bar weight, or
   `bodyKg x bwFactor + added kg` for bodyweight exercises. Reps count up to `repCap`.
   - Type factor: warm-up 0.3, normal 1, drop set and superset 1.1.
   - Intensity factor: the set's estimated 1RM (Epley, reps capped at 12) against your best for that exercise before
     this workout. 1.0 at your best, falling in a straight line to 0.6 at half your best, rising to at most 1.1 for a
     record. No history for the exercise = 1.0.
2. *Exercise* = its sets added up, best first. The best 6 count in full; each further set is worth 75% of the one
   before. The same exercise logged twice in a workout is scored as one.
3. *Gym bonus* = exercise points x (weighted mean of the gym's multipliers for its muscles - 1); primary muscles
   weigh 1, secondary 0.5.
4. *Focus bonus* = +50% on exercises whose primary muscles include the focus muscle.
5. *Time* = 0.6 points per minute, for at most 3.5 minutes per done set and 90 minutes in total.
6. *Buddy bonus* = +15% of everything above per buddy who finished, at most +30%.

Three separate brakes stop junk from paying: the exponent (more reps in a set), the 6-set taper (more sets of an
exercise) and the intensity factor (lighter weights). All parts are whole numbers and add up exactly to the total.

**Gym multipliers.** Per muscle: `1 + equipment + vibe - dust`. Equipment contributions for one muscle are sorted
largest first and the nth counts `0.7^n` (so the shop's "+10%" is true for your best piece), capped at +60%.
Vibe is the sum of placed decor, the nth copy of the same item counting `0.5^n`, capped at +10%. Dust subtracts up
to 0.25. Only items placed in a room count, across all floors.

**Dust.** 0 for 3 days after a workout, then linear to 1 at 14 days. One workout clears it.

**Consistency.** From 7-day blocks counted back from now. An active week has at least 2 workouts.

| Level | Label | Workouts in last 14 days | Active weeks in a row |
| --- | --- | --- | --- |
| 0 | Off | 0 | 0 |
| 1 | Warming up | 2 | 0 |
| 2 | Consistent | 4 | 2 |
| 3 | Locked in | 6 | 4 |

**Passive income.** From Consistent up: `passivePerHour[level] x average gym multiplier` (dust included), piling up
since the last collection for at most 12 hours.

**Focus offer.** Only from Consistent up. Training load per muscle over the last 21 days in set-equivalents (done
working sets; primary 1, secondary 0.5). If the least trained muscle sits below 40% of the average, exercises that
train it as a primary earn x1.5 in the next workout. Muscles no exercise trains as a primary (calves today) are
never offered. The offer is frozen on the session when it starts.

**Space and finishes.** Expansion n costs `round(800 x 1.7^n)` and grows the active room by one tile each way, up to
10 x 10; n counts every expansion ever bought. Floor n+1 costs `25,000 x 2^(n-1)`, up to 4 floors. A floor finish
costs price x tiles, a wall finish price x (w + d); once owned, a finish can be applied to any room for free.

## TUNING

| Key | Value | Meaning |
| --- | --- | --- |
| `setScale`, `volumeExponent` | 2.5, 0.36 | set points = 2.5 x (load x reps)^0.36; double volume = +28% |
| `repCap`, `oneRmRepCap` | 30, 12 | reps that count for points / for the 1RM estimate |
| `typeFactor` | 0.3 / 1 / 1.1 / 1.1 | warm-up / normal / drop / superset |
| `intensityFloor`, `intensityFloorRatio`, `intensityCeil` | 0.6, 0.5, 1.1 | factor at half your best, and the record cap |
| `fullSets`, `setDecay` | 6, 0.75 | sets per exercise in full, then the taper |
| `durationPerMin`, `minutesPerSet`, `durationCapMin` | 0.6, 3.5, 90 | the time term |
| `primaryWeight`, `secondaryWeight` | 1, 0.5 | muscle weights (multipliers and training load) |
| `stackDecay`, `muscleBonusCap` | 0.7, 0.6 | equipment stacking per muscle |
| `vibeRepeatDecay`, `vibeCap` | 0.5, 0.1 | decor |
| `dustCleanDays`, `dustFullDays`, `dustMaxPenalty` | 3, 14, 0.25 | dust curve and penalty |
| `activeWeekMin`, `consistencyLevels` | 2, table above | consistency |
| `passivePerHour`, `passiveCapHours`, `passiveMinLevel` | [0, 0, 2.5, 4.5], 12, 2 | passive income |
| `focusWindowDays`, `focusThreshold`, `focusMult`, `focusMinLevel` | 21, 0.4, 1.5, 2 | focus offer |
| `buddyRate`, `buddyCap` | 0.15, 0.3 | buddy bonus |
| `expansionBase`, `expansionGrowth`, `roomStartSize`, `roomMaxSize` | 800, 1.7, 5, 10 | room space |
| `extraFloorBase`, `extraFloorGrowth`, `maxRooms` | 25,000, 2, 4 | extra floors |

## Measured

Sample sessions are defined in `tests/_fixtures.mjs`; each lifter walks in with realistic personal bests.
"Kitted" places one of each of nine machines and six decor items of a fixed test catalog (average multiplier 1.245).

| Session | Day-one gym | Kitted gym | With one buddy | No history |
| --- | --- | --- | --- | --- |
| Beginner hour (15 light sets) | 320 | 390 | 368 | 324 |
| Intermediate hour (17 working sets, warm-up, drop set) | 392 | 479 | 451 | 404 |
| Advanced hour (heavy compounds, 17 working sets) | 554 | 681 | 637 | 552 |
| Junk hour (20 x 25 reps with a 20 kg bar) | 163 | 196 | 187 | 248 |
| Quick 20 minutes (6 sets) | 128 | 158 | 147 | 131 |

- The seeded history (4 to 5 exercises, 15 to 21 sets, 47 to 65 minutes) earns 307 to 449 per session, 350 on average.
- A strong lifter earns 1.7x a beginner for an hour, not 5x: effort counts more than absolute strength.
- Near the ceiling: the advanced hour (a leg day) in the kitted gym with a quads focus offer and two buddies earns 1,080.
- Gym multipliers: day one 1.002 on average, kitted 1.245, fully dusty day one 0.752.

Passive income on the day-one gym, against the intermediate hour (392):

| Level | Per hour | Per day, collected twice or more | Per day, collected once | Share of a workout per day |
| --- | --- | --- | --- | --- |
| Off, Warming up | 0 | 0 | 0 | 0% |
| Consistent | 2.5 | 60 | 30 | 15% |
| Locked in | 4.5 | 108 | 54 | 28% |

Time to afford at 4 intermediate workouts a week on the day-one gym, Locked in, collecting twice a day
(training 1,568 + passive 756 = 2,324 a week; passive is a third of income at best, a fifth when collected once a day):

| Purchase | Price | Workouts | Weeks |
| --- | --- | --- | --- |
| Starter gear | 480 | 1.2 | 0.2 |
| Rubber floor for the 5 x 5 room (24 per m²) | 600 | 1.5 | 0.3 |
| First expansion | 800 | 2.0 | 0.3 |
| Squat rack | 2,400 | 6.1 | 1.0 |
| Third expansion | 2,312 | 5.9 | 1.0 |
| Top machine | 9,000 | 23 | 3.9 |
| One room to 10 x 10 (5 expansions) | 15,084 | 38 | 6.5 |
| Second floor | 25,000 | 64 | 10.8 |

The seeded player starts with about 8,700 points earned by the history and an untouched gym, so the first session
in the shop already offers real choices once unlimited points are switched off.

## Judgment calls

- The workout that ends a break is scored with a clean gym: it is the workout that clears the dust. Dust lowers the
  multipliers shown in the gym and the passive rate while it lasts.
- Passive income ends when the last 7 days hold fewer than 2 workouts (about 5 days after stopping for a 3-a-week
  lifter). A workout that makes you consistent starts the clock at that moment, with no back pay.
- Weeks are trailing 7-day blocks, not calendar weeks: no time zones, the same on every platform.
- Starter items (price 0) cannot be bought again, so the free bench cannot be stacked for free chest bonus.
