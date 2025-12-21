<template>
  <div class="title-page" aria-label="Big Monte Dice Poker title screen">
    <div class="title-card">
      <div class="title-card__header">
        <div>
          <p class="title-kicker">Big Monte presents</p>
          <h1>Big Monte Dice Poker</h1>
        </div>
      </div>

      <p class="title-tagline">Shake the dice, chase straights, and ride the upper bonus to victory.</p>

      <section class="high-score-section" aria-label="High score">
        <button type="button" class="high-score-card" @click="$emit('leaderboard')">
          <span class="high-score-card__label">High score</span>
          <span class="high-score-card__value">
            {{ hasHighScore ? highScore.toLocaleString() : '—' }}
          </span>
          <span class="high-score-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M9.29 6.71a1 1 0 0 1 1.42 0l5 5a1 1 0 0 1 0 1.42l-5 5a1 1 0 1 1-1.42-1.42L13.59 12 9.29 7.71a1 1 0 0 1 0-1.42Z"
              />
            </svg>
          </span>
        </button>
      </section>

      <section class="save-section" aria-label="Saved games">
        <header class="save-section__header">
          <p class="section-label">Saved games</p>
          <p class="section-subtitle">{{ saves.length }} / {{ maxSaves }} slots used</p>
        </header>

        <div v-if="saves.length" class="save-grid">
          <article
            v-for="(save, index) in saves"
            :key="save.id"
            class="save-card"
            :class="{ active: save.id === activeSaveId }"
          >
            <header class="save-card__header">
              <p class="save-title">Save {{ index + 1 }}</p>
              <button
                type="button"
                class="icon-btn"
                aria-label="Delete saved game"
                @click="$emit('delete', save.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M9 3h6l1 2h4v2h-1v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4l1-2Zm8 4H7v14h10V7Zm-7 3h2v8h-2v-8Zm4 0h2v8h-2v-8Z"
                  />
                </svg>
              </button>
            </header>

            <dl class="save-metrics">
              <div>
                <dt>Round</dt>
                <dd>{{ save.round }} / {{ save.maxRounds }}</dd>
              </div>
              <div>
                <dt>Leader</dt>
                <dd>{{ save.score }}</dd>
              </div>
            </dl>

            <p class="save-meta">
              Players {{ save.playersCount }} · Leader {{ save.leaderName }} · Current {{ save.activePlayerName }}
            </p>
            <p class="save-meta">Scored {{ save.scoredCount }} / {{ save.totalScorable }}</p>

            <button type="button" class="title-btn primary" @click="$emit('resume', save.id)">
              Continue
            </button>
          </article>
        </div>

        <p v-else class="placeholder">No saved games yet. Start playing to create one.</p>
      </section>

      <div class="title-actions">
        <button type="button" class="title-btn secondary" @click="$emit('create-game')">Create game</button>
      </div>

      <div class="title-utilities">
        <button type="button" class="utility-btn" @click="$emit('settings')">Game settings</button>
        <button
          v-if="canInstallPwa"
          type="button"
          class="utility-btn utility-btn--primary"
          :disabled="pwaBusy"
          @click="handleInstall"
        >
          {{ pwaBusy ? 'Opening…' : 'Install PWA' }}
        </button>
        <button
          v-else
          type="button"
          class="utility-btn utility-btn--primary"
          :disabled="pwaBusy"
          @click="handleRefresh"
        >
          {{ pwaBusy ? 'Refreshing…' : updateAvailable ? 'Refresh PWA (update ready)' : 'Refresh PWA' }}
        </button>
      </div>
      <p v-if="pwaMessage" class="title-status">{{ pwaMessage }}</p>
      <p class="title-hint">Progress saves automatically (up to {{ maxSaves }} games).</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { promptPwaInstall, refreshPwa, usePwaState } from '../pwa/pwaState';

export type SavedGameSummary = {
  id: string;
  playersCount: number;
  leaderName: string;
  activePlayerName: string;
  round: number;
  maxRounds: number;
  scoredCount: number;
  totalScorable: number;
  score: number;
};

defineProps<{
  saves: SavedGameSummary[];
  activeSaveId: string | null;
  maxSaves: number;
  highScore: number;
  hasHighScore: boolean;
}>();

const { canInstallPwa, updateAvailable } = usePwaState();
const pwaBusy = ref(false);
const pwaMessage = ref('');

