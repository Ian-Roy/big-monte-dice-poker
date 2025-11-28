# Integrating Dice-Box Into the Yahtzee Phaser Game

This document explains how to replace the existing dice roller in our Phaser-based Yahtzee clone with **Dice-Box** (`@3d-dice/dice-box`), while **preserving all current game behaviors**:

- Click a die to **hold/unhold** it.
- Communicate current dice values to the rest of the app (scoring, UI, etc.).
- Reroll only **unheld** dice on subsequent rolls.

We are using **Option A**: Dice-Box handles **3D physics & visuals**, while the hold state and interaction remain in our Phaser UI overlay.

---

## 1. Architectural Overview

### 1.1 Layers

1. **DiceBox Integration Layer**

   - Owns the `DiceBox` instance.
   - Starts a roll (`roll('5d6')`), rerolls specific dice (`reroll([...])`), and listens for `onRollComplete`.

2. **Dice State Layer** (framework-agnostic)

   - Stores current dice as plain JS objects containing the value (1–6), held flag, and Dice-Box identifiers (`groupId`, `rollId`).
   - Provides methods to toggle hold, read values for scoring, and determine rerolls.

3. **Phaser UI Layer**
   - Renders dice, hold markers, roll/score buttons, and reports interactions to the Dice State API.

> **Important:** Phaser never talks directly to Dice-Box. A dedicated **DiceService** wraps Dice-Box, isolates integration, and exposes only the APIs the rest of the game needs.

---

## 2. Pre-Requisites & Setup

### 2.1 Install Dice-Box and Assets

From the project root:

```bash
npm install @3d-dice/dice-box
```

During installation, Dice-Box expects its static assets to be available (e.g. `/public/assets/dice-box`). If the post-install script does not copy them automatically, copy everything from `node_modules/@3d-dice/dice-box/src/assets` into your static assets folder and point `assetPath` at that location.

### 2.2 HTML Container for Dice-Box

In your main HTML file (where the Phaser canvas already lives), add a container for the Dice-Box canvas:

```html
<div id="game-root">
  <canvas id="phaser-game"></canvas>
  <div id="dice-box"></div>
</div>
```

Use CSS to layer the Dice-Box canvas behind or beside your Phaser canvas. For example:

```css
#game-root {
  position: relative;
  width: 100%;
  height: 100%;
}

#phaser-game {
  position: absolute;
  inset: 0;
}

#dice-box {
  position: absolute;
  inset: 0;
  pointer-events: none; /* dice are visual-only in this design */
}
```

`pointer-events: none` ensures Phaser still handles all clicks; Dice-Box is purely decorative from the player's perspective.

### 2.3 Held-State Visual Cues (Phaser UI)

- Use color to indicate held/unheld:
  - Unheld: neutral tint (e.g. white).
  - Held: strong highlight (e.g. green).
- Sample pattern:

```ts
const UNLOCKED_TINT = 0xffffff; // neutral
const LOCKED_TINT = 0x22c55e;   // held

function updateDiceUI(dice: GameDie[]) {
  dice.forEach((die, i) => {
    const sprite = this.diceSprites[i];
    const frame = `die-face-${die.value}`;
    sprite.setTexture('dice-atlas', frame);

    if (die.held) {
      sprite.setTint(LOCKED_TINT);
      sprite.setScale(1.1); // optional emphasis
    } else {
      sprite.setTint(UNLOCKED_TINT);
      sprite.setScale(1.0);
    }
  });
}
```

- Add a non-color cue for accessibility (pick at least one):
  - Slight scale-up when held.
  - Small lock icon overlay sprite.
  - Subtle outline behind held dice.

```ts
// When creating dice:
this.diceSprites[i] = this.add.sprite(x, y, 'die-face-1');
this.lockIcons[i] = this.add
  .image(x + 20, y - 20, 'lock-icon')
  .setVisible(false);

// In updateDiceUI:
if (die.held) {
  sprite.setTint(LOCKED_TINT);
  this.lockIcons[i].setVisible(true);
} else {
  sprite.setTint(UNLOCKED_TINT);
  this.lockIcons[i].setVisible(false);
}
```

