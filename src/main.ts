import './style.css';
import Phaser from 'phaser';
import { phaserConfig } from './phaser.config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainScene } from './scenes/MainScene';
import { setupPWAUpdatePrompt } from './pwa/ServiceWorkerManager';
import { setupInstallPrompt } from './pwa/InstallPrompt';

async function boot() {
  const config: Phaser.Types.Core.GameConfig = {
    ...phaserConfig,
    scene: [BootScene, PreloadScene, MainScene]
  };

  // Launch game
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
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
