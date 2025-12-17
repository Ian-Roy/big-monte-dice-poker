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

export const MAX_SAVE_SLOTS = 4;

const GAME_SAVES_STORAGE_KEY = 'big-monte:game-saves';
const GAME_SAVES_STORAGE_VERSION = 1;

const LEGACY_GAME_STATE_STORAGE_KEY = 'big-monte:engine-state';
const LEGACY_GAME_STATE_STORAGE_VERSION = 1;

type PersistedLegacyGamePayload = {
  version: number;
  savedAt: number;
  state: GameState;
};

export type GameSaveSlot = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: GameState;
};

type PersistedGameSavesPayload = {
  version: number;
  savedAt: number;
  activeId: string | null;
  slots: GameSaveSlot[];
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

function hasMeaningfulProgress(state: GameState) {
  if (state.completed) return true;
  if (state.rollsThisRound > 0) return true;
  if (state.currentRound > 1) return true;
  const scoredCount = Array.isArray(state.categories)
    ? state.categories.filter((cat) => cat?.interactive !== false && cat?.scored === true).length
    : 0;
  return scoredCount > 0;
}

function generateSaveId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSlots(rawSlots: unknown): GameSaveSlot[] {
  if (!Array.isArray(rawSlots)) return [];
  const slots: GameSaveSlot[] = [];
  const seen = new Set<string>();
  rawSlots.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const slot = raw as Partial<GameSaveSlot>;
    if (typeof slot.id !== 'string' || !slot.id.trim()) return;
    if (!slot.state || typeof slot.state !== 'object') return;
    if (seen.has(slot.id)) return;
    const createdAt = typeof slot.createdAt === 'number' && Number.isFinite(slot.createdAt) ? slot.createdAt : Date.now();
    const updatedAt = typeof slot.updatedAt === 'number' && Number.isFinite(slot.updatedAt) ? slot.updatedAt : createdAt;
    slots.push({
      id: slot.id,
      createdAt,
      updatedAt,
      state: slot.state as GameState
    });
    seen.add(slot.id);
  });

  return slots
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_SAVE_SLOTS);
}

function loadLegacyGameState(): PersistedLegacyGamePayload | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(LEGACY_GAME_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLegacyGamePayload;
    if (!parsed || parsed.version !== LEGACY_GAME_STATE_STORAGE_VERSION || !parsed.state) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[GameStore] failed to parse saved game state; ignoring snapshot.', err);
    return null;
  }
}

function persistGameSaves(slots: GameSaveSlot[], activeId: string | null) {
  const storage = getStorage();
  if (!storage) return;
  if (!slots.length && !activeId) {
    storage.removeItem(GAME_SAVES_STORAGE_KEY);
    return;
  }
  const payload: PersistedGameSavesPayload = {
    version: GAME_SAVES_STORAGE_VERSION,
    savedAt: Date.now(),
    activeId,
    slots
  };
  try {
    storage.setItem(GAME_SAVES_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[GameStore] failed to persist game snapshot', err);
  }
}

function loadPersistedGameSaves(): { slots: GameSaveSlot[]; activeId: string | null } {
  const storage = getStorage();
  if (!storage) return { slots: [], activeId: null };

  const raw = storage.getItem(GAME_SAVES_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PersistedGameSavesPayload;
      if (!parsed || parsed.version !== GAME_SAVES_STORAGE_VERSION) {
        return { slots: [], activeId: null };
      }
      const slots = normalizeSlots(parsed.slots);
      const candidateActive = typeof parsed.activeId === 'string' ? parsed.activeId : null;
      const activeId = candidateActive && slots.some((slot) => slot.id === candidateActive) ? candidateActive : slots[0]?.id ?? null;
      return { slots, activeId };
    } catch (err) {
      console.warn('[GameStore] failed to parse saved games; ignoring snapshot.', err);
      return { slots: [], activeId: null };
    }
  }

  const legacy = loadLegacyGameState();
  if (!legacy || !hasMeaningfulProgress(legacy.state)) {
    if (legacy) storage.removeItem(LEGACY_GAME_STATE_STORAGE_KEY);
    return { slots: [], activeId: null };
  }

  const id = generateSaveId();
  const createdAt = typeof legacy.savedAt === 'number' && Number.isFinite(legacy.savedAt) ? legacy.savedAt : Date.now();
  const slot: GameSaveSlot = {
    id,
    createdAt,
    updatedAt: createdAt,
    state: legacy.state
  };

  storage.removeItem(LEGACY_GAME_STATE_STORAGE_KEY);
  persistGameSaves([slot], id);
  return { slots: [slot], activeId: id };
}

