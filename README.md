# GymBros

Log workouts, earn points, build your gym. A workout logger with a friends feed and a tycoon game on top: every set you log earns points, points furnish an isometric gym your character lives in, and the gym feeds back into training through per-muscle multipliers, passive income for consistency, and dust for neglect.

This repo holds prototype v1: a single self-contained web build with three switchable art directions (Studio, Arcade, Varsity), five colour themes, and a test lab (unlimited points, skip time, reset).

## Run it

```
npm install
npm run build        # writes dist/index.html, one file, no server needed
npm test             # economy, stats, seed and action tests
```

Open `dist/index.html` in a browser. The same file is what gets published as the artifact and what Cloudflare Pages can serve as-is (set the build command to `npm run build` and the output directory to `dist`).

## Layout

| Path | What |
| --- | --- |
| `src/core/` | Game rules and state. Pure functions in `economy.js` and `stats.js` (one `TUNING` table), store actions, seed data. No DOM. This is the part that ports to Swift. |
| `src/gym/` | Isometric room engine (Canvas 2D): models as data, three render styles, avatar, dust, build mode, thumbnails. See `src/gym/README.md`. |
| `src/exercises/` | Exercise data, mannequin rig, 10 looping animations, icons, muscle map. See `src/exercises/README.md`. |
| `src/ui/system/` | Design system: tokens, components, app shell, themes. See `src/ui/system/README.md`. |
| `src/ui/screens/` | The five tabs: Home, Train (and the workout session), Gym, Progress, Exercises. |
| `src/styles/` | Plain CSS, concatenated in filename order. Everything styles through tokens. |
| `docs/` | `SPEC.md` (product and contracts), `ECONOMY.md` (formulas and balance numbers), `REVIEWS.md` (how each part was graded), `NEXT.md` (guidance for the next prototype). |
| `tools/shot.mjs` | Headless screenshot and smoke-test helper. |

## Roadmap

1. Prototype v1: single-file web build (this).
2. Web app on Cloudflare: Pages for the client, Workers plus D1 for accounts, friends, feed and saved gyms.
3. Native iOS app: SwiftUI for the app, SpriteKit or Metal for the room, the `src/core` rules ported one to one with the same tests.
