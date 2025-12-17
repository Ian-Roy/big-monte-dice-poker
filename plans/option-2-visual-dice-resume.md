# Option 2 (Future): Visual Dice Resume

## Goal
When the player taps **Continue game**, show the 3D dice already sitting in the tray with:
- The exact saved face values (1–6)
- The exact saved held/unheld state
- A stable mapping so future re-rolls can still target “unheld dice only”

This improves UX vs option 1 (game-accurate resume with an empty tray) without attempting a full physics/world restore.

## Non-goals
- Restoring *exact* physics positions/velocities/contacts from the previous session.
- Restoring mid-animation (“isRolling”) state.

## Proposed Approach
### 1) Add a fork API to spawn dice at rest
Add an API to the dice-box fork (WorldFacade + worlds + physics worker) along the lines of:

```ts
type SpawnDie = {
  sides: 6;
  value: 1 | 2 | 3 | 4 | 5 | 6;
  rollId: string;  // stable id used by pick + setHeldState + reroll targets
  groupId: string; // stable group for reroll API
  held: boolean;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number }; // quaternion
};

diceBox.spawnDice(dice: SpawnDie[], opts?: { clear?: boolean }): Promise<void>
```

Implementation notes:
- `clear: true` should remove existing meshes + physics bodies.
- The dice should be inserted into both:
  - The render world (instanced mesh with metadata containing `rollId`/`groupId`)
  - The physics world (rigid body with zero velocity, sleeping, correct collider scale)

### 2) Value → Rotation mapping (d6)
The hard part is making a die show a specific face value on top.

Options:
1. **Hardcode** a `value -> quaternion` lookup for the d6 model used by this game.
2. Compute it once at runtime by:
   - Reading the die mesh’s face/normal mapping (if available)
   - Or running a tiny “orientation probe” (spawn, rotate, pick top face, iterate) and caching results.

For a first pass, hardcoding for d6 is simplest and reliable.

### 3) Resume flow in app
On boot, when persisted `engineState.rollsThisRound > 0`:
- The app should call `diceBox.spawnDice` with 5 dice:
  - `value` from `engineState.dice[i]`
  - `held` from `engineState.holds[i]`
  - `rollId` / `groupId` generated deterministically (e.g. `resume-${saveId}-${i}`)
- Then normal `DiceService.rerollUnheld()` can use the existing `diceBox.reroll([...targets])` path.

### 4) Held styling
Because `rollId`s are now “real” and correspond to meshes, `setHeldState({ ids })` can tint held dice immediately on resume.

## Risks / Open Questions
- The fork currently derives values from physics settling; we’ll need a clean way to override “value” for spawned dice.
- Ensuring `pickDieAt` reports the correct `rollId` for spawned dice (should work if metadata is consistent).
- Babylon mesh orientation must match the assumed d6 face layout; if the model changes, the hardcoded quaternion table must be updated.

