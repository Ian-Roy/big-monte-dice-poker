import './style.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { setupInstallPrompt } from './pwa/InstallPrompt';
import { setupPWAUpdatePrompt } from './pwa/ServiceWorkerManager';
import { setupViewportSizing } from './shared/viewport';

setupViewportSizing();

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

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

setupInstallPrompt();

const enforcePortraitOrientation = async () => {
  const lock = screen.orientation?.lock;
  if (typeof lock !== 'function') {
    return;
  }

  try {
    await lock.call(screen.orientation, 'portrait');
  } catch (err) {
    console.info('Unable to lock screen orientation to portrait mode.', err);
  }
};

enforcePortraitOrientation();
