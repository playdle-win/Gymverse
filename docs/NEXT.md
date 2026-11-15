# Guidance for the next prototype

## 1. Pick an art direction

All three run on the same models, layout and logic, so the choice costs nothing technically. What each one commits you to later:

| | Studio | Arcade | Varsity |
| --- | --- | --- | --- |
| Feel | Calm, premium, Apple-native | Nostalgic, playful, Habbo | Loud, sporty, sticker-like |
| Room art | Soft vector isometric | Low-res pixel art | Thick outlines, flat fills |
| Strongest at | Looking like a serious fitness app that happens to have a game | Making the gym feel like a game people screenshot | Brand energy, merch, social posts |
| Risk | The game can feel like a feature instead of the hook | Pixel UI type is tiring for long logging sessions | Italics and heavy blocks get noisy on dense screens |
| Art cost per new item | Low (shading does the work) | Medium (small sizes need hand-tuned silhouettes) | Low to medium |
| iOS port | SwiftUI defaults fit as-is | Custom font and borders everywhere | Custom font, otherwise close to defaults |

A mix is possible and worth considering: Studio UI for logging, Arcade or Varsity rendering for the room only. The style setting already drives UI and room separately under the hood (one token set, one renderer style), so a hybrid is a one-line change to try.

## 2. Decisions that shape prototype 2

1. **Art direction** (above), and whether users can switch or the brand picks one.
2. **How much the gym should matter to points.** Today a fully kitted gym adds roughly 25% on average, capped at +60% per muscle. Higher makes the game pull harder but lets rich gyms out-earn hard training.
3. **Room size and floors.** Start 5 x 5, cap 10 x 10, up to 4 floors. Bigger rooms need camera work on small phones.
4. **Passive income cap.** 12 hours, so opening the app twice a day collects everything. Shorter pushes daily opens; longer is kinder.
5. **Dust.** Starts after 3 days, full at 14, costs up to 25% of multipliers. Decide whether a rest week or holiday mode should pause it.
6. **Buddy workouts.** Simulated here. Real ones need both people to finish within some window; decide the window and whether it requires being in the same place.
7. **Units.** Metric only now. Prices for finishes are per m².
8. **Exercise art.** The mannequin rig is good enough to test with. For release decide between extending the rig (cheap, consistent) or commissioning illustrated or 3D loops.

## 3. Recommended scope for prototype 2 (web app on Cloudflare)

- **Accounts and real friends**: Cloudflare Pages for the client, Workers plus D1 for users, friendships, workouts, feed, gyms. Sign in with Apple from day one since iOS is the target.
- **Server-side scoring**: move `workoutPoints` behind the API (the pure functions in `src/core/economy.js` run unchanged in a Worker) so points cannot be forged.
- **Real buddy sessions**: invite, live status, bonus on both finishing.
- **Content**: 60 to 80 exercises, 100+ items, item sets and rarities, seasonal drops. The catalog and model kit are data-driven, so this is authoring, not engineering.
- **Gym depth**: guests that react, item interactions for decor (mirror selfies, water cooler), room themes, a visit log ("Noor visited your gym"), likes on gyms.
- **Logging depth**: rest timer that survives reloads, supersets that pair two exercises, plate calculator, notes, bodyweight tracking, Apple Health import later.
- **Onboarding**: the day-one room is the hook. A 30-second first run: name, avatar, first workout, first purchase.

## 4. What changes for the native iOS app

- `src/core` ports one to one to Swift (pure functions, one tuning table, 178 tests to mirror).
- UI: SwiftUI with the Studio tokens maps almost directly; the other two styles need custom fonts and control styles.
- Room: SpriteKit (2D isometric, closest to this) or RealityKit/SceneKit if you want real 3D. The model kit (boxes, cylinders, wedges as data) converts to either.
- Platform features the web cannot do: HealthKit, Live Activities for the running workout, widgets for streak and passive income, haptics on set completion, push notifications when a friend finishes or dust starts to settle.
- App Review: points must not be purchasable in a way that looks like gambling; cosmetic IAP is fine.

## 5. Known gaps in prototype 1

- Friends, feed, buddy sessions and other people's gyms are seeded, not live.
- Text sizes are fixed; no Dynamic Type scaling yet.
- No swipe-back gesture; no keyboard control of the placement ghost.
- Arcade: a lying avatar with dumbbells is cluttered at pixel resolution; short hair reads as a cap.
- Google Fonts (Arcade and Varsity display faces) could not be verified inside the build sandbox; they load from fonts.googleapis.com in the artifact.
