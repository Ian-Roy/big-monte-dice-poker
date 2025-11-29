import { DiceService } from './DiceService';

let instance: DiceService | null = null;

export function getDiceService(containerSelector = '#dice-box') {
  if (!instance) {
    instance = new DiceService(containerSelector);
  }
  return instance;
}

export function disposeDiceService() {
  instance?.dispose();
  instance = null;
}
