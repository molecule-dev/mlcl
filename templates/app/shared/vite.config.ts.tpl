/// <reference types="vitest/config" />
import type { IncomingMessage } from 'node:http'
import { createRequire } from 'node:module'
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
{{TAILWIND_IMPORT}}import { VitePWA } from 'vite-plugin-pwa'
{{VITE_PLUGIN_IMPORT}}import { APP_NAME, APP_DESCRIPTION, BRAND_COLOR } from '{{BRANDING_IMPORT}}'
import { stripPreviewBridgePlugin } from './vite-preview-bridge-plugin.js'

// Discover @molecule/* packages to exclude from pre-bundling.
// Bond state uses module-level singletons — pre-bundling creates duplicate
// instances that break the bond system. They're pre-built (.js) so Vite
// just serves them directly with no transform overhead.
//
// npm workspaces hoist @molecule/* to the workspace-root node_modules, so
// `node_modules/@molecule` doesn't exist next to this config. Walk up the
// directory tree from this file until we find one — that way the exclusion
// list is non-empty and bond singletons survive a pre-bundle.
let moleculePackages: string[] = []
// CJS deps that individual @molecule/* packages declare (via their package.json
// `molecule.viteOptimizeInclude`) must be force-included so Vite pre-bundles them
// with proper CJS→ESM interop. Otherwise an excluded @molecule package's
// `import X from 'cjs-lib'` throws a runtime "does not provide an export named
// 'default'" and white-screens the app (e.g. @molecule/app-rich-text-quill →
// quill → quill-delta). Same source of truth as the flagship config
// (@molecule/app-vite-config-default): the declaration lives on the OWNING
// package, so the fix ships with the dep and is never hardcoded here.
const declaredOptimizeIncludes: string[] = []
// Resolves optimizeDeps.include specifiers against this app's node_modules so
// only installed ones are force-included (an unresolvable entry makes vite
// re-scan endlessly — see the include filter below).
const optimizeResolver = createRequire(import.meta.url)
// `react`/`react-dom` pinned to the one copy this app resolves: an install
// inside the app otherwise leaves a second React beside the one the @molecule
// packages resolve, and the preview goes blank with "Invalid hook call"
// (`dedupe` alone did not prevent it).
const singleReactAliases: Record<string, string> = {}
for (const name of ['react', 'react-dom']) {
  try {
    singleReactAliases[name] = dirname(optimizeResolver.resolve(`${name}/package.json`))
  } catch (_error) {
    // Not installed for this app (a non-React framework): nothing to pin.
  }
}
const findMoleculeDir = (): string | null => {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++) {
    try {
      const candidate = resolve(dir, 'node_modules/@molecule')
      // An EMPTY @molecule dir (npm-workspaces hoisting) must NOT stop the walk —
      // optimizing against it yields a second module identity for every
      // @molecule/app-react-dependent package (duplicate React contexts, crash).
      if (readdirSync(candidate).length > 0)
      return candidate
    } catch (_error) {
      /* keep walking */
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}
const moleculeDir = findMoleculeDir()
if (moleculeDir) {
  const names = readdirSync(moleculeDir)
  moleculePackages = names.map((name) => `@molecule/${name}`)
  const seen = new Set<string>()
  for (const name of names) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(moleculeDir, name, 'package.json'), 'utf8')) as {
        molecule?: { viteOptimizeInclude?: string[] }
      }
      for (const dep of pkg.molecule?.viteOptimizeInclude ?? []) {
        if (typeof dep === 'string' && !seen.has(dep)) {
          seen.add(dep)
          declaredOptimizeIncludes.push(dep)
        }
      }
    } catch (_error) {
      /* package without a readable package.json or molecule field — skip */
    }
  }
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
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    // No runtime API caching. The old rule matched every /api/ request with
    // NetworkFirst, which tried to cache SSE/streaming GETs (EventSource,
    // text/event-stream) and threw "Cache.put() encountered a network error", and
    // parked authenticated API responses in shared cache. Let /api/ pass straight
    // through to the network.
    runtimeCaching: [],
  },
}

