import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages alt yolda servis ediyor: https://<kullanici>.github.io/<repo>/
// Workflow build sirasinda BASE_PATH'i repo adiyla dolduruyor; yerelde kok yol yeterli.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kocis & Karicik Puan Programi',
        short_name: 'Puan Programi',
        description: 'Ev ici sadakat programi: kocis puani ve karicik puani biriktir, odul kazan.',
        lang: 'tr',
        dir: 'ltr',
        theme_color: '#f7b7c8',
        background_color: '#fdf6f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
