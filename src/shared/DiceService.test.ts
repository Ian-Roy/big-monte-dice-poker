import { describe, expect, it, vi } from 'vitest';

vi.mock('@3d-dice/dice-box', () => ({
  default: vi.fn(() => ({}))
}));

import { mergeRollResults, type GameDie } from './DiceService';

function makeDie(index: number, value: number, held = false, rollId?: string): GameDie {
  return {
    index,
    value,
    sides: 6,
    held,
    groupId: 'g',
    rollId: rollId ?? `r-${index}`
  };
}

describe('mergeRollResults', () => {
  it('preserves held dice and maps rerolled results to requested indices in any order', () => {
    const previous: GameDie[] = [
      makeDie(0, 1, false, 'a'),
      makeDie(1, 2, true, 'b'),
      makeDie(2, 3, false, 'c'),
      makeDie(3, 4, false, 'd'),
      makeDie(4, 5, true, 'e')
    ];

    const results = [
      { groupId: 'g', rollId: 'b', value: 2, sides: 6 }, // held
      { groupId: 'g', rollId: 'new-0', value: 6, sides: 6 }, // reroll idx 0
      { groupId: 'g', rollId: 'e', value: 5, sides: 6 }, // held
      { groupId: 'g', rollId: 'new-3', value: 1, sides: 6 }, // reroll idx 3
      { groupId: 'g', rollId: 'new-2', value: 4, sides: 6 } // reroll idx 2
    ];

    const merged = mergeRollResults({ previous, results, rerollIndices: [0, 2, 3] });

    expect(merged.map((d) => d.value)).toEqual([6, 2, 1, 4, 5]);
    expect(merged.map((d) => d.held)).toEqual([false, true, false, false, true]);
    expect(merged[0].rollId).toBe('new-0');
    expect(merged[2].rollId).toBe('new-3');
    expect(merged[3].rollId).toBe('new-2');
  });

  it('leaves untouched dice in place if fewer results arrive than expected', () => {
    const previous: GameDie[] = [
      makeDie(0, 1, false, 'a'),
      makeDie(1, 2, false, 'b'),
      makeDie(2, 3, false, 'c'),
      makeDie(3, 4, false, 'd'),
      makeDie(4, 5, false, 'e')
    ];

    const results = [
      { groupId: 'g', rollId: 'new-a', value: 6, sides: 6 },
      { groupId: 'g', rollId: 'new-b', value: 1, sides: 6 }
    ];

    const merged = mergeRollResults({ previous, results, rerollIndices: [0, 1, 2, 3, 4] });

    expect(merged.map((d) => d.value)).toEqual([6, 1, 3, 4, 5]);
    expect(merged.map((d) => d.held)).toEqual([false, false, false, false, false]);
    expect(merged[2].rollId).toBe('c');
  });
});
