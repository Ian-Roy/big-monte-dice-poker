import Phaser from 'phaser';
import { diceState, DiceStateEvent, type DiceSnapshot, type DiceValues, type DiceLocks } from '../shared/DiceState';
import { PhaserDiceManager } from '../shared/PhaserDiceManager';
import { bindPress } from '../shared/PointerPress';

export class MainScene extends Phaser.Scene {
  private rollsLeft = 3;
  private diceValues: DiceValues = [null, null, null, null, null];
  private diceLocks: DiceLocks = [false, false, false, false, false];
  private rolling = false;
  private diceManager!: PhaserDiceManager;
  private rollButton!: Phaser.GameObjects.Rectangle;
  private rollLabel!: Phaser.GameObjects.Text;
  private handleDiceStateUpdate = ({ values, locks }: DiceSnapshot) => {
    console.debug('[scene] dice state change', { values, locks });
    this.diceValues = values;
    this.diceLocks = locks;
    this.diceManager.updateState(values, locks);
  };

  constructor() {
    super('main');
  }

  create() {
    this.createLayout();
    this.createDiceArea();
    this.setupDiceState();
    this.updateRollButton();
  }

  private createLayout() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Soft backdrop behind the dice cluster
    this.add.rectangle(w / 2, h / 2 + 10, w * 0.82, h * 0.78, 0x02111d, 0.42);

    const btnY = h - 70;
    this.rollButton = this.add
      .rectangle(w / 2, btnY, 260, 70, 0x1f7bb6, 0.98)
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

  private createDiceArea() {
    const areaWidth = this.scale.width;
    const areaHeight = this.scale.height - 140;

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
    if (this.rolling) return 'ROLLING...';
    return this.rollsLeft > 0 ? `ROLL (${this.rollsLeft})` : 'NO ROLLS LEFT';
  }

  private updateRollButton() {
    if (!this.rollButton || !this.rollLabel) return;
    const disabled = this.rollsLeft <= 0 || this.rolling;
    this.rollLabel.setText(this.rollButtonText());
    this.rollButton.setAlpha(disabled ? 0.7 : 1);
  }

  private async handleRollClick() {
    console.debug('[scene] handleRollClick', { rolling: this.rolling, rollsLeft: this.rollsLeft });
    if (this.rolling) return;
    if (this.rollsLeft <= 0) {
      this.addToast('No rolls left');
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
      // This is where scoring/locking can hook in later using this.diceValues.
    } catch (err) {
      console.error('Dice roll failed', err);
      this.addToast('Roll failed');
    } finally {
      this.rolling = false;
      this.updateRollButton();
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
