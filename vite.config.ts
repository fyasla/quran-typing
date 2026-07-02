import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'fonts/*.ttf'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,ttf,svg,png}'],
        // Les pages du Coran sont mises en cache à la demande
        runtimeCaching: [
          {
            urlPattern: /\/data\/pages\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-pages',
              expiration: { maxEntries: 700 },
            },
          },
        ],
      },
      manifest: {
        name: 'Quran Typing',
        short_name: 'QuranTyping',
        description: "Apprendre le saint Coran en le tapant au clavier",
        theme_color: '#1a1a2e',
        background_color: '#faf8f4',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
});
