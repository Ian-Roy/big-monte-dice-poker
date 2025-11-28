# Dice-Box Migration Plan (3D-first, lock-row overlay)

Plan to replace the 2D RNG dice with Dice-Box 3D visuals/physics while keeping game flow unchanged (hold/unhold, reroll only unheld, scoring, round limits). Phaser stays for UI and adds a dedicated 2D lock row directly under the Dice-Box canvas for hold toggles. Dice-Box remains the sole dice renderer. Heavy logging stays enabled (dev and prod) to aid debugging.

## Goals & Guardrails
- Preserve Yahtzee flow: 5 dice, 3 rolls max, manual hold/unhold, scoring UI untouched.
- Dice-Box renders/animates dice; Phaser overlay only handles interaction (hit boxes + lock markers) and game UI.
- Single source of truth for dice values/locks/roll counts.
- Mobile/responsive and PWA/offline behavior remain solid.
- Default to “press Roll to start”; no auto-roll on round start.
- Lock interaction happens on a 2D row under the 3D dice; locking should be visible both in the 2D row (color/size change) and reflected in the 3D view (theme/tint cue or overlay fallback).

## Current State Snapshot
- `src/scenes/MainScene.ts` owns roll logic, tracks `rollsLeft`/`rolling`, calls `PhaserDiceManager.roll()` for RNG, then writes into `diceState.applyRollResults(...)`. `advanceRound()` resets `rollsLeft` and `diceState`.
- `src/shared/DiceState.ts` holds `values` + `locks` and emits `dice-change`; applies roll values sequentially into unlocked slots.
- `src/shared/PhaserDiceManager.ts` renders 2D faces, shows lock tint/labels, and fakes roll animations (to be repurposed as the lock-row renderer).
- `index.html` lacks a `#dice-box` container; `src/style.css` layers only the Phaser surface.
- Assets: `public/assets/dice-box/**` and `public/assets/ammo/ammo.wasm.wasm` exist, but Workbox in `vite.config.ts` does not precache `.wasm` → offline Dice-Box would fail. `REPO_BASE`/`import.meta.env.BASE_URL` must be respected for asset paths.

## Target Architecture
- **DiceService** (new): Owns Dice-Box, tracks `GameDie { index, value, held, sides, groupId, rollId }`, manages `rollsThisRound`/`isRolling`, emits snapshots. API: `init()`, `startNewRound()` (reset only), `rollAll()`, `rerollUnheld()`, `toggleHold(idx)`, `getSnapshot()/allValues`, `onChange`, `dispose()`. Verbose logging for init/roll start/roll complete/snapshots.
- **State**: Single source in DiceService. Map Dice-Box results by `groupId/rollId` (not array order). No dependency on 3D positions—interaction uses a dedicated 2D lock row.
- **Overlay (`PhaserDiceManager` repurposed)**: Renders a horizontal lock row under the 3D dice. Each slot shows die value and held state via color + scale; clickable to toggle hold. Optional small lock icon for accessibility. Can pulse on roll start. Add debug outlines/text when a dev flag is on.
- **3D hold cue**: Attempt to reflect held dice in Dice-Box by updating theme/material for held dice (if supported). If per-die tint is unavailable, add a subtle CSS overlay/highlight on the 3D canvas aligned to the lock row index (e.g., tinted bar behind the row) so users see held state in the 3D layer.
- **Scene wiring**: `MainScene` subscribes to DiceService, reads `rollsThisRound`/`isRolling` from it, and routes roll/lock actions through the service. Scoring reads dice values from the service snapshot. Liberal logging around roll clicks, reroll selection, and scoring confirmations.
- **DOM/CSS**: Add `#dice-box` inside `#game-root`, absolutely positioned with `pointer-events: none` under/behind the Phaser canvas; add space below for the lock row UI to sit visually connected to the dice.

## Implementation Steps
1) **Assets & caching**
   - Set `assetPath = new URL('assets/dice-box/', import.meta.env.BASE_URL).toString()`.
   - Update Workbox `globPatterns` to include `.wasm` (and theme `jpg/png/json`) for offline Dice-Box.
   - Standardize ammo path (prefer `assets/dice-box/ammo`), remove/redirect duplicates to avoid cache bloat.
   - Use Dice-Box default theme/physics for now (sane defaults).

