<template>
  <div class="settings-page" aria-label="Settings">
    <div class="settings-shell">
      <header class="settings-header">
        <button type="button" class="ghost-button" @click="$emit('back')">Back</button>
        <div class="settings-header__titles">
          <h2>Settings</h2>
          <p>These options affect how the dice behave and look.</p>
        </div>
        <button type="button" class="ghost-button ghost-button--danger" @click="store.resetToDefaults">
          Reset defaults
        </button>
      </header>

      <section class="settings-section">
        <h3>Player</h3>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Preferred username</div>
              <div class="setting-help">
                Used as Player 1 when starting new games. Leave blank to keep using random casino names.
              </div>
            </div>
            <div class="setting-controls setting-controls--name">
              <input
                v-model="store.preferredUsername"
                class="text-input"
                type="text"
                autocomplete="nickname"
                maxlength="24"
                placeholder="(random)"
              />
              <button
                type="button"
                class="icon-button"
                aria-label="Randomize preferred username"
                @click="randomizePreferredUsername"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Zm0 2h14v14H5V5Zm3.5 3.5a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Zm7 0a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5ZM8.5 13a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Zm7 0a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5ZM12 10.75a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h3>Dice Appearance</h3>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Dice color</div>
              <div class="setting-help">Main tint used for dice.</div>
            </div>
            <div class="setting-controls">
              <DropdownSelect
                v-model="store.appearance.diceColor"
                aria-label="Dice color"
                :options="diceColorOptions"
              />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Held dice color</div>
              <div class="setting-help">Always rendered as a brighter tint so it pops.</div>
            </div>
            <div class="setting-controls">
              <DropdownSelect
                v-model="store.appearance.heldColor"
                aria-label="Held dice color"
                :options="heldColorOptions"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h3>Dice Physics</h3>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Throw force</div>
              <div class="setting-help">How hard the dice are tossed into the tray.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input
                v-model.number="store.physics.throwForce"
                type="range"
                min="0"
                max="12"
                step="0.1"
              />
              <input v-model.number="store.physics.throwForce" class="number-input" type="number" min="0" max="12" step="0.1" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Spin force</div>
              <div class="setting-help">How much twist is applied to a toss.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.spinForce" type="range" min="0" max="12" step="0.1" />
              <input v-model.number="store.physics.spinForce" class="number-input" type="number" min="0" max="12" step="0.1" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Gravity</div>
              <div class="setting-help">Higher values make dice settle faster.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.gravity" type="range" min="0" max="3" step="0.05" />
              <input v-model.number="store.physics.gravity" class="number-input" type="number" min="0" max="3" step="0.05" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Mass</div>
              <div class="setting-help">Heavier dice feel weightier (and can reduce bounce).</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.mass" type="range" min="0.25" max="8" step="0.05" />
              <input v-model.number="store.physics.mass" class="number-input" type="number" min="0.25" max="8" step="0.05" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Friction</div>
              <div class="setting-help">Lower values slide more; higher values grip more.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.friction" type="range" min="0" max="1" step="0.01" />
              <input v-model.number="store.physics.friction" class="number-input" type="number" min="0" max="1" step="0.01" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Restitution</div>
              <div class="setting-help">Higher values bounce more.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.restitution" type="range" min="0" max="1" step="0.01" />
              <input v-model.number="store.physics.restitution" class="number-input" type="number" min="0" max="1" step="0.01" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Linear damping</div>
              <div class="setting-help">Air resistance-like slow-down for movement.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.linearDamping" type="range" min="0" max="1" step="0.01" />
              <input v-model.number="store.physics.linearDamping" class="number-input" type="number" min="0" max="1" step="0.01" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Angular damping</div>
              <div class="setting-help">Slow-down for spinning.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.angularDamping" type="range" min="0" max="1" step="0.01" />
              <input v-model.number="store.physics.angularDamping" class="number-input" type="number" min="0" max="1" step="0.01" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-text">
              <div class="setting-label">Starting height</div>
              <div class="setting-help">How high dice start above the tray.</div>
            </div>
            <div class="setting-controls setting-controls--range">
              <input v-model.number="store.physics.startingHeight" type="range" min="0" max="16" step="0.1" />
              <input v-model.number="store.physics.startingHeight" class="number-input" type="number" min="0" max="16" step="0.1" />
            </div>
          </div>
        </div>
      </section>

      <p class="settings-footer">
        More settings will appear here over time — this page is built to grow.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import DropdownSelect, { type DropdownOption } from '../components/ui/DropdownSelect.vue';
import { pickRandomCasinoName } from '../shared/casinoNames';
import { ensureBrighterThanHex } from '../shared/color';
import { DICE_COLOR_OPTIONS, useSettingsStore } from '../stores/settingsStore';

const store = useSettingsStore();

const diceColorOptions = computed<DropdownOption[]>(() =>
  DICE_COLOR_OPTIONS.map((opt) => ({
    value: opt.key,
    label: opt.label,
    swatch: opt.hex
  }))
);

const heldColorOptions = computed<DropdownOption[]>(() =>
  DICE_COLOR_OPTIONS.map((opt) => ({
    value: opt.key,
    label: opt.label,
    swatch: ensureBrighterThanHex(opt.hex, store.diceColorHex, 0.1)
  }))
);

function randomizePreferredUsername() {
  const current = store.preferredUsername.trim();
  const exclude = current ? new Set<string>([current]) : undefined;
  store.preferredUsername = pickRandomCasinoName({ exclude });
}

defineEmits<{
  (event: 'back'): void;
}>();
</script>

<style scoped>
.settings-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
  padding: calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right))
    calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));
  box-sizing: border-box;
}

.settings-shell {
  width: min(860px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.settings-header__titles {
  flex: 1 1 240px;
  min-width: 0;
}

.settings-header h2 {
  margin: 0;
  font-size: 24px;
}

.settings-header p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.75);
}

.settings-section {
  border-radius: 18px;
  padding: 16px;
  background: rgba(4, 10, 22, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.55);
}

.settings-section h3 {
  margin: 0 0 10px;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.88);
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 12px;
  border-radius: 14px;
  background: rgba(8, 20, 36, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.setting-text {
  flex: 1 1 220px;
  min-width: 0;
}

.setting-label {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.setting-help {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  line-height: 1.3;
}

.setting-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 1 1 240px;
  min-width: 0;
  flex-wrap: wrap;
}

.setting-controls--name {
  flex-wrap: nowrap;
}

.setting-controls--name .text-input {
  flex: 1;
  width: auto;
  max-width: 360px;
}

.icon-button {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.78);
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
  flex: 0 0 auto;
}

.icon-button svg {
  width: 20px;
  height: 20px;
}

.icon-button:hover,
.icon-button:focus-visible {
  outline: none;
  border-color: rgba(146, 227, 255, 0.65);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.setting-controls--range input[type='range'] {
  flex: 1;
  min-width: 160px;
}

.number-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 10px;
  font-size: 14px;
  box-sizing: border-box;
  width: 110px;
}

.text-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  box-sizing: border-box;
  width: min(340px, 100%);
}

.text-input:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
  border-color: rgba(146, 227, 255, 0.65);
}

.settings-footer {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  text-align: center;
}

.ghost-button {
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.ghost-button--danger {
  border-color: rgba(239, 68, 68, 0.35);
  color: rgba(255, 210, 210, 0.9);
}

.ghost-button:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}
</style>
