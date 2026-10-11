// @vitest-environment node
/**
 * The scaffold has a family of IN-PLACE rewrites — a file that ALREADY exists is
 * read, modified, written back. The four preview bridges
 * (`injectPreviewNavBridge`, `-Snapshot`, `-Runtime`, `-Interact`) insert their
 * `<script>` into the app's `index.html`; `stampDemoContentNotices` prepends the
 * demo-seed header to each seed module; `syncIdentityFromBranding` rewrites the
 * `<title>`/meta block and each `package.json`.
 *
 * Every one of those writes went through a bare `writeFile` — and `writeFile`
 * truncates before it writes, so a failure mid-write (a full disk, EIO) left a
 * PARTIAL file where a complete one used to be. For the bridges that file is the
 * entry document Vite builds from, so the scaffold reported success over an app
 * that no longer parses. `writeGuarded` (the policy `syncProjectAssets` already
 * uses for the same document) restores the previous bytes instead: a failed write
 * leaves the file as it was, never worse.
 *
 * The failure is simulated the honest way — the file is truncated to garbage and
 * THEN the error surfaces, the shape no pre-write check can produce — and it
 * fires once, because the guard's own restore write must go through.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as fsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** When set, the NEXT write to this exact path truncates and then throws. */
const shortWrite = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>()
  type WriteFileArgs = Parameters<typeof actual.writeFile>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (shortWrite.path !== null && String(path) === shortWrite.path) {
        // A short write on ENOSPC: the truncating open has already destroyed the
        // file's contents by the time the error is raised.
        shortWrite.path = null
        await actual.writeFile(path, 'TRUNCATED-BEFORE-FAILURE', options)
        throw Object.assign(new Error(`ENOSPC: no space left on device, write '${String(path)}'`), {
          code: 'ENOSPC',
        })
      }
      return actual.writeFile(path, data, options)
    },
  }
})

import {
  addPackages,
  applyStaticSiteOverlay,
  applyTemplatePostInjectOverrides,
  copyTemplateDomainFiles,
  ensureBaseHandlersIndex,
  ensureE2EManifest,
  ensureMoleculePeerClosure,
  injectPreviewInteractBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
  stampDemoContentNotices,
  stampMoleculeMetadata,
  wireTemplateApiRouters,
} from '../scaffold.js'

/** An entry document with a `</body>` for a bridge to anchor against. */
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>demo</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

/** Every bridge injector, with the sentinel its insertion leaves behind. */
const BRIDGES: Array<[string, (htmlPath: string) => Promise<boolean>, string]> = [
  ['injectPreviewNavBridge', injectPreviewNavBridge, 'mol:nav-bridge'],
  ['injectPreviewSnapshotBridge', injectPreviewSnapshotBridge, 'mol:snapshot-bridge'],
  ['injectPreviewRuntimeBridge', injectPreviewRuntimeBridge, 'mol:runtime-bridge'],
  ['injectPreviewInteractBridge', injectPreviewInteractBridge, 'mol:interact-bridge'],
]

const SEED_SOURCE = `export async function seed(): Promise<void> {
  // the app's own seed
}
`

let dir: string

beforeEach(() => {
  shortWrite.path = null
  dir = mkdtempSync(join(tmpdir(), 'mlcl-scaffold-inplace-guard-'))
})

afterEach(() => {
  shortWrite.path = null
  rmSync(dir, { recursive: true, force: true })
})

