import { computed, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';

import { GameEngine, type CategoryKey, type GameState } from '../game/engine';
import { snapshotFromService, type DiceLocks, type DiceSnapshot, type DiceValues } from '../shared/DiceState';
import type { DiceService, DiceServiceSnapshot } from '../shared/DiceService';
import { buildDefaultPlayerNames } from '../shared/casinoNames';
import { ensureBrighterThanHex } from '../shared/color';
import type { GameSessionMode, GameSessionPlayer, GameSessionState, PlayerAppearance } from '../shared/gameSession';
import { getLeaderIndex, isSessionCompleted } from '../shared/gameSession';
import { DICE_COLOR_PRESETS, type DiceColorKey, useSettingsStore } from './settingsStore';

export type DiceServiceAdapter = Pick<
  DiceService,
  | 'rollAll'
  | 'rerollUnheld'
  | 'rollIndices'
  | 'hydrateRoundState'
  | 'updateConfig'
  | 'toggleHold'
  | 'startNewRound'
  | 'onChange'
  | 'getSnapshot'
>;

export const MAX_SAVE_SLOTS = 4;

const GAME_SAVES_STORAGE_KEY = 'big-monte:game-saves';
const GAME_SAVES_STORAGE_VERSION = 2;

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
  state: GameSessionState;
};

type LegacyGameSaveSlotV1 = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: GameState;
};

type PersistedGameSavesPayloadV2 = {
  version: 2;
  savedAt: number;
  activeId: string | null;
  slots: GameSaveSlot[];
};

type PersistedGameSavesPayloadV1 = {
  version: 1;
  savedAt: number;
  activeId: string | null;
  slots: LegacyGameSaveSlotV1[];
};

type PersistedGameSavesPayload = PersistedGameSavesPayloadV1 | PersistedGameSavesPayloadV2;

export type NewGamePlayerSetup = {
  name: string;
  appearance: PlayerAppearance;
};

export type NewGameSetup = {
  mode: GameSessionMode;
  players: NewGamePlayerSetup[];
};

const COLOR_KEYS = new Set<DiceColorKey>(Object.keys(DICE_COLOR_PRESETS) as DiceColorKey[]);
const COLOR_KEY_BY_HEX = new Map<string, DiceColorKey>(
  Object.entries(DICE_COLOR_PRESETS).map(([key, preset]) => [preset.hex.toLowerCase(), key as DiceColorKey])
);

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

function clampIndex(value: unknown, maxExclusive: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  if (rounded < 0) return 0;
  if (rounded >= maxExclusive) return Math.max(0, maxExclusive - 1);
  return rounded;
}

function toColorKey(value: unknown, fallback: DiceColorKey): DiceColorKey {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('#')) {
    const byHex = COLOR_KEY_BY_HEX.get(trimmed.toLowerCase());
    return byHex ?? fallback;
  }
  const asKey = trimmed as DiceColorKey;
  return COLOR_KEYS.has(asKey) ? asKey : fallback;
}

function createFreshGameState() {
  return new GameEngine().resetGame();
}

