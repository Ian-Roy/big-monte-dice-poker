import Phaser from 'phaser';

export type DieValue = number | null;
export type DiceValues = [DieValue, DieValue, DieValue, DieValue, DieValue];
export type DiceLocks = [boolean, boolean, boolean, boolean, boolean];
export type DiceSnapshot = { values: DiceValues; locks: DiceLocks };

export const DiceStateEvent = {
  Change: 'dice-change'
} as const;

const BLANK_VALUES: DiceValues = [null, null, null, null, null];
const UNLOCKED_LOCKS: DiceLocks = [false, false, false, false, false];

class DiceState extends Phaser.Events.EventEmitter {
  private values: DiceValues = [...BLANK_VALUES];
  private locks: DiceLocks = [...UNLOCKED_LOCKS];

  getState(): DiceSnapshot {
    return { values: [...this.values] as DiceValues, locks: [...this.locks] as DiceLocks };
  }

  setValues(values: Array<number | null | undefined>, opts?: { respectLocks?: boolean }) {
    const next: DiceValues = [...this.values] as DiceValues;
    for (let i = 0; i < next.length; i++) {
      if (opts?.respectLocks && this.locks[i]) continue;
      const v = values[i];
      next[i] = typeof v === 'number' ? Number(v) : null;
    }
    this.values = next;
    this.emitChange();
  }

  applyRollResults(rollValues: number[]) {
    const next: DiceValues = [...this.values] as DiceValues;
    let rollIdx = 0;
    for (let i = 0; i < next.length; i++) {
      if (this.locks[i]) continue;
      const v = rollValues[rollIdx];
      if (typeof v === 'number' && Number.isFinite(v)) {
        next[i] = Number(v);
      }
      rollIdx += 1;
      if (rollIdx >= rollValues.length) break;
    }
    this.values = next;
    this.emitChange();
  }

  toggleLock(idx: number) {
    if (idx < 0 || idx >= this.locks.length) return;
    const next: DiceLocks = [...this.locks] as DiceLocks;
    next[idx] = !next[idx];
    this.locks = next;
    this.emitChange();
  }

  setLocks(locks: Array<boolean | undefined>) {
    const next: DiceLocks = [...this.locks] as DiceLocks;
    for (let i = 0; i < next.length; i++) {
      if (typeof locks[i] === 'boolean') {
        next[i] = Boolean(locks[i]);
      }
    }
    this.locks = next;
    this.emitChange();
  }

  reset() {
    this.values = [...BLANK_VALUES];
    this.locks = [...UNLOCKED_LOCKS];
    this.emitChange();
  }

  private emitChange() {
    this.emit(DiceStateEvent.Change, this.getState());
  }
}

export const diceState = new DiceState();
