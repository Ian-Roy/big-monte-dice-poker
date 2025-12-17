<template></template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';

import { getDiceService, disposeDiceService } from '../shared/diceServiceInstance';
import { DICE_CONTEXT_LOST_EVENT } from '../shared/DiceService';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';

const store = useGameStore();
const settings = useSettingsStore();
let recovering = false;

const configSnapshot = () => ({
  diceColor: settings.diceColorHex,
  heldColor: settings.heldColorHex,
  physics: { ...settings.physics }
});

async function initializeService() {
  const service = getDiceService('#dice-box', configSnapshot());
  try {
    await service.init();
    service.updateConfig(configSnapshot());
    store.attachDiceService(service);
    service.startNewRound();
    return true;
  } catch (err) {
    store.setServiceError((err as Error).message);
    console.error('[DiceServiceBridge] failed to init DiceService', err);
    return false;
  }
}

async function handleContextLost(event: Event) {
  if (recovering) return;
  recovering = true;
  const detail = (event as CustomEvent<{ reason?: string }>).detail;
  const reason = detail?.reason ? ` (${detail.reason})` : '';
  store.setServiceError(`Dice display reset${reason}; reloading…`);
  store.detachDiceService();
  disposeDiceService();
  const ok = await initializeService();
  if (ok) {
    store.setServiceError('Dice display recovered; starting a new round.');
  } else {
    store.setServiceError('Failed to recover the 3D dice. Please reload.');
  }
  recovering = false;
}

onMounted(() => {
  initializeService();
  if (typeof window !== 'undefined') {
    window.addEventListener(DICE_CONTEXT_LOST_EVENT, handleContextLost as EventListener);
  }
});

watch(
  () => configSnapshot(),
  (next) => {
    const service = getDiceService('#dice-box', next);
    service.updateConfig(next);
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(DICE_CONTEXT_LOST_EVENT, handleContextLost as EventListener);
  }
  store.detachDiceService();
  disposeDiceService();
});
</script>