2) **DOM/CSS container**
   - Add `<div id="dice-box"></div>` as a sibling of `#phaser-root` in `index.html`.
   - In `src/style.css`, layer `#dice-box` with `position: absolute; inset: 0; pointer-events: none;` beneath Phaser; keep `#phaser-root` on top for input.
   - Allocate vertical space for the lock row directly beneath the Dice-Box viewport; ensure responsive scaling keeps them visually paired.

3) **DiceService (new in src/shared)**
   - Instantiate Dice-Box with `assetPath`/`container: '#dice-box'`; await `init()` before first roll. Log init start/complete and config.
   - `handleRollComplete`: normalize `rolls`/`dice`, populate dice on first roll, update existing dice by `groupId/rollId` on rerolls. Log full payloads (values, groupId, rollId).
   - Methods: `startNewRound` (reset dice/holds/roll count), `rollAll` (guard 3-roll limit), `rerollUnheld` (skip held), `toggleHold`, `getSnapshot`/`allValues`, `onChange`, `dispose`. Log every entry/exit and snapshot state.
   - Emit snapshots with values + held so UI/scoring stay Dice-Box agnostic.

4) **State reconciliation**
   - Replace/wrap `DiceState` to mirror DiceService snapshots (values + locks) instead of applying ordered arrays. Track `rollsThisRound` only in DiceService.
   - Ensure scoring pulls from DiceService-derived values to avoid drift.

5) **Overlay updates (`PhaserDiceManager`)**
   - Remove RNG/face generation; repurpose to render a horizontal lock row: five slots labeled 1–5 showing the current die value. Click/tap to toggle hold.
   - Styling: unheld = neutral color/scale; held = highlight color + scale-up (per updated integration guide). Optionally add a lock icon per slot. Mirror held state immediately on click.
   - Add a subtle roll cue (pulse/jitter) when a roll starts. Add debug outlines/labels when a dev flag is set. Log all clicks with die metadata.

6) **MainScene wiring**
   - Instantiate DiceService in `create()`, await `init()`, subscribe to snapshots to refresh the lock row and local state for UI/text. Log every snapshot received.
   - Update `handleRollClick` to call `diceService.rollAll()` first, then `diceService.rerollUnheld()`; read `rollsThisRound`/`isRolling` from the service. Remove direct `diceState.applyRollResults`. Log roll attempts, unlocked dice indices, and outcomes.
   - Update `advanceRound` to call `diceService.startNewRound()`; keep scoring logic unchanged. Dispose the service on scene shutdown. Log round transitions and scoring confirmations.

7) **Debug/telemetry**
   - Add logging throughout (init, roll start, roll complete payloads, reroll selections, snapshots). Keep logs enabled even in prod builds for now.
   - Add dev-only overlay to inspect Dice-Box `rollResult` (groupId/rollId/value) and show lock row state.
   - Optional HUD showing `rollsThisRound` and each die’s `{ index, value, held, groupId, rollId }` for verification.

8) **Testing pass**
   - Manual: roll → hold via 2D hit boxes → reroll unheld → score → advance round → complete game; verify roll counts and held dice stay consistent.
   - Mobile/responsive: rotate/rescale to keep 3D canvas and 2D hit boxes aligned; confirm Dice-Box does not capture input.
   - Offline: `yarn build && yarn preview` with network disabled to confirm Dice-Box assets (incl. `.wasm`) precache.
   - Base path: test with `REPO_BASE` for GitHub Pages to validate `assetPath`.

## Risks & Mitigations
- **Offline failure**: `.wasm` not precached → update Workbox and verify manifest.
- **Ordering bug**: Reroll results not matching unlocked order → map by `groupId/rollId`.
- **State drift**: Multiple roll counters → centralize in DiceService.
- **Pointer interference**: Dice-Box stealing input → `pointer-events: none` + z-index behind Phaser.
- **Base path issues**: Hardcoded asset paths → derive from `import.meta.env.BASE_URL`.
- **Lifecycle leaks**: Dice-Box canvas/observers → implement `dispose` on scene shutdown.
- **Overlay alignment**: 3D positions vs 2D hit boxes may drift → prefer Dice-Box-reported positions; otherwise fix layout and match camera framing.
