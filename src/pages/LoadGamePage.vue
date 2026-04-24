<template>
  <div class="load-page" aria-label="Saved games">
    <div class="load-card">
      <header class="load-header">
        <button type="button" class="ghost-button ghost-button--back" @click="$emit('back')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M14.71 5.29a1 1 0 0 1 0 1.42L10.41 11l4.3 4.29a1 1 0 1 1-1.42 1.42l-5-5a1 1 0 0 1 0-1.42l5-5a1 1 0 0 1 1.42 0Z"
            />
          </svg>
          <span>Back</span>
        </button>
        <div class="load-header__titles">
          <p class="kicker">Monte's Delux</p>
          <h2>Load game</h2>
          <p class="subtitle">Pick a saved run and jump right back in.</p>
        </div>
      </header>

      <section class="save-section" aria-label="Saved games list">
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
              <p class="save-title">
                Save {{ index + 1 }}
                <span v-if="save.id === activeSaveId" class="save-pill">Active</span>
              </p>
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

            <button type="button" class="continue-btn" @click="$emit('resume', save.id)">
              Continue
            </button>
          </article>
        </div>

        <p v-else class="placeholder">No saved games available. Start a new game first.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
type SavedGameSummary = {
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
}>();

defineEmits<{
  (event: 'resume', id: string): void;
  (event: 'delete', id: string): void;
  (event: 'back'): void;
}>();
</script>

<style scoped>
.load-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: radial-gradient(circle at top, rgba(12, 19, 36, 0.95), rgba(3, 6, 14, 0.98));
  padding: calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right))
    calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));
  box-sizing: border-box;
}

.load-card {
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

.load-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.load-header__titles {
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

.save-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.save-pill {
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.14);
  color: rgba(220, 255, 231, 0.95);
  font-size: 10px;
  letter-spacing: 0.14em;
  padding: 2px 8px;
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

.continue-btn {
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.5);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 12px 18px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.32));
  color: #dfffe7;
}

.continue-btn:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  min-height: 44px;
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

.ghost-button--back svg {
  width: 18px;
  height: 18px;
}
</style>
