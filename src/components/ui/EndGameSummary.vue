<template>
  <div class="end-game-summary">
    <header class="summary-header">
      <div>
        <p class="status-label">{{ statusLabel }}</p>
        <h3>End Game Summary</h3>
      </div>
      <div class="summary-meta">
        <span class="round-indicator">Round {{ currentRound }} / {{ maxRounds }}</span>
        <span class="status-pill" :class="{ complete: completed }">
          {{ completed ? 'Game complete' : 'In progress' }}
        </span>
      </div>
    </header>

    <div class="summary-actions">
      <button type="button" class="ghost-button" @click="$emit('back-to-title')">
        Go back to title screen
      </button>
      <button v-if="!completed" type="button" class="danger-button" @click="$emit('quit-game')">
        Quit game
      </button>
    </div>
    <section class="final-score">
      <header>
        <p class="section-label">Final score details</p>
        <p class="section-subtitle">Upper, lower, and bonus values roll up into the grand total.</p>
      </header>
      <div class="score-grid">
        <div class="score-line">
          <span>Upper</span>
          <span class="value">{{ totals.upper }}</span>
        </div>
        <div class="score-line">
          <span>Bonus</span>
          <span class="value">{{ totals.bonus }}</span>
        </div>
        <div class="score-line">
          <span>Lower</span>
          <span class="value">{{ totals.lower }}</span>
        </div>
        <div class="score-line grand">
          <span>Total</span>
          <span class="value">{{ totals.grand }}</span>
        </div>
      </div>
    </section>

    <section class="audit-section">
      <header>
        <p class="section-label">Dice audit log</p>
        <p class="section-subtitle">Every scored category keeps the dice you used for that round.</p>
      </header>
      <div v-if="auditEntries.length" class="audit-list">
        <article v-for="(entry, index) in auditEntries" :key="entry.key" class="audit-entry">
          <div class="entry-header">
            <span class="entry-round">Round {{ entry.round ?? index + 1 }}</span>
            <span class="entry-label">{{ entry.label }}</span>
            <span class="entry-score">{{ entry.score }} pts</span>
          </div>
          <div class="audit-dice">
            <span
              v-for="(value, dieIdx) in entry.dice"
              :key="`${entry.key}-${dieIdx}-${value}`"
              class="audit-die"
            >
              <span class="die-value">{{ typeof value === 'number' ? value : '?' }}</span>
            </span>
          </div>
        </article>
      </div>
      <p v-else class="placeholder">Score a category to record its dice in this audit log.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();

const totals = computed(() => store.totals);
const currentRound = computed(() => store.engineState.currentRound);
const maxRounds = computed(() => store.engineState.maxRounds);
const completed = computed(() => store.engineState.completed);
const statusLabel = computed(() => (completed.value ? 'Game complete' : 'Game in progress'));

defineEmits<{
  (event: 'back-to-title'): void;
  (event: 'quit-game'): void;
}>();

const auditEntries = computed(() => {
  const entries = store.categories
    .filter((cat) => cat.scored && cat.scoredDice && cat.scoredDice.length)
    .map((cat) => ({
      key: cat.key,
      label: cat.label,
      score: cat.score ?? 0,
      dice: [...(cat.scoredDice ?? [])],
      round: cat.roundScored ?? undefined
    }));

  return entries.sort((a, b) => {
    const aRound = typeof a.round === 'number' ? a.round : Number.MAX_SAFE_INTEGER;
    const bRound = typeof b.round === 'number' ? b.round : Number.MAX_SAFE_INTEGER;
    return aRound - bRound;
  });
});
</script>

<style scoped>
.end-game-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.summary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-header > div {
  flex: 1 1 220px;
  min-width: 0;
}

.summary-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.summary-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.ghost-button {
  border-radius: 999px;
  padding: 6px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.ghost-button:hover,
.ghost-button:focus-visible {
  border-color: rgba(146, 227, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.danger-button {
  border-radius: 999px;
  padding: 6px 16px;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.55);
  color: rgba(255, 220, 220, 0.92);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.danger-button:hover,
.danger-button:focus-visible {
  border-color: rgba(248, 113, 113, 0.95);
  background: rgba(239, 68, 68, 0.28);
  color: #fff;
}

.status-label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.summary-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  text-align: right;
}

.round-indicator {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9ad5ff;
}

.status-pill {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-pill.complete {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
}

.section-label {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #9ad5ff;
}

.section-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.final-score {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
}

.score-grid {
  margin-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(3, 12, 24, 0.85);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
}

.score-line.grand {
  font-weight: 700;
  color: #ffc857;
}

.score-line .value {
  font-size: 15px;
  font-weight: 600;
}

.audit-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audit-entry {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px;
  background: rgba(3, 12, 24, 0.85);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.entry-round {
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.entry-label {
  flex: 1;
  font-weight: 700;
  min-width: 0;
  word-break: break-word;
}

.entry-score {
  font-size: 13px;
  color: #ffc857;
  font-weight: 600;
}

.audit-dice {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.audit-die {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  display: grid;
  place-items: center;
}

.die-value {
  font-family: 'JetBrains Mono', 'DM Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.placeholder {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

@media (max-width: 640px) {
  .summary-actions {
    justify-content: flex-start;
  }

  .ghost-button {
    flex: 1 1 180px;
    text-align: center;
  }

  .summary-meta {
    align-items: flex-start;
    text-align: left;
  }

  .entry-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .entry-score {
    margin-top: 4px;
  }
}
</style>
