<template>
  <div class="new-game-overlay" role="dialog" aria-modal="true" aria-label="Create game">
    <div class="new-game-card">
      <header class="new-game-header">
        <div class="new-game-header__titles">
          <p class="kicker">Create game</p>
          <h2>Pass-and-play setup</h2>
          <p class="subtitle">Pick players, names, and dice colors. The phone will prompt the next player each turn.</p>
        </div>
        <button type="button" class="ghost-button" @click="emit('cancel')">Close</button>
      </header>

      <section class="section">
        <div class="row">
          <div class="row__text">
            <div class="row__label">Players</div>
            <div class="row__help">Up to 4 players on one device.</div>
          </div>
          <div class="row__controls">
            <DropdownSelect v-model="playerCountValue" aria-label="Player count" :options="playerCountOptions" />
          </div>
        </div>
      </section>

      <section class="section">
        <header class="section-header">
          <h3>Players</h3>
          <button type="button" class="small-button" @click="randomizeNames">Randomize names</button>
        </header>

        <div class="player-list">
          <article v-for="(player, index) in players" :key="`player-${index}`" class="player-card">
            <header class="player-card__header">
              <div class="player-badge">
                <span class="player-badge__index">P{{ index + 1 }}</span>
                <span class="player-badge__name">{{ player.name.trim() || `Player ${index + 1}` }}</span>
              </div>
              <span v-if="index === 0" class="default-pill">House default</span>
            </header>

            <div class="player-grid">
              <label class="field">
                <span class="field__label">Name</span>
                <input v-model="player.name" class="text-input" type="text" autocomplete="off" />
              </label>

              <label class="field">
                <span class="field__label">Dice color</span>
                <DropdownSelect
                  v-model="player.diceColor"
                  aria-label="Dice color"
                  :options="diceColorOptions"
                />
              </label>

              <label class="field">
                <span class="field__label">Held dice color</span>
                <DropdownSelect
                  v-model="player.heldColor"
                  aria-label="Held dice color"
                  :options="heldColorOptionsFor(player.diceColor)"
                />
              </label>
            </div>
          </article>
        </div>
      </section>

      <footer class="new-game-footer">
        <button type="button" class="ghost-button" @click="emit('cancel')">Cancel</button>
        <button type="button" class="primary-button" @click="createGame">Create game</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import DropdownSelect, { type DropdownOption } from './DropdownSelect.vue';
import { pickRandomCasinoName } from '../../shared/casinoNames';
import { ensureBrighterThanHex } from '../../shared/color';
import { DICE_COLOR_OPTIONS, DICE_COLOR_PRESETS, type DiceColorKey, useSettingsStore } from '../../stores/settingsStore';
import type { NewGameSetup } from '../../stores/gameStore';

type PlayerForm = {
  name: string;
  diceColor: DiceColorKey;
  heldColor: DiceColorKey;
};

const emit = defineEmits<{
  (event: 'cancel'): void;
  (event: 'create', setup: NewGameSetup): void;
}>();

const settings = useSettingsStore();

const playerCountOptions: DropdownOption[] = [
  { value: '1', label: '1 player' },
  { value: '2', label: '2 players' },
  { value: '3', label: '3 players' },
  { value: '4', label: '4 players' }
];

const diceColorOptions = computed<DropdownOption[]>(() =>
  DICE_COLOR_OPTIONS.map((opt) => ({
    value: opt.key,
    label: opt.label,
    swatch: opt.hex
  }))
);

const playerCountValue = ref('1');
const players = ref<PlayerForm[]>([]);

const orderedColorKeys = computed(() => DICE_COLOR_OPTIONS.map((opt) => opt.key));
const preferredUsername = computed(() => settings.preferredUsername.trim());

function buildDefaultNames(count: number) {
  const clamped = Math.max(1, Math.min(4, Math.floor(count)));
  const preferred = preferredUsername.value;
  const exclude = new Set<string>();
  const names: string[] = [];

  if (preferred) {
    exclude.add(preferred);
    names.push(preferred);
  }

  for (let idx = names.length; idx < clamped; idx += 1) {
    const next = pickRandomCasinoName({ exclude });
    exclude.add(next);
    names.push(next);
  }

  return names;
}

function rotatedDiceKeys(count: number, first: DiceColorKey): DiceColorKey[] {
  const list = orderedColorKeys.value;
  const startIdx = list.indexOf(first);
  const rotated = startIdx >= 0 ? [...list.slice(startIdx), ...list.slice(0, startIdx)] : [...list];
  return rotated.slice(0, count);
}

function buildPermutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((item, idx) => {
    const rest = items.slice(0, idx).concat(items.slice(idx + 1));
    buildPermutations(rest).forEach((perm) => {
      out.push([item, ...perm]);
    });
  });
  return out;
}

function bestHeldKeys({
  diceKeys,
  firstHeldKey
}: {
  diceKeys: DiceColorKey[];
  firstHeldKey: DiceColorKey;
}): DiceColorKey[] {
  const allKeys = orderedColorKeys.value;
  const perms = buildPermutations(allKeys);
  let best: DiceColorKey[] | null = null;
  let bestCollisions = Number.POSITIVE_INFINITY;

  perms.forEach((perm) => {
    if (perm[0] !== firstHeldKey) return;
    const slice = perm.slice(0, diceKeys.length);
    let collisions = 0;
    for (let i = 0; i < slice.length; i += 1) {
      if (slice[i] === diceKeys[i]) collisions += 1;
    }
    if (collisions < bestCollisions) {
      bestCollisions = collisions;
      best = slice;
    }
  });

  if (best) return best;

  const out: DiceColorKey[] = [];
  const used = new Set<DiceColorKey>();
  out.push(firstHeldKey);
  used.add(firstHeldKey);
  for (let idx = 1; idx < diceKeys.length; idx += 1) {
    const next = allKeys.find((key) => !used.has(key)) ?? firstHeldKey;
    used.add(next);
    out.push(next);
  }
  return out;
}

