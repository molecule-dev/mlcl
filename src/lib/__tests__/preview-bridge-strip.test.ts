/**
 * A production build must ship NO preview bridge.
 *
 * Every app's vite config carries `stripPreviewBridgePlugin()` from
 * `@molecule/app-e2e-preview/vite`, whose build half strips the molecule preview plumbing
 * from `vite build` output: `<script>`s that `postMessage` runtime diagnostics to
 * `window.parent` with `'*'` as the target origin, and — for the interact bridge — accept
 * commands that click and fill the page. A deployed app can be framed by anyone, so every one
 * of those blocks is an information-disclosure surface in production.
 *
 * The strip once named the bridges it removed, one literal per bridge, and that list fell
 * behind the injectors (`mol:runtime-bridge` and `mol:interact-bridge` shipped in every built
 * page). So this suite asserts the property, not the list: it builds the document a REAL
 * scaffold produces — the shipped `index.html.tpl` with every injector in `scaffold.ts` run
 * over it — and requires that the package's strip leaves no bridge sentinel, no
 * `postMessage`, and no `molecule:*` protocol name behind. The sentinels it checks are
 * DISCOVERED from `scaffold.ts`, so the next bridge is covered on the day it is written. The
 * strip's own cases (unknown names, separated tags, asset drop, the reference guard) are
 * tested in the package.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { stripPreviewBridges } from '@molecule/app-e2e-preview/vite'

import {
  injectPreviewInteractBridge,
  injectPreviewLivenessBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const MLCL_ROOT = join(HERE, '..', '..', '..')
const TEMPLATES = join(MLCL_ROOT, 'templates')
const SCAFFOLD_SRC = join(MLCL_ROOT, 'src', 'lib', 'scaffold.ts')
const PACKAGE_IMPORT = "import { stripPreviewBridgePlugin } from '@molecule/app-e2e-preview/vite'"

/** The index.html a real scaffold produces, with every bridge injected. */
let scaffoldedHtml = ''
let dir = ''

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
    // The liveness bridge is MOVED (it is baked into the template) rather than
    // appended, and it is the biggest one — the fixture must carry its reference
    // form too, or the strip would be proven only for the smaller four.
    injectPreviewLivenessBridge,
  ]) {
    expect(await inject(htmlPath), `${inject.name} injected its bridge`).toBe(true)
  }
  scaffoldedHtml = await readFile(htmlPath, 'utf8')
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('stripPreviewBridges — strips every bridge mlcl injects', () => {
  it('starts from a document that really does carry every bridge', async () => {
    const injected = sentinelsInjectedByScaffold(await readFile(SCAFFOLD_SRC, 'utf8'))

    // Guard the guard: if this list ever comes back empty the suite proves nothing.
    expect(injected.length).toBeGreaterThanOrEqual(4)
    for (const sentinel of injected) {
      expect(scaffoldedHtml, `fixture carries ${sentinel}`).toContain(`<!-- ${sentinel} -->`)
    }
    // Every bridge is present in the form a scaffold actually emits now: a
    // reference to its file, not the script itself.
    expect(scaffoldedHtml).toContain('<!-- mol:preview-bridge -->')
    for (const name of [
      'preview-bridge',
      'nav-bridge',
      'snapshot-bridge',
      'runtime-bridge',
      'interact-bridge',
    ]) {
      expect(scaffoldedHtml, `fixture references ${name}`).toContain(
        `<script src="/__mol/bridges/${name}.js"></script>`,
      )
    }
    expect(scaffoldedHtml.match(/<script src="\/__mol\/bridges\//g)).toHaveLength(5)
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
    expect(stripped).not.toContain('/__mol/')
    // Only the app's own module entry may remain.
    expect(stripped.match(/<script/g) ?? []).toHaveLength(1)
    expect(stripped).toContain('<script type="module" src="/src/main.tsx"></script>')
  })

  it('keeps everything that is not preview plumbing', () => {
    const selectedFont = '<link rel="stylesheet" href="/fonts/selected-provider.css" />'
    const stripped = stripPreviewBridges(
      scaffoldedHtml.replace('</head>', `${selectedFont}</head>`),
    )

    expect(stripped).toContain('<div id="root"></div>')
    expect(stripped).toContain('<title>Demo</title>')
    // `mol:` markers that are NOT bridges must survive untouched.
    expect(stripped).toContain('<!-- mol:design-resources -->')
    expect(stripped).toContain('<!-- /mol:design-resources -->')
    expect(stripped).toContain(selectedFont)
    expect(stripped).toContain('</body>')
    expect(stripped).toContain('</html>')
  })

  it('is idempotent', () => {
    const once = stripPreviewBridges(scaffoldedHtml)

    expect(stripPreviewBridges(once)).toBe(once)
  })
})

describe('every app takes the preview plugin from the package', () => {
  it('no flagship vendors a copy, and each vite config imports it from @molecule/app-e2e-preview', async () => {
    const apps = await readdir(join(TEMPLATES, 'apps'), { withFileTypes: true })
    const vendored: string[] = []
    const notImporting: string[] = []
    let checked = 0
    for (const app of apps) {
      if (!app.isDirectory()) continue
      const appDir = join(TEMPLATES, 'apps', app.name, 'app')
      if (existsSync(join(appDir, 'vite-preview-bridge-plugin.ts'))) vendored.push(app.name)
      const configPath = join(appDir, 'vite.config.ts')
      if (!existsSync(configPath)) continue
      checked++
      if (!(await readFile(configPath, 'utf8')).includes(PACKAGE_IMPORT))
        notImporting.push(app.name)
    }

    expect(checked, 'found the flagship vite configs').toBeGreaterThan(100)
    expect(vendored).toEqual([])
    // A config without the plugin builds a production page that still carries every bridge.
    expect(notImporting).toEqual([])
  })

  it('the generated vite configs import it from the package too', async () => {
    for (const template of ['app/shared/vite.config.ts.tpl', 'static/vite.config.ts.tpl']) {
      const source = await readFile(join(TEMPLATES, template), 'utf8')
      expect(source, template).toContain("from '@molecule/app-e2e-preview/vite'")
      expect(source, template).not.toContain('vite-preview-bridge-plugin')
    }
    expect(existsSync(join(TEMPLATES, 'app', 'shared', 'vite-preview-bridge-plugin.ts.tpl'))).toBe(
      false,
    )
  })
})
