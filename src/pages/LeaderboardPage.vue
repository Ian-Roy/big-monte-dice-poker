<template>
  <div class="leaderboard-page" aria-label="Leaderboard">
    <div class="leaderboard-card">
      <header class="leaderboard-header">
        <button type="button" class="ghost-button" @click="$emit('back')">Back</button>
        <div class="leaderboard-header__titles">
          <p class="kicker">Monte's Delux</p>
          <h2>Leaderboard</h2>
          <p class="subtitle">Top scores across completed games.</p>
        </div>
      </header>

      <section class="entries-section">
        <header class="entries-section__header">
          <p class="section-label">High scores</p>
          <p class="section-subtitle">{{ entries.length }} entr{{ entries.length === 1 ? 'y' : 'ies' }}</p>
        </header>

        <div v-if="entries.length" class="entries">
          <div
            v-for="(entry, index) in entries"
            :key="entry.id"
            class="entry-row"
            :class="{ clickable: index < 3 }"
          >
            <component
              :is="index < 3 ? 'button' : 'div'"
              :type="index < 3 ? 'button' : undefined"
              class="entry-row__content"
              :aria-label="index < 3 ? `View summary for rank ${index + 1}` : undefined"
              :tabindex="index < 3 ? 0 : undefined"
              @click="index < 3 ? emit('open-summary', entry.id) : undefined"
            >
              <span class="rank">#{{ index + 1 }}</span>
              <span class="main">
                <span class="name">{{ entry.leaderName || '—' }}</span>
                <span class="meta">{{ entry.playersCount }} player{{ entry.playersCount === 1 ? '' : 's' }} · {{ formatDate(entry.finishedAt) }}</span>
              </span>
              <span class="score">{{ entry.leaderScore.toLocaleString() }}</span>
              <span v-if="index < 3" class="details" aria-hidden="true">
                <span class="details__label">Details</span>
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M9.29 6.71a1 1 0 0 1 1.42 0l5 5a1 1 0 0 1 0 1.42l-5 5a1 1 0 1 1-1.42-1.42L13.59 12 9.29 7.71a1 1 0 0 1 0-1.42Z"
                  />
                </svg>
              </span>
            </component>
          </div>
        </div>

        <p v-else class="placeholder">No high scores yet. Finish a game to post your first score.</p>
      </section>

      <p class="hint">Top 3 entries include a full game summary.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useLeaderboardStore } from '../stores/leaderboardStore';

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'open-summary', id: string): void;
}>();

const leaderboard = useLeaderboardStore();
const entries = computed(() => leaderboard.sortedEntries);

function formatDate(timestampMs: number) {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style scoped>
.leaderboard-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
  padding: calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right))
    calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));
  box-sizing: border-box;
}

.leaderboard-card {
  width: min(860px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 24px;
  padding: 20px;
  background: rgba(4, 10, 22, 0.96);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.62);
  color: #e7edf2;
}

.leaderboard-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.leaderboard-header__titles {
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
  font-size: 1.6rem;
}

.subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}

.ghost-button {
  border-radius: 999px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.8);
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

.entries-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entries-section__header {
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

.entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-row {
  border-radius: 16px;
  padding: 0;
  background: rgba(8, 20, 36, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
}

.entry-row__content {
  width: 100%;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: inherit;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
  text-align: left;
}

.entry-row.clickable .entry-row__content {
  cursor: pointer;
}

.entry-row.clickable .entry-row__content:hover,
.entry-row.clickable .entry-row__content:focus-visible {
  outline: none;
  background: rgba(10, 28, 48, 0.92);
}

.rank {
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name {
  font-weight: 800;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.score {
  font-weight: 900;
  font-size: 18px;
  color: #ffc857;
  font-variant-numeric: tabular-nums;
}

.details {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.85);
}

.details svg {
  width: 16px;
  height: 16px;
}

.placeholder {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

@media (max-width: 560px) {
  .entry-row__content {
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "rank main score"
      "rank details details";
    align-items: start;
  }

  .rank {
    grid-area: rank;
  }

  .main {
    grid-area: main;
  }

  .score {
    grid-area: score;
    text-align: right;
  }

  .details {
    grid-area: details;
    justify-content: flex-end;
    margin-top: 6px;
  }
}
</style>