function buildDefaults(count: number): PlayerForm[] {
  const clamped = Math.max(1, Math.min(4, Math.floor(count)));
  const names = buildDefaultNames(clamped);
  const diceKeys = rotatedDiceKeys(clamped, settings.appearance.diceColor);
  const heldKeys =
    clamped > 1
      ? bestHeldKeys({ diceKeys, firstHeldKey: settings.appearance.heldColor })
      : [settings.appearance.heldColor];
  return Array.from({ length: clamped }, (_, idx) => {
    const diceColor = diceKeys[idx] ?? settings.appearance.diceColor;
    const heldColor = heldKeys[idx] ?? settings.appearance.heldColor;
    return {
      name: names[idx] ?? `Player ${idx + 1}`,
      diceColor,
      heldColor
    };
  });
}

function heldColorOptionsFor(diceColor: DiceColorKey): DropdownOption[] {
  const diceHex = DICE_COLOR_PRESETS[diceColor]?.hex ?? DICE_COLOR_PRESETS.blue.hex;
  return DICE_COLOR_OPTIONS.map((opt) => ({
    value: opt.key,
    label: opt.label,
    swatch: ensureBrighterThanHex(opt.hex, diceHex, 0.1)
  }));
}

function syncPlayersToCount(nextCount: number) {
  const current = players.value;
  const preferred = preferredUsername.value;
  const defaults = buildDefaults(nextCount);
  players.value = defaults.map((def, idx) => ({
    name: idx === 0 && preferred ? current[idx]?.name?.trim() || preferred : current[idx]?.name ?? def.name,
    diceColor: current[idx]?.diceColor ?? def.diceColor,
    heldColor: current[idx]?.heldColor ?? def.heldColor
  }));
}

watch(
  playerCountValue,
  (val) => {
    const count = Number.parseInt(val, 10);
    syncPlayersToCount(Number.isFinite(count) ? count : 1);
  },
  { immediate: true }
);

function randomizeNames() {
  const count = players.value.length;
  const fresh = buildDefaultNames(count);
  players.value = players.value.map((p, idx) => ({
    ...p,
    name: fresh[idx] ?? p.name
  }));
}

function createGame() {
  const preferred = preferredUsername.value;
  const exclude = new Set<string>();
  const normalized = players.value.map((p, idx) => {
    let name = p.name.trim();
    if (!name && idx === 0 && preferred) name = preferred;
    if (name) exclude.add(name);
    return {
      name,
      diceColor: p.diceColor,
      heldColor: p.heldColor,
      idx
    };
  });

  const playerPayload = normalized.map((p) => {
    let name = p.name;
    if (!name) {
      name = pickRandomCasinoName({ exclude });
      exclude.add(name);
    }
    return {
      name,
      appearance: {
        diceColor: p.diceColor,
        heldColor: p.heldColor
      }
    };
  });

  const setup: NewGameSetup = {
    mode: playerPayload.length > 1 ? 'pass-and-play' : 'solo',
    players: playerPayload
  };

  emit('create', setup);
}
</script>

<style scoped>
.new-game-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
  box-sizing: border-box;
}

.new-game-card {
  width: min(920px, 100%);
  max-height: calc(var(--app-height, 100vh) - 36px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 24px;
  padding: 20px;
  background: rgba(4, 10, 22, 0.96);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.62);
  color: #e7edf2;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.new-game-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}

.new-game-header__titles {
  flex: 1 1 260px;
  min-width: 0;
}

.kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
}

h2 {
  margin: 8px 0 6px;
  font-size: 22px;
}

.subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  line-height: 1.35;
}

.section {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 14px;
  background: rgba(8, 20, 36, 0.65);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.88);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.row__text {
  flex: 1 1 220px;
  min-width: 0;
}

.row__label {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.row__help {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.row__controls {
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
}

.player-list {
  display: grid;
  gap: 12px;
}

.player-card {
  border-radius: 16px;
  background: rgba(5, 16, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.player-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.player-badge__index {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.player-badge__name {
  font-weight: 800;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.default-pill {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: rgba(220, 255, 231, 0.9);
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field__label {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.text-input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.text-input:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

.new-game-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ghost-button {
  border-radius: 999px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
  white-space: nowrap;
}

.ghost-button:hover,
.ghost-button:focus-visible {
  border-color: rgba(146, 227, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.small-button {
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: rgba(219, 234, 254, 0.9);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.primary-button {
  border-radius: 999px;
  padding: 8px 16px;
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.32));
  border: 1px solid rgba(34, 197, 94, 0.55);
  color: rgba(220, 255, 231, 0.95);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.primary-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

@media (max-width: 760px) {
  .player-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .new-game-footer {
    justify-content: stretch;
  }

  .new-game-footer button {
    flex: 1;
  }
}
</style>
