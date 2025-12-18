<template>
  <div class="scorecard">
    <div class="score-table">
      <div class="section">
        <h4>Upper Section</h4>
        <div class="rows">
          <div
            v-for="cat in upper"
            :key="cat.key"
            class="score-row"
            :class="{ scored: cat.scored, bonus: cat.interactive === false }"
          >
            <span class="label">{{ cat.label }}</span>
            <span class="value">
              <template v-if="cat.scored">{{ cat.score ?? 0 }}</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>
      </div>

      <div class="section">
        <h4>Lower Section</h4>
        <div class="rows">
          <div v-for="cat in lower" :key="cat.key" class="score-row" :class="{ scored: cat.scored }">
            <span class="label">{{ cat.label }}</span>
            <span class="value">
              <template v-if="cat.scored">{{ cat.score ?? 0 }}</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>
      </div>

      <div class="totals">
        <div class="total-line">
          <span>Upper</span>
          <span>{{ totals.upper }}</span>
        </div>
        <div class="total-line">
          <span>Bonus</span>
          <span>{{ totals.bonus }}</span>
        </div>
        <div class="total-line">
          <span>Lower</span>
          <span>{{ totals.lower }}</span>
        </div>
        <div class="total-line grand">
          <span>Total</span>
          <span>{{ totals.grand }}</span>
        </div>
        <div class="total-line round-line" aria-live="polite">
          <span>Round</span>
          <span>{{ state.currentRound }} / {{ state.maxRounds }}</span>
        </div>
      </div>
    </div>

    <section class="audit-section">
      <header>
        <p class="section-label">Dice audit log</p>
        <p class="section-subtitle">Scored categories keep the dice you used for that round.</p>
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

import type { GameState } from '../../game/engine';

const props = defineProps<{
  state: GameState;
}>();

const state = computed(() => props.state);
const totals = computed(() => state.value.totals);
const categories = computed(() => state.value.categories);

const upper = computed(() => categories.value.filter((c) => c.section === 'upper' || c.key === 'upper-bonus'));
const lower = computed(() => categories.value.filter((c) => c.section === 'lower'));

const auditEntries = computed(() => {
  const entries = categories.value
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
.scorecard {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.score-table {
  background: rgba(11, 26, 40, 0.9);
  border: 1px solid rgba(122, 211, 255, 0.35);
  border-radius: 14px;
  padding: 14px;
  color: #e7edf2;
  display: grid;
  gap: 12px;
}

.section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ad5ff;
}

.rows {
  display: grid;
  gap: 8px;
}

.score-row {
  width: 100%;
  text-align: left;
  background: rgba(5, 22, 34, 0.9);
  color: #e7edf2;
  border: 1px solid rgba(122, 211, 255, 0.4);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.score-row.scored {
  background: rgba(26, 43, 59, 0.9);
  border-color: rgba(255, 200, 87, 0.85);
}

.score-row.bonus {
  opacity: 0.85;
  border-style: dashed;
}

.label {
  font-weight: 800;
  font-size: 14px;
}

.value {
  font-size: 14px;
  color: #b7e2ff;
  font-variant-numeric: tabular-nums;
}

.score-row.scored .value {
  color: #ffc857;
  font-weight: 700;
}

.totals {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
  display: grid;
  gap: 6px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
}

.grand {
  font-weight: 800;
  color: #ffc857;
}

.round-line {
  margin-top: 4px;
  font-weight: 700;
  color: #8bd0ff;
}

.round-line span:last-child {
  font-variant-numeric: tabular-nums;
}

.audit-section {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  background: rgba(3, 12, 24, 0.85);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #9ad5ff;
}

.section-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
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
  background: rgba(5, 16, 30, 0.78);
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
  font-weight: 800;
  min-width: 0;
  word-break: break-word;
}

.entry-score {
  font-size: 13px;
  color: #ffc857;
  font-weight: 700;
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
  .entry-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .entry-score {
    margin-top: 4px;
  }
}
</style>