// Dev-only middleware: the live-preview bridge (index.html) POSTs the running
// app's console output to /__molecule_log; append it to /tmp/browser.log so the
// molecule IDE's AI agent can read it via its read_logs tool. No-op in a build.
//
// The sink feeds the AI executor, so a foreign page must not be able to append
// attacker-chosen lines into it (persistent prompt-injection / log poisoning).
// Gate by Origin: allow requests with no Origin header (non-browser clients),
// requests whose Origin host equals the request's own Host (the framed app
// itself — localhost or any sandbox preview host, any port), or the molecule
// IDE preview proxy origin; everything else gets a 403.
const isOwnPreviewOrigin = (req: IncomingMessage): boolean => {
  const rawOrigin = req.headers.origin
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin
  if (!origin) return true
  let originHost: string
  try {
    originHost = new URL(origin).hostname
  } catch (_error) {
    return false // malformed / opaque ("null") Origin — fail closed
  }
  const ownHost = String(req.headers.host ?? '')
    .replace(/:\d+$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
  return (
    originHost === ownHost ||
    originHost === 'localhost' ||
    originHost === '127.0.0.1' ||
    originHost === '::1' ||
    originHost.endsWith('.preview.molecule.dev')
  )
}

const previewConsoleLogPlugin: Plugin = {
  name: 'molecule-preview-console-log',
  apply: 'serve',
  configureServer(server) {
    const LOG = '/tmp/browser.log'
    const MAX_BYTES = 512 * 1024
    server.middlewares.use('/__molecule_log', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end()
        return
      }
      if (!isOwnPreviewOrigin(req)) {
        res.statusCode = 403
        res.end()
        return
      }
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 1_000_000) req.destroy()
      })
      req.on('end', () => {
        try {
          const entries = JSON.parse(body) as Array<{ l?: string; m?: string; t?: number }>
          const lines =
            entries
              .map(
                (e) =>
                  `[${new Date(e.t || Date.now()).toISOString()}] [${e.l || 'log'}] ${e.m || ''}`,
              )
              .join('\n') + '\n'
          appendFileSync(LOG, lines)
          // Keep only the tail if the file outgrows the cap (a render loop can spam).
          const size = statSync(LOG).size
          if (size > MAX_BYTES) writeFileSync(LOG, readFileSync(LOG).subarray(size - MAX_BYTES))
        } catch (_error) {
          /* ignore malformed batches */
        }
        res.statusCode = 204
        res.end()
      })
    })
  },
}

// ── Dev-server watcher: poll the app tree in a molecule sandbox ──
//
// chokidar's inotify watch is pinned to the INODE of each directory it walks. Replace a
// directory inside the served tree (`rm -rf src` + recreate — a restore, a checkout, a tool
// that rewrites a tree, and in a sandbox the platform's own operations) and that watch
// points at a dead inode: edits, touches and new files then produce NO event, chokidar
// reports NO error, and it never re-arms — the dev server keeps serving the modules it
// transformed before the swap while the files on disk are current, and nothing in its log
// says so (reproduced against vite 8.1.5, 2026-10-16; X1 flash-m79 lost 3.5 minutes and a
// 1.6-minute Playwright run to it). A stat-based polling watcher has no inode to lose, so in
// a sandbox it is the correct trade: the tree walked is the app's own source, with
// `node_modules`, `.git`, `dist` and `test-results` excluded. `/etc/mol` exists in every
// molecule sandbox; `VITE_WATCH_POLLING=0|1` overrides either way.
const watchPolling =
  process.env.VITE_WATCH_POLLING === undefined
    ? existsSync('/etc/mol')
    : process.env.VITE_WATCH_POLLING !== '0' && process.env.VITE_WATCH_POLLING !== 'false'

