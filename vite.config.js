import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // The desktop build (npm run desktop) runs inside a native window, so it skips the service worker.
      disable: mode === 'desktop',
      registerType: 'prompt', // the app shows a "new version" toast instead of reloading mid-hand
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Hold’em',
        short_name: 'Hold’em',
        description: 'No-limit Texas Hold’em against computer players.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0F3E43',
        background_color: '#0B1415',
        categories: ['games'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // In server mode, `npm run dev` forwards API calls to the FastAPI server on port 8000.
    proxy: { '/api': 'http://localhost:8000' },
  },
}));
