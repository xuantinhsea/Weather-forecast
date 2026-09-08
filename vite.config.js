import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative by default, so one build works wherever it lands: a domain root,
// a project subpath like GitHub Pages' /model-spread/, or dist/index.html
// opened straight off the disk. An absolute '/assets/...' resolves against
// the filesystem root in that last case, and the page comes up blank. A host
// that needs an absolute base can still set VITE_BASE_PATH.
//
// The manifest's scope/start_url below are derived from it either way — an
// installed app whose start_url sits outside its scope opens in a browser tab
// instead of standalone. Relative values there resolve against the manifest's
// own URL, which is the same answer without having to be told the path.
const base = process.env.VITE_BASE_PATH ?? './'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Model Spread — 16 forecast models',
        short_name: 'Model Spread',
        description: 'Sixteen forecast models side by side: where they agree, where they do not, and how far each one reaches.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f9f9f7',
        theme_color: '#1c5cab',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Map tiles and forecasts are the two things worth having when the
        // network is gone. Both are cached with a network-first strategy: a
        // live answer when there is signal, the last good one when there is
        // not — which is exactly the situation this app is for.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'forecast-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split the two heavy always-on libraries out of the app chunk so an
        // app edit doesn't invalidate them in installed users' caches.
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
})
