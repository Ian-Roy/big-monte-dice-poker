import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';

import { ensureBrighterThanHex } from '../shared/color';

export type DicePhysicsSettings = {
  throwForce: number;
  spinForce: number;
  gravity: number;
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  startingHeight: number;
};

export type DiceAppearanceSettings = {
  diceColor: DiceColorKey;
  heldColor: DiceColorKey;
};

export type AppSettingsState = {
  preferredUsername: string;
  appearance: DiceAppearanceSettings;
  physics: DicePhysicsSettings;
};

const SETTINGS_STORAGE_KEY = 'big-monte:settings';
const SETTINGS_STORAGE_VERSION = 1;

const DEFAULT_SETTINGS: AppSettingsState = {
  preferredUsername: '',
  appearance: {
    diceColor: 'blue',
    heldColor: 'blue'
  },
  physics: {
    throwForce: 5,
    spinForce: 6,
    gravity: 1,
    mass: 1,
    friction: 0.8,
    restitution: 0.1,
    linearDamping: 0.5,
    angularDamping: 0.4,
    startingHeight: 8
  }
};

type PersistedSettingsPayload = {
  version: number;
  savedAt: number;
  state: AppSettingsState;
};

export type DiceColorKey =
  | 'blue'
  | 'red'
  | 'purple'
  | 'slate';

export const DICE_COLOR_PRESETS: Readonly<
  Record<DiceColorKey, { label: string; hex: string }>
> = {
  blue: { label: 'Blue', hex: '#3b82f6' },
  red: { label: 'Red', hex: '#ef4444' },
  purple: { label: 'Purple', hex: '#a855f7' },
  slate: { label: 'Slate', hex: '#94a3b8' }
} as const;

export const DICE_COLOR_OPTIONS: ReadonlyArray<{ key: DiceColorKey; label: string; hex: string }> =
  Object.entries(DICE_COLOR_PRESETS).map(([key, val]) => ({
    key: key as DiceColorKey,
    label: val.label,
    hex: val.hex
  }));

const COLOR_BY_KEY = new Map<DiceColorKey, string>(
  DICE_COLOR_OPTIONS.map((o) => [o.key, o.hex])
);
const COLOR_KEYS = new Set<DiceColorKey>(DICE_COLOR_OPTIONS.map((o) => o.key));
const COLOR_KEY_BY_HEX = new Map<string, DiceColorKey>(
  DICE_COLOR_OPTIONS.map((o) => [o.hex.toLowerCase(), o.key])
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback: number) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toColorKey(value: unknown, fallback: DiceColorKey): DiceColorKey {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const byHex = trimmed.startsWith('#') ? COLOR_KEY_BY_HEX.get(trimmed.toLowerCase()) : undefined;
  if (byHex) return byHex;
  const asKey = trimmed as DiceColorKey;
  return COLOR_KEYS.has(asKey) ? asKey : fallback;
}

function sanitizePreferredUsername(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 24);
}

function sanitizeState(input: AppSettingsState): AppSettingsState {
  const preferredUsername = sanitizePreferredUsername((input as Partial<AppSettingsState>)?.preferredUsername);
  const appearance = input?.appearance ?? DEFAULT_SETTINGS.appearance;
  const physics = input?.physics ?? DEFAULT_SETTINGS.physics;

  const diceColor = toColorKey(appearance.diceColor, DEFAULT_SETTINGS.appearance.diceColor);
  const heldColor = toColorKey(appearance.heldColor, DEFAULT_SETTINGS.appearance.heldColor);

  return {
    preferredUsername,
    appearance: { diceColor, heldColor },
    physics: {
      throwForce: clamp(toNumber(physics.throwForce, DEFAULT_SETTINGS.physics.throwForce), 0, 12),
      spinForce: clamp(toNumber(physics.spinForce, DEFAULT_SETTINGS.physics.spinForce), 0, 12),
      gravity: clamp(toNumber(physics.gravity, DEFAULT_SETTINGS.physics.gravity), 0, 3),
      mass: clamp(toNumber(physics.mass, DEFAULT_SETTINGS.physics.mass), 0.25, 8),
      friction: clamp(toNumber(physics.friction, DEFAULT_SETTINGS.physics.friction), 0, 1),
      restitution: clamp(toNumber(physics.restitution, DEFAULT_SETTINGS.physics.restitution), 0, 1),
      linearDamping: clamp(toNumber(physics.linearDamping, DEFAULT_SETTINGS.physics.linearDamping), 0, 1),
      angularDamping: clamp(toNumber(physics.angularDamping, DEFAULT_SETTINGS.physics.angularDamping), 0, 1),
      startingHeight: clamp(toNumber(physics.startingHeight, DEFAULT_SETTINGS.physics.startingHeight), 0, 16)
    }
  };
}

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

function loadPersistedSettings(): AppSettingsState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSettingsPayload;
    if (!parsed || parsed.version !== SETTINGS_STORAGE_VERSION || !parsed.state) {
      return null;
    }
    return sanitizeState(parsed.state);
  } catch (err) {
    console.warn('[SettingsStore] failed to parse saved settings; ignoring snapshot.', err);
    return null;
  }
}

function persistSettings(state: AppSettingsState) {
  const storage = getStorage();
  if (!storage) return;
  const payload: PersistedSettingsPayload = {
    version: SETTINGS_STORAGE_VERSION,
    savedAt: Date.now(),
    state
  };
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[SettingsStore] failed to persist settings', err);
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadPersistedSettings() ?? DEFAULT_SETTINGS;
  const preferredUsername = ref(initial.preferredUsername);
  const appearance = reactive({ ...initial.appearance });
  const physics = reactive({ ...initial.physics });

  const diceColorHex = computed(
    () =>
      COLOR_BY_KEY.get(appearance.diceColor) ?? COLOR_BY_KEY.get(DEFAULT_SETTINGS.appearance.diceColor)!
  );
  const heldColorHex = computed(() => {
    const base =
      COLOR_BY_KEY.get(appearance.heldColor) ?? COLOR_BY_KEY.get(DEFAULT_SETTINGS.appearance.heldColor)!;
    return ensureBrighterThanHex(base, diceColorHex.value, 0.1);
  });

  watch(
    () => ({ preferredUsername: preferredUsername.value, appearance: { ...appearance }, physics: { ...physics } }),
    (next) => persistSettings(next),
    { deep: true }
  );

  function resetToDefaults() {
    preferredUsername.value = DEFAULT_SETTINGS.preferredUsername;
    Object.assign(appearance, DEFAULT_SETTINGS.appearance);
    Object.assign(physics, DEFAULT_SETTINGS.physics);
  }

  return {
    preferredUsername,
    appearance,
    physics,
    diceColorHex,
    heldColorHex,
    resetToDefaults,
    defaults: DEFAULT_SETTINGS
  };
});
