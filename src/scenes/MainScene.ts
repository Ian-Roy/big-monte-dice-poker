import Phaser from 'phaser';
import { diceState, DiceStateEvent, type DiceSnapshot, type DiceValues, type DiceLocks } from '../shared/DiceState';
import { PhaserDiceManager } from '../shared/PhaserDiceManager';
import { bindPress } from '../shared/PointerPress';

type CategoryKey =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'three-kind'
  | 'four-kind'
  | 'full-house'
  | 'small-straight'
  | 'large-straight'
  | 'yahtzee'
  | 'chance';

type ScoreCategory = {
  key: CategoryKey;
  label: string;
  score: number | null;
  scored: boolean;
};

type ScoreRow = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
};

export class MainScene extends Phaser.Scene {
  private currentRound = 1;
  private rollsLeft = 3;
  private diceValues: DiceValues = [null, null, null, null, null];
  private diceLocks: DiceLocks = [false, false, false, false, false];
  private rolling = false;
  private diceManager!: PhaserDiceManager;
  private rollButton!: Phaser.GameObjects.Rectangle;
  private rollLabel!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private scoreboardHeight = 230;
  private scoreboardCenterY = 0;
  private rollButtonY = 0;
  private diceAreaHeight = 0;
  private scoreRows: Map<CategoryKey, ScoreRow> = new Map();
  private scoreCategories: ScoreCategory[] = [];
  private maxRounds = 13;

  private handleDiceStateUpdate = ({ values, locks }: DiceSnapshot) => {
    console.debug('[scene] dice state change', { values, locks });
    this.diceValues = values;
    this.diceLocks = locks;
    this.diceManager.updateState(values, locks);
  };

  constructor() {
    super('main');
    this.scoreCategories = this.buildScoreCategories();
    this.maxRounds = this.scoreCategories.length;
  }

  create() {
    this.createLayout();
    this.createDiceArea();
    this.createScoreBoard();
    this.setupDiceState();
    this.updateRollButton();
    this.updateInfoText();
  }

  private buildScoreCategories(): ScoreCategory[] {
    return [
      { key: 'ones', label: 'Ones', score: null, scored: false },
      { key: 'twos', label: 'Twos', score: null, scored: false },
      { key: 'threes', label: 'Threes', score: null, scored: false },
      { key: 'fours', label: 'Fours', score: null, scored: false },
      { key: 'fives', label: 'Fives', score: null, scored: false },
      { key: 'sixes', label: 'Sixes', score: null, scored: false },
      { key: 'three-kind', label: 'Three of a Kind', score: null, scored: false },
      { key: 'four-kind', label: 'Four of a Kind', score: null, scored: false },
      { key: 'full-house', label: 'Full House (25)', score: null, scored: false },
      { key: 'small-straight', label: 'Small Straight (30)', score: null, scored: false },
      { key: 'large-straight', label: 'Large Straight (40)', score: null, scored: false },
      { key: 'yahtzee', label: 'Yahtzee (50)', score: null, scored: false },
      { key: 'chance', label: 'Chance', score: null, scored: false }
    ];
  }

  private createLayout() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.scoreboardHeight = 230;
    this.scoreboardCenterY = h - this.scoreboardHeight / 2 - 12;
    this.rollButtonY = this.scoreboardCenterY - this.scoreboardHeight / 2 - 28;
    this.diceAreaHeight = Math.max(260, this.rollButtonY - 40);