describe('scaffold in-place rewrites — a failed write restores the file', () => {
  it.each(BRIDGES)(
    '%s: a failed write leaves the entry document intact (and the bridge lands when it succeeds)',
    async (name, inject, sentinel) => {
      const htmlPath = join(dir, `${name}.html`)
      writeFileSync(htmlPath, INDEX_HTML)
      shortWrite.path = htmlPath

      await expect(inject(htmlPath), `${name} must surface the write failure`).rejects.toThrow(
        /ENOSPC/,
      )
      expect(readFileSync(htmlPath, 'utf-8'), `${name} truncated index.html`).toBe(INDEX_HTML)

      // The positive twin: without it the assertion above would hold for an
      // injector that never wrote anything at all.
      await expect(inject(htmlPath)).resolves.toBe(true)
      const written = readFileSync(htmlPath, 'utf-8')
      expect(written).toContain(sentinel)
      expect(written).toContain('</body>')
    },
  )

  it('stampDemoContentNotices: a failed seed-header write leaves the seed module intact', async () => {
    const apiDir = join(dir, 'api')
    mkdirSync(join(apiDir, 'src'), { recursive: true })
    const seedPath = join(apiDir, 'src', 'seed.ts')
    writeFileSync(seedPath, SEED_SOURCE)

    shortWrite.path = seedPath
    await expect(stampDemoContentNotices(null, apiDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(seedPath, 'utf-8')).toBe(SEED_SOURCE)

    // The positive twin: the header is what this step exists to add.
    await stampDemoContentNotices(null, apiDir)
    const stamped = readFileSync(seedPath, 'utf-8')
    expect(stamped).toContain('DEMO SEED DATA')
    expect(stamped.endsWith(SEED_SOURCE)).toBe(true)
  })

  // The manifest rewrites are the other half of the same policy: `writeGuarded`
  // names "a workspace package.json" among the files it protects, because a
  // truncated manifest is unparseable for every later scaffold step.
  it('ensureE2EManifest: a failed manifest write leaves the manifest parseable', async () => {
    const appDir = join(dir, 'app')
    mkdirSync(appDir, { recursive: true })
    const manifestPath = join(appDir, 'package.json')
    const before = `${JSON.stringify({ name: 'my-app', scripts: { dev: 'vite' } }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(ensureE2EManifest(appDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the script this step exists to add does land.
    await ensureE2EManifest(appDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      scripts: Record<string, string>
    }
    expect(manifest.scripts['test:e2e']).toBe('playwright test')
  })

  it('ensureMoleculePeerClosure: a failed manifest write leaves the manifest parseable', async () => {
    const projectDir = join(dir, 'project')
    mkdirSync(join(projectDir, 'api'), { recursive: true })
    const manifestPath = join(projectDir, 'api', 'package.json')
    const before = `${JSON.stringify({ dependencies: { '@molecule/api-database': '1.0.1' } }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(ensureMoleculePeerClosure(projectDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the closure this step exists to add does land.
    await ensureMoleculePeerClosure(projectDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    // An exact pin, not merely a present key — a range or placeholder version
    // would satisfy `toBeTruthy()` while breaking the install this closure
    // exists to fix.
    expect(manifest.dependencies['@molecule/api-database-postgresql']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  // The ROOT manifest is the other half of the same policy — and the last
  // rewrite that was still going through a bare `writeFileSync`, which truncates
  // before it writes just like `writeFile` (and which this suite's mock, being
  // the promises one, would not even have caught).
  it('stampMoleculeMetadata: a failed root-manifest write leaves it parseable, and stamps the real CLI version', async () => {
    const projectDir = join(dir, 'stamped')
    mkdirSync(projectDir, { recursive: true })
    const manifestPath = join(projectDir, 'package.json')
    // The marker `create` wrote moments earlier (createAppProject) — the
    // provenance is MERGED into it. Replacing the block dropped `framework`,
    // and `detectAppFramework` then probes `appFrameworks` in order and reads a
    // react-native-web app as `react` (skipping its peer-exclusion rules).
    const before = `${JSON.stringify(
      { name: 'my-app', molecule: { projectType: 'app', framework: 'react-native-web' } },
      null,
      2,
    )}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(stampMoleculeMetadata(projectDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the provenance this step exists to stamp does land —
    // carrying the CLI's OWN version, never a stale literal (`2.0.0` while the
    // CLI shipped a later one described a generator that never ran).
    await stampMoleculeMetadata(projectDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      keywords: string[]
      molecule: {
        projectType?: string
        framework?: string
        generator: string
        version: string
        docs: string
      }
    }
    expect(manifest.keywords).toContain('molecule')
    // The project's OWN marker survives the provenance stamp…
    expect(manifest.molecule.projectType).toBe('app')
    expect(manifest.molecule.framework).toBe('react-native-web')
    // …as does the provenance this step exists to stamp, carrying the CLI's OWN
    // version — never a stale literal (`2.0.0` while the CLI shipped a later one
    // described a generator that never ran).
    const cliManifest = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', '..', 'package.json'), 'utf-8'),
    ) as { version: string }
    expect(manifest.molecule.generator).toBe('mlcl')
    expect(manifest.molecule.version).toBe(cliManifest.version)
  })

  // The create flow's own in-place rewrites — a manifest it just wrote
  // (`addPackages`), the app's theme.css / index.css / index.html and every
  // locale `ui.ts` (copyTemplateDomainFiles) — were still going through a bare
  // `writeFile`, the same truncating-open class the rest of this suite covers.
  it('addPackages: a failed manifest write leaves it parseable', async () => {
    const projectDir = join(dir, 'add-packages')
    mkdirSync(projectDir, { recursive: true })
    const manifestPath = join(projectDir, 'package.json')
    const before = `${JSON.stringify({ name: 'my-api', dependencies: {} }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(addPackages(projectDir, ['@molecule/api-logger'])).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the dependency this step exists to add does land.
    await addPackages(projectDir, ['@molecule/api-logger'])
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    // Exact pin, not bare presence: see the closure test above.
    expect(manifest.dependencies['@molecule/api-logger']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('copyTemplateDomainFiles: a failed theme.css rewrite leaves the file as copied', async () => {
    const cliRoot = join(dir, 'cli-root')
    const templateDir = join(cliRoot, 'templates', 'apps', 'probe')
    const appDir = join(dir, 'probe-app')
    // The layout every template in the fleet ships: the palette under
    // `app/src/`. A fixture at the template ROOT (where this test used to put
    // it) pinned a path no template has, so the copy could be broken — and it
    // was — with this guard still green.
    mkdirSync(join(templateDir, 'app', 'src'), { recursive: true })
    mkdirSync(join(appDir, 'src'), { recursive: true })
    writeFileSync(
      join(templateDir, 'app', 'src', 'theme.css'),
      ':root { --color-primary: #123456; }\n',
    )
    // What createAppProject copied there first — the file this step rewrites.
    const copied = ':root { --color-primary: #000000; }\n'
    writeFileSync(join(appDir, 'src', 'theme.css'), copied)

    shortWrite.path = join(appDir, 'src', 'theme.css')
    await expect(copyTemplateDomainFiles('probe', 'react', appDir, null, cliRoot)).rejects.toThrow(
      /ENOSPC/,
    )
    expect(readFileSync(join(appDir, 'src', 'theme.css'), 'utf-8')).toBe(copied)

    // The positive twin: the template's palette AND its header do land — the
    // color value too, not just the header, so a copy that read the wrong file
    // (or none) cannot pass.
    await copyTemplateDomainFiles('probe', 'react', appDir, null, cliRoot)
    const theme = readFileSync(join(appDir, 'src', 'theme.css'), 'utf-8')
    expect(theme).toContain('APP COLOR PALETTE')
    expect(theme).toContain('--color-primary: #123456')
  })

  // The create flow's API-side rewrites of the ROUTER — the file every route in
  // the scaffolded API resolves through — were the last in-place rewrites still
  // going through a bare `writeFile`.
  const ROUTER_BEFORE = `import { Router } from 'express'\n\nexport const router = Router()\n`

  it('wireTemplateApiRouters: a failed router write leaves the copied router intact', async () => {
    const apiDir = join(dir, 'template-api')
    mkdirSync(join(apiDir, 'src', 'App'), { recursive: true })
    mkdirSync(join(apiDir, 'src', 'handlers'), { recursive: true })
    const routerPath = join(apiDir, 'src', 'App', 'router.ts')
    writeFileSync(routerPath, ROUTER_BEFORE)
    writeFileSync(
      join(apiDir, 'src', 'handlers', 'index.ts'),
      `import { Router } from 'express'\n\nconst router = Router()\n\nexport default router\n`,
    )

    shortWrite.path = routerPath
    await expect(wireTemplateApiRouters(apiDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(routerPath, 'utf-8')).toBe(ROUTER_BEFORE)

    // The positive twin: the handlers mount this step exists to add does land.
    await wireTemplateApiRouters(apiDir)
    const wired = readFileSync(routerPath, 'utf-8')
    expect(wired).toContain(`from '../handlers/index.js'`)
    expect(wired).toContain('router.use(templateHandlers)')
  })

  it('ensureBaseHandlersIndex: a failed router write leaves the router intact, and the aggregator lands', async () => {
    const apiDir = join(dir, 'custom-api')
    mkdirSync(join(apiDir, 'src', 'App'), { recursive: true })
    const routerPath = join(apiDir, 'src', 'App', 'router.ts')
    writeFileSync(routerPath, ROUTER_BEFORE)

    shortWrite.path = routerPath
    await expect(ensureBaseHandlersIndex(apiDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(routerPath, 'utf-8')).toBe(ROUTER_BEFORE)

    // The positive twin: the aggregator file and its mount both land.
    await ensureBaseHandlersIndex(apiDir)
    const wired = readFileSync(routerPath, 'utf-8')
    expect(wired).toContain(`from '../handlers/index.js'`)
    expect(wired).toContain('router.use(handlers)')
    expect(readFileSync(join(apiDir, 'src', 'handlers', 'index.ts'), 'utf-8')).toContain(
      'export default router',
    )
  })

  it('applyTemplatePostInjectOverrides: a failed bond-override write leaves the generated bond intact', async () => {
    const cliRoot = join(dir, 'override-cli')
    const templateBonds = join(cliRoot, 'templates', 'apps', 'probe', 'app', 'src', 'bonds')
    mkdirSync(templateBonds, { recursive: true })
    writeFileSync(join(templateBonds, 'app-theme-css-variables.ts'), 'export const classMap = {}\n')
    const appDir = join(dir, 'override-app')
    mkdirSync(join(appDir, 'src', 'bonds'), { recursive: true })
    const destPath = join(appDir, 'src', 'bonds', 'app-theme-css-variables.ts')
    // What the injector generated a moment earlier — the file this step overwrites.
    const generated = 'export const classMap = { from: "injector" }\n'
    writeFileSync(destPath, generated)

    shortWrite.path = destPath
    await expect(applyTemplatePostInjectOverrides('probe', appDir, cliRoot)).rejects.toThrow(
      /ENOSPC/,
    )
    expect(readFileSync(destPath, 'utf-8')).toBe(generated)

    // The positive twin: the template's redirect header + override land.
    await applyTemplatePostInjectOverrides('probe', appDir, cliRoot)
    const stamped = readFileSync(destPath, 'utf-8')
    expect(stamped).toContain('COLORS ARE NOT DEFINED HERE')
    expect(stamped).toContain('export const classMap = {}')
  })

  it('applyStaticSiteOverlay: a failed vite.config.ts rewrite leaves the base config intact', async () => {
    const appDir = join(dir, 'static-app')
    mkdirSync(join(appDir, 'src'), { recursive: true })
    writeFileSync(
      join(appDir, 'package.json'),
      `${JSON.stringify(
        {
          name: 'static-app',
          scripts: { dev: 'vite' },
          molecule: { projectType: 'app', framework: 'react' },
        },
        null,
        2,
      )}\n`,
    )
    const viteConfigPath = join(appDir, 'vite.config.ts')
    // What createAppProject wrote earlier in the same create — the build's entry config.
    const baseConfig = `import { defineConfig } from 'vite'\n\nexport default defineConfig({})\n`
    writeFileSync(viteConfigPath, baseConfig)
    writeFileSync(join(appDir, 'src', 'vite-env.d.ts'), '/// <reference types="vite/client" />\n')

    shortWrite.path = viteConfigPath
    await expect(applyStaticSiteOverlay(appDir, 'static-app')).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(viteConfigPath, 'utf-8')).toBe(baseConfig)

    // The positive twin: the static config this overlay exists to write lands.
    await applyStaticSiteOverlay(appDir, 'static-app')
    expect(readFileSync(viteConfigPath, 'utf-8')).toContain('staticSitePlugin')
  })
})