async function handleInstall() {
  if (pwaBusy.value) return;
  pwaBusy.value = true;
  pwaMessage.value = '';
  try {
    const result = await promptPwaInstall();
    if (result === 'accepted') pwaMessage.value = 'Thanks! The install prompt was accepted.';
    else if (result === 'dismissed') pwaMessage.value = 'Install prompt dismissed.';
    else pwaMessage.value = 'Install is not available on this device yet.';
  } catch (err) {
    pwaMessage.value = (err as Error)?.message ?? 'Install failed.';
  } finally {
    pwaBusy.value = false;
  }
}

async function handleRefresh() {
  if (pwaBusy.value) return;
  pwaBusy.value = true;
  pwaMessage.value = '';
  try {
    const result = await refreshPwa();
    if (result === 'unsupported') {
      pwaMessage.value = 'PWA updates are not supported in this browser.';
    } else if (result === 'missing') {
      pwaMessage.value = 'No service worker found. Reloading to install…';
      setTimeout(() => window.location.reload(), 200);
    } else {
      pwaMessage.value = 'Update applied. Reloading…';
      setTimeout(() => window.location.reload(), 200);
    }
  } catch (err) {
    pwaMessage.value = (err as Error)?.message ?? 'Refresh failed.';
  } finally {
    pwaBusy.value = false;
  }
}

defineEmits<{
  (event: 'resume', id: string): void;
  (event: 'create-game'): void;
  (event: 'delete', id: string): void;
  (event: 'settings'): void;
  (event: 'leaderboard'): void;
}>();
</script>

<style scoped>
.title-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
}

.title-card {
  width: min(680px, 100%);
  border-radius: 24px;
  padding: 28px 24px 30px;
  background: rgba(4, 10, 22, 0.95);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  text-align: center;
  color: #e7edf2;
  box-sizing: border-box;
}

.title-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-kicker {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
  text-align: left;
}

.title-card h1 {
  margin: 10px 0 4px;
  font-size: clamp(30px, 5vw, 44px);
  letter-spacing: -0.02em;
  text-align: left;
}

.title-tagline {
  margin: 10px 0 18px;
  color: rgba(255, 255, 255, 0.85);
}

.high-score-section {
  margin: 0 0 18px;
  display: flex;
  justify-content: center;
}

.high-score-card {
  width: 100%;
  border-radius: 18px;
  padding: 14px 14px;
  background: rgba(8, 20, 36, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "label icon"
    "value icon";
  align-items: center;
  gap: 6px 10px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.high-score-card:hover,
.high-score-card:focus-visible {
  border-color: rgba(146, 227, 255, 0.45);
  background: rgba(10, 28, 48, 0.92);
  outline: none;
}

.high-score-card__label {
  grid-area: label;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
}

.high-score-card__value {
  grid-area: value;
  font-size: 22px;
  font-weight: 800;
  color: #ffc857;
  font-variant-numeric: tabular-nums;
}

.high-score-card__icon {
  grid-area: icon;
  width: 34px;
  height: 34px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  display: grid;
  place-items: center;
}

.high-score-card__icon svg {
  width: 18px;
  height: 18px;
}

.save-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 22px;
  text-align: left;
}

.save-section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
}

.section-subtitle {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.save-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.save-card {
  border-radius: 18px;
  padding: 14px;
  background: rgba(8, 20, 36, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
}

.save-card.active {
  border-color: rgba(34, 197, 94, 0.55);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.18), 0 10px 22px rgba(0, 0, 0, 0.28);
}

.save-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.save-title {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75);
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

.icon-btn:hover,
.icon-btn:focus-visible {
  border-color: rgba(255, 120, 120, 0.5);
  background: rgba(239, 68, 68, 0.12);
  color: rgba(255, 215, 215, 0.95);
  outline: none;
}

.save-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
}

.save-metrics div {
  background: rgba(3, 10, 20, 0.55);
  border-radius: 14px;
  padding: 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.save-metrics dt {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.save-metrics dd {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: #b7e2ff;
}

.save-meta {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.placeholder {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.title-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.title-utilities {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 6px 0 10px;
}

.utility-btn {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.utility-btn--primary {
  border-color: rgba(146, 227, 255, 0.35);
  background: rgba(59, 130, 246, 0.12);
  color: rgba(219, 234, 254, 0.92);
}

.utility-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.utility-btn:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

.title-status {
  margin: 0 0 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.title-btn {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 12px 18px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.title-btn.primary {
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.32));
  color: #dfffe7;
  border-color: rgba(34, 197, 94, 0.5);
}

.title-btn.secondary {
  background: rgba(59, 130, 246, 0.15);
  color: #dbeafe;
  border-color: rgba(59, 130, 246, 0.5);
}

.title-btn:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

.title-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

@media (min-width: 480px) {
  .title-actions {
    flex-direction: row;
  }

  .title-actions .title-btn {
    flex: 1;
  }
}
</style>