This keeps the Phaser layer authoritative for held state: Dice-Box only renders the 3D visuals.

## 3. Dice Service: Central Integration Point

### 3.1 Data Types

Define the shape of a die in our game state:

```ts
// DiceService.ts

export interface GameDie {
  index: number; // 0..4 (Yahtzee die position)
  value: number; // 1..6, or 0 if not rolled yet
  sides: number; // normally 6
  held: boolean; // whether the player has held this die
  groupId: number; // Dice-Box roll group id
  rollId: number | string; // Dice-Box die id within the group
}

interface DiceState {
  dice: GameDie[];
  rollsThisRound: number; // 0–3
}
```

### 3.2 Creating the DiceBox Instance

```ts
import DiceBox from "@3d-dice/dice-box";

export class DiceService {
  private diceBox: any;
  private state: DiceState;
  private listeners: Array<(dice: GameDie[]) => void> = [];

  constructor() {
    this.state = {
      dice: [],
      rollsThisRound: 0,
    };

    this.diceBox = new DiceBox({
      assetPath: "/assets/dice-box/",
      container: "#dice-box",
    });

    this.diceBox.onRollComplete = (rollResult: any) => {
      this.handleRollComplete(rollResult);
    };
  }

  async init() {
    await this.diceBox.init();
  }

  onDiceChanged(listener: (dice: GameDie[]) => void) {
    this.listeners.push(listener);
  }

  private emitDiceChanged() {
    this.listeners.forEach((cb) => cb(this.state.dice));
  }
}
```

This keeps Dice-Box configuration centralized, and the rest of the game never interacts with Dice-Box directly.

---

## 4. Mapping Dice-Box Results to GameDice

When Dice-Box finishes a roll it calls `onRollComplete` with the result. Inspect the structure in your dev tools, but typically you can do:

```ts
interface RawDie {
  groupId: number;
  rollId: number | string;
  sides: number;
  value: number;
}

private handleRollComplete(rollResult: any) {
  const groups = Array.isArray(rollResult) ? rollResult : [rollResult];
  const primaryGroup = groups[0];

  const rawDice: RawDie[] = primaryGroup.rolls ?? primaryGroup.dice ?? [];

  if (this.state.rollsThisRound === 1) {
    this.state.dice = rawDice.map((die, index) => ({
      index,
      value: die.value,
      sides: die.sides,
      held: false,
      groupId: die.groupId,
      rollId: die.rollId,
    }));
  } else {
    rawDice.forEach((die) => {
      const idx = this.state.dice.findIndex(
        (d) => d.groupId === die.groupId && d.rollId === die.rollId
      );
      if (idx !== -1) {
        this.state.dice[idx].value = die.value;
        this.state.dice[idx].sides = die.sides;
      }
    });
  }

  this.emitDiceChanged();
}
```

Adjust `primaryGroup.rolls ?? primaryGroup.dice` if your Dice-Box version uses a different naming scheme.

---

## 5. Rolling Dice for a New Yahtzee Round

### 5.1 DiceService API

```ts
export class DiceService {
  // ...existing methods...

  async startNewRound() {
    this.state.rollsThisRound = 0;
    this.state.dice = [];
    this.emitDiceChanged();

    await this.rollAll();
  }

  private async rollAll() {
    if (this.state.rollsThisRound >= 3) return;

    this.state.rollsThisRound += 1;
    await this.diceBox.roll("5d6");
  }
}
```

Call `startNewRound()` whenever a Yahtzee turn begins; new values arrive via `handleRollComplete`.

---

## 6. Holding & Unholding Dice

### 6.1 DiceService Toggle

```ts
export class DiceService {
  // ...

  toggleHold(index: number) {
    const die = this.state.dice[index];
    if (!die) return;
    if (this.state.rollsThisRound === 0) return;

    die.held = !die.held;
    this.emitDiceChanged();
  }

  getDice(): GameDie[] {
    return this.state.dice;
  }

  getRollsThisRound(): number {
    return this.state.rollsThisRound;
  }

  allDiceValues(): number[] {
    return this.state.dice.map((d) => d.value);
  }
}
```

