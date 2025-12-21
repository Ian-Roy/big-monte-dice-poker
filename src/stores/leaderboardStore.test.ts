import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';

import type { GameState } from '../game/engine';
import type { GameSessionState } from '../shared/gameSession';
import { useLeaderboardStore } from './leaderboardStore';

function buildCompletedState(grand: number): GameState {
  return {
    dice: [1, 1, 1, 1, 1],
    holds: [false, false, false, false, false],
    rollsThisRound: 0,
    currentRound: 13,
    maxRounds: 13,
    maxRolls: 3,
    categories: [],
    totals: { upper: 0, lower: 0, bonus: 0, grand },
    completed: true
  };
}

describe('useLeaderboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem('big-monte:leaderboard');
    }
  });

  it('records completed reactive sessions without throwing', () => {
    const store = useLeaderboardStore();

    const session: GameSessionState = {
      mode: 'solo',
      activePlayerIndex: 0,
      players: [
        {
          id: 'p1',
          name: 'Alice',
          appearance: { diceColor: 'blue', heldColor: 'blue' },
          state: buildCompletedState(123)
        }
      ]
    };

    const reactiveSession = reactive(session);
    expect(() => store.recordCompletedSession({ id: 'slot-1', session: reactiveSession })).not.toThrow();

    expect(store.entries.length).toBe(1);
    expect(store.entries[0]?.id).toBe('slot-1');
    expect(store.entries[0]?.leaderName).toBe('Alice');
    expect(store.entries[0]?.leaderScore).toBe(123);
  });

  it('persists and reloads entries from localStorage', () => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return;
    }

    const store = useLeaderboardStore();

    const session: GameSessionState = {
      mode: 'solo',
      activePlayerIndex: 0,
      players: [
        {
          id: 'p1',
          name: 'Alice',
          appearance: { diceColor: 'blue', heldColor: 'blue' },
          state: buildCompletedState(200)
        }
      ]
    };

    store.recordCompletedSession({ id: 'slot-1', session });
    expect(store.entries.length).toBe(1);

    setActivePinia(createPinia());
    const reloaded = useLeaderboardStore();
    expect(reloaded.entries.length).toBe(1);
    expect(reloaded.entries[0]?.id).toBe('slot-1');
    expect(reloaded.entries[0]?.leaderScore).toBe(200);
  });
});
