import type { DiceServiceSnapshot } from './DiceService';

export type DieValue = number | null;
export type DiceValues = [DieValue, DieValue, DieValue, DieValue, DieValue];
export type DiceLocks = [boolean, boolean, boolean, boolean, boolean];
export type DiceSnapshot = {
  values: DiceValues;
  locks: DiceLocks;
  rollsThisRound: number;
  isRolling: boolean;
};

const BLANK_VALUES: DiceValues = [null, null, null, null, null];
const UNLOCKED_LOCKS: DiceLocks = [false, false, false, false, false];

export function emptySnapshot(): DiceSnapshot {
  return {
    values: [...BLANK_VALUES] as DiceValues,
    locks: [...UNLOCKED_LOCKS] as DiceLocks,
    rollsThisRound: 0,
    isRolling: false
  };
}

export function snapshotFromService(serviceSnapshot: DiceServiceSnapshot): DiceSnapshot {
  const values = [...BLANK_VALUES] as DiceValues;
  const locks = [...UNLOCKED_LOCKS] as DiceLocks;

  serviceSnapshot.dice.forEach((die) => {
    if (die.index < 0 || die.index >= values.length) return;
    values[die.index] = die.value > 0 ? die.value : null;
    locks[die.index] = !!die.held;
  });

  return {
    values,
    locks,
    rollsThisRound: serviceSnapshot.rollsThisRound,
    isRolling: serviceSnapshot.isRolling
  };
}
