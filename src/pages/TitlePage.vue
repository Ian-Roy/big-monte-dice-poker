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

      <dl class="title-progress">
        <div>
          <dt>Round</dt>
          <dd>{{ summary.round }} / {{ summary.maxRounds }}</dd>
        </div>
        <div>
          <dt>Scored</dt>
          <dd>{{ summary.scoredCount }} / {{ summary.totalScorable }}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{{ summary.score }}</dd>
        </div>
      </dl>

      <div class="title-actions">
        <button v-if="canResume" type="button" class="title-btn primary" @click="$emit('resume')">
          Continue game
        </button>
        <button type="button" class="title-btn secondary" @click="$emit('start')">
          {{ canResume ? 'Start new game' : 'Start playing' }}
        </button>
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
      <p class="title-hint">Progress saves automatically.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { promptPwaInstall, refreshPwa, usePwaState } from '../pwa/pwaState';

type TitleSummary = {
  round: number;
  maxRounds: number;
  scoredCount: number;
  totalScorable: number;
  score: number;
};

defineProps<{
  canResume: boolean;
  summary: TitleSummary;
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
  (event: 'resume'): void;
  (event: 'start'): void;
  (event: 'settings'): void;
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

.title-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 26px;
  padding: 0;
}

.title-progress div {
  background: rgba(8, 20, 36, 0.9);
  border-radius: 14px;
  padding: 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.title-progress dt {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.title-progress dd {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #b7e2ff;
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
