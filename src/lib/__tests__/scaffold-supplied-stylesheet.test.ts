import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'
import {
  applyStaticSiteOverlay,
  copyTemplateInstance,
  createAppProject,
  getTemplatesDir,
} from '../scaffold.js'

const nodeModules = dirname(dirname(createRequire(import.meta.url).resolve('vite/package.json')))
const slot = 'src/supplied-styles/entry.css'
let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'scaffold-supplied-css-'))
  await symlink(nodeModules, join(root, 'node_modules'))
})

afterAll(async () => rm(root, { recursive: true, force: true }))

// The bundles below resolve the scaffold's imports from mlcl's own install. A build dependency
// the Tailwind tooling declares but mlcl does not install resolved only in the workspace, through
// its hoisted copy, and failed in CI and the release's suite as an unresolved import inside the
// Vite build (`@tailwindcss/typography`, 2026-11-20).
it('installs every build dependency the Tailwind scaffold declares', () => {
  const styling = getRawRegistry().packages?.['@molecule/app-styling-tailwind']?.buildTooling
  const declared = Object.keys(styling?.devDependencies ?? {})
  expect(declared.length).toBeGreaterThan(0)
  const missing = declared.filter((name) => !existsSync(join(nodeModules, name, 'package.json')))
  expect(missing, "add them to mlcl's devDependencies").toEqual([])
})

async function scaffoldCustom(app: string): Promise<void> {
  const styling = getRawRegistry().packages?.['@molecule/app-styling-tailwind']?.buildTooling
  if (!styling) throw new Error('The Tailwind build tooling is missing')
  await createAppProject(app, 'equipment-console', 'react', false, '', {}, [], styling)
}

async function scaffoldStaticSite(app: string): Promise<void> {
  await copyTemplateInstance(
    join(getTemplatesDir(), 'apps', 'static-site'),
    dirname(app),
    'equipment-site',
    {},
  )
}

async function bundleStyles(app: string, tailwind = true): Promise<string> {
  const result = await build({
    root: app,
    configFile: false,
    logLevel: 'error',
    plugins: tailwind ? [tailwindcss({ optimize: false })] : [],
    build: {
      write: false,
      cssMinify: false,
      rolldownOptions: { input: join(app, 'src/index.css') },
    },
  })
  const output = (Array.isArray(result) ? result : [result]).flatMap((entry) =>
    'output' in entry ? entry.output : [],
  )
  const css = output.find((entry) => entry.type === 'asset' && entry.fileName.endsWith('.css'))
  if (css?.type !== 'asset' || typeof css.source !== 'string') {
    throw new Error('Vite did not emit a CSS asset')
  }
  return css.source
}

describe('supplied stylesheets in Tailwind scaffolds', () => {
  it.each([
    ['custom', scaffoldCustom],
    ['flagship-static-site', scaffoldStaticSite],
  ] as const)('bundles the supplied stylesheet unlayered in %s', async (name, scaffold) => {
    const app = join(root, name, 'app')
    await scaffold(app)
    const supplied = join(app, slot)
    // Copying files into the supplied slot is the only addition to the generated app.
    // On the old scaffold it succeeds, but the generated CSS entry never imports the file.
    await mkdir(dirname(supplied), { recursive: true })
    await writeFile(supplied, "@import './editor.css';\n")
    await writeFile(
      join(dirname(supplied), 'editor.css'),
      'img { display: inline; width: 41px; height: 29px; }\n',
    )
    const css = await bundleStyles(app)
    // The supplied element rule is at the top level. Preflight still supplies the app defaults.
    expect(css).toMatch(/^img\s*\{\s*display: inline;\s*width: 41px;\s*height: 29px;\s*\}/m)
    expect(css).toMatch(/@layer base\s*\{[\s\S]*?max-width: 100%;\s*height: auto;/)
  })

  it('emits identical CSS with an empty supplied stylesheet', async () => {
    const app = join(root, 'no-supplied', 'app')
    await scaffoldStaticSite(app)
    const withSlot = await bundleStyles(app)
    const entry = join(app, 'src/index.css')
    const css = await readFile(entry, 'utf8')
    await writeFile(
      entry,
      css.replace(
        /\/\* Put supplied CSS[\s\S]*?\*\/\n@import '\.\/supplied-styles\/entry\.css';\n/,
        '',
      ),
    )
    expect(await bundleStyles(app)).toBe(withSlot)
  })
})

describe('supplied stylesheets across web scaffolds', () => {
  it.each([
    ['flagship-static', scaffoldStaticSite],
    [
      'custom-static',
      async (app: string) => {
        await scaffoldCustom(app)
        await applyStaticSiteOverlay(app, 'equipment-site')
      },
    ],
  ] as const)('keeps %s free of source files for absent routes', async (name, scaffold) => {
    const app = join(root, name, 'app')
    await scaffold(app)
    expect(await readFile(join(app, 'src/locales/en/ui.ts'), 'utf8')).toContain('export')
    for (const file of [
      'components/Icon.tsx',
      'components/ThemeToggle.tsx',
      'locales/en/privacyPolicy.ts',
      'locales/en/termsOfService.ts',
    ]) {
      await expect(readFile(join(app, 'src', file), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      })
    }
  })

  it.each(['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web'] as const)(
    'provides the global stylesheet slot for plain %s',
    async (framework) => {
      const app = join(root, `plain-${framework}`)
      await createAppProject(app, 'equipment-console', framework, false, '', {}, [])
      expect(await readFile(join(app, slot), 'utf8')).toBe('')
      const entry = await readFile(join(app, 'src/index.css'), 'utf8')
      expect(entry).toContain("@import './supplied-styles/entry.css';")
    },
  )

  it('lets a layered stylesheet override the plain scaffold defaults', async () => {
    const app = join(root, 'plain-cascade')
    await createAppProject(app, 'equipment-console', 'react', false, '', {}, [])
    const supplied = join(app, slot)
    await mkdir(dirname(supplied), { recursive: true })
    await writeFile(supplied, '@layer brand { html, body, #root { margin: 12px } }\n')
    const css = await bundleStyles(app, false)
    expect(css).toContain('@layer brand')
    expect(css).toMatch(/@layer molecule-reset;[\s\S]*@layer brand\s*\{[\s\S]*margin:\s*12px/)
    expect(css).toMatch(/@layer molecule-reset\s*\{[\s\S]*margin:\s*0 auto/)
  })

  it('declares Tailwind layers before the supplied stylesheet declares its own', async () => {
    const app = join(root, 'tailwind-cascade')
    await scaffoldCustom(app)
    await writeFile(join(app, slot), '@layer brand { img { max-width: 17px } }\n')
    const css = await bundleStyles(app)
    expect(css.indexOf('@layer theme, base, components, utilities')).toBeGreaterThanOrEqual(0)
    expect(css.indexOf('@layer brand')).toBeGreaterThan(
      css.indexOf('@layer theme, base, components, utilities'),
    )
  })
})
