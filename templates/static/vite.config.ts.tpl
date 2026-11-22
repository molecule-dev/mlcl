/// <reference types="vitest/config" />
import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
{{TAILWIND_IMPORT}}{{VITE_PLUGIN_IMPORT}}import { stripPreviewBridgePlugin } from '@molecule/app-e2e-preview/vite'

import { staticSitePlugin } from './vite-static-site-plugin.js'

// ---------------------------------------------------------------------------
// STATIC SITE — this project has no API and no database. `npm run dev` serves
// the site with Vite (live reload); `npm run build` writes `dist/`: one
// `index.html` per route, prerendered in Node by scripts/prerender.mjs, plus
// every file `getStaticFiles()` in src/entry-server.tsx publishes. Deploy
// `dist/` to any static host.
//
// BASE_PATH — set it when the site is served from a sub-path (GitHub Pages
// project sites: `BASE_PATH=/my-repo npm run build`). Every link, asset, feed
// and JSON URL goes through `withBase()` in src/site.ts, which reads the value
// Vite exposes as `import.meta.env.BASE_URL`; never hardcode a leading `/`.
// ---------------------------------------------------------------------------
const normalizeBase = (raw: string | undefined): string => {
  const trimmed = (raw ?? '/').trim()
  if (!trimmed || trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`
}
const BASE_PATH = normalizeBase(process.env.BASE_PATH)

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
// with proper CJS→ESM interop. The declaration lives on the OWNING package, so
// the fix ships with the dep and is never hardcoded here.
const declaredOptimizeIncludes: string[] = []
const optimizeResolver = createRequire(import.meta.url)
const findMoleculeDir = (): string | null => {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++) {
    try {
      const candidate = resolve(dir, 'node_modules/@molecule')
      readdirSync(candidate)
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

// Locale bond packages ARE pre-bundled: they are pure data (no bond
// singletons) and each eagerly re-exports ~81 language modules, so served
// unbundled a dev first load fans out into thousands of module requests.
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

// ── Dev-server watcher: poll the site tree in a molecule sandbox ──
//
// chokidar's inotify watch is pinned to the INODE of each directory it walks. Replace a
// directory inside the served tree (`rm -rf src` + recreate — a restore, a checkout, a tool
// that rewrites a tree, and in a sandbox the platform's own operations) and that watch
// points at a dead inode: edits, touches and new files then produce NO event, chokidar
// reports NO error, and it never re-arms — the dev server keeps serving the modules it
// transformed before the swap while the files on disk are current, with nothing in its log
// to say so (reproduced against vite 8.1.5, 2026-10-16; flash-m79 lost 3.5 minutes and a
// 1.6-minute run to it). A stat-based polling watcher has no inode to lose, and the tree it
// walks is the site's own source, with `node_modules`, `.git`, `dist` and `test-results`
// excluded. `/etc/mol` exists in every molecule sandbox; `VITE_WATCH_POLLING=0|1` overrides
// either way.
const watchPolling =
  process.env.VITE_WATCH_POLLING === undefined
    ? existsSync('/etc/mol')
    : process.env.VITE_WATCH_POLLING !== '0' && process.env.VITE_WATCH_POLLING !== 'false'

export default defineConfig(({ command }) => ({
  base: BASE_PATH,
{{VITE_PLUGINS}}{{RESOLVE_EXTENSIONS}}
  resolve: {
    preserveSymlinks: true,
    // One module identity per @molecule package, whichever install path an
    // importer reaches it through — two identities would mean two bond
    // registries. Dedupe resolves each listed package from the project root
    // through Vite's normal package resolution, so exports maps, conditions
    // and subpaths still apply (an alias that rewrites a specifier to a
    // directory would bypass them).
    dedupe: ['react', 'react-dom', 'react-router', ...moleculePackages],
  },
  optimizeDeps: {
    exclude: moleculePackages.filter((name) => !isLocaleBondPackage(name)),
    include: [
      ...localePackages,
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'void-elements',
      'html-parse-stringify',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
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
    allowedHosts: (
      process.env.VITE_ALLOWED_HOSTS || '.mlcl.dev,.e2b.app,.fly.dev,.sprites.app'
    ).split(','),
    headers: { 'Origin-Agent-Cluster': '?1' },
    open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
    fs: {
      strict: false,
    },
    // Sandbox-only: a replaced directory cannot kill a stat-based watcher (see the
    // watcher-hardening block above `export default`).
    ...(watchPolling ? { watch: { usePolling: true, interval: 500, binaryInterval: 1000 } } : {}),
    warmup: {
      clientFiles: ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts'],
    },
  },
  preview: {
    headers: { 'Origin-Agent-Cluster': '?1' },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  ssr: {
    // The prerender (scripts/prerender.mjs) bundles src/entry-server.tsx with
    // this config. At BUILD time, bundle EVERY dependency into that one file
    // rather than leaving any external: an external is resolved by Node at
    // run time from wherever it happens to be installed, and in a workspace
    // with more than one physical `react` (a nested install, a linked
    // package) two modules can end up with two React copies — which breaks
    // every hook ("Cannot read properties of null (reading 'useContext')").
    // Bundled, everything resolves through `resolve.dedupe` above — one
    // React, same as the browser — whatever the install topology. Node
    // built-ins stay external.
    //
    // In DEV the static-site plugin loads the same entry through Vite's SSR
    // module runner, which cannot inline CommonJS (`require is not defined`
    // from react-dom/server) — so dependencies stay external there, the
    // default. The dev path only calls `getStaticFiles()`, which renders no
    // React, so the copy count does not matter to it.
    noExternal: command === 'build' ? true : undefined,
  },
  envPrefix: 'VITE_',
  test: {
    // Linked Molecule packages must resolve React through this app's dedupe
    // configuration in tests too, including the real server-rendering tests.
    server: { deps: { inline: [/@molecule\//] } },
    // Playwright owns e2e/ (playwright.config.ts → testDir './e2e'); its
    // *.spec.ts files match vitest's default include, so without this
    // `npm test` collects them and each fails with "Playwright Test did not
    // expect test.describe() to be called here". `exclude` REPLACES vitest's
    // defaults, so they are re-listed.
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/e2e/**'],
  },
}))
