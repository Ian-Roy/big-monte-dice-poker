# Working With Dice-Box (Monte's Delux Dice Poker)

Practical notes for integrating and operating `@3d-dice/dice-box` in this project, including asset layout, DiceService wiring, sprite baking for 2D UI parity, and troubleshooting tips.

## Asset Layout & Paths
- Dice-Box assets live under `public/assets/dice-box/`:
  - `ammo/` (WASM)
  - `themes/default/` (diffuse-light.png, diffuse-dark.png, normal.png, specular.jpg, default.json, theme.config.json)
  - Generated sprites: `faces.png`, `faces.json`
- We mirror `faces.png/json` into `src/assets/dice-box/` for Vite-importable metadata. Always run `yarn gen:dice-sprites` after changing the bake script or theme assets.
- Dice-Box uses `assetPath` derived from `import.meta.env.BASE_URL` (`/assets/dice-box/` by default). Keep Workbox glob patterns including `png,jpg,jpeg,json,wasm` so offline caching covers Dice-Box.

## DiceService Integration
- `src/shared/DiceService.ts` owns the Dice-Box instance. Key config:
  - `assetPath` → `${import.meta.env.BASE_URL || '/' }assets/dice-box/`
  - `container` → `#dice-box`
  - `scale: 10` (dice size), `delay: 6` (start delay)
  - `offscreen: false` to keep rendering on the main thread for picking/holding support; click a die to toggle its hold state (emissive blue + slight scale bump via the fork’s `setHeldState` API).
- Lifecycle: `init()` → `rollAll()` / `rerollUnheld()` → `startNewRound()` → `dispose()`.
- Snapshots: DiceService emits `dice[]` with `{ index, value, held, groupId, rollId }`, plus `rollsThisRound` and `isRolling`.
- Mapping: We convert service snapshots to view state via `snapshotFromService` (values/locks) and synchronize into the headless engine through the Pinia store.

## Pinia Store Sync
- Store (`src/stores/gameStore.ts`) attaches to DiceService and mirrors snapshots to the headless `GameEngine`.
- Roll sync guards:
  - Ignore while `isRolling` is true.
  - Require numeric values and `rollsThisRound >= 1`.
  - Apply when roll count increases or when values change at the same count (handles rerolls completing).
- Holds: toggling goes to both engine and DiceService; scoring calls `scoreCategory`, then `startNewRound` on DiceService unless explicitly skipped (used by legacy scene).

## Sprite Baking for 2D UI Parity
- Tool: `tools/bake-dice-sprites.ts`
  - Reads `themes/default/diffuse-light.png`.
  - Detects base and pip colors from the theme; renders pip layouts for faces 1–6 onto 88×88 tiles.
  - Emits sprite strip + metadata to `public/assets/dice-box/` and `src/assets/dice-box/`.
- Usage:
  - Run `yarn gen:dice-sprites` to regenerate after theme/size changes.
  - Vue composable `useDiceSprites` reads `faces.json` from `src/assets/dice-box/` and exposes `url`, `frames`, `sheetSize` for CSS backgrounds (DiceFacesRow, ScoreTable).

## Vue Components & Layout
- `DiceViewport` hosts `#dice-box`; `pointer-events: none` lets Vue UI capture input.
- `DiceFacesRow` shows the current dice faces from the baked sprite strip; held state is visual only (toggled via 3D dice picking).
- Roll button disables when DiceService isn’t ready or is rolling; initial roll uses `rollAll()`, subsequent rolls use `rerollUnheld()`.
- Scoring flow: ScoreTable rows emit `select`, App shows confirm dialog, then calls `store.scoreCategory(key)`, which advances the engine and resets DiceService for the next round.

## Configuration Levers (Dice-Box)
- Size: `scale` in DiceService config (current: 10) increases dice size; adjust viewport height if needed.
- Speed: `delay` (ms before starting physics) can make rolls feel snappier (current: 6).
- Theme: default theme pulled from `assets/dice-box/themes/default/`; swap `theme` in DiceService config or copy a new theme into `themes/` and update `assetPath` as needed.
- Locking/re-roll merge: DiceService now normalizes roll results through `mergeRollResults`, keyed by `{groupId, rollId}` when possible and then by the reroll request order (`pendingRerollIndices`). Held dice keep their values and rollIds; unexpected/missing results fall back to the first available unlocked index. This prevents UI “held” flags from drifting when Dice-Box returns dice in a different order.

## Troubleshooting
- **Missing faces.json/faces.png in dev**: ensure `src/assets/dice-box/faces.*` exist; run `yarn gen:dice-sprites`.
- **Rolls not reflected in scoring**: verify DiceService emits `isRolling=false` before sync; store now replays when values change at the same roll count.
- **Dice too small/large**: tweak `scale` in DiceService; if clipping occurs, increase `DiceViewport` height or adjust camera via Dice-Box config if needed.
- **Offline failures**: confirm Workbox glob includes `wasm/png/jpg/json`; Dice-Box needs `ammo.wasm` and theme textures cached.

## Recent Integration Notes (2024-11)
- Canvas sizing: let Dice-Box manage the OffscreenCanvas backing store. Avoid setting `canvas.width/height` after init or you will hit `InvalidStateError: Cannot resize canvas after call to transferControlToOffscreen()`.
- Visual area: size/position the injected canvas via CSS (e.g., `:global(#dice-box canvas)` at 110% height with a small negative top) rather than resizing the element directly. This keeps dice visible without fighting OffscreenCanvas.
- Dice scale: current `scale` is `5` to fit a full-height mobile viewport. Adjust up/down in `DiceService` if you change canvas oversizing.
- Bounds/viewport: the overlay is fixed to the viewport on mobile and capped to the app width on desktop, reserving only the top controls as a safe zone. Dice can roll over the scorecard/dice strip.
- Debugging: DiceService logs layer/container/canvas rects and window metrics on init and around rolls (`viewport summary` lines). Use these to verify the canvas matches the overlay.
- Layer control: a toggle moves the dice layer above/below the Vue UI; roll button forces the layer visible so rolls aren’t hidden. Pointer events are enabled on the canvas (and disabled when the layer is “under”) so clicks reach the dice for picking/holding.

## Quick Commands
- Generate sprites: `yarn gen:dice-sprites`
- Run tests: `yarn test:run`
- Dev server: `yarn dev` (ensure assets exist in both public/ and src/)