export const useGameStore = defineStore('game', () => {
  const { slots: initialSlots, activeId: initialActiveId } = loadPersistedGameSaves();
  const saveSlots = ref<GameSaveSlot[]>(initialSlots);
  const activeSaveId = ref<string | null>(initialActiveId);

  const engine = new GameEngine();
  const activeSlot = activeSaveId.value
    ? saveSlots.value.find((slot) => slot.id === activeSaveId.value)
    : null;
  if (activeSlot) {
    try {
      engine.hydrateState(activeSlot.state);
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

  function persistSavesSnapshot() {
    persistGameSaves(saveSlots.value, activeSaveId.value);
  }

  function updateActiveSlotState(state: GameState) {
    const activeId = activeSaveId.value;
    if (!activeId) return;
    const idx = saveSlots.value.findIndex((slot) => slot.id === activeId);
    if (idx < 0) {
      activeSaveId.value = null;
      persistSavesSnapshot();
      return;
    }
    const now = Date.now();
    const nextSlots = [...saveSlots.value];
    nextSlots[idx] = {
      ...nextSlots[idx],
      updatedAt: now,
      state
    };
    nextSlots.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    saveSlots.value = nextSlots;
    persistSavesSnapshot();
  }

  watch(
    engineState,
    (state) => {
      updateActiveSlotState(state);
      syncDiceSnapshot();
    },
    { deep: true, immediate: true, flush: 'sync' }
  );

  function setEngineState() {
    engineState.value = engine.getState();
  }

  function hydrateDiceServiceFromState(state: GameState) {
    diceService.value?.hydrateRoundState({
      values: state.dice,
      holds: state.holds,
      rollsThisRound: state.rollsThisRound
    });
  }

  function tryHydrateSlot(slot: GameSaveSlot) {
    try {
      engine.hydrateState(slot.state);
      setEngineState();
      hydrateDiceServiceFromState(engineState.value);
      return true;
    } catch (err) {
      console.warn('[GameStore] failed to hydrate saved slot; removing it.', err);
      return false;
    }
  }

  function chooseMostRecentSlotId(slots: GameSaveSlot[]) {
    if (!slots.length) return null;
    return slots.reduce((best, slot) => (slot.updatedAt > best.updatedAt ? slot : best), slots[0]).id;
  }

  function createNewGameSlot() {
    clearError();
    if (saveSlots.value.length >= MAX_SAVE_SLOTS) {
      return { ok: false as const, reason: 'limit' as const };
    }

    const now = Date.now();
    const id = generateSaveId();
    const state = engine.resetGame();
    activeSaveId.value = id;
    saveSlots.value = [
      { id, createdAt: now, updatedAt: now, state },
      ...saveSlots.value
    ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    persistSavesSnapshot();
    engineState.value = state;
    diceService.value?.startNewRound();
    return { ok: true as const, id };
  }

  function loadGameSlot(id: string) {
    clearError();
    const slot = saveSlots.value.find((candidate) => candidate.id === id);
    if (!slot) {
      lastError.value = 'Saved game not found';
      return false;
    }
    activeSaveId.value = id;
    persistSavesSnapshot();
    try {
      engine.hydrateState(slot.state);
      setEngineState();
      hydrateDiceServiceFromState(engineState.value);
    } catch (err) {
      lastError.value = (err as Error).message;
      return false;
    }
    return true;
  }

  function deleteGameSlot(id: string) {
    clearError();
    if (!saveSlots.value.some((slot) => slot.id === id)) return false;

    let remaining = saveSlots.value.filter((slot) => slot.id !== id);
    const removedWasActive = activeSaveId.value === id;
    saveSlots.value = remaining;

    if (removedWasActive) {
      const ordered = [...remaining].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      let nextSlot: GameSaveSlot | undefined = ordered[0];
      while (nextSlot) {
        activeSaveId.value = nextSlot.id;
        if (tryHydrateSlot(nextSlot)) break;
        remaining = remaining.filter((slot) => slot.id !== nextSlot!.id);
        saveSlots.value = remaining;
        nextSlot = remaining.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
      }
      if (!nextSlot) {
        activeSaveId.value = null;
        engine.resetGame();
        setEngineState();
        diceService.value?.startNewRound();
      }
    }

    persistSavesSnapshot();
    return true;
  }

  function quitActiveGame() {
    const id = activeSaveId.value;
    if (!id) return false;
    return deleteGameSlot(id);
  }

  function cleanupFinishedSaves() {
    let remaining = saveSlots.value.filter((slot) => slot.state?.completed !== true);
    if (remaining.length === saveSlots.value.length) return false;

    const ordered = [...remaining].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    let nextSlot: GameSaveSlot | undefined = activeSaveId.value
      ? ordered.find((slot) => slot.id === activeSaveId.value)
      : ordered[0];
    while (nextSlot) {
      activeSaveId.value = nextSlot.id;
      if (tryHydrateSlot(nextSlot)) break;
      remaining = remaining.filter((slot) => slot.id !== nextSlot!.id);
      saveSlots.value = remaining;
      nextSlot = remaining.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    }

    saveSlots.value = remaining;
    if (!nextSlot) {
      activeSaveId.value = null;
      engine.resetGame();
      setEngineState();
      diceService.value?.startNewRound();
    }

    persistSavesSnapshot();
    return true;
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
    saveSlots,
    activeSaveId,
    maxSaveSlots: MAX_SAVE_SLOTS,
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
    createNewGameSlot,
    loadGameSlot,
    deleteGameSlot,
    quitActiveGame,
    cleanupFinishedSaves,
    rollAll,
    rerollUnheld,
    toggleHold,
    scoreCategory,
    startNewRound,
    resetGame,
    previewCategory: (key: CategoryKey) => engine.previewCategory(key)
  };
});