function normalizeLegacySlotsV1(rawSlots: unknown): LegacyGameSaveSlotV1[] {
  if (!Array.isArray(rawSlots)) return [];
  const slots: LegacyGameSaveSlotV1[] = [];
  const seen = new Set<string>();
  rawSlots.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const slot = raw as Partial<LegacyGameSaveSlotV1>;
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

function normalizeSessionState(rawState: unknown, fallbackAppearance: PlayerAppearance): GameSessionState | null {
  if (!rawState || typeof rawState !== 'object') return null;
  const state = rawState as Partial<GameSessionState>;
  const rawPlayers = Array.isArray(state.players) ? state.players : [];
  if (!rawPlayers.length) return null;

  const players: GameSessionPlayer[] = [];
  const seenIds = new Set<string>();

  rawPlayers.slice(0, 4).forEach((rawPlayer, index) => {
    if (!rawPlayer || typeof rawPlayer !== 'object') return;
    const player = rawPlayer as Partial<GameSessionPlayer>;
    const rawId = typeof player.id === 'string' ? player.id.trim() : '';
    const id = rawId && !seenIds.has(rawId) ? rawId : generateSaveId();
    seenIds.add(id);

    const nameRaw = typeof player.name === 'string' ? player.name.trim() : '';
    const name = nameRaw || `Player ${index + 1}`;

    const appearanceRaw = player.appearance ?? fallbackAppearance;
    const diceColor = toColorKey(appearanceRaw.diceColor, fallbackAppearance.diceColor);
    const heldColor = toColorKey(appearanceRaw.heldColor, fallbackAppearance.heldColor);

    const gameState =
      player.state && typeof player.state === 'object' ? (player.state as GameState) : createFreshGameState();

    players.push({
      id,
      name,
      appearance: { diceColor, heldColor },
      state: gameState
    });
  });

  if (!players.length) return null;
  const activePlayerIndex = clampIndex(state.activePlayerIndex, players.length, 0);
  const mode: GameSessionMode =
    state.mode === 'solo' || state.mode === 'pass-and-play' ? state.mode : players.length > 1 ? 'pass-and-play' : 'solo';

  return { mode, players, activePlayerIndex };
}

function normalizeSessionSlotsV2(rawSlots: unknown, fallbackAppearance: PlayerAppearance): GameSaveSlot[] {
  if (!Array.isArray(rawSlots)) return [];
  const slots: GameSaveSlot[] = [];
  const seen = new Set<string>();
  rawSlots.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const slot = raw as Partial<GameSaveSlot>;
    if (typeof slot.id !== 'string' || !slot.id.trim()) return;
    if (seen.has(slot.id)) return;
    const state = normalizeSessionState(slot.state, fallbackAppearance);
    if (!state) return;
    const createdAt = typeof slot.createdAt === 'number' && Number.isFinite(slot.createdAt) ? slot.createdAt : Date.now();
    const updatedAt = typeof slot.updatedAt === 'number' && Number.isFinite(slot.updatedAt) ? slot.updatedAt : createdAt;
    slots.push({ id: slot.id, createdAt, updatedAt, state });
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
  const payload: PersistedGameSavesPayloadV2 = {
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

function buildSoloSessionFromGameState(state: GameState, options: { appearance: PlayerAppearance; name?: string }): GameSessionState {
  const name = options.name?.trim() || buildDefaultPlayerNames(1)[0] || 'Player 1';
  return {
    mode: 'solo',
    activePlayerIndex: 0,
    players: [
      {
        id: generateSaveId(),
        name,
        appearance: { ...options.appearance },
        state
      }
    ]
  };
}

function loadPersistedGameSaves(options: { fallbackAppearance: PlayerAppearance }): { slots: GameSaveSlot[]; activeId: string | null } {
  const storage = getStorage();
  if (!storage) return { slots: [], activeId: null };

  const raw = storage.getItem(GAME_SAVES_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PersistedGameSavesPayload;
      if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) {
        return { slots: [], activeId: null };
      }

      if (parsed.version === 2) {
        const slots = normalizeSessionSlotsV2(parsed.slots, options.fallbackAppearance);
        const candidateActive = typeof parsed.activeId === 'string' ? parsed.activeId : null;
        const activeId = candidateActive && slots.some((slot) => slot.id === candidateActive) ? candidateActive : slots[0]?.id ?? null;
        return { slots, activeId };
      }

      const legacySlots = normalizeLegacySlotsV1(parsed.slots);
      const migrated: GameSaveSlot[] = legacySlots.map((slot) => ({
        id: slot.id,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
        state: buildSoloSessionFromGameState(slot.state, { appearance: options.fallbackAppearance })
      }));
      const candidateActive = typeof parsed.activeId === 'string' ? parsed.activeId : null;
      const activeId =
        candidateActive && migrated.some((slot) => slot.id === candidateActive)
          ? candidateActive
          : migrated[0]?.id ?? null;
      persistGameSaves(migrated, activeId);
      return { slots: migrated, activeId };
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
    state: buildSoloSessionFromGameState(legacy.state, { appearance: options.fallbackAppearance })
  };

  storage.removeItem(LEGACY_GAME_STATE_STORAGE_KEY);
  persistGameSaves([slot], id);
  return { slots: [slot], activeId: id };
}

export const useGameStore = defineStore('game', () => {
  const settings = useSettingsStore();
  const fallbackAppearance: PlayerAppearance = {
    diceColor: settings.appearance.diceColor,
    heldColor: settings.appearance.heldColor
  };

  const { slots: initialSlots, activeId: initialActiveId } = loadPersistedGameSaves({
    fallbackAppearance
  });
  const saveSlots = ref<GameSaveSlot[]>(initialSlots);
  const activeSaveId = ref<string | null>(initialActiveId);

  const engine = new GameEngine();
  const activeSlotForHydration = activeSaveId.value
    ? saveSlots.value.find((slot) => slot.id === activeSaveId.value) ?? null
    : null;
  const activePlayerForHydration = activeSlotForHydration
    ? activeSlotForHydration.state.players[activeSlotForHydration.state.activePlayerIndex]
    : null;
  if (activePlayerForHydration) {
    try {
      engine.hydrateState(activePlayerForHydration.state);
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

  const activeSlot = computed(() => {
    const id = activeSaveId.value;
    if (!id) return null;
    return saveSlots.value.find((slot) => slot.id === id) ?? null;
  });

  const session = computed(() => activeSlot.value?.state ?? null);
  const players = computed(() => session.value?.players ?? []);
  const activePlayerIndex = computed(() => session.value?.activePlayerIndex ?? 0);
  const activePlayer = computed(() => {
    const list = players.value;
    const idx = activePlayerIndex.value;
    return idx >= 0 && idx < list.length ? list[idx] : null;
  });
  const sessionCompleted = computed(() => (session.value ? isSessionCompleted(session.value) : false));
  const isMultiplayer = computed(() => (players.value.length > 1 ? true : false));

  function computeNextPlayerIndex(input: GameSessionState): number | null {
    const count = input.players.length;
    if (count <= 1) return null;
    for (let offset = 1; offset <= count; offset += 1) {
      const idx = (input.activePlayerIndex + offset) % count;
      const candidate = input.players[idx];
      if (candidate && candidate.state?.completed !== true) return idx;
    }
    return null;
  }

  const nextPlayerIndex = computed(() => {
    const current = session.value;
    if (!current) return null;
    return computeNextPlayerIndex(current);
  });

  const nextPlayer = computed(() => {
    const current = session.value;
    const idx = nextPlayerIndex.value;
    if (!current || idx === null) return null;
    return current.players[idx] ?? null;
  });

  const leaderIndex = computed(() => (session.value ? getLeaderIndex(session.value) : null));
  const leaderPlayer = computed(() => {
    const current = session.value;
    const idx = leaderIndex.value;
    if (!current || idx === null) return null;
    return current.players[idx] ?? null;
  });

  function colorHexForKey(key: DiceColorKey) {
    return DICE_COLOR_PRESETS[key]?.hex ?? DICE_COLOR_PRESETS.blue.hex;
  }

  function heldHexForKeys(heldKey: DiceColorKey, baselineDiceHex: string) {
    const base = colorHexForKey(heldKey);
    return ensureBrighterThanHex(base, baselineDiceHex, 0.1);
  }

  const activeDiceColorHex = computed(() => {
    const player = activePlayer.value;
    const key = player?.appearance?.diceColor ?? settings.appearance.diceColor;
    return colorHexForKey(key);
  });

  const activeHeldColorHex = computed(() => {
    const player = activePlayer.value;
    const diceHex = activeDiceColorHex.value;
    const heldKey = player?.appearance?.heldColor ?? settings.appearance.heldColor;
    return heldHexForKeys(heldKey, diceHex);
  });

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

  function applyDiceThemeForPlayer(player: GameSessionPlayer | null) {
    if (!diceService.value) return;
    const diceKey = player?.appearance?.diceColor ?? settings.appearance.diceColor;
    const heldKey = player?.appearance?.heldColor ?? settings.appearance.heldColor;
    const diceHex = colorHexForKey(diceKey);
    const heldHex = heldHexForKeys(heldKey, diceHex);
    try {
      diceService.value.updateConfig({ diceColor: diceHex, heldColor: heldHex });
    } catch (err) {
      console.warn('[GameStore] failed to update dice theme', err);
    }
  }

  function tryHydrateSlot(slot: GameSaveSlot) {
    const idx = clampIndex(slot.state.activePlayerIndex, slot.state.players.length, 0);
    const player = slot.state.players[idx];
    if (!player) return false;
    try {
      engine.hydrateState(player.state);
      setEngineState();
      hydrateDiceServiceFromState(engineState.value);
      applyDiceThemeForPlayer(player);
      return true;
    } catch (err) {
      console.warn('[GameStore] failed to hydrate saved slot; removing it.', err);
      return false;
    }
  }

  function updateActiveSession(nextSession: GameSessionState) {
    const activeId = activeSaveId.value;
    if (!activeId) return false;
    const idx = saveSlots.value.findIndex((slot) => slot.id === activeId);
    if (idx < 0) {
      activeSaveId.value = null;
      persistSavesSnapshot();
      return false;
    }
    const now = Date.now();
    const nextSlots = [...saveSlots.value];
    nextSlots[idx] = {
      ...nextSlots[idx],
      updatedAt: now,
      state: nextSession
    };
    nextSlots.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    saveSlots.value = nextSlots;
    persistSavesSnapshot();
    return true;
  }

  function updateActivePlayerState(state: GameState) {
    const activeId = activeSaveId.value;
    if (!activeId) return;
    const idx = saveSlots.value.findIndex((slot) => slot.id === activeId);
    if (idx < 0) {
      activeSaveId.value = null;
      persistSavesSnapshot();
      return;
    }

    const slot = saveSlots.value[idx];
    const currentSession = slot.state;
    const playerIdx = clampIndex(currentSession.activePlayerIndex, currentSession.players.length, 0);
    const players = [...currentSession.players];
    const player = players[playerIdx];
    if (!player) return;
    players[playerIdx] = { ...player, state };
    const nextSession: GameSessionState = { ...currentSession, activePlayerIndex: playerIdx, players };
    updateActiveSession(nextSession);
  }

  watch(
    engineState,
    (state) => {
      updateActivePlayerState(state);
      syncDiceSnapshot();
    },
    { deep: true, immediate: true, flush: 'sync' }
  );

  function setServiceError(message: string | null) {
    serviceError.value = message;
  }

  function clearError() {
    lastError.value = null;
  }

  function createNewSessionSlot(setup: NewGameSetup) {
    clearError();
    if (saveSlots.value.length >= MAX_SAVE_SLOTS) {
      return { ok: false as const, reason: 'limit' as const };
    }

    const normalizedPlayers = setup.players.slice(0, 4).map((p, idx) => {
      const name = p.name?.trim() || `Player ${idx + 1}`;
      const diceColor = toColorKey(p.appearance?.diceColor, fallbackAppearance.diceColor);
      const heldColor = toColorKey(p.appearance?.heldColor, fallbackAppearance.heldColor);
      return {
        id: generateSaveId(),
        name,
        appearance: { diceColor, heldColor },
        state: createFreshGameState()
      } satisfies GameSessionPlayer;
    });

    if (!normalizedPlayers.length) {
      lastError.value = 'At least one player is required.';
      return { ok: false as const, reason: 'invalid' as const };
    }

    const now = Date.now();
    const id = generateSaveId();
    const firstState = engine.resetGame();
    normalizedPlayers[0] = { ...normalizedPlayers[0], state: firstState };
    const sessionState: GameSessionState = {
      mode: setup.mode,
      players: normalizedPlayers,
      activePlayerIndex: 0
    };

    activeSaveId.value = id;
    saveSlots.value = [
      { id, createdAt: now, updatedAt: now, state: sessionState },
      ...saveSlots.value
    ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    persistSavesSnapshot();
    engineState.value = firstState;
    hydrateDiceServiceFromState(firstState);
    applyDiceThemeForPlayer(normalizedPlayers[0] ?? null);
    return { ok: true as const, id };
  }

  function createNewGameSlot() {
    const name = buildDefaultPlayerNames(1)[0] || 'Player 1';
    return createNewSessionSlot({
      mode: 'solo',
      players: [
        {
          name,
          appearance: { ...fallbackAppearance }
        }
      ]
    });
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
      return tryHydrateSlot(slot);
    } catch (err) {
      lastError.value = (err as Error).message;
      return false;
    }
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
    let remaining = saveSlots.value.filter((slot) => !isSessionCompleted(slot.state));
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

  function setActivePlayerIndex(index: number) {
    clearError();
    const slot = activeSlot.value;
    if (!slot) {
      lastError.value = 'No active game.';
      return false;
    }
    const sessionState = slot.state;
    const nextIndex = clampIndex(index, sessionState.players.length, sessionState.activePlayerIndex);
    const nextPlayer = sessionState.players[nextIndex];
    if (!nextPlayer) return false;

    const updated: GameSessionState = {
      ...sessionState,
      activePlayerIndex: nextIndex
    };
    updateActiveSession(updated);

    try {
      engine.hydrateState(nextPlayer.state);
      setEngineState();
      hydrateDiceServiceFromState(engineState.value);
      applyDiceThemeForPlayer(nextPlayer);
    } catch (err) {
      lastError.value = (err as Error).message;
      return false;
    }

    return true;
  }

  function advanceToNextPlayer() {
    clearError();
    const current = session.value;
    if (!current) {
      lastError.value = 'No active game.';
      return { ok: false as const };
    }
    const nextIndex = computeNextPlayerIndex(current);
    if (nextIndex === null) {
      lastError.value = 'No next player.';
      return { ok: false as const };
    }
    const ok = setActivePlayerIndex(nextIndex);
    return ok ? { ok: true as const, nextIndex } : { ok: false as const };
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

  function handleServiceUpdate(raw: DiceServiceSnapshot) {
    const mapped = snapshotFromService(raw);
    serviceReady.value = true;
    setServiceError(null);
    syncEngineRoll(mapped);
    syncEngineHolds(mapped);
    syncDiceSnapshot(mapped.isRolling);
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
    applyDiceThemeForPlayer(activePlayer.value);
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
    activeSlot,
    session,
    players,
    activePlayer,
    activePlayerIndex,
    nextPlayer,
    nextPlayerIndex,
    leaderPlayer,
    leaderIndex,
    sessionCompleted,
    isMultiplayer,
    activeDiceColorHex,
    activeHeldColorHex,
    diceColorHexForKey: colorHexForKey,
    heldColorHexForKeys: heldHexForKeys,
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
    createNewSessionSlot,
    createNewGameSlot,
    loadGameSlot,
    deleteGameSlot,
    quitActiveGame,
    cleanupFinishedSaves,
    setActivePlayerIndex,
    advanceToNextPlayer,
    rollAll,
    rerollUnheld,
    toggleHold,
    scoreCategory,
    startNewRound,
    resetGame,
    previewCategory: (key: CategoryKey) => engine.previewCategory(key)
  };
});