export default defineConfig({
  plugins: [{{VITE_PLUGINS}}, previewConsoleLogPlugin, stripPreviewBridgePlugin()],{{RESOLVE_EXTENSIONS}}
  resolve: {
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router'],
    alias: singleReactAliases,
  },
  optimizeDeps: {
    exclude: moleculePackages,
    // CJS-only transitive deps that ESM importers (i18next, etc.) pull
    // in. Vite's auto-discovery sometimes misses these inside excluded
    // workspace packages, surfacing as "does not provide an export
    // named 'default'" runtime errors. Force-include them so vite
    // pre-bundles with proper CJS→ESM interop.
    //
    // FILTERED to specifiers that actually resolve: an entry here that is NOT
    // installed (e.g. `html-parse-stringify` when the app pulls in no i18n
    // path that needs it) makes vite log "Failed to resolve dependency … present in
    // optimizeDeps.include" and re-scan on every client discovery, which can
    // briefly drop the dev server mid-reoptimize. Only list what is present,
    // so the set self-adapts to each app's real dependency tree.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'html-parse-stringify',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
      // Per-package CJS deps aggregated from each @molecule/* package's
      // `molecule.viteOptimizeInclude` (see the discovery walk above).
      ...declaredOptimizeIncludes,
    ].filter((spec) => {
      try {
        optimizeResolver.resolve(spec)
        return true
      } catch (_error) {
        return false
      }
    }),
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3000'),
    // Allow the platform preview hosts to reach this dev server. Vite blocks any
    // request whose Host header is not an IP or in `allowedHosts` — so a sandbox
    // served at `https://<token>.mlcl.dev`, `https://<id>.e2b.app`,
    // `https://<app>.fly.dev` or `https://<sprite>.sprites.app` is rejected with
    // "This host is not allowed" and the preview iframe never loads
    // (localhost/127.0.0.1 work because Vite always allows IP hosts). The list
    // must cover EVERY sandbox provider's preview domain: it only surfaces when a
    // request arrives with that provider's Host header, which is exactly what a
    // hibernation wake does (the executor's own checks hit localhost, so a
    // missing domain here 403'd the E2B preview only after resume). Override
    // with a comma-separated `VITE_ALLOWED_HOSTS` for custom domains.
    allowedHosts: (
      process.env.VITE_ALLOWED_HOSTS || '.mlcl.dev,.e2b.app,.fly.dev,.sprites.app'
    ).split(','),
    // Origin-isolate this app so a buggy/looping build can't freeze the IDE that
    // previews it. The IDE and this dev server are the same site (localhost),
    // which by default puts them in the SAME browser renderer thread — so an
    // infinite loop or runaway render in this app (routine for in-progress code)
    // would block the entire IDE. `Origin-Agent-Cluster: ?1` gives this origin its
    // own agent cluster (separate event loop), isolating the app's main thread
    // from the IDE's. Harmless when the app runs standalone.
    headers: { 'Origin-Agent-Cluster': '?1' },
    // `open: true` auto-launches the OS default browser. Set
    // `VITE_OPEN=false` (or `BROWSER=none`) to suppress that — required
    // for CI, E2E, and any automation context.
    open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
    fs: {
      strict: false,
    },
    // Sandbox-only: a replaced directory cannot kill a stat-based watcher (see above).
    ...(watchPolling ? { watch: { usePolling: true, interval: 500, binaryInterval: 1000 } } : {}),
    proxy: {
      // Proxy target precedence: explicit VITE_API_URL > $PORT (the API
      // server's listen port, set by `npm run dev` so api + proxy line up
      // even when PORT is overridden for parallel multi-app smoke runs)
      // > 4000 default. Avoids hard-coding 4000 which silently breaks any
      // setup where the api binds to a non-default port.
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
      // Socket.io realtime shares the API's HTTP server at /socket.io/ (the
      // realtime bond attaches there). `ws: true` forwards the WebSocket upgrade
      // so realtime works through the dev server / sandbox preview — without it
      // the client's /socket.io connection 404s and messages never deliver.
      '/socket.io': {
        target:
          process.env.VITE_API_URL?.replace(/\/api$/, '') ||
          `http://localhost:${process.env.PORT || 4000}`,
        changeOrigin: true,
        ws: true,
      },
    },
    warmup: {
      clientFiles: ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts'],
    },
  },
  preview: {
    // `vite preview` serves the production build (a prod-ish instance the IDE may
    // also frame). Mirror the dev server's origin isolation so a buggy/looping
    // build can't freeze the IDE that previews it: `Origin-Agent-Cluster: ?1` gives
    // this origin its own agent cluster (separate event loop). Must be set on EVERY
    // served-preview path — an origin with an inconsistent OAC value is ignored by
    // the browser. Harmless when the app runs standalone.
    headers: { 'Origin-Agent-Cluster': '?1' },
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
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/e2e/**'],
  },
})
