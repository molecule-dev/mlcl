import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const cli = resolve(import.meta.dirname, '../../../bin/run.js')
const require = createRequire(import.meta.url)
const dependencies = dirname(dirname(require.resolve('typescript/package.json')))
let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mlcl-app-locales-'))
  // Resolve exactly the dependency installation that runs this suite. The projects
  // live outside the checkout, so an unrelated ancestor install cannot satisfy imports.
  await symlink(dependencies, join(root, 'node_modules'), 'junction')
})

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

function run(
  command: string,
  args: string[],
  cwd: string,
): { status: number | null; output: string } {
  const result = spawnSync(command, args, { cwd, encoding: 'utf-8', timeout: 90_000 })
  if (result.error) throw result.error
  return { status: result.status, output: result.stdout + result.stderr }
}

function create(name: string, ...flags: string[]): string {
  const result = run(
    process.execPath,
    [cli, 'create', name, '--skip-install', '--json', ...flags],
    root,
  )
  expect(result.status, result.output).toBe(0)
  return join(root, name)
}

async function directories(dir: string): Promise<string[]> {
  return (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

const custom = ['--type', 'app', '--framework', 'react', '--packages', '@molecule/app-routing']

/** A literal key passed to `t()` or `$t()` in starter source (script, JSX or template). */
const STARTER_KEY = /(?<![\w$.])\$?t\(\s*(['"])([A-Za-z][\w.-]*)\1/g

/**
 * Source without its comments: the capability recipes stamped into starter files quote other
 * apps' calls (`t('orders.open')`), which are examples, not keys this app uses.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:\\'"`])\/\/[^\n]*/gm, '$1')
}

async function sourceFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)))
    else files.push(path)
  }
  return files
}

async function addTranslations(app: string, locale: string, translations: string): Promise<void> {
  const file = join(app, 'src', 'locales', locale, 'ui.ts')
  const source = await readFile(file, 'utf-8')
  await writeFile(
    file,
    source.replace('} satisfies UiTranslations', `${translations}\n} satisfies UiTranslations`),
  )
}

