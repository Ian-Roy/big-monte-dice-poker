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
  | 'upper-bonus'
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
  section: 'upper' | 'lower';
  interactive?: boolean;
  scoredDice?: number[];
};

type ScoreRow = {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  width: number;
  diceIcons: Phaser.GameObjects.Image[];
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
  private scoreboardHeight = 900;
  private readonly scoreboardRowHeight = 56;
  private readonly scoreboardTopPadding = 64;
  private readonly scoreboardBottomPadding = 30;
  private readonly scoreboardHeaderHeight = 18;
  private readonly scoreboardHeaderGap = 10;
  private readonly scoreboardSectionGap = 24;
  private readonly scoreboardBonusGap = 12;
  private scoreboardCenterY = 0;
  private rollButtonY = 0;
  private diceAreaHeight = 0;
  private scoreRows: Map<CategoryKey, ScoreRow> = new Map();
  private scoreCategories: ScoreCategory[] = [];
  private maxRounds = 13;
  private confirmContainer?: Phaser.GameObjects.Container;
  private readonly upperKeys: CategoryKey[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  private readonly lowerKeys: CategoryKey[] = [
    'three-kind',
    'four-kind',
    'full-house',
    'small-straight',
    'large-straight',
    'yahtzee',
    'chance'
  ];

  private handleDiceStateUpdate = ({ values, locks }: DiceSnapshot) => {
    console.debug('[scene] dice state change', { values, locks });
    this.diceValues = values;
    this.diceLocks = locks;
    this.diceManager.updateState(values, locks);
    this.refreshScoreRows();
  };

  constructor() {
    super('main');
    this.scoreCategories = this.buildScoreCategories();
    this.maxRounds = this.upperKeys.length + this.lowerKeys.length;
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
      { key: 'ones', label: 'Ones', score: null, scored: false, section: 'upper' },
      { key: 'twos', label: 'Twos', score: null, scored: false, section: 'upper' },
      { key: 'threes', label: 'Threes', score: null, scored: false, section: 'upper' },
      { key: 'fours', label: 'Fours', score: null, scored: false, section: 'upper' },
      { key: 'fives', label: 'Fives', score: null, scored: false, section: 'upper' },
      { key: 'sixes', label: 'Sixes', score: null, scored: false, section: 'upper' },
      { key: 'upper-bonus', label: 'Upper Bonus (+35 if 63+)', score: null, scored: false, section: 'upper', interactive: false },
      { key: 'three-kind', label: 'Three of a Kind', score: null, scored: false, section: 'lower' },
      { key: 'four-kind', label: 'Four of a Kind', score: null, scored: false, section: 'lower' },
      { key: 'full-house', label: 'Full House (25)', score: null, scored: false, section: 'lower' },
      { key: 'small-straight', label: 'Small Straight (30)', score: null, scored: false, section: 'lower' },
      { key: 'large-straight', label: 'Large Straight (40)', score: null, scored: false, section: 'lower' },
      { key: 'yahtzee', label: 'Yahtzee (50)', score: null, scored: false, section: 'lower' },
      { key: 'chance', label: 'Chance', score: null, scored: false, section: 'lower' }
    ];
  }

  private createLayout() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.scoreboardHeight = this.computeScoreboardHeight(h);
    this.scoreboardCenterY = h - this.scoreboardHeight / 2 - 12;
    this.rollButtonY = this.scoreboardCenterY - this.scoreboardHeight / 2 - 40;
    this.diceAreaHeight = Math.max(320, this.rollButtonY - 40);

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

  private computeScoreboardHeight(sceneHeight: number) {
    const headerBlock = this.scoreboardHeaderHeight + this.scoreboardHeaderGap;
    const upperRowsHeight = this.scoreboardRowHeight * this.upperKeys.length;
    const lowerRowsHeight = this.scoreboardRowHeight * this.lowerKeys.length;
    const bonusRowHeight = this.scoreboardRowHeight;

    const baseHeight =
      this.scoreboardTopPadding +
      headerBlock +
      upperRowsHeight +
      this.scoreboardBonusGap +
      bonusRowHeight +
      this.scoreboardSectionGap +
      headerBlock +
      lowerRowsHeight +
      this.scoreboardBottomPadding;

    const minHeight = 900;
    const maxHeight = sceneHeight - 40;
    return Math.min(Math.max(baseHeight, minHeight), Math.max(minHeight, maxHeight));
  }

  private createScoreBoard() {
    const w = this.scale.width;
    const bgWidth = w * 0.92;

    this.add
      .rectangle(w / 2, this.scoreboardCenterY, bgWidth, this.scoreboardHeight, 0x0b1a28, 0.82)
      .setStrokeStyle(2, 0x123f5b, 0.7)
      .setDepth(8);

    this.add
      .text(
        w / 2 - bgWidth / 2 + 14,
        this.scoreboardCenterY - this.scoreboardHeight / 2 + 12,
        'Scorecard',
        {
          fontFamily: 'monospace',
          fontSize: '17px',
          color: '#9ad5ff'
        }
      )
      .setOrigin(0, 0)
      .setDepth(9);

    const colWidth = bgWidth - 32;
    const centerX = w / 2;
    const startY = this.scoreboardCenterY - this.scoreboardHeight / 2 + this.scoreboardTopPadding;
    const rowHeight = this.scoreboardRowHeight;
    let y = startY;

    const upperCats = this.upperScoringCategories();
    const bonusCat = this.findCategory('upper-bonus');
    const lowerCats = this.scoreCategories.filter((c) => this.lowerKeys.includes(c.key));

    y = this.addSectionHeader('Upper Section', centerX, colWidth, y);
    upperCats
      .filter((c) => c.key !== 'upper-bonus')
      .forEach((cat) => {
        this.createScoreRow(cat, centerX, colWidth, rowHeight, y + rowHeight / 2);
        y += rowHeight;
      });

    if (bonusCat) {
      y += this.scoreboardBonusGap;
      this.createScoreRow(bonusCat, centerX, colWidth, rowHeight, y + rowHeight / 2);
      y += rowHeight;
    }

    y += this.scoreboardSectionGap;
    y = this.addSectionHeader('Lower Section (Poker Hands)', centerX, colWidth, y);
    lowerCats.forEach((cat) => {
      this.createScoreRow(cat, centerX, colWidth, rowHeight, y + rowHeight / 2);
      y += rowHeight;
    });

    // Initialize rows with correct text/colors
    this.scoreCategories.forEach((cat) => this.updateScoreRow(cat));
  }

  private addSectionHeader(title: string, centerX: number, width: number, y: number) {
    this.add
      .text(centerX - width / 2 + 4, y, title, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad5ff'
      })
      .setOrigin(0, 0)
      .setDepth(11);
    return y + this.scoreboardHeaderHeight + this.scoreboardHeaderGap;
  }

  private createScoreRow(
    cat: ScoreCategory,
    centerX: number,
    width: number,
    rowHeight: number,
    y: number
  ) {
    const interactive = cat.interactive !== false;
    const bgRect = this.add
      .rectangle(centerX, y, width, rowHeight - 2, interactive ? 0x0f2636 : 0x1a1f34, 0.9)
      .setStrokeStyle(2, interactive ? 0x7ad3ff : 0xffdf7f, interactive ? 0.65 : 0.8)
      .setOrigin(0.5)
      .setDepth(9);

    if (interactive) {
      bgRect.setInteractive({ useHandCursor: true });
      bindPress(bgRect, () => this.handleScoreCategory(cat.key));
    }

    const labelY = y - 6;
    const valueY = y - 6;

    const label = this.add
      .text(centerX - width / 2 + 10, labelY, cat.label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e7edf2'
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    const defaultValueText = interactive ? 'Tap to score' : 'Upper bonus auto-applied';
    const defaultValueColor = interactive ? '#b7e2ff' : '#ffdf7f';
    const value = this.add
      .text(centerX + width / 2 - 10, valueY, defaultValueText, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: defaultValueColor
      })
      .setOrigin(1, 0.5)
      .setDepth(10);
    // Preview line removed; inline hint handled in updateScoreRow

    this.scoreRows.set(cat.key, { bg: bgRect, label, value, width, diceIcons: [] });
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

  private getDiceNumbers() {
    return this.diceValues.filter((v): v is number => typeof v === 'number');
  }

  private findCategory(key: CategoryKey) {
    return this.scoreCategories.find((c) => c.key === key);
  }

  private upperScoringCategories() {
    return this.scoreCategories.filter((c) => this.upperKeys.includes(c.key));
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
    if (this.confirmContainer) return;
    const cat = this.findCategory(key);
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

    const dice = this.getDiceNumbers();
    if (dice.length !== 5) {
      this.addToast('Roll the dice first');
      return;
    }

    const score = this.computeScore(cat.key, dice);
    this.showScoreConfirm(cat, score);
  }

  private updateScoreRow(cat: ScoreCategory) {
    const row = this.scoreRows.get(cat.key);
    if (!row) return;
    const scored = cat.scored;
    const isBonus = cat.key === 'upper-bonus';
    const baseText = isBonus ? 'Upper bonus auto-applied' : 'Tap to score';
    const preview = !scored && !isBonus ? this.previewScore(cat) : null;
    const text = typeof cat.score === 'number' ? `${cat.score}` : preview ? `${baseText} (+${preview})` : baseText;
    row.value.setText(text);
    row.value.setColor(scored ? '#ffc857' : isBonus ? '#ffdf7f' : '#b7e2ff');
    row.bg.setFillStyle(scored ? 0x1a2b3b : 0x0f2636, scored ? 0.9 : 0.9);
    row.bg.setStrokeStyle(scored ? 2 : 2, scored ? 0xffc857 : 0x7ad3ff, scored ? 0.9 : 0.65);
    if (scored) {
      row.bg.disableInteractive();
    }
    this.renderScoredDice(row, cat);
  }

  private refreshScoreRows() {
    this.scoreCategories.forEach((cat) => this.updateScoreRow(cat));
  }

  private showScoreConfirm(cat: ScoreCategory, score: number) {
    const w = this.scale.width;
    const h = this.scale.height;
    this.closeConfirm();

    const overlayBg = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.55)
      .setInteractive({ useHandCursor: false })
      .setDepth(100);

    const cardWidth = 420;
    const cardHeight = 200;
    const cardBg = this.add
      .rectangle(w / 2, h / 2, cardWidth, cardHeight, 0x0e1c2c, 0.96)
      .setStrokeStyle(2, 0x7ad3ff, 0.8)
      .setDepth(101);

    const title = this.add
      .text(w / 2, h / 2 - 60, `Score ${cat.label}?`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e7edf2'
      })
      .setOrigin(0.5)
      .setDepth(102);

    const detail = this.add
      .text(
        w / 2,
        h / 2 - 18,
        `This will add ${score} point${score === 1 ? '' : 's'} and end round ${this.currentRound}.`,
        {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#b7e2ff'
        }
      )
      .setOrigin(0.5)
      .setDepth(102);

    const confirmBtn = this.add
      .rectangle(w / 2 - 90, h / 2 + 46, 160, 48, 0x1f7bb6, 0.95)
      .setStrokeStyle(2, 0x7ad3ff, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(103);
    const confirmLabel = this.add
      .text(confirmBtn.x, confirmBtn.y, 'Score it', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(104);

    const cancelBtn = this.add
      .rectangle(w / 2 + 90, h / 2 + 46, 160, 48, 0x12263b, 0.95)
      .setStrokeStyle(2, 0x7ad3ff, 0.6)
      .setInteractive({ useHandCursor: true })
      .setDepth(103);
    const cancelLabel = this.add
      .text(cancelBtn.x, cancelBtn.y, 'Cancel', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#b7e2ff'
      })
      .setOrigin(0.5)
      .setDepth(104);

    const container = this.add.container(0, 0, [
      overlayBg,
      cardBg,
      title,
      detail,
      confirmBtn,
      cancelBtn,
      confirmLabel,
      cancelLabel
    ]);
    container.setDepth(100);
    this.confirmContainer = container;

    bindPress(confirmBtn, () => this.applyScore(cat, score));
    bindPress(cancelBtn, () => this.closeConfirm());
  }

  private closeConfirm() {
    if (this.confirmContainer) {
      this.confirmContainer.destroy(true);
      this.confirmContainer = undefined;
    }
  }

  private applyScore(cat: ScoreCategory, score: number) {
    if (cat.scored) {
      this.closeConfirm();
      return;
    }
    cat.score = score;
    const dice = this.getDiceNumbers();
    if (dice.length === 5) {
      cat.scoredDice = [...dice];
    }
    cat.scored = true;
    this.updateScoreRow(cat);
    this.updateUpperBonusIfReady();
    this.addToast(`${cat.label}: +${score} points`);
    this.closeConfirm();
    this.advanceRound();
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
    return this.getDiceNumbers().length === this.diceValues.length;
  }

  private previewScore(cat: ScoreCategory) {
    if (cat.scored || cat.interactive === false) return null;
    const dice = this.getDiceNumbers();
    if (dice.length !== 5) return null;
    const val = this.computeScore(cat.key, dice);
    return val > 0 ? val : null;
  }

  private renderScoredDice(row: ScoreRow, cat: ScoreCategory) {
    // Clear any previous icons
    row.diceIcons.forEach((icon) => icon.destroy());
    row.diceIcons = [];
    if (!cat.scoredDice || !cat.scoredDice.length) return;
    const sorted = [...cat.scoredDice].sort((a, b) => a - b);
    const size = 28;
    const gap = 6;
    const totalWidth = sorted.length * size + (sorted.length - 1) * gap;
    const startX = row.bg.x - totalWidth / 2 + size / 2;
    const y = row.bg.y - row.bg.height / 2 + 8 + size / 2;
    sorted.forEach((val, idx) => {
      const x = startX + idx * (size + gap);
      const icon = this.add.image(x, y, `die-face-${val}`).setDisplaySize(size, size).setDepth(11);
      row.diceIcons.push(icon);
    });
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

  private updateUpperBonusIfReady() {
    const bonusCat = this.findCategory('upper-bonus');
    if (!bonusCat) return;

    const upperCats = this.upperScoringCategories();
    const allUpperScored = upperCats.every((c) => c.scored);
    if (!allUpperScored) {
      bonusCat.score = null;
      bonusCat.scored = false;
      this.updateScoreRow(bonusCat);
      return;
    }

    const upperTotal = upperCats.reduce((sum, cat) => sum + (cat.score ?? 0), 0);
    const bonusScore = upperTotal >= 63 ? 35 : 0;
    const changed = bonusCat.score !== bonusScore || bonusCat.scored === false;
    bonusCat.score = bonusScore;
    bonusCat.scored = true;
    if (changed) {
      this.updateScoreRow(bonusCat);
      this.updateInfoText();
    }
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
