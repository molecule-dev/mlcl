/**
 * A scaffolded app, and its API, load the translations of every companion locale bond installed.
 *
 * Before 2026-11-13 the default i18n bond of an `mlcl create` app, on every framework, was a
 * bare `createSimpleI18nProvider` over the app's own `ui.ts` files: the scaffold installed
 * `@molecule/app-locales-auth`, `-forms`, `-ui` and the rest, and nothing ever read them, so
 * every package string stayed English in every other locale. Only the flagships, wired by a
 * workspace script, loaded them. The bond is now the flagships' `setupI18nDefault` call, with a
 * loader for each installed bond, derived from the registry rather than a list in the CLI.
 *
 * The API had the same gap for every bond a core or provider package owns (`api-locales-config`,
 * `-secrets`, `-payments-stripe`): resources register their own on import, but nothing else
 * did. The API's `bonds/locales.ts` now registers each installed one, first in `setupBonds()`.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { check } from 'prettier'
import { afterAll, describe, expect, it } from 'vitest'

import {
  generateBondsIndexContent,
  synthesizeAppProjectFiles,
  synthesizeProjectFiles,
} from '../injector.js'
import { findPackageByRole, getRawRegistry, loadRegistry } from '../registry.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
/** The prettier config every scaffolded app ships. */
const PRETTIER = JSON.parse(
  readFileSync(join(ROOT, 'templates', 'app', 'shared', 'prettierrc.json.tpl'), 'utf8'),
)
/** The prettier config every scaffolded API ships. */
const API_PRETTIER = JSON.parse(
  readFileSync(join(ROOT, 'templates', 'api', 'prettierrc.json.tpl'), 'utf8'),
)

const registry = loadRegistry()
const i18nCore = findPackageByRole('app', 'core', 'i18n')!
const defaultSetup = findPackageByRole('app', 'feature', 'i18n-default')!
const appLocaleBonds = registry
  .filter((p) => p.molecule?.type === 'locales' && p.molecule?.stack === 'app')
  .map((p) => p.name)
  .sort()
/** The locale bond the setup package peers on and merges itself (the common bond). */
const commonBond = appLocaleBonds.find((name) =>
  (getRawRegistry().packages[defaultSetup]?.moleculePeers ?? []).includes(name),
)!
/** Every other app locale bond: the ones an app's bond must load. */
const localeBonds = appLocaleBonds.filter((name) => name !== commonBond)

/** The `bonds/i18n-default.ts` an app installing these packages gets. */
function i18nBond(installed: string[]): string {
  return appFile(installed, 'bonds/i18n-default.ts')
}

/** A file the app scaffold generates for these packages, by its path's ending. */
function appFile(installed: string[], ending: string): string {
  const files = synthesizeAppProjectFiles([], installed, '/tmp/test-app', registry)
  const file = files.find((f) => f.targetPath.endsWith(ending))
  if (!file?.content) throw new Error(`no ${ending} was generated`)
  return file.content
}

describe("the scaffolded app's i18n bond", () => {
  it('finds the packages it composes in the registry', () => {
    expect(i18nCore).toBeDefined()
    expect(defaultSetup).toBeDefined()
    expect(commonBond).toBeDefined()
    expect(localeBonds.length).toBeGreaterThan(2)
  })

  it('loads every installed companion locale bond through its per-language loader', () => {
    const [first, second] = localeBonds
    const bond = i18nBond([i18nCore, defaultSetup, commonBond, first, second])

    for (const pkg of [first, second]) {
      const local = bond.match(
        new RegExp(`import \\{ loadLocaleModule as (\\w+) \\} from '${pkg}/loader\\.js'`),
      )?.[1]
      expect(local, `${pkg} is never imported`).toBeDefined()
      expect(bond).toMatch(new RegExp(`packageLocaleLoaders: \\[[^\\]]*\\b${local}\\b`))
    }
    // setupI18nDefault merges the common bond itself.
    expect(bond).not.toContain(`'${commonBond}`)
    expect(bond).toContain(
      `import { setupI18nDefault as setupI18nProvider } from '${defaultSetup}'`,
    )
    expect(bond).toContain('export const i18nProvider = setupI18nProvider({')
    expect(bond).toContain('export function setupI18nDefault(): void {')
  })

  it('gives the bonds smoke test a loader for each bond, which the setup call reads at import', () => {
    // Mocked as an empty module, every generated test failed: vitest throws on reading an
    // export its mock does not define.
    const installed = [i18nCore, defaultSetup, commonBond, ...localeBonds.slice(0, 2)]
    const test = appFile(installed, '__tests__/bonds.test.ts')
    for (const pkg of localeBonds.slice(0, 2)) {
      expect(test).toContain(
        `vi.mock('${pkg}/loader.js', () => ({\n  loadLocaleModule: vi.fn(),\n}))`,
      )
    }
  })

  it.each([
    ['two bonds', 2],
    ['every bond', Number.POSITIVE_INFINITY],
    ['no bond', 0],
  ])('is printed the way the app formats it, with %s', async (_label, count) => {
    const bond = i18nBond([i18nCore, defaultSetup, commonBond, ...localeBonds.slice(0, count)])
    expect(await check(bond, { ...PRETTIER, parser: 'typescript' })).toBe(true)
  })

  it('keeps the plain provider when the default-setup package is not installed', () => {
    const bond = i18nBond([i18nCore, localeBonds[0]])
    expect(bond).toContain(`createSimpleI18nProvider('en', [`)
    expect(bond).not.toContain('packageLocaleLoaders')
  })
})

