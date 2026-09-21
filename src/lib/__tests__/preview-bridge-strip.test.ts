/**
 * A production build must ship NO preview bridge.
 *
 * Every scaffolded app carries `vite-preview-bridge-plugin.ts`, whose whole job
 * is to strip the molecule preview plumbing from `vite build` output: inline
 * `<script>`s that `postMessage` runtime diagnostics to `window.parent` with `'*'`
 * as the target origin, and — for the interact bridge — accept commands that
 * click and fill the page. A deployed app can be framed by anyone, so every one
 * of those blocks is an information-disclosure surface in production.
 *
 * The plugin used to name the bridges it stripped, one literal per bridge. That
 * list fell behind the injectors: `mol:runtime-bridge` (~5 KB) and
 * `mol:interact-bridge` (~28 KB) were added to `scaffold.ts` and never added
 * here, so every built page in the fleet shipped both — ~33 KB of live
 * diagnostics per page, the exact disclosure the plugin's own header says it
 * prevents.
 *
 * So this suite asserts the property, not the list: it builds the document a
 * REAL scaffold produces — the shipped `index.html.tpl` with every injector in
 * `scaffold.ts` run over it — and requires that the shipped plugin leaves no
 * bridge sentinel, no `postMessage`, and no `molecule:*` protocol name behind.
 * The sentinels it checks are DISCOVERED from `scaffold.ts`, so the next bridge
 * is covered on the day it is written, with no edit to this file.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  injectPreviewInteractBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const MLCL_ROOT = join(HERE, '..', '..', '..')
const TEMPLATES = join(MLCL_ROOT, 'templates')
const PLUGIN_TPL = join(TEMPLATES, 'app', 'shared', 'vite-preview-bridge-plugin.ts.tpl')
const SCAFFOLD_SRC = join(MLCL_ROOT, 'src', 'lib', 'scaffold.ts')

/** The strip entry point, loaded from the SHIPPED template rather than a copy. */
let stripPreviewBridges: (html: string) => string
/** The index.html a real scaffold produces, with every bridge injected. */
let scaffoldedHtml = ''
let dir = ''

/**
 * Load the shipped `.tpl` as a module.
 *
 * The template is what users get, so the test must run THAT file — not a
 * re-implementation. Its two imports (`vite` for a type, `@molecule/app-e2e-preview`
 * for the sibling plugin) are irrelevant to stripping and are stubbed out; the
 * replacements are asserted, so a change to the template's import shape fails
 * here instead of silently testing nothing.
 *
 * @param outDir - Directory to write the transpiled module into.
 * @returns The template module's `stripPreviewBridges`.
 */
