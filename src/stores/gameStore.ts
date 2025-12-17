import { computed, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';

import { GameEngine, type CategoryKey, type GameState } from '../game/engine';
import { snapshotFromService, type DiceLocks, type DiceSnapshot, type DiceValues } from '../shared/DiceState';
import type { DiceService, DiceServiceSnapshot } from '../shared/DiceService';

export type DiceServiceAdapter = Pick<
  DiceService,
  | 'rollAll'
  | 'rerollUnheld'
  | 'rollIndices'
  | 'hydrateRoundState'
  | 'toggleHold'
  | 'startNewRound'
  | 'onChange'
  | 'getSnapshot'
>;

const GAME_STATE_STORAGE_KEY = 'big-monte:engine-state';
const GAME_STATE_STORAGE_VERSION = 1;

type PersistedGamePayload = {
  version: number;
  savedAt: number;
  state: GameState;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

function loadPersistedGameState(): GameState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(GAME_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGamePayload;
    if (!parsed || parsed.version !== GAME_STATE_STORAGE_VERSION || !parsed.state) {
      return null;
    }
    return parsed.state;
  } catch (err) {
    console.warn('[GameStore] failed to parse saved game state; ignoring snapshot.', err);
    return null;
  }
}

function persistGameState(state: GameState) {
  const storage = getStorage();
  if (!storage) return;
  const payload: PersistedGamePayload = {
    version: GAME_STATE_STORAGE_VERSION,
    savedAt: Date.now(),
    state
  };
  try {
    storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[GameStore] failed to persist game snapshot', err);
  }
}

export const useGameStore = defineStore('game', () => {
  const persistedState = loadPersistedGameState();
  const engine = new GameEngine();
  if (persistedState) {
    try {
      engine.hydrateState(persistedState);
    } catch (err) {
      console.warn('[GameStore] failed to hydrate saved state; falling back to defaults.', err);
    }
  }
  const engineState = ref(engine.getState());
  const diceSnapshot = ref<DiceSnapshot>({
    values: [...engineState.value.dice] as DiceValues,
    locks: [...engineState.value.holds] as DiceLocks,
    rollsThisRound: engineState.value.rollsThisRound,
    isRolling: false
  });
  const serviceReady = ref(false);
  const serviceError = ref<string | null>(null);
  const lastError = ref<string | null>(null);

  const diceService = shallowRef<DiceServiceAdapter | null>(null);
  const diceUnsub = shallowRef<null | (() => void)>(null);

  const categories = computed(() => engineState.value.categories);
  const totals = computed(() => engineState.value.totals);
  const isRolling = computed(() => diceSnapshot.value.isRolling);
  const rollsThisRound = computed(() => engineState.value.rollsThisRound);
  const rollLimit = computed(() => engineState.value.maxRolls);

  function syncDiceSnapshot(isRollingOverride?: boolean) {
    const next: DiceSnapshot = {
      values: [...engineState.value.dice] as DiceValues,
      locks: [...engineState.value.holds] as DiceLocks,
      rollsThisRound: engineState.value.rollsThisRound,
      isRolling: typeof isRollingOverride === 'boolean' ? isRollingOverride : diceSnapshot.value.isRolling
    };
    diceSnapshot.value = next;
  }

  watch(
    engineState,
    (state) => {
      persistGameState(state);
      syncDiceSnapshot();
    },
    { deep: true, immediate: true }
  );

  function setEngineState() {
    engineState.value = engine.getState();
  }

  function setServiceError(message: string | null) {
    serviceError.value = message;
  }

  function clearError() {
    lastError.value = null;
  }

  function syncEngineRoll(snapshot: DiceSnapshot) {
    if (snapshot.isRolling) return;
    const values = snapshot.values;
    if (values.some((v) => typeof v !== 'number')) return;
    const rolls = snapshot.rollsThisRound;
    const stateRolls = engineState.value.rollsThisRound;
    const valuesChanged =
      values.length === engineState.value.dice.length &&
      values.some((v, idx) => engineState.value.dice[idx] !== v);
    if (rolls < 1) return;
    if (rolls > stateRolls || (rolls === stateRolls && valuesChanged)) {
      try {
        engine.recordRoll(values as number[]);
        setEngineState();
      } catch (err) {
        serviceError.value = (err as Error).message;
      }
    }
  }

  function handleServiceUpdate(raw: DiceServiceSnapshot) {
    const mapped = snapshotFromService(raw);
    serviceReady.value = true;
    setServiceError(null);
    syncEngineRoll(mapped);
    syncEngineHolds(mapped);
    syncDiceSnapshot(mapped.isRolling);
  }

  function syncEngineHolds(snapshot: DiceSnapshot) {
    const engineRolls = engineState.value.rollsThisRound;
    if (engineRolls > 0 && snapshot.rollsThisRound === 0) {
      // When resuming a saved game, the dice service starts fresh. Do not overwrite persisted holds.
      return;
    }
    const currentHolds = engineState.value.holds;
    const desiredHolds = snapshot.locks;
    let changed = false;
    desiredHolds.forEach((held, idx) => {
      if (held !== currentHolds[idx]) {
        try {
          engine.toggleHold(idx);
          changed = true;
        } catch (err) {
          // ignore toggle errors (e.g., before first roll); service guards should prevent this
        }
      }
    });
    if (changed) {
      setEngineState();
    }
  }

  function attachDiceService(service: DiceServiceAdapter) {
    detachDiceService();
    diceService.value = service;
    try {
      const initial = service.getSnapshot();
      handleServiceUpdate(initial);
    } catch (err) {
      serviceError.value = (err as Error).message;
    }
    diceUnsub.value = service.onChange((snap) => handleServiceUpdate(snap));
  }

  function detachDiceService() {
    diceUnsub.value?.();
    diceUnsub.value = null;
    diceService.value = null;
    serviceReady.value = false;
    syncDiceSnapshot(false);
  }

  async function rollAll() {
    clearError();
    if (!diceService.value) {
      lastError.value = 'Dice service not attached';
      return;
    }
    try {
      await diceService.value.rollAll();
    } catch (err) {
      const message = (err as Error)?.message ?? 'Roll failed';
      lastError.value = `Roll failed: ${message}`;
      console.error('[GameStore] rollAll failed', err);
    }
  }

  async function rerollUnheld() {
    clearError();
    if (!diceService.value) {
      lastError.value = 'Dice service not attached';
      return;
    }
    const state = engineState.value;
    if (state.completed) return;
    if (state.rollsThisRound === 0) {
      return rollAll();
    }

    const unheldIndices = state.holds
      .map((held, idx) => (!held ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!unheldIndices.length) {
      lastError.value = 'All dice are held';
      return;
    }

    const service = diceService.value;
    const snap = service.getSnapshot();
    const canRerollInPlace =
      snap.rollsThisRound === state.rollsThisRound &&
      snap.rollsThisRound > 0 &&
      snap.dice.length === state.dice.length &&
      snap.dice.some((d) => d.groupId !== '-1');

    try {
      if (canRerollInPlace) {
        await service.rerollUnheld();
      } else {
        service.hydrateRoundState({
          values: state.dice,
          holds: state.holds,
          rollsThisRound: state.rollsThisRound
        });
        await service.rollIndices(unheldIndices);
      }
    } catch (err) {
      const message = (err as Error)?.message ?? 'Re-roll failed';
      lastError.value = `Re-roll failed: ${message}`;
      console.error('[GameStore] rerollUnheld failed', err);
    }
  }

  function toggleHold(index: number) {
    clearError();
    try {
      engine.toggleHold(index);
      setEngineState();
    } catch (err) {
      lastError.value = (err as Error).message;
      return;
    }
    diceService.value?.toggleHold(index);
  }

  function scoreCategory(key: CategoryKey, options?: { skipServiceRoundReset?: boolean }) {
    clearError();
    try {
      engine.scoreCategory(key);
      setEngineState();
    } catch (err) {
      lastError.value = (err as Error).message;
      return;
    }

    if (!options?.skipServiceRoundReset) {
      diceService.value?.startNewRound();
    }
  }

  function startNewRound() {
    clearError();
    engine.startNewRound();
    setEngineState();
    diceService.value?.startNewRound();
  }

  function resetGame() {
    clearError();
    engine.resetGame();
    setEngineState();
    diceService.value?.startNewRound();
  }

  return {
    // state
    engineState,
    diceSnapshot,
    serviceReady,
    serviceError,
    lastError,
    rollLimit,
    categories,
    totals,
    isRolling,
    rollsThisRound,
    // lifecycle
    attachDiceService,
    detachDiceService,
    handleServiceUpdate,
    setServiceError,
    // actions
    rollAll,
    rerollUnheld,
    toggleHold,
    scoreCategory,
    startNewRound,
    resetGame,
    previewCategory: (key: CategoryKey) => engine.previewCategory(key)
  };
});
