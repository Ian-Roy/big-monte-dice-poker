import Phaser from 'phaser';
import DiceBox from '@3d-dice/dice-box';
import { diceState, DiceStateEvent, type DiceValues } from '../shared/DiceState';

type DiceBoxWithEvents = DiceBox & {
  onRollResult?: (die: unknown) => void;
  onRollComplete?: (results?: unknown) => void;
  getRollResults?: () => unknown;
};

type DiceEnabledConfig = Phaser.Types.Core.GameConfig & { diceBox?: DiceBox };
type GameWithDice = Phaser.Game & { diceBox?: DiceBox };

export class MainScene extends Phaser.Scene {
  private currentRound = 1;
  private rollsLeft = 3;
  private diceValues: DiceValues = [null, null, null, null, null];
  private diceText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private rolling = false;
  private diceBox?: DiceBox;
  private dieButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private handleDiceStateUpdate = (values: DiceValues) => {
    console.debug('[scene] dice state change', values);
    this.diceValues = values;
    this.updateDiceText();
    this.updateDieButtons();
  };

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
    this.setupDiceState();
    this.updateHeaderText();
    this.attachDiceBoxListeners();

    if (!this.diceBox) {
      this.addToast('Dice tray failed to load');
    }
  }

  private attachDiceBoxListeners() {
    if (!this.diceBox) return;
    const box = this.diceBox as DiceBoxWithEvents;

    box.onRollResult = (die) => {
      console.debug('[scene] onRollResult (single die)', die);
    };

    box.onRollComplete = (results) => {
      console.debug('[scene] onRollComplete', results);
      const values = this.extractDiceValues(results ?? box.getRollResults?.());
      if (values.length) {
        diceState.setValues(values);
      } else {
        console.warn('[scene] onRollComplete found no values');
      }
    };
  }

  private createLayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const panelWidth = 240;
    const panelX = w - panelWidth;
    this.dieButtons = [];

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

    this.createDieButtons(panelX, panelWidth, btnY);

    this.diceText = this.add.text(panelX + 24, 520, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e7edf2',
      wordWrap: { width: panelWidth - 48 }
    });

    this.add
      .text(panelX + 24, 570, 'Dice overlay renders in the center.\nPhaser UI stays clickable.', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad5ff',
        wordWrap: { width: panelWidth - 48 }
      })
      .setAlpha(0.85);
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

  private createDieButtons(panelX: number, panelWidth: number, btnY: number) {
    const btnWidth = panelWidth - 120;
    const btnHeight = 46;
    const btnX = panelX + 20 + btnWidth / 2;
    const startY = btnY + 70;
    const gap = 12;

    for (let i = 0; i < 5; i++) {
      const y = startY + i * (btnHeight + gap);
      const bg = this.add
        .rectangle(btnX, y, btnWidth, btnHeight, 0x0f2636, 0.8)
        .setStrokeStyle(2, 0x7ad3ff, 0.6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(bg.x, bg.y, this.formatDieLabel(i), {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e7edf2'
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x15415a, 0.9));
      bg.on('pointerout', () => bg.setFillStyle(0x0f2636, 0.8));
      bg.on('pointerup', () => this.handleDieButtonClick(i));

      this.dieButtons.push({ bg, label });
    }
  }

  private updateHeaderText() {
    this.roundText.setText(`Round ${this.currentRound}  |  Rolls left: ${this.rollsLeft}`);
  }

  private updateDiceText() {
    const hasValues = this.diceValues.some((v) => typeof v === 'number');
    const printable = this.diceValues.map((v) => (typeof v === 'number' ? v.toString() : '-'));
    console.debug('[scene] updateDiceText', { hasValues, printable });
    this.diceText.setText(hasValues ? `Dice: ${printable.join(' ')}` : 'Dice: - - - - -');
  }

  private async handleRollClick() {
    console.debug('[scene] handleRollClick', { rolling: this.rolling, rollsLeft: this.rollsLeft });
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
      console.debug('[scene] roll raw resultGroups', resultGroups);
      const group = Array.isArray(resultGroups) ? resultGroups[0] : undefined;
      const values = this.extractDiceValues(group ?? resultGroups);
      if (values.length) {
        diceState.setValues(values);
      } else {
        // Fallback: ask Dice-Box directly for its current results
        const directValues = this.extractDiceValues((this.diceBox as DiceBoxWithEvents).getRollResults?.());
        if (directValues.length) {
          console.debug('[scene] using getRollResults fallback', directValues);
          diceState.setValues(directValues);
        } else {
          console.warn('[scene] roll produced no values');
        }
      }
      console.info('[scene] roll result', { values });
      // This is where scoring/locking can hook in later using this.diceValues.
    } catch (err) {
      console.error('Dice roll failed', err);
      this.addToast('Roll failed');
    } finally {
      this.rolling = false;
    }
  }

  private updateDieButtons() {
    this.dieButtons.forEach((btn, idx) => {
      btn.label.setText(this.formatDieLabel(idx));
    });
  }

  private extractDiceValues(result: unknown): number[] {
    if (!result) return [];
    const groups = Array.isArray(result) ? result : [result as never];
    const values: number[] = [];

    groups.forEach((group) => {
      if (!group) return;
      // Try several common shapes: { rolls: [...] }, { rollsArray: [...] }, { dice: [...] }
      const rolls =
        (group as { rolls?: unknown[] }).rolls ??
        (group as { rollsArray?: unknown[] }).rollsArray ??
        (group as { dice?: unknown[] }).dice ??
        [];

      if (Array.isArray(rolls)) {
        rolls.forEach((die) => {
          const v = (die as { value?: unknown })?.value;
          if (typeof v === 'number' && Number.isFinite(v)) {
            values.push(Number(v));
          } else if (typeof die === 'number' && Number.isFinite(die)) {
            values.push(Number(die));
          }
        });
      }
    });

    return values.slice(0, 5);
  }

  private formatDieLabel(idx: number) {
    const value = this.diceValues[idx];
    return `Die ${idx + 1}: ${typeof value === 'number' ? value : '-'}`;
  }

  private handleDieButtonClick(idx: number) {
    const value = this.diceValues[idx];
    const text = typeof value === 'number' ? `Die ${idx + 1} rolled a ${value}` : `Die ${idx + 1} not rolled yet`;
    console.debug('[scene] die button click', { idx, value });
    this.addToast(text);
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
