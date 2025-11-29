import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import type { DiceServiceSnapshot } from '../shared/DiceService';
import { useGameStore, type DiceServiceAdapter } from './gameStore';

type StubService = DiceServiceAdapter & {
  emit: (snapshot: DiceServiceSnapshot) => void;
  record: {
    rollCalls: number;
    rerollCalls: number;
    toggleCalls: number[];
    startCalls: number;
  };
};

const baseSnapshot: DiceServiceSnapshot = {
  dice: Array.from({ length: 5 }, (_, index) => ({
    index,
    value: 0,
    sides: 6,
    held: false,
    groupId: 'g',
    rollId: `r-${index}`
  })),
  rollsThisRound: 0,
  isRolling: false
};

function snapshotFor(values: number[], rollsThisRound: number, held?: boolean[]): DiceServiceSnapshot {
  return {
    dice: values.map((v, idx) => ({
      index: idx,
      value: v,
      sides: 6,
      held: held?.[idx] ?? false,
      groupId: 'g',
      rollId: `r-${idx}`
    })),
    rollsThisRound,
    isRolling: false
  };
}

function createStubService(initial: DiceServiceSnapshot = baseSnapshot): StubService {
  let snapshot = initial;
  const listeners: Array<(s: DiceServiceSnapshot) => void> = [];
  const record = {
    rollCalls: 0,
    rerollCalls: 0,
    toggleCalls: [] as number[],
    startCalls: 0
  };

  const emit = (next: DiceServiceSnapshot) => {
    snapshot = next;
    listeners.forEach((cb) => cb(snapshot));
  };

  return {
    record,
    emit,
    getSnapshot: () => snapshot,
    onChange(cb) {
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    async rollAll() {
      record.rollCalls += 1;
    },
    async rerollUnheld() {
      record.rerollCalls += 1;
    },
    toggleHold(index: number) {
      record.toggleCalls.push(index);
      snapshot = {
        ...snapshot,
        dice: snapshot.dice.map((die) =>
          die.index === index ? { ...die, held: !die.held } : die
        )
      };
      emit(snapshot);
    },
    startNewRound() {
      record.startCalls += 1;
      snapshot = {
        ...snapshot,
        rollsThisRound: 0,
        isRolling: false,
        dice: snapshot.dice.map((die) => ({ ...die, held: false, value: 0 }))
      };
      emit(snapshot);
    }
  };
}

describe('useGameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('syncs engine rolls when dice service emits values', () => {
    const store = useGameStore();
    const stub = createStubService();

    store.attachDiceService(stub);
    stub.emit(snapshotFor([1, 2, 3, 4, 5], 1));

    expect(store.diceSnapshot.values).toEqual([1, 2, 3, 4, 5]);
    expect(store.engineState.rollsThisRound).toBe(1);
  });

  it('forwards hold toggles to the engine and service', () => {
    const store = useGameStore();
    const stub = createStubService();
    store.attachDiceService(stub);
    stub.emit(snapshotFor([1, 1, 1, 1, 1], 1));

    store.toggleHold(0);

    expect(store.engineState.holds[0]).toBe(true);
    expect(stub.record.toggleCalls).toEqual([0]);
  });

  it('scores a category, advances round, and resets the dice service', () => {
    const store = useGameStore();
    const stub = createStubService();
    store.attachDiceService(stub);
    stub.emit(snapshotFor([2, 3, 4, 5, 6], 1));

    store.scoreCategory('chance');

    const chance = store.engineState.categories.find((c) => c.key === 'chance');
    expect(chance?.score).toBe(20);
    expect(store.engineState.currentRound).toBe(2);
    expect(stub.record.startCalls).toBe(1);
    expect(store.diceSnapshot.rollsThisRound).toBe(0);
  });
});
