import Phaser from 'phaser';

export type DieValue = number | null;
export type DiceValues = [DieValue, DieValue, DieValue, DieValue, DieValue];

export const DiceStateEvent = {
  Change: 'dice-change'
} as const;

const BLANK_VALUES: DiceValues = [null, null, null, null, null];

class DiceState extends Phaser.Events.EventEmitter {
  private values: DiceValues = [...BLANK_VALUES];

  getValues(): DiceValues {
    return [...this.values] as DiceValues;
  }

  setValues(values: Array<number | null | undefined>) {
    console.debug('[diceState] setValues input', values);
    const next: DiceValues = [...BLANK_VALUES] as DiceValues;
    for (let i = 0; i < next.length; i++) {
      const v = values[i];
      next[i] = typeof v === 'number' ? Number(v) : null;
    }
    this.values = next;
    console.debug('[diceState] emit change', this.values);
    this.emit(DiceStateEvent.Change, this.getValues());
  }

  reset() {
    console.debug('[diceState] reset');
    this.setValues(BLANK_VALUES);
  }
}

export const diceState = new DiceState();
