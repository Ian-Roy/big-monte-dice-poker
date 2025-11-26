import Phaser from 'phaser';
import DiceBox from '@3d-dice/dice-box';

type DiceEnabledConfig = Phaser.Types.Core.GameConfig & { diceBox?: DiceBox };
type GameWithDice = Phaser.Game & { diceBox?: DiceBox };

export class MainScene extends Phaser.Scene {
  private currentRound = 1;
  private rollsLeft = 3;
  private diceValues: number[] = [];
  private diceText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private rolling = false;
  private diceBox?: DiceBox;

  constructor() {
    super('main');
  }

  create() {
    const cfg = this.game.config as DiceEnabledConfig;
    const gameDice = (this.game as GameWithDice).diceBox;
    // Prefer the direct game attachment, fall back to config, then window hook for debugging
    this.diceBox = gameDice ?? cfg.diceBox ?? ((window as unknown as Record<string, unknown>).diceBox as DiceBox | undefined);

    console.info('[scene] create; diceBox present:', !!this.diceBox);

    this.createLayout();
    this.updateHeaderText();
    this.updateDiceText();

    if (!this.diceBox) {
      this.addToast('Dice tray failed to load');
    }
  }

  private createLayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const panelWidth = 240;
    const panelX = w - panelWidth;

    // Backdrop panels
    this.add.rectangle(w / 2, 48, w, 96, 0x041927).setOrigin(0.5);
    this.add.rectangle(panelX + panelWidth / 2, h / 2, panelWidth, h, 0x0b2e3f).setOrigin(0.5);

    // Header text (round / rolls)
    this.roundText = this.add.text(24, 22, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#e7edf2'
    });

    this.add
      .text(24, 62, 'Roll the 3D dice, then score in Phaser.\n(Click ROLL on the right)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad5ff'
      })
      .setDepth(1);

    // Roll button
    const btnY = 130;
    const button = this.add
      .rectangle(panelX + panelWidth / 2, btnY, panelWidth - 40, 68, 0x1f7bb6, 0.98)
      .setStrokeStyle(3, 0x7ad3ff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(button.x, button.y, 'ROLL', {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    button.on('pointerup', () => this.handleRollClick());

    this.diceText = this.add.text(panelX + 24, 220, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e7edf2',
      wordWrap: { width: panelWidth - 48 }
    });

    this.add
      .text(panelX + 24, 300, 'Dice overlay renders in the center.\nPhaser UI stays clickable.', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad5ff',
        wordWrap: { width: panelWidth - 48 }
      })
      .setAlpha(0.85);
  }

  private updateHeaderText() {
    this.roundText.setText(`Round ${this.currentRound}  |  Rolls left: ${this.rollsLeft}`);
  }

  private updateDiceText() {
    if (!this.diceValues.length) {
      this.diceText.setText('Dice: - - - - -');
      return;
    }
    this.diceText.setText(`Dice: ${this.diceValues.join(' ')}`);
  }

  private async handleRollClick() {
    if (this.rolling) return;
    if (!this.diceBox) {
      this.addToast('Dice tray not ready');
      console.warn('[scene] roll click ignored: diceBox missing');
      return;
    }
    if (this.rollsLeft <= 0) {
      this.addToast('No rolls left');
      return;
    }

    this.rolling = true;
    this.rollsLeft -= 1;
    this.updateHeaderText();

    try {
      const resultGroups = await this.diceBox.roll('5d6');
      const group = Array.isArray(resultGroups) ? resultGroups[0] : undefined;
      const values = group?.rolls?.map((die: { value: number }) => Number(die.value)) ?? [];
      this.diceValues = values;
      console.info('[scene] roll result', { values });
      this.updateDiceText();
      // This is where scoring/locking can hook in later using this.diceValues.
    } catch (err) {
      console.error('Dice roll failed', err);
      this.addToast('Roll failed');
    } finally {
      this.rolling = false;
    }
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