    this.add.rectangle(w / 2, 42, w * 0.9, 70, 0x041927).setOrigin(0.5);
    this.infoText = this.add.text(24, 22, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e7edf2'
    });

    this.add.rectangle(
      w / 2,
      this.diceAreaHeight / 2 + 32,
      w * 0.85,
      this.diceAreaHeight,
      0x02111d,
      0.42
    );

    this.rollButton = this.add
      .rectangle(w / 2, this.rollButtonY, 240, 70, 0x1f7bb6, 0.98)
      .setStrokeStyle(3, 0x7ad3ff)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    this.rollLabel = this.add
      .text(this.rollButton.x, this.rollButton.y, this.rollButtonText(), {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(11);

    bindPress(this.rollButton, () => this.handleRollClick());
  }

  private createScoreBoard() {
    const w = this.scale.width;
    const bgWidth = w * 0.9;

    this.add
      .rectangle(w / 2, this.scoreboardCenterY, bgWidth, this.scoreboardHeight, 0x0b1a28, 0.8)
      .setStrokeStyle(2, 0x123f5b, 0.7)
      .setDepth(8);

    this.add
      .text(
        w / 2 - bgWidth / 2 + 14,
        this.scoreboardCenterY - this.scoreboardHeight / 2 + 12,
        'Scorecard (tap to score)',
        {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#9ad5ff'
        }
      )
      .setDepth(9);

    const perCol = Math.ceil(this.scoreCategories.length / 2);
    const colGap = 16;
    const colWidth = (bgWidth - colGap - 24) / 2;
    const leftX = w / 2 - (colWidth + colGap) / 2;
    const rightX = w / 2 + (colWidth + colGap) / 2;
    const startY = this.scoreboardCenterY - this.scoreboardHeight / 2 + 48;
    const rowHeight = 30;

    this.scoreCategories.forEach((cat, idx) => {
      const col = idx < perCol ? 0 : 1;
      const row = col === 0 ? idx : idx - perCol;
      const x = col === 0 ? leftX : rightX;
      const y = startY + row * rowHeight;

      const bgRect = this.add
        .rectangle(x, y, colWidth, rowHeight - 2, 0x0f2636, 0.82)
        .setStrokeStyle(1.5, 0x7ad3ff, 0.6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(9);

      const label = this.add
        .text(x - colWidth / 2 + 10, y, cat.label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#e7edf2'
        })
        .setOrigin(0, 0.5)
        .setDepth(10);

      const value = this.add
        .text(x + colWidth / 2 - 10, y, 'Tap to score', {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#9ad5ff'
        })
        .setOrigin(1, 0.5)
        .setDepth(10);

      this.scoreRows.set(cat.key, { bg: bgRect, label, value });
      bindPress(bgRect, () => this.handleScoreCategory(cat.key));
      this.updateScoreRow(cat);
    });
  }

  private createDiceArea() {
    const areaWidth = this.scale.width;
    const areaHeight = Math.max(240, this.rollButtonY - 50);

    this.diceManager = new PhaserDiceManager(this, (idx) => this.handleDieToggle(idx));
    this.diceManager.createDiceSet(areaWidth, areaHeight);
  }

  private setupDiceState() {
    console.debug('[scene] setupDiceState: register listener');
    diceState.on(DiceStateEvent.Change, this.handleDiceStateUpdate);

    // Clean up listeners when the scene is torn down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      diceState.off(DiceStateEvent.Change, this.handleDiceStateUpdate);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      diceState.off(DiceStateEvent.Change, this.handleDiceStateUpdate);
    });

    // Initialize UI with current values (resets to blanks and emits a change)
    diceState.reset();
  }

  private rollButtonText() {
    if (this.hasCompletedGame()) return 'GAME COMPLETE';
    if (this.rolling) return 'ROLLING...';
    return this.rollsLeft > 0 ? `ROLL (${this.rollsLeft})` : 'NO ROLLS LEFT';
  }

  private updateRollButton() {
    if (!this.rollButton || !this.rollLabel) return;
    const disabled = this.rollsLeft <= 0 || this.rolling || this.hasCompletedGame();
    this.rollLabel.setText(this.rollButtonText());
    this.rollButton.setAlpha(disabled ? 0.7 : 1);
  }

  private updateInfoText() {
    const total = this.totalScore();
    const text = this.hasCompletedGame()
      ? `Game complete • Total: ${total}`
      : `Round ${this.currentRound}/${this.maxRounds}  |  Rolls left: ${this.rollsLeft}  |  Total: ${total}`;
    this.infoText.setText(text);
  }

  private async handleRollClick() {
    console.debug('[scene] handleRollClick', { rolling: this.rolling, rollsLeft: this.rollsLeft });
    if (this.rolling) return;
    if (this.hasCompletedGame()) {
      this.addToast('All categories scored!');
      return;
    }
    if (this.rollsLeft <= 0) {
      this.addToast('No rolls left — pick a category to score');
      return;
    }

    const unlockedIndices = this.diceLocks
      .map((locked, idx) => (!locked ? idx : -1))
      .filter((idx) => idx >= 0);

    if (!unlockedIndices.length) {
      this.addToast('All dice locked');
      return;
    }

    this.rolling = true;
    this.rollsLeft -= 1;
    this.updateRollButton();
    this.updateInfoText();

    try {
      const values = await this.diceManager.roll(unlockedIndices);
      if (values.length) {
        diceState.applyRollResults(values);
        if (values.length < unlockedIndices.length) {
          console.warn('[scene] fewer roll values than unlocked dice', { values, unlockedIndices });
        }
      } else {
        console.warn('[scene] roll produced no values');
      }
      console.info('[scene] roll result', { values });
    } catch (err) {
      console.error('Dice roll failed', err);
      this.addToast('Roll failed');
    } finally {
      this.rolling = false;
      this.updateRollButton();
      this.updateInfoText();
    }
  }

  private handleScoreCategory(key: CategoryKey) {
    const cat = this.scoreCategories.find((c) => c.key === key);
    if (!cat || cat.scored) return;
    if (this.rolling) {
      this.addToast('Wait for the roll to finish');
      return;
    }
    if (this.hasCompletedGame()) {
      this.addToast('All categories scored!');
      return;
    }
    if (!this.hasFullRoll()) {
      this.addToast('Roll the dice first');
      return;
    }

    const dice = this.diceValues.filter((v): v is number => typeof v === 'number');
    if (dice.length !== 5) {
      this.addToast('Roll the dice first');
      return;
    }

    const score = this.computeScore(cat.key, dice);
    cat.score = score;
    cat.scored = true;
    this.updateScoreRow(cat);
    this.addToast(`${cat.label}: +${score} points`);
    this.advanceRound();
  }

  private updateScoreRow(cat: ScoreCategory) {
    const row = this.scoreRows.get(cat.key);
    if (!row) return;
    const scored = cat.scored;
    row.value.setText(typeof cat.score === 'number' ? `${cat.score}` : 'Tap to score');
    row.value.setColor(scored ? '#ffc857' : '#9ad5ff');
    row.bg.setFillStyle(scored ? 0x1a2b3b : 0x0f2636, scored ? 0.85 : 0.82);
    row.bg.setStrokeStyle(scored ? 2 : 1.5, scored ? 0xffc857 : 0x7ad3ff, scored ? 0.9 : 0.6);
    if (scored) {
      row.bg.disableInteractive();
    }
  }

  private advanceRound() {
    if (this.hasCompletedGame()) {
      this.rollsLeft = 0;
      this.updateRollButton();
      this.updateInfoText();
      this.addToast('All categories scored! Game complete.');
      return;
    }

    this.currentRound = Math.min(this.currentRound + 1, this.maxRounds);
    this.rollsLeft = 3;
    diceState.reset();
    this.updateRollButton();
    this.updateInfoText();
  }

  private totalScore() {
    return this.scoreCategories.reduce((sum, cat) => sum + (cat.score ?? 0), 0);
  }

  private hasCompletedGame() {
    return this.scoreCategories.every((c) => c.scored);
  }

  private hasFullRoll() {
    return this.diceValues.every((v) => typeof v === 'number');
  }

  private computeScore(key: CategoryKey, dice: number[]) {
    const counts = this.countsByValue(dice);
    const sum = dice.reduce((acc, v) => acc + v, 0);
    switch (key) {
      case 'ones':
      case 'twos':
      case 'threes':
      case 'fours':
      case 'fives':
      case 'sixes': {
        const face = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].indexOf(key) + 1;
        return dice.filter((v) => v === face).reduce((acc, v) => acc + v, 0);
      }
      case 'three-kind':
        return counts.some((c) => c >= 3) ? sum : 0;
      case 'four-kind':
        return counts.some((c) => c >= 4) ? sum : 0;
      case 'full-house':
        return this.isFullHouse(counts) ? 25 : 0;
      case 'small-straight':
        return this.hasStraight(dice, 4) ? 30 : 0;
      case 'large-straight':
        return this.hasStraight(dice, 5) ? 40 : 0;
      case 'yahtzee':
        return counts.some((c) => c === 5) ? 50 : 0;
      case 'chance':
        return sum;
      default:
        return 0;
    }
  }

  private countsByValue(dice: number[]) {
    const counts = [0, 0, 0, 0, 0, 0];
    dice.forEach((v) => {
      if (v >= 1 && v <= 6) {
        counts[v - 1] += 1;
      }
    });
    return counts;
  }

  private isFullHouse(counts: number[]) {
    const hasThree = counts.some((c) => c === 3);
    const hasTwo = counts.some((c) => c === 2);
    const isYahtzee = counts.some((c) => c === 5);
    return (hasThree && hasTwo) || isYahtzee;
  }

  private hasStraight(dice: number[], length: number) {
    const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i] === unique[i - 1] + 1) {
        streak += 1;
        if (streak >= length) return true;
      } else {
        streak = 1;
      }
    }
    return false;
  }

  private handleDieToggle(idx: number) {
    const lockedBefore = this.diceLocks[idx];
    diceState.toggleLock(idx);
    const lockedAfter = !lockedBefore;
    const value = this.diceValues[idx];
    const statusText = lockedAfter ? 'locked' : 'unlocked';
    const valueText = typeof value === 'number' ? ` (${value})` : '';
    console.debug('[scene] die button click -> toggle lock', { idx, lockedAfter, value });
    this.addToast(`Die ${idx + 1} ${statusText}${valueText}`);
  }

  private addToast(text: string) {
    const t = this.add.text(this.cameras.main.centerX, 64, text, {
      color: '#7ad3ff',
      fontSize: '16px',
      fontFamily: 'monospace'
    });
    t.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: t,
      y: 28,
      alpha: 0,
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }
}
