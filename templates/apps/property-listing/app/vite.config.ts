/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import {
  moleculePushServiceWorkerPlugin,
  PUSH_SW_FILENAME,
} from '@molecule/app-vite-config-default'

import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
import { stripPreviewBridgePlugin } from './vite-preview-bridge-plugin.js'

// Discover @molecule/* packages to exclude from pre-bundling.
// Bond state uses module-level singletons — pre-bundling creates duplicate
// instances that break the bond system. They're pre-built (.js) so Vite
// just serves them directly with no transform overhead.
//
// An EMPTY node_modules/@molecule must NOT stop the walk: npm workspaces
// hoist @molecule/* to the workspace root, so intermediate projects (e.g. a
// smoke app under a monorepo) can hold an empty dir. Stopping there made the
// exclusion list empty, Vite pre-bundled the app-* packages that other
// chunks import externally, and the app crashed with "useI18nProvider must
// be used within an I18nProvider" — two module instances of @molecule/app-react
// (one inside the pre-bundle, one served to source files) means two React
// contexts and every useTranslation() call throws.
let moleculePackages: string[] = []
const findMoleculeDir = (): string | null => {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++) {
    try {
      const candidate = resolve(dir, 'node_modules/@molecule')
      if (readdirSync(candidate).length > 0) return candidate
      // empty @molecule dir — keep walking to the hoisting root
    } catch (_error) {
      /* keep walking — readdirSync throws until node_modules/@molecule is found */
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}
const moleculeDir = findMoleculeDir()
if (moleculeDir) {
  moleculePackages = readdirSync(moleculeDir).map((name) => `@molecule/${name}`)
}

// EXCEPTION: locale bond packages ARE pre-bundled. They are pure data
// (translation dictionaries — no bond singletons, so the duplicate-instance
// concern above does not apply), and each one eagerly re-exports ~81
// language modules. Served unbundled, a dev-mode first load fans out into
// thousands of individual module requests (~2,400 for this app) — slow
// everywhere, and inside the molecule.dev preview iframe (which loads
// alongside the IDE's own module traffic) it can exhaust the browser's
// request budget (net::ERR_INSUFFICIENT_RESOURCES), permanently failing the
// app's ES module graph. Pre-bundling collapses each locale package to a
// single chunk. Only this app's declared locale dependencies are included
// so Vite never optimizes packages the app doesn't use.
const isLocaleBondPackage = (name: string): boolean => name.startsWith('@molecule/app-locales-')
let localePackages: string[] = []
try {
  const appPkg = JSON.parse(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf-8'),
  ) as { dependencies?: Record<string, string> }
  localePackages = Object.keys(appPkg.dependencies ?? {}).filter(isLocaleBondPackage)
} catch (_error) {
  /* no readable package.json — keep every @molecule package excluded */
}

const pwaOptions = {
  registerType: 'prompt' as const,
  includeAssets: ['icons/*.svg', 'favicon.svg', 'og-image.svg'],
  manifest: {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    theme_color: BRAND_COLOR,
    background_color: '#ffffff',
    display: 'standalone' as const,
    start_url: '/',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  },
  workbox: {
    // In `prompt` mode the new worker activates when the update banner posts
    // SKIP_WAITING; without clientsClaim it never takes control of the open page,
    // so `controllerchange` never fires and the reload never happens — the banner
    // sticks on "Updating…". Claim clients so activation drives the one reload in
    // registerPWA.
    clientsClaim: true,
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    // Mirror of the shared config (@molecule/app-vite-config-default): pull
    // the push handler into the generated worker — generateSW ships no
    // 'push' listener, so a delivered web-push would display nothing.
    importScripts: [PUSH_SW_FILENAME],
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    // No runtime API caching. The old rule matched every /api/ request with
    // NetworkFirst, which tried to cache SSE/streaming GETs (EventSource,
    // text/event-stream) and threw "Cache.put() encountered a network error", and
    // parked authenticated API responses in shared cache. Let /api/ pass straight
    // through to the network.
    runtimeCaching: [],
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA(pwaOptions),
    moleculePushServiceWorkerPlugin(),
    stripPreviewBridgePlugin(),
  ],
  resolve: {
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router'],
  },
  optimizeDeps: {
    // Locale bond packages are pre-bundled (see above) — exclude wins over
    // include in Vite, so they must be filtered OUT of the exclusion list.
    exclude: moleculePackages.filter((name) => !isLocaleBondPackage(name)),
    include: [
      ...localePackages,
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3000'),
    // Bind to all interfaces so the dev server is reachable over LAN /
    // Tailscale (e.g. test from a phone). Honors VITE_HOST when set.
    host: process.env.VITE_HOST || '0.0.0.0',
    allowedHosts: true,
    open: true,
    fs: {
      strict: false,
    },
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_URL?.replace(/\/api$/, '') ||
          `http://localhost:${process.env.PORT || 4000}`,
        changeOrigin: true,
      },
      '/health': {
        target:
          process.env.VITE_API_URL?.replace(/\/api$/, '') ||
          `http://localhost:${process.env.PORT || 4000}`,
        changeOrigin: true,
      },
    },
    warmup: {
      clientFiles: ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  envPrefix: 'VITE_',
  test: {
    // Playwright owns e2e/ (playwright.config.ts → testDir './e2e'); its
    // *.spec.ts files match vitest's default include, so without this
    // `npm test` collects them and each fails with "Playwright Test did not
    // expect test.describe() to be called here". `exclude` REPLACES vitest's
    // defaults, so they are re-listed.
    exclude: [
      '@molecule/app-icons-molecule',
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/e2e/**',
    ],
  },
})
