import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'
import { copyTemplateInstance, createAppProject, getTemplatesDir } from '../scaffold.js'

const nodeModules = dirname(dirname(createRequire(import.meta.url).resolve('vite/package.json')))
const slot = 'src/supplied-styles/entry.css'
let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'scaffold-supplied-css-'))
  await symlink(nodeModules, join(root, 'node_modules'))
})

afterAll(async () => rm(root, { recursive: true, force: true }))

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

async function bundleStyles(app: string): Promise<string> {
  const result = await build({
    root: app,
    configFile: false,
    logLevel: 'error',
    plugins: [tailwindcss({ optimize: false })],
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
