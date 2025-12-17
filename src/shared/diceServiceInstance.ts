import { DiceService, type DiceServiceConfig } from './DiceService';

let instance: DiceService | null = null;

export function getDiceService(containerSelector = '#dice-box', config?: DiceServiceConfig) {
  if (!instance) {
    instance = new DiceService(containerSelector, config);
  } else if (config) {
    instance.updateConfig(config);
  }
  return instance;
}

export function disposeDiceService() {
  instance?.dispose();
  instance = null;
}
