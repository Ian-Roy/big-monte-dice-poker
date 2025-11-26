import './style.css';
import Phaser from 'phaser';
import DiceBox from '@3d-dice/dice-box';
import { phaserConfig } from './phaser.config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainScene } from './scenes/MainScene';
import { setupPWAUpdatePrompt } from './pwa/ServiceWorkerManager';
import { setupInstallPrompt } from './pwa/InstallPrompt';

type DiceGameConfig = Phaser.Types.Core.GameConfig & { diceBox?: DiceBox };

async function boot() {
  // Initialize Dice-Box in its own HTML container so the scene can request rolls
  let diceBox: DiceBox | undefined;
  try {
    diceBox = new DiceBox({
      assetPath: `${import.meta.env.BASE_URL}assets/dice-box/`,
      container: '#dice-box',
      id: 'dice-canvas',
      scale: 5,
      gravity: 1
    });
    await diceBox.init();
  } catch (err) {
    console.error('Failed to initialize Dice-Box', err);
  }

  const config: DiceGameConfig = {
    ...phaserConfig,
    scene: [BootScene, PreloadScene, MainScene],
    diceBox
  };

  // Launch game
  const game = new Phaser.Game(config);
}

boot().catch((err) => console.error('Failed to bootstrap game', err));

// PWA: set up update prompt when a new SW is available
setupPWAUpdatePrompt(() => {
  const el = document.createElement('div');
  el.className = 'update-toast';
  el.innerHTML = `
    <div class="update-toast__card">
      <div>Update available</div>
      <button class="update-toast__btn" id="reload">Reload</button>
    </div>`;
  document.body.appendChild(el);
  document.getElementById('reload')?.addEventListener('click', () => {
    location.reload();
  });
});

// PWA: show install prompt UI when supported
setupInstallPrompt();
