<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

import { getDiceService, disposeDiceService } from '../shared/diceServiceInstance';
import { useGameStore } from '../stores/gameStore';

const store = useGameStore();

onMounted(async () => {
  const service = getDiceService('#dice-box');
  try {
    await service.init();
    store.attachDiceService(service);
    service.startNewRound();
  } catch (err) {
    store.setServiceError((err as Error).message);
    console.error('[DiceServiceBridge] failed to init DiceService', err);
  }
});

onBeforeUnmount(() => {
  store.detachDiceService();
  disposeDiceService();
});
</script>