const apiI18n = findPackageByRole('api', 'core', 'i18n')!
const apiSecrets = findPackageByRole('api', 'core', 'secrets')!
const apiLocaleBonds = registry
  .filter((p) => p.molecule?.type === 'locales' && p.molecule?.stack === 'api')
  .map((p) => p.name)
  .sort()
const apiRoots: string[] = []
afterAll(() => {
  for (const root of apiRoots) rmSync(root, { recursive: true, force: true })
})

/** The `bonds/index.ts` and `bonds/locales.ts` an API installing these packages gets. */
async function apiBonds(installed: string[]): Promise<{ index: string; locales?: string }> {
  const root = mkdtempSync(join(tmpdir(), 'api-locale-bonds-'))
  apiRoots.push(root)
  const files = await synthesizeProjectFiles([], installed, root, registry)
  const content = (name: string): string | undefined =>
    files.find((f) => f.targetPath === join(root, 'src', 'bonds', name))?.content
  const index = content('index.ts')
  if (!index) throw new Error('no bonds/index.ts was generated')
  return { index, locales: content('locales.ts') }
}

describe("the scaffolded API's locale bonds", () => {
  it('registers every installed API locale bond, first in setupBonds', async () => {
    const [first, second] = apiLocaleBonds
    const { index, locales } = await apiBonds([apiI18n, apiSecrets, first, second])

    expect(locales).toContain(`import { registerLocaleModule } from '${apiI18n}'`)
    for (const pkg of [first, second]) {
      const local = locales?.match(new RegExp(`import \\* as (\\w+) from '${pkg}'`))?.[1]
      expect(local, `${pkg} is never imported`).toBeDefined()
      expect(locales).toMatch(new RegExp(`const localeModules = \\[[^\\]]*\\b${local}\\b`))
    }
    expect(locales).toContain('for (const locales of localeModules) registerLocaleModule(locales)')
    expect(index).toContain("import { setupLocales } from './locales.js'")
    expect(index).toContain('setupBonds(): Promise<void> {\n  setupLocales()\n')
  })

  it.each([
    ['two bonds', 2],
    ['every bond', Number.POSITIVE_INFINITY],
  ])('is printed the way the API formats it, with %s', async (_label, count) => {
    const { locales } = await apiBonds([apiI18n, apiSecrets, ...apiLocaleBonds.slice(0, count)])
    expect(await check(locales!, { ...API_PRETTIER, parser: 'typescript' })).toBe(true)
  })

  it('registers them before the secrets provider is bonded', async () => {
    const index = generateBondsIndexContent(
      [
        {
          interfacePackage: apiSecrets,
          providerPackage: '@molecule/api-secrets-env',
          interfaceType: 'secrets',
          setupCode: '',
        },
      ],
      [],
      ['DATABASE_URL'],
      [apiI18n, apiSecrets, '@molecule/api-secrets-env', apiLocaleBonds[0]],
      registry,
    )
    expect(index).toContain("import { setupLocales } from './locales.js'")
    expect(index.indexOf('  setupLocales()')).toBeGreaterThan(-1)
    expect(index.indexOf('  setupLocales()')).toBeLessThan(index.indexOf('  setupSecretsEnv()'))
    expect(await check(index, { ...API_PRETTIER, parser: 'typescript' })).toBe(true)
  })

  it('writes no locales bond and no call when no API locale bond is installed', async () => {
    const { index, locales } = await apiBonds([apiI18n, apiSecrets])
    expect(locales).toBeUndefined()
    expect(index).not.toContain('setupLocales')
  })
})