### 6.2 Phaser UI Binding

```ts
create() {
  this.diceService = new DiceService();
  this.diceSprites = [];

  this.diceService.onDiceChanged((dice) => {
    this.updateDiceUI(dice);
  });

  this.diceService.init().then(() => {
    this.diceService.startNewRound();
  });
}

private updateDiceUI(dice: GameDie[]) {
  dice.forEach((die, i) => {
    let sprite = this.diceSprites[i];
    if (!sprite) {
      sprite = this.add.sprite(100 + i * 80, 300, 'die-face-1');
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        this.diceService.toggleHold(i);
      });
      this.diceSprites[i] = sprite;
    }

    const frame = `die-face-${die.value}`;
    sprite.setTexture('dice-atlas', frame);

    if (die.held) {
      sprite.setTint(0x00ff00);
    } else {
      sprite.clearTint();
    }
  });
}
```

Dice visuals behave as before; the only change is that values now come from Dice-Box.

---

## 7. Rerolling Only Unheld Dice

### 7.1 DiceService Reroll

```ts
export class DiceService {
  // ...

  async rerollUnheld() {
    if (this.state.rollsThisRound >= 3) return;

    const toReroll = this.state.dice.filter((d) => !d.held);
    if (toReroll.length === 0) return;

    this.state.rollsThisRound += 1;
    await this.diceBox.reroll(toReroll);
  }
}
```

### 7.2 Phaser “Roll” Button

```ts
create() {
  // ...existing setup...

  const rollButton = this.add
    .text(400, 500, 'ROLL', {
      fontSize: '32px',
      backgroundColor: '#444',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  rollButton.on('pointerdown', async () => {
    const rolls = this.diceService.getRollsThisRound();
    if (rolls === 0) {
      await this.diceService.startNewRound();
    } else if (rolls < 3) {
      await this.diceService.rerollUnheld();
    } else {
      // Optionally disable the button or show a message.
    }
  });
}
```

Subsequent clicks on “ROLL” reroll only unheld dice; animations reflect the Dice-Box reroll calls.

---

## 8. Communicating Dice Info Back to the Game

Other systems can rely on the DiceService API:

```ts
const diceValues = diceService.allDiceValues();
```

Or subscribe to updates:

```ts
diceService.onDiceChanged((dice) => {
  gameState.currentRoll = dice.map((d) => d.value);
});
```

Everything else in the game continues to operate as before, unaware that Dice-Box powers the dice results.

---

## 9. Migration Checklist

- Replace any RNG-based “roll 5 dice” or “reroll selected dice” logic with the DiceService API.
- Keep the existing Phaser dice UI (sprites, hold markers, layout) but source values from `GameDie.value`.
- Maintain the click handler and point it at `diceService.toggleHold(i)`.
- Update any scoring logic to pull values via `diceService.allDiceValues()` or `getDice()`.
- Guard rerolls when the round is not active or when three rolls have already happened.
- Reset `rollsThisRound` to 0 and clear held flags when a new round starts.

---

## 10. Testing Suggestions

- Log `rollResult` inside `handleRollComplete` to verify where the dice array lives and confirm each die has `groupId`, `rollId`, `sides`, and `value`.
- Add a debug overlay showing `rollsThisRound` and each die’s `{ index, value, held, groupId, rollId }`.
- Walk through a full Yahtzee round: start the round, verify five dice appear with values, hold some dice, reroll, and confirm only unheld dice animate.
- Double-check that scoring still works using the new values from DiceService.

---

## 11. Summary

Dice-Box replaces the visual dice roller, but we keep all hold logic, reroll logic, and game flow inside our own DiceService and Phaser UI. The DiceService wraps Dice-Box, manages `GameDie` objects, and exposes a concise API so you can swap visuals or tweak physics without touching Yahtzee logic.