describe('custom app locales', () => {
  it('offers one language by default and builds after adding another', async () => {
    const app = create('locale-default', ...custom)
    const locales = join(app, 'src/locales')
    expect(await directories(locales)).toEqual(['en'])
    const loaders = join(locales, 'project.ts')
    expect(await readFile(loaders, 'utf-8')).toMatch(/from '\.\/en\/ui\.js'/)
    expect(await readFile(loaders, 'utf-8')).not.toMatch(/import\('\.\/(?!en\/)/)

    // The installed workspace copy can differ from the manifest pin during development.
    const manifestPath = join(app, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/app-locales-ui']).toBeDefined()
    manifest.dependencies['@molecule/app-locales-ui'] = '0.0.0'
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    const added = run(process.execPath, [cli, 'locale', 'add', 'fr'], app)
    expect(added.status, added.output).toBe(0)
    expect(await directories(locales)).toEqual(['en', 'fr'])
    expect(await readFile(loaders, 'utf-8')).toContain("fr: () => import('./fr/ui.js')")
    expect((await readdir(join(locales, 'fr'))).sort()).toEqual([
      'privacyPolicy.ts',
      'termsOfService.ts',
      'ui.ts',
    ])
    const built = run('npm', ['run', 'build'], app)
    expect(built.status, built.output).toBe(0)
  }, 120_000)

  it('scaffolds and typechecks a French-only app', async () => {
    const app = create('locale-french', ...custom, '--locales', 'fr')
    expect(await directories(join(app, 'src/locales'))).toEqual(['fr'])
    expect(await readFile(join(app, 'src/locales/project.ts'), 'utf-8')).toContain(
      "export const primaryLocale = 'fr'",
    )
    const bond = await readFile(join(app, 'src/bonds/i18n-default.ts'), 'utf-8')
    expect(bond).toContain("from '@molecule/app-i18n-default/setup.js'")
    expect(bond).toContain('primaryLocale,')
    expect(bond).not.toContain("'/en/ui.js'")
    const checked = run('npm', ['run', 'typecheck'], app)
    expect(checked.status, checked.output).toBe(0)
  }, 120_000)

  it('reports every missing locale for a literal or computed key even with defaultValue', async () => {
    const app = create('locale-parity', ...custom, '--locales', 'en,fr')
    await addTranslations(app, 'en', "  'tools.borrow': 'Borrow',")
    await writeFile(
      join(app, 'src/translation-probe.ts'),
      `import { t } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'

export function borrow(action: 'borrow' | 'return'): string {
  return t(\`tools.\${action}\` as const, undefined, { defaultValue: 'Use the tool' })
}

export function useTool(): string {
  const { t } = useTranslation()
  return t('tools.borrow', undefined, { defaultValue: 'Borrow' })
}

export const stringFromBond = (): string => t('nav.primaryNavigation')
`,
    )
    for (const script of ['typecheck', 'build']) {
      const checked = run('npm', ['run', script], app)
      expect(checked.status, checked.output).not.toBe(0)
      expect(checked.output).toMatch(/src\/translation-probe\.ts\(5,\d+\): error TS/)
      expect(checked.output).toMatch(/src\/translation-probe\.ts\(10,\d+\): error TS/)
      expect(checked.output).toContain('Missing translation in fr: tools.borrow')
      expect(checked.output).toContain('Missing translation in fr: tools.return')
      expect(checked.output).toContain('Missing translation in en: tools.return')
      expect(checked.output).not.toContain('Missing translation in en: tools.borrow')
    }

    await addTranslations(app, 'en', "  'tools.return': 'Return',")
    await addTranslations(app, 'fr', "  'tools.borrow': 'Emprunter',\n  'tools.return': 'Rendre',")
    const built = run('npm', ['run', 'build'], app)
    expect(built.status, built.output).toBe(0)
  }, 120_000)

  // Every literal key the starter source uses must be in the catalogs the scaffold offers, or the
  // app's own typecheck fails on it. The scaffold matrix compiles each framework only when someone
  // runs it with that framework's toolchain installed: on 2026-11-27 it ran without React Native,
  // whose generated App.tsx and Home.tsx (nav.home, home.welcome, home.subtitle) failed for every
  // user. This compiles only the generated catalog types and one call per key, so it needs no
  // framework toolchain and covers every framework in each run of the suite.
  it.each(['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web', 'react-native'])(
    'offers every key the %s starter source uses',
    async (framework) => {
      const app = create(`locale-keys-${framework}`, '--type', 'app', '--framework', framework)
      const files = await sourceFiles(join(app, 'src'))
      const catalogs = files.find((file) => file.endsWith(`${'/'}locales/catalogs.d.ts`))
      expect(catalogs, 'the scaffold writes its catalog types').toBeDefined()
      const keys = new Set<string>()
      for (const file of files) {
        if (/[\\/]locales[\\/]/.test(file) || !/\.(?:tsx?|vue|svelte|html)$/.test(file)) continue
        const code = withoutComments(await readFile(file, 'utf-8'))
        for (const match of code.matchAll(STARTER_KEY)) keys.add(match[2])
      }
      // A scan that matches nothing would pass for every framework.
      expect(keys.size, `literal t() keys found in the ${framework} starter`).toBeGreaterThan(2)
      const probe = join(app, 'src', 'starter-keys.probe.ts')
      await writeFile(
        probe,
        `import type { TranslateFunction } from '@molecule/app-i18n'\n\ndeclare const t: TranslateFunction\n\n${[
          ...keys,
        ]
          .sort()
          .map((key) => `t(${JSON.stringify(key)})`)
          .join('\n')}\n`,
      )
      const checked = run(
        process.execPath,
        [
          require.resolve('typescript/bin/tsc'),
          // Only the probe and the catalog types: the app's own config would compile its
          // framework sources, which need that framework's toolchain.
          '--ignoreConfig',
          '--noEmit',
          '--strict',
          '--skipLibCheck',
          '--target',
          'es2022',
          '--module',
          'esnext',
          '--moduleResolution',
          'bundler',
          probe,
          catalogs!,
        ],
        app,
      )
      expect(checked.status, checked.output).toBe(0)
    },
    120_000,
  )

  it('keeps the flagship locale folders', async () => {
    const app = create('locale-flagship', '--template', 'static-site')
    const source = resolve(
      import.meta.dirname,
      '../../../templates/apps/static-site/app/src/locales',
    )
    const expected = await directories(source)
    expect(expected.length).toBeGreaterThan(1)
    expect(await directories(join(app, 'app/src/locales'))).toEqual(expected)
  }, 120_000)
})
