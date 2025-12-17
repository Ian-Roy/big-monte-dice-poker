import './style.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { initPwaState } from './pwa/pwaState';
import { setupViewportSizing } from './shared/viewport';

setupViewportSizing();

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

initPwaState();

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
