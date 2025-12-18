<template>
  <div class="end-game-summary">
    <header class="summary-header">
      <div>
        <p class="status-label">{{ statusLabel }}</p>
        <h3>Game Summary</h3>
        <p class="summary-subtitle">
          {{ playersCount }} player{{ playersCount === 1 ? '' : 's' }} · Leader {{ leaderName }} ({{ leaderScore }})
        </p>
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

    <section class="players-section">
      <header>
        <p class="section-label">Players</p>
        <p class="section-subtitle">Tap a player row to expand their full score card and audit log.</p>
      </header>

      <div class="players-list">
        <details v-for="player in playerSummaries" :key="player.id" class="player-details">
          <summary class="player-summary">
            <span class="swatch" :style="{ background: player.diceHex }" aria-hidden="true" />
            <span class="player-summary__main">
              <span class="player-name">{{ player.name }}</span>
              <span class="player-badges">
                <span v-if="player.isLeader" class="pill pill--leader">Leader</span>
                <span v-if="player.isActive" class="pill pill--current">Current</span>
                <span v-if="player.done" class="pill pill--done">Done</span>
              </span>
            </span>
            <span class="player-summary__stats">
              <span class="stat">
                <span class="stat__label">Total</span>
                <span class="stat__value">{{ player.total }}</span>
              </span>
              <span class="stat">
                <span class="stat__label">Round</span>
                <span class="stat__value">{{ player.round }} / {{ player.maxRounds }}</span>
              </span>
            </span>
          </summary>
          <div class="player-details__body">
            <PlayerScoreCard :state="player.state" />
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import PlayerScoreCard from './PlayerScoreCard.vue';
import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();

const completed = computed(() => store.sessionCompleted);
const statusLabel = computed(() => (completed.value ? 'Game complete' : 'Game in progress'));
const currentRound = computed(() => store.engineState.currentRound);
const maxRounds = computed(() => store.engineState.maxRounds);

const playersCount = computed(() => store.players.length);
const leaderName = computed(() => store.leaderPlayer?.name ?? '—');
const leaderScore = computed(() => store.leaderPlayer?.state?.totals?.grand ?? 0);

defineEmits<{
  (event: 'back-to-title'): void;
  (event: 'quit-game'): void;
}>();

const playerSummaries = computed(() =>
  store.players.map((player) => {
    const state = player.state;
    const diceHex = store.diceColorHexForKey(player.appearance.diceColor);
    return {
      id: player.id,
      name: player.name,
      diceHex,
      total: state.totals?.grand ?? 0,
      round: state.currentRound ?? 1,
      maxRounds: state.maxRounds ?? 0,
      isLeader: store.leaderPlayer?.id === player.id,
      isActive: store.activePlayer?.id === player.id,
      done: state.completed === true,
      state
    };
  })
);
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
  flex: 1 1 240px;
  min-width: 0;
}

.summary-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.status-label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.summary-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
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
  outline: none;
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
  outline: none;
}

.players-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.players-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-details {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(3, 12, 24, 0.85);
  overflow: hidden;
}

.player-details[open] {
  border-color: rgba(146, 227, 255, 0.28);
}

.player-summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.player-summary::-webkit-details-marker {
  display: none;
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.35);
  flex: 0 0 auto;
}

.player-summary__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-name {
  font-weight: 900;
  word-break: break-word;
}

.player-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pill {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.78);
}

.pill--leader {
  border-color: rgba(255, 200, 87, 0.55);
  background: rgba(255, 200, 87, 0.14);
  color: rgba(255, 230, 190, 0.95);
}

.pill--current {
  border-color: rgba(146, 227, 255, 0.55);
  background: rgba(146, 227, 255, 0.14);
  color: rgba(230, 250, 255, 0.95);
}

.pill--done {
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(34, 197, 94, 0.14);
  color: rgba(220, 255, 231, 0.95);
}

.player-summary__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  text-align: right;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
}

.stat__label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.stat__value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.9);
}

.player-details__body {
  padding: 12px;
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

  .player-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .player-summary__stats {
    justify-content: flex-start;
    text-align: left;
  }

  .stat {
    min-width: 0;
  }
}
</style>

