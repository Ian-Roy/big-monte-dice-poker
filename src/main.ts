import './style.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { setupInstallPrompt } from './pwa/InstallPrompt';
import { setupPWAUpdatePrompt } from './pwa/ServiceWorkerManager';

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
