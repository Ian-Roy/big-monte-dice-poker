<template>
  <div class="summary-page" aria-label="Leaderboard entry summary">
    <div class="summary-card">
      <header class="summary-header">
        <button type="button" class="ghost-button" @click="$emit('back')">Back</button>
        <div class="summary-header__titles">
          <p class="kicker">Leaderboard</p>
          <h2>Game summary</h2>
          <p v-if="rank" class="subtitle">Rank #{{ rank }}</p>
          <p v-else class="subtitle">Score details</p>
        </div>
      </header>

      <template v-if="entry">
        <section class="meta-section">
          <div class="meta-card">
            <p class="meta-label">Leader</p>
            <p class="meta-value">{{ entry.leaderName }} · {{ entry.leaderScore.toLocaleString() }}</p>
          </div>
          <div class="meta-card">
            <p class="meta-label">Players</p>
            <p class="meta-value">{{ entry.playersCount }}</p>
          </div>
          <div class="meta-card">
            <p class="meta-label">Finished</p>
            <p class="meta-value">{{ finishedAt }}</p>
          </div>
        </section>

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
                <span class="chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M7.41 8.59a1 1 0 0 1 1.42 0L12 11.76l3.17-3.17a1 1 0 1 1 1.42 1.42l-3.88 3.88a1 1 0 0 1-1.42 0L7.41 10a1 1 0 0 1 0-1.42Z"
                    />
                  </svg>
                </span>
              </summary>
              <div class="player-details__body">
                <PlayerScoreCard :state="player.state" />
              </div>
            </details>
          </div>
        </section>
      </template>

      <p v-else class="placeholder">That leaderboard entry could not be found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import PlayerScoreCard from '../components/ui/PlayerScoreCard.vue';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { DICE_COLOR_PRESETS } from '../stores/settingsStore';

const props = defineProps<{
  entryId: string | null;
}>();

defineEmits<{
  (event: 'back'): void;
}>();

const leaderboard = useLeaderboardStore();

const entry = computed(() => {
  const id = props.entryId?.trim();
  if (!id) return null;
  return leaderboard.getEntry(id);
});

const rank = computed(() => {
  if (!entry.value) return null;
  const idx = leaderboard.sortedEntries.findIndex((candidate) => candidate.id === entry.value!.id);
  return idx >= 0 ? idx + 1 : null;
});

const finishedAt = computed(() => {
  if (!entry.value) return '—';
  const date = new Date(entry.value.finishedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
});

const playerSummaries = computed(() => {
  if (!entry.value) return [];
  const session = entry.value.session;
  const leaderId = entry.value.leaderPlayerId;
  return session.players.map((player) => {
    const diceHex = DICE_COLOR_PRESETS[player.appearance.diceColor]?.hex ?? DICE_COLOR_PRESETS.blue.hex;
    const state = player.state;
    return {
      id: player.id,
      name: player.name,
      diceHex,
      total: state.totals?.grand ?? 0,
      round: state.currentRound ?? 1,
      maxRounds: state.maxRounds ?? 0,
      isLeader: player.id === leaderId,
      done: state.completed === true,
      state
    };
  });
});
</script>

<style scoped>
.summary-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
  padding: calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right))
    calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));
  box-sizing: border-box;
}

.summary-card {
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

.summary-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.summary-header__titles {
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

.meta-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.meta-card {
  border-radius: 16px;
  padding: 12px;
  background: rgba(8, 20, 36, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.meta-label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.8);
}

.meta-value {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
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
  border-radius: 6px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
}

.player-summary__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 800;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
}

.pill--leader {
  border-color: rgba(255, 200, 87, 0.7);
  background: rgba(255, 200, 87, 0.15);
  color: rgba(255, 237, 213, 0.92);
}

.pill--done {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.16);
  color: rgba(220, 252, 231, 0.9);
}

.player-summary__stats {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: flex-end;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.stat__label {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.stat__value {
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #b7e2ff;
}

.chevron {
  width: 34px;
  height: 34px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.chevron svg {
  width: 18px;
  height: 18px;
}

.player-details[open] .chevron svg {
  transform: rotate(180deg);
}

.player-details__body {
  padding: 12px;
}

.placeholder {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}
</style>

