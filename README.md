# How You Coin

Play at **https://howyoucoin.vercel.app**. New contributors and coding agents should also read [AGENTS.md](AGENTS.md) for the source map, current gameplay decisions, and handoff notes.

A touch-first infinite marble runner built with Three.js. Choose Prism Orbit (a rainbow track through space), Abyssal Bloom (bioluminescent ocean), Golden Dunes (sandstone canyons), Cloud Forest (floating woodland islands), or Night Shift (neon city), then collect spinning gold coins. Drag to steer; swipe up or use the jump button. Desktop controls: A/D or left/right arrows, Space to jump, Esc/P to pause.

## Run locally

```sh
cd neon-drift
npm ci
npm run build
npm run dev
```

The server listens on port 4173. Source lives in `neon-drift/src`; static assets and the generated bundle live in `neon-drift/dist`. Run the build after changing JavaScript. HTML and CSS can be edited directly in `dist`.

## Amp orbs

Amp runs the executable `.agents/setup` when preparing a fresh orb. It uses the base image's Node.js, npm, and Python 3, installs dependencies from the lockfile, builds the game, and reuses the preinstalled agent-browser Chromium (installing it only if missing). Setup is safe to rerun; it never deletes `dist`, starts a server, or deploys to Vercel. No application secrets or database are needed.

From the repository root, start the supervised preview and obtain its authenticated portal link:

```sh
amp orb services ensure
```

The `preview` service in `.amp/services.yaml` builds before starting, serves only `neon-drift/dist` on port 4173, and checks `/game.js` for readiness. Share the portal URL printed by Amp, not a localhost URL. Amp supervises the server across CLI updates and orb pause/resume; no `.agents/resume` hook is needed. Generated portal links and local review captures are ignored by Git.

After editing JavaScript, run `npm run build` inside `neon-drift` and refresh the browser; the preview does not watch source files. Use `amp orb service logs preview` to inspect it or `amp orb service restart preview` to rebuild and restart it.

For the browser checks below, reuse the orb's Chromium rather than downloading Playwright's separate browser. Export this in the same shell that runs the checks, then skip `npx playwright install chromium`:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(printf '%s\n' "$HOME"/.agent-browser/browsers/chrome-*/chrome | sort -V | tail -n 1)"
```

Orb configuration must reach the repository's default branch before future orbs can use it.

## Gameplay

Procedurally generated curved tracks, gaps, pink blocks, full-width low barriers, moving obstacles, coins, and boost gates. Speed rises with distance (18 + 0.56 × √meters) and caps at 38 m/s before boosts. Mixed obstacles appear earlier as distance grows. Hazards are spaced so jumping remains possible. The opening stretch introduces steering, a block, a gap, then a boost. World chunks and city instances are recycled, keeping the live course bounded. Personal best and preferences are saved locally in the browser.

Drag gestures support a second finger on the jump button. Steering uses an exact critically damped spring for precise tracking without overshoot; deliberate movement beyond the road falls unless star power is active. Scenery scrolls in the same direction as the road. Marble reflections use a 64px local cube capture of moving scenery at roughly 8 Hz, with simplified reflection geometry to limit GPU work. Jump buffering and a short coyote window make timing forgiving. Switching tabs automatically pauses. Sound starts only after a user interaction. Settings include synthesized sound/music, bloom, reduced camera motion, steering sensitivity, and a Show hints switch that takes effect immediately, including all transient messages. Hints default to the first three runs per browser/device; an explicit on/off choice overrides that automatic behavior and persists. Settings are also available from the pause panel. The web manifest and Apple touch icon support adding the game to an iPad/iPhone home screen.

## Verify

```sh
cd neon-drift
npm test
npx playwright install chromium
# With the preview server running:
node test/browser-check.mjs
node test/gameplay-check.mjs
node test/worlds-check.mjs
node test/expansion-check.mjs
node test/coin-meter-check.mjs
node test/star-falls-check.mjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium installation. The visual check captures desktop, iPad, and phone screenshots in `/tmp`. The deterministic gameplay check uses a controlled frame clock and disables draw calls; it exercises a 2.5 km course with normal input events, then verifies falling, restart, and record persistence. It is complemented by actual rendered browser checks, not a GPU performance benchmark.

Validated in Chromium with desktop and touch viewport emulation. Actual iOS Safari device performance still needs hands-on testing.

## Deploy

The Vercel project is `howyoucoin`. Root `vercel.json` installs/builds the nested game and publishes `neon-drift/dist`. Run deployment commands at the repository root. A fresh checkout may need `vercel link --project howyoucoin` with access to the existing project; local `.vercel` linkage is intentionally not committed. The game needs no application environment variables.

```sh
vercel deploy --prod --project howyoucoin
```

Fonts are self-hosted with OFL licenses in `dist/fonts`. No backend or third-party game assets are required.

Coins fill a visible 100-coin star meter. Every 100 coins automatically grants six seconds of collision immunity against blocks and barriers, shattering obstacles into debris. The first charge is available in about 29 seconds with perfect collection on the opening course (before boosts); later charges arrive faster as speed increases. Coins collected while powered charge the next meter. The old floating star pickups have been replaced. Distance remains the personal-best score. The timer freezes while paused and resets on a new run. Star power supports the marble at road height across gaps and beyond either road edge, without restricting steering or jumping. When it expires, normal support rules resume immediately: return to solid road before the countdown ends to avoid falling. The effect includes a chromatic shield, orbiting rings, a rainbow trail, an activation shockwave, impact debris, a countdown HUD, and synthesized audio.
