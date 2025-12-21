<template>
  <div class="title-screen" role="dialog" aria-modal="true" aria-label="Monte's Delux Dice Poker">
    <div class="title-card">
      <img
        v-if="!logoMissing"
        class="title-logo"
        :src="logoUrl"
        alt="Monte's Delux Dice Poker"
        decoding="async"
        loading="eager"
        @error="logoMissing = true"
      />
      <template v-else>
        <p class="title-kicker">Monte's Delux presents</p>
        <h1>Monte's Delux Dice Poker</h1>
        <p class="title-tagline">Shake the dice, chase straights, and ride the upper bonus to victory.</p>
      </template>
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
      <p class="title-hint">Progress saves automatically, so you can refresh without losing your run.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

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

const baseUrl = import.meta.env.BASE_URL || '/';
const logoUrl = `${baseUrl}assets/branding/logo-full@512w.png`;
const logoMissing = ref(false);

defineEmits<{
  (event: 'resume'): void;
  (event: 'start'): void;
}>();
</script>

<style scoped>
.title-screen {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
}

.title-card {
  width: min(520px, 100%);
  border-radius: 24px;
  padding: 28px 24px 30px;
  background: rgba(4, 10, 22, 0.95);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  text-align: center;
  color: #e7edf2;
}

.title-logo {
  width: min(420px, 100%);
  height: auto;
  display: block;
  margin: 0 auto 18px;
  filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
}

.title-kicker {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
}

.title-card h1 {
  margin: 10px 0 4px;
  font-size: clamp(30px, 5vw, 44px);
  letter-spacing: -0.02em;
}

.title-tagline {
  margin: 0 0 18px;
  color: rgba(255, 255, 255, 0.85);
}

.title-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 26px;
  padding: 0;
  list-style: none;
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
