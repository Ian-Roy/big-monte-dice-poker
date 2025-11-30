# Dice-Box Fork (onscreen + picking + held state)

This project vendors a fork of `@3d-dice/dice-box` at `vendor/dice-box-fork` and links it via `package.json` (`link:./vendor/dice-box-fork`).

## What’s different
- Defaults to onscreen rendering (`offscreen: false`) to enable picking.
- Picking API: `pickDieAt(x, y)` / `pickDieFromPointer(event)` return `{ hit, rollId, groupId, dieId }` and trigger `onDiePicked`.
- Held visuals: `setHeldState({ ids, held, scale = 1.08, color = '#3aa0ff' })` tints dice blue and scales them up (per-instance tint for instanced meshes).

The app uses these to let users click a 3D die to toggle hold without switching layers.

## Local usage
- Build fork dist (needed for GH Pages): `yarn --cwd vendor/dice-box-fork build`
- App build: `yarn build` (uses the linked fork and emits the forked dist under `dist/assets`).
- Tests: `yarn test:run`

## Updating the fork from upstream
1) Add upstream remote (once):
```
git -C vendor/dice-box-fork remote add upstream https://github.com/3d-dice/dice-box.git
```
2) Pull latest upstream changes:
```
git -C vendor/dice-box-fork fetch upstream
git -C vendor/dice-box-fork checkout main
git -C vendor/dice-box-fork merge upstream/main   # or checkout a tag, e.g., v1.1.4
```
3) Re-apply fork patches if needed (picking/held defaults are in `src/WorldFacade.js`, `src/components/world.onscreen.js`, `src/components/Dice.js`).
4) Rebuild dist so the app consumes the updated code:
```
yarn --cwd vendor/dice-box-fork install
yarn --cwd vendor/dice-box-fork build
```
5) Commit the updated `vendor/dice-box-fork` (including `dist/`) and rerun `yarn build` at the root to verify.

## Deployment notes (GitHub Pages)
- `yarn build` already succeeds locally; it emits the forked Dice-Box bundles into `dist/assets/*world*.js`.
- Ensure `vendor/dice-box-fork/dist` is committed so the linked dependency works in the GitHub Pages build environment (no separate install/build step for the fork is needed).