const loadShippedPlugin = async (outDir: string): Promise<(html: string) => string> => {
  const source = await readFile(PLUGIN_TPL, 'utf8')

  const viteImport = "import type { Plugin } from 'vite'\n"
  const e2eImport = "import { molE2EPreviewPlugin } from '@molecule/app-e2e-preview/vite'\n"
  expect(source, 'template still imports the vite Plugin type').toContain(viteImport)
  expect(source, 'template still imports the e2e preview plugin').toContain(e2eImport)

  const stubbed = source
    .replace(viteImport, 'type Plugin = Record<string, unknown>\n')
    .replace(e2eImport, 'const molE2EPreviewPlugin = (): Plugin => ({ name: "stub" })\n')

  const js = ts.transpileModule(stubbed, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const modulePath = join(outDir, 'strip-plugin.mjs')
  await writeFile(modulePath, js)

  const mod = (await import(pathToFileURL(modulePath).href)) as {
    stripPreviewBridges?: (html: string) => string
  }
  expect(typeof mod.stripPreviewBridges, 'template exports stripPreviewBridges').toBe('function')
  return mod.stripPreviewBridges as (html: string) => string
}

/**
 * Every preview sentinel `scaffold.ts` injects, read out of its source.
 *
 * Discovery, not a list: a bridge added to the scaffolder enters this set
 * automatically, so the strip can never quietly fall behind again.
 *
 * @param scaffoldSource - The text of `src/lib/scaffold.ts`.
 * @returns The sentinel names (e.g. `mol:nav-bridge`), deduplicated.
 */
const sentinelsInjectedByScaffold = (scaffoldSource: string): string[] => [
  ...new Set(
    [...scaffoldSource.matchAll(/<!--\s*(mol:[a-z0-9-]+-(?:bridge|shim))(?::start)?\s*-->/g)].map(
      (m) => m[1],
    ),
  ),
]

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-strip-test-'))
  stripPreviewBridges = await loadShippedPlugin(dir)

  // The real scaffolded entry document: the shipped index.html template with its
  // placeholders filled, then every injector run over it exactly as `mlcl create` does.
  const htmlPath = join(dir, 'index.html')
  const template = await readFile(join(TEMPLATES, 'app', 'shared', 'index.html.tpl'), 'utf8')
  await writeFile(
    htmlPath,
    template
      .replace(/\{\{PROJECT_NAME\}\}/g, 'Demo')
      .replace(/\{\{APP_DESCRIPTION\}\}/g, 'A demo app')
      .replace(/\{\{BRAND_COLOR\}\}/g, '#4070e0')
      .replace(/\{\{FONT_LINKS\}\}/g, '')
      .replace(/\{\{ROOT_ELEMENT\}\}/g, '<div id="root"></div>')
      .replace(/\{\{MAIN_ENTRY\}\}/g, '/src/main.tsx'),
  )
  for (const inject of [
    injectPreviewNavBridge,
    injectPreviewSnapshotBridge,
    injectPreviewRuntimeBridge,
    injectPreviewInteractBridge,
  ]) {
    expect(await inject(htmlPath), `${inject.name} injected its bridge`).toBe(true)
  }
  scaffoldedHtml = await readFile(htmlPath, 'utf8')
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('vite-preview-bridge-plugin — strips every bridge from a build', () => {
  it('starts from a document that really does carry every bridge', async () => {
    const injected = sentinelsInjectedByScaffold(await readFile(SCAFFOLD_SRC, 'utf8'))

    // Guard the guard: if this list ever comes back empty the suite proves nothing.
    expect(injected.length).toBeGreaterThanOrEqual(4)
    for (const sentinel of injected) {
      expect(scaffoldedHtml, `fixture carries ${sentinel}`).toContain(`<!-- ${sentinel} -->`)
    }
    expect(scaffoldedHtml).toContain('<!-- mol:preview-bridge:start -->')
  })

  it('leaves no bridge sentinel behind — including ones added after this test', async () => {
    const stripped = stripPreviewBridges(scaffoldedHtml)

    for (const sentinel of sentinelsInjectedByScaffold(await readFile(SCAFFOLD_SRC, 'utf8'))) {
      expect(stripped, `${sentinel} survived the build`).not.toContain(sentinel)
    }
    expect(stripped).not.toContain('mol:preview-bridge')
    // Nothing named `mol:<x>-bridge` at all, however it was spelled.
    expect(stripped).not.toMatch(/mol:[a-z0-9-]*-(?:bridge|shim)/)
  })

  it('leaves no executable bridge code — no postMessage, no molecule:* protocol', () => {
    const stripped = stripPreviewBridges(scaffoldedHtml)
    // The template's own prose comment explains where the bridges come from, so
    // the protocol check reads the markup a browser would EXECUTE, not the prose.
    const markup = stripped.replace(/<!--[\s\S]*?-->/g, '')

    expect(stripped).not.toContain('postMessage')
    expect(stripped).not.toContain('window.parent')
    expect(markup).not.toMatch(/molecule:[a-z-]+/)
    expect(stripped).not.toContain('__molecule_log')
    // Only the app's own module entry may remain.
    expect(stripped.match(/<script/g) ?? []).toHaveLength(1)
    expect(stripped).toContain('<script type="module" src="/src/main.tsx"></script>')
  })

  it('keeps everything that is not preview plumbing', () => {
    const stripped = stripPreviewBridges(scaffoldedHtml)

    expect(stripped).toContain('<div id="root"></div>')
    expect(stripped).toContain('<title>Demo</title>')
    // `mol:` markers that are NOT bridges must survive untouched.
    expect(stripped).toContain('<!-- mol:design-resources -->')
    expect(stripped).toContain('<!-- /mol:design-resources -->')
    expect(stripped).toContain('Material+Symbols+Outlined')
    expect(stripped).toContain('</body>')
    expect(stripped).toContain('</html>')
  })

  it('strips a bridge whose name this plugin has never heard of', () => {
    const html = [
      '<!doctype html>',
      '<html><body>',
      '<div id="root"></div>',
      '    <!-- mol:telemetry-bridge -->',
      '    <script>',
      "      window.parent.postMessage({ type: 'molecule:whatever' }, '*');",
      '    </script>',
      '    <!-- mol:future-thing-bridge:start -->',
      '    <script>console.log(1)</script>',
      '    <!-- mol:future-thing-bridge:end -->',
      '    <!-- mol:experimental-shim -->',
      '    <script>console.log(2)</script>',
      '</body></html>',
    ].join('\n')

    const stripped = stripPreviewBridges(html)

    expect(stripped).not.toContain('mol:telemetry-bridge')
    expect(stripped).not.toContain('mol:future-thing-bridge')
    expect(stripped).not.toContain('mol:experimental-shim')
    expect(stripped).not.toContain('postMessage')
    expect(stripped).not.toContain('console.log')
    expect(stripped).toContain('<div id="root"></div>')
  })

  it('does not swallow the document when a mol: marker is not a bridge', () => {
    const html = [
      '<!doctype html>',
      '<html><head>',
      '    <!-- mol:design-resources -->',
      '    <link rel="stylesheet" href="/fonts.css" />',
      '    <!-- /mol:design-resources -->',
      '</head><body>',
      '<div id="root"></div>',
      '<script type="module" src="/src/main.tsx"></script>',
      '</body></html>',
    ].join('\n')

    expect(stripPreviewBridges(html)).toBe(html)
  })

  it('is idempotent and a no-op on a document that never had a bridge', () => {
    const once = stripPreviewBridges(scaffoldedHtml)

    expect(stripPreviewBridges(once)).toBe(once)
  })
})

describe('vite-preview-bridge-plugin — every template ships the canonical copy', () => {
  it('has no drifted vendored copy under templates/apps', async () => {
    const { readdir } = await import('node:fs/promises')
    const canonical = await readFile(PLUGIN_TPL, 'utf8')
    const apps = await readdir(join(TEMPLATES, 'apps'), { withFileTypes: true })

    const drifted: string[] = []
    let checked = 0
    for (const app of apps) {
      if (!app.isDirectory()) continue
      const copy = join(TEMPLATES, 'apps', app.name, 'app', 'vite-preview-bridge-plugin.ts')
      let content: string
      try {
        content = await readFile(copy, 'utf8')
      } catch (_error) {
        // Not every template is a vite app; a missing copy is not drift.
        continue
      }
      checked++
      if (content !== canonical) drifted.push(app.name)
    }

    expect(checked, 'found the vendored copies').toBeGreaterThan(100)
    // A drifted copy is a template whose production build still ships bridges.
    expect(drifted).toEqual([])
  })
})
