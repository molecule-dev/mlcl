/** The ordinary npm build must execute the scaffold's existing native lint checks. */
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { applyStaticSiteOverlay, copyTemplateInstance, createAppProject } from '../scaffold.js'

const exec = promisify(execFile)
const require = createRequire(import.meta.url)
const nodeModules = dirname(dirname(require.resolve('eslint/package.json')))
const template = new URL('../../../templates/apps/note-taking/app/', import.meta.url)
const missing =
  'export function Control({ act }: { act: () => void }) { return <i role="button" tabIndex={0} aria-label="Remove record" className="unloaded-glyph" onClick={act} onKeyDown={act} /> }\n'
let root: string
let custom: string
let flagship: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'build-lint-lifecycle-'))
  custom = join(root, 'custom')
  await createAppProject(custom, 'equipment-console', 'react')
  await symlink(nodeModules, join(custom, 'node_modules'))

  // Exercise the real template-copy path with a non-benchmark template's actual
  // manifest. No API/database or demo content is needed to test npm's lifecycle.
  const source = join(root, 'template')
  await mkdir(join(source, 'app'), { recursive: true })
  await copyFile(new URL('package.json', template), join(source, 'app/package.json'))
  const manifest = JSON.parse(await readFile(join(source, 'app/package.json'), 'utf8'))
  manifest.scripts.prebuild = "node -e \"require('node:fs').writeFileSync('prepared.txt', 'yes')\""
  await writeFile(join(source, 'app/package.json'), JSON.stringify(manifest))
  await copyTemplateInstance(source, join(root, 'copied'), 'equipment-notes', {})
  flagship = join(root, 'copied/app')
  await symlink(nodeModules, join(flagship, 'node_modules'))
}, 30_000)

afterAll(async () => rm(root, { recursive: true, force: true }))

/** Use the generated scripts/config/rules with a small, real TypeScript/Vite app. */
async function fixture(app: string, source: string): Promise<void> {
  await rm(join(app, 'src'), { recursive: true, force: true })
  await rm(join(app, 'dist'), { recursive: true, force: true })
  await rm(join(app, 'prepared.txt'), { force: true })
  await mkdir(join(app, 'src'), { recursive: true })
  await writeFile(join(app, 'src/Control.tsx'), source)
  await writeFile(
    join(app, 'src/main.tsx'),
    "import { Control } from './Control.js'\n\nconsole.log(Control)\n",
  )
  await writeFile(
    join(app, 'index.html'),
    '<html><head><title>Equipment console</title></head><body><script type="module" src="/src/main.tsx"></script></body></html>',
  )
  await writeFile(join(app, 'vite.config.ts'), 'export default {}\n')
  await writeFile(
    join(app, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        types: ['vite/client'],
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['src'],
    }),
  )
}

async function build(app: string): Promise<{ code: number; output: string }> {
  try {
    const result = await exec('npm', ['run', 'build'], { cwd: app, timeout: 20_000 })
    return { code: 0, output: result.stdout + result.stderr }
  } catch (error) {
    const result = error as { code: number; stdout: string; stderr: string }
    return { code: result.code, output: result.stdout + result.stderr }
  }
}

describe('frontend npm build verification', () => {
  it.each(['custom', 'flagship'])('rejects an undrawn target before bundling: %s', async (kind) => {
    const app = kind === 'custom' ? custom : flagship
    await fixture(app, missing)
    const result = await build(app)
    expect(result.code, result.output).not.toBe(0)
    expect(result.output).toContain('Control.tsx')
    expect(result.output).toContain('no-empty-interactive-target')
    expect(result.output).toMatch(/\b1:\d+\s+error/)
    await expect(readFile(join(app, 'prepared.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(app, 'dist/index.html'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('builds a visible control without a browser test suite', async () => {
    await fixture(custom, missing.replace(' /> }', '>×</i> }'))
    const result = await build(custom)
    expect(result.code, result.output).toBe(0)
    expect(await readFile(join(custom, 'dist/index.html'), 'utf8')).toContain('Equipment console')
  })

  it('builds a CSS-drawn control and preserves the template preparation', async () => {
    await fixture(flagship, `import './glyph.css'\n\n${missing}`)
    await writeFile(join(flagship, 'src/glyph.css'), '.unloaded-glyph::before { content: "×" }')
    const result = await build(flagship)
    expect(result.code, result.output).toBe(0)
    expect(await readFile(join(flagship, 'prepared.txt'), 'utf8')).toBe('yes')
    expect(await readFile(join(flagship, 'dist/index.html'), 'utf8')).toContain('Equipment console')
  })

  it('keeps lint in the static-site build lifecycle', async () => {
    const app = join(root, 'static')
    await createAppProject(app, 'equipment-manual', 'react')
    await applyStaticSiteOverlay(app, 'equipment-manual')
    const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
    expect(manifest.scripts.prebuild).toBe('npm run lint')
    expect(manifest.scripts.build).toContain('prerender.mjs')
  })

  it.each(['vue', 'svelte', 'solid', 'angular'])(
    'adds the same lifecycle to %s',
    async (framework) => {
      const app = join(root, framework)
      await createAppProject(app, 'equipment-console', framework)
      const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
      expect(manifest.scripts.prebuild).toBe('npm run lint')
      expect(manifest.scripts.lint).toBe('eslint src/')
    },
  )
})
