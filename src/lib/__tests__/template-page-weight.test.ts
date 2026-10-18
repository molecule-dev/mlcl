/**
 * Guards the entry-chunk budget of every scaffold.
 *
 * A built scaffold used to download the framework plus every page, every
 * companion locale dictionary and the settings panel before it could paint —
 * 172 KB gzip in a fresh custom scaffold, 1.7 MB gzip in a flagship. These
 * assertions pin the fixes that move that weight out of the entry: lazy
 * companion-locale bonds, a service worker that precaches the shell instead of
 * the whole app, and — for the custom scaffold — NO route-level splitting.
 *
 * Route splitting was measured and rejected for the custom scaffold: its page
 * set is small, a `lazy()` page adds a serial chunk request, and React holds a
 * suspended commit for 300 ms after it has shown a fallback, so cold TTI rose
 * 402 → 688 ms and warm navigation 372 → 512 ms at 150 ms RTT. Every route can
 * be the first paint of a full document load, so none of them can be split.
 * The flagship templates keep splitting: their entry was 1.8 MB gzip before.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const APP_TEMPLATES = join(ROOT, 'templates', 'app')
const FLAGSHIPS = join(ROOT, 'templates', 'apps')

const read = (...parts: string[]): string => readFileSync(join(APP_TEMPLATES, ...parts), 'utf8')
const flagshipApps = (): string[] => readdirSync(FLAGSHIPS).sort()

describe('custom scaffold: pages are imported statically (splitting measured slower)', () => {
  it('imports every page statically — no lazy() route, no route Suspense boundary', () => {
    const app = read('react', 'App.tsx.tpl')
    for (const page of [
      'About',
      'ForgotPassword',
      'Home',
      'Login',
      'PlanUpdated',
      'ResetPassword',
      'Signup',
    ]) {
      expect(app).toMatch(new RegExp(`^import \\{ ${page} \\} from '\\./pages/${page}\\.js'$`, 'm'))
      expect(app).not.toContain(`const ${page} = lazy(`)
    }
    // A lazy route is what re-introduces React's 300 ms Suspense-fallback
    // throttle on a full page load: no lazy() declaration and no route
    // Suspense boundary (the comment above the code may still name both).
    expect(app).not.toMatch(/= lazy\(/)
    expect(app).not.toMatch(/import\('\.\/pages\//)
    expect(app).not.toContain('<Suspense')
  })

  it('documents the measured decision beside the static imports', () => {
    // The next agent to add a page must find the reason, not just the shape.
    const app = read('react', 'App.tsx.tpl')
    expect(app).toContain('measured decision')
    expect(app).toContain('SUSPENSE_FALLBACK_THROTTLE')
  })

  it('loads the settings panel only when the drawer opens', () => {
    const menu = read('react', 'components', 'UserMenu.tsx.tpl')
    expect(menu).not.toContain("import { SettingsPanel } from './SettingsPanel.js'")
    expect(menu).toContain('const SettingsPanel = lazy(')
    expect(menu).toContain("import('./SettingsPanel.js')")
    expect(menu).toContain('<Suspense fallback={null}>')
  })

  it('precaches the shell, not every emitted chunk', () => {
    const vite = read('shared', 'vite.config.ts.tpl')
    expect(vite).toContain(
      "globPatterns: ['**/*.{html,ico,png,svg}', 'assets/index-*.js', 'assets/index-*.css']",
    )
    expect(vite).not.toContain("globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']")
  })

  it('loads webfonts without blocking the first paint', () => {
    const html = read('shared', 'index.html.tpl')
    expect(html).toContain('rel="preload" as="style"')
    expect(html).toContain("this.onload=null;this.rel='stylesheet'")
    expect(html).toContain('<noscript>')
    // A bare stylesheet link to the font host is render-blocking; the only
    // ones left must be inside the <noscript> fallback.
    const withoutNoScript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    expect(withoutNoScript).not.toMatch(
      /<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*rel="stylesheet"/,
    )
  })
})

describe('flagship templates: the router splits every page', () => {
  it('every flagship App.tsx uses lazy() for its pages and no static page import', () => {
    const offenders: string[] = []
    for (const app of flagshipApps()) {
      const file = join(FLAGSHIPS, app, 'app', 'src', 'App.tsx')
      let source: string
      try {
        source = readFileSync(file, 'utf8')
      } catch (_error) {
        continue // app without a React App.tsx (non-React template)
      }
      if (/^import \{ \w+ \} from '\.\/pages\//m.test(source))
        offenders.push(`${app}: static page import`)
      if (!source.includes('<Suspense')) offenders.push(`${app}: no Suspense boundary`)
      // An aliased page import (`import { Routes as RoutesPage }`) must keep
      // the exported name on the right of the import and the local name on
      // the left; a naive split emits invalid JS.
      if (/^const \w+ as /m.test(source)) offenders.push(`${app}: malformed lazy declaration`)
      if (!/const \w+ = lazy\(\(\) => import\('\.\/pages\//.test(source)) {
        offenders.push(`${app}: no lazy page`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('every flagship analytics bond loads the PostHog SDK on demand', () => {
    // posthog-js is ~230 KB of source. A static provider import put it in the
    // entry chunk of every page load, in apps that never configured a key.
    const offenders: string[] = []
    for (const app of flagshipApps()) {
      const bondFile = join(FLAGSHIPS, app, 'app', 'src', 'bonds', 'app-analytics.ts')
      let bond: string
      try {
        bond = readFileSync(bondFile, 'utf8')
      } catch (_error) {
        continue
      }
      if (/^import \{[^}]*\} from '@molecule\/app-analytics-posthog'/m.test(bond)) {
        offenders.push(`${app}: static posthog provider import`)
      }
      if (!/await import\('@molecule\/app-analytics-posthog'\)/.test(bond)) {
        offenders.push(`${app}: provider not dynamically imported`)
      }
      if (!/export async function setupAppAnalytics\(\): Promise<void>/.test(bond)) {
        offenders.push(`${app}: setupAppAnalytics is not async`)
      }
      const indexFile = join(FLAGSHIPS, app, 'app', 'src', 'bonds', 'index.ts')
      const index = readFileSync(indexFile, 'utf8')
      if (!/await setupAppAnalytics\(\)/.test(index)) {
        offenders.push(`${app}: setupProviders does not await analytics`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('every flagship i18n bond loads companion bonds lazily, never through the barrel', () => {
    const offenders: string[] = []
    for (const app of flagshipApps()) {
      const file = join(FLAGSHIPS, app, 'app', 'src', 'bonds', 'i18n-default.ts')
      let source: string
      try {
        source = readFileSync(file, 'utf8')
      } catch (_error) {
        continue
      }
      // A star import re-exports all ~79 language dictionaries.
      if (/^import \* as \w+ from '@molecule\/app-locales-/m.test(source)) {
        offenders.push(`${app}: star-imports a locale bond`)
      }
      if (/packageLocales:/.test(source) && !/packageLocaleLoaders:/.test(source)) {
        offenders.push(`${app}: still registers packageLocales eagerly`)
      }
      const importLines = source.split('\n').filter((line) => /^import /.test(line))
      for (const line of importLines)
        for (const m of line.matchAll(/from '@molecule\/app-locales-([^/']+)(?:\/loader\.js)?'/g)) {
          if (!m[0].includes('/loader.js'))
            offenders.push(`${app}: ${m[1]} imported without /loader.js`)
        }
    }
    expect(offenders).toEqual([])
  })
})
