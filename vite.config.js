import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const commitSha = (() => {
  // Cloudflare Pages sets this automatically
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
  // Local dev: read directly from .git without spawning a child process
  try {
    const head = readFileSync('.git/HEAD', 'utf-8').trim()
    if (head.startsWith('ref: ')) {
      return readFileSync(`.git/${head.slice(5)}`, 'utf-8').trim().slice(0, 7)
    }
    return head.slice(0, 7) // detached HEAD
  } catch { return 'dev' }
})()

export default defineConfig({
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache all built assets so the app shell loads fully offline
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PourLog',
        short_name: 'PourLog',
        description: 'Specialty coffee journal',
        theme_color: '#2c1810',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the app shell with StaleWhileRevalidate
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            // Supabase API — NetworkFirst so you always get fresh data when online,
            // but fall back to the last cached response when offline
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
