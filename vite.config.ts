import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANT: Set this to your repo name for GitHub Pages, e.g. "/big-monte-dice-poker/"
const REPO_BASE = process.env.REPO_BASE || "/big-monte-dice-poker/";

export default defineConfig({
  base: REPO_BASE,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,woff2,png,svg,ogg,wav,mp3,json,wasm,jpg,jpeg}"
        ],
        navigateFallback: "index.html",
        clientsClaim: true,
        skipWaiting: false, // we'll prompt the user to reload
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Big Monte Dice Poker",
        short_name: "Big Monte Dice Poker",
        description: "Phaser 3 PWA dice poker game.",
        display: "standalone",
        background_color: "#0b1020",
        theme_color: "#0b1020",
        categories: ["games", "entertainment"],
        icons: [
          {
            src: "assets/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "assets/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
});
