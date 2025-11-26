Project Spec: Phaser Yahtzee Clone with Dice-Box 3D Dice

You are an AI coding agent.
Your task is to **build a browser-based Yahtzee-style game** using **Phaser 3** for the 2D UI and **Dice-Box (@3d-dice/dice-box)** for the 3D dice animation.

The final result should be a working web app that:

- Shows a **3D dice tray** in the center of the screen using Dice-Box.
- Uses **Phaser** for:
  - A **2D info bar at the top** (score, round, rolls left).
  - A **2D controller panel on the right** (roll button and placeholders for Yahtzee actions).
- Implements core **Yahtzee turn flow** using the Dice-Box roll results
  (it’s okay if not all scoring categories are implemented, but the foundations should be there).

---

## 1. Tech Stack & Project Setup

### 1.1 Tools & Libraries

Use:

- **Phaser 3** (ES modules preferred)
- **@3d-dice/dice-box**
- **Vite** as the build tool (fast dev server + bundler)
- Plain JavaScript (no TypeScript required unless explicitly needed)

### 1.2 Directory Layout

Create a project structure like:

```text
yahtzee-dicebox/
  index.html
  vite.config.js
  package.json
  public/
    assets/
      dice-box/        <-- copied from @3d-dice/dice-box/src/assets
  src/
    main.js
    MainScene.js
    yahtzeeLogic.js   <-- pure game logic (optional but preferred)
    styles.css
1.3 npm Dependencies
Add the following dependencies:

phaser

@3d-dice/dice-box

vite (devDependency)

Example package.json fields (simplified):

json
Copy code
{
  "name": "yahtzee-dicebox",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.87.0",
    "@3d-dice/dice-box": "^0.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
(Exact versions can be adjusted, but use recent stable releases.)

1.4 Dice-Box Assets
Dice-Box requires its asset folder to be served from the web root.

Copy assets from:
node_modules/@3d-dice/dice-box/src/assets

Paste into:
public/assets/dice-box

Ensure the final path (as seen by the browser) is:

text
Copy code
/public/assets/dice-box/...
The asset path string used in Dice-Box config will be:

js
Copy code
assetPath: '/assets/dice-box/'
The path must end with a trailing slash.

2. HTML & CSS Layout
2.1 index.html
Create a minimal HTML shell that provides:

A root container for the game.

A div for the Phaser canvas.

An overlay div for the Dice-Box 3D dice tray.

html
Copy code
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Yahtzee 3D Dice</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="game-root">
      <div id="phaser-root"></div>

      <!-- 3D dice overlay (Dice-Box renders its canvas inside here) -->
      <div id="dice-overlay">
        <div id="dice-box"></div>
      </div>
    </div>

    <script type="module" src="/src/main.js"></script>
  </body>
</html>
2.2 src/styles.css
Add layout and basic styling:

#game-root: fixed size game area (e.g., 1024×768), centered.

#phaser-root: fills the game area; Phaser attaches its canvas here.

#dice-overlay: absolute overlay, pointer-events disabled (so 2D UI still works).

#dice-box: central Dice-Box container in which Dice-Box creates its canvas.

Example:

css
Copy code
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #111;
  font-family: system-ui, sans-serif;
}

#game-root {
  position: relative;
  width: 1024px;
  height: 768px;
  margin: 0 auto;
  background: #002b36;
  overflow: hidden;
}

#phaser-root {
  width: 100%;
  height: 100%;
}

/* Dice overlay covers entire game area */
#dice-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* allow Phaser to receive mouse input */
}

/* Central 3D dice tray */
#dice-box {
  width: 600px;
  height: 450px;
  border-radius: 16px;
  overflow: hidden;
}

#dice-box canvas {
  width: 100%;
  height: 100%;
  display: block;
}
Ensure this CSS is imported in src/main.js via:

js
Copy code
import './styles.css';
3. Vite Configuration
Create a simple vite.config.js that works with plain JS:

js
Copy code
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173
  }
});
No advanced config is required, but ensure Vite serves /public as the static assets root.

4. Dice-Box Initialization
4.1 src/main.js
Responsibilities:

Import Phaser and Dice-Box.

Initialize Dice-Box with the assets path and container.

Create the Phaser game, passing the Dice-Box instance into the game config so scenes can use it.

Example:

js
Copy code
import Phaser from 'phaser';
import DiceBox from '@3d-dice/dice-box';
import MainScene from './MainScene.js';
import './styles.css';

async function boot() {
  // Initialize Dice-Box
  const diceBox = new DiceBox({
    assetPath: '/assets/dice-box/', // must end with slash
    container: '#dice-box',         // CSS selector for the dice container div
    id: 'dice-canvas',              // optional canvas id
    scale: 5,                       // size of dice (2-9 recommended)
    gravity: 1
  });

  await diceBox.init();

  // Create Phaser game
  const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'phaser-root',
    backgroundColor: '#073642',
    scene: [MainScene],
    // custom field to share Dice-Box with scenes
    diceBox
  };

  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

boot();
5. Phaser Scene: Layout & Dice Integration
5.1 src/MainScene.js
Responsibilities:

Render:

Top info bar with round and rolls left.

Right-side control panel with a “ROLL” button and text showing latest dice values.

Manage state:

currentRound (start at 1).

rollsLeft (start at 3 each round).

diceValues (array of last 5 dice values).

Integrate Dice-Box:

On “ROLL” button click, call diceBox.roll('5d6').

Await the result and update diceValues, rollsLeft, and UI text.

Implementation sketch (full file):

js
Copy code
export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');

    this.currentRound = 1;
    this.rollsLeft = 3;
    this.diceValues = [];
  }

  create() {
    // Access Dice-Box from game config
    this.diceBox = this.game.config.diceBox;

    // --- TOP INFO BAR ---
    this.add.rectangle(512, 40, 1024, 80, 0x002b36).setOrigin(0.5);

    this.roundText = this.add
      .text(20, 20, this._buildInfoText(), {
        fontFamily: 'monospace',
        fontSize: 24,
        color: '#ffffff'
      })
      .setDepth(10);

    // --- RIGHT-SIDE PANEL ---
    const panelX = 1024 - 220;
    this.add.rectangle(panelX + 110, 384, 220, 768, 0x073642).setDepth(5);

    // Roll button
    const rollButton = this.add
      .rectangle(panelX + 110, 140, 180, 60, 0x268bd2)
      .setInteractive()
      .setDepth(10);

    this.add
      .text(panelX + 110, 140, 'ROLL', {
        fontFamily: 'monospace',
        fontSize: 28,
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(11);

    rollButton.on('pointerup', () => {
      this.handleRollClick();
    });

    // Text to show last dice roll values
    this.diceText = this.add
      .text(panelX + 30, 220, 'Dice: - - - - -', {
        fontFamily: 'monospace',
        fontSize: 22,
        color: '#eee8d5',
        wordWrap: { width: 180 }
      })
      .setDepth(10);

    // Placeholder: later add score category buttons here
  }

  _buildInfoText() {
    return `Round ${this.currentRound}  |  Rolls left: ${this.rollsLeft}`;
  }

  async handleRollClick() {
    if (this.rollsLeft <= 0) {
      // No rolls left: ignore or show feedback
      return;
    }

    this.rollsLeft--;

    // Roll 5 six-sided dice with Dice-Box
    const resultGroups = await this.diceBox.roll('5d6');

    // resultGroups is an array; we only use the first group
    const group = resultGroups[0];

    // Each die object has a numeric `value` field
    const diceValues = group.rolls.map((die) => die.value);

    this.diceValues = diceValues;

    // Update UI
    this.diceText.setText('Dice: ' + diceValues.join(' '));
    this.roundText.setText(this._buildInfoText());

    // Future extension:
    // - enable category buttons
    // - compute suggested scores based on diceValues
  }
}
6. Yahtzee Game Logic (Optional Separate Module)
Create src/yahtzeeLogic.js with pure functions to evaluate dice arrays (length 5, values 1–6).

At minimum, implement helpers for:

Sum of dice.

Count of value (for “Ones”, “Twos”, etc.).

Check for:

Three of a kind.

Four of a kind.

Full house.

Small straight.

Large straight.

Yahtzee.

Example skeleton:

js
Copy code
// src/yahtzeeLogic.js

export function sum(dice) {
  return dice.reduce((a, b) => a + b, 0);
}

export function countOf(dice, face) {
  return dice.filter((d) => d === face).length;
}

export function isThreeOfKind(dice) {
  const counts = countMap(dice);
  return Object.values(counts).some((c) => c >= 3);
}

// ... implement other helpers similarly ...

function countMap(dice) {
  const map = {};
  for (const d of dice) {
    map[d] = (map[d] || 0) + 1;
  }
  return map;
}
Integrate these with the Phaser scene later to calculate scores when the player chooses a category.

7. UI Behavior & Turn Flow (Minimum Requirements)
Implement at least this basic turn loop:

Initial state:

currentRound = 1

rollsLeft = 3

diceValues = []

Click ROLL:

If rollsLeft > 0, decrement rollsLeft.

Call diceBox.roll('5d6').

On resolution, set diceValues.

Update UI.

For this initial version, you do not need full “keep / re-roll specific dice” functionality, but the code should be organized so that this can be added later (e.g., by tracking “held” flags per die index).

After all Yahtzee categories are implemented in the future, currentRound will advance and rollsLeft reset to 3 when a category is selected & locked.

8. Build & Run
Ensure the following commands work:

npm install

npm run dev (starts Vite dev server)

npm run build (builds optimized production bundle)

npm run preview (preview production build)

When running npm run dev, opening the app in a browser should show:

A 1024×768 game area centered.

Top bar with “Round 1 | Rolls left: 3”.

Right panel with ROLL button and dice values text.

A 3D Dice-Box area in the center.

Clicking ROLL should:

Play a 3D dice roll animation (5d6).

Update the dice values text on the right.

Decrease “Rolls left” in the top bar.

9. Code Quality Expectations
Use modular structure:

main.js only boots Dice-Box and Phaser.

MainScene.js handles 2D rendering and basic state.

(Optional) yahtzeeLogic.js for scoring helpers.

Avoid global variables; use scene properties and config injection for sharing the Dice-Box instance.

Include comments explaining key integration points (Dice-Box → Phaser).

Keep the code simple and readable; no unnecessary abstractions.

```
