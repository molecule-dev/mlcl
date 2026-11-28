/**
 * The merge `mlcl inject -m` applies to an app project's existing i18n bond, so a companion
 * locale bond that `mlcl add --inject` installs is loaded, not only declared.
 *
 * @module
 */
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { appI18nBondFile, extendAppLocales, usePackageLocales } from '../extend-app-wiring.js'
import { generateI18nDefaultSetupBond } from '../injector.js'

const SETUP = '@molecule/app-i18n-default'

/** The i18n bond the generator writes for an app that installs these packages. */
const bond = (bindings: string[]): string =>
  generateI18nDefaultSetupBond(undefined, SETUP, 'i18nProvider', 'I18nDefault', [
    SETUP,
    ...bindings,
  ])

/** What a bond file loads: its import specifiers and its `packageLocaleLoaders` entries. */
function loads(source: string): { imports: string[]; loaders: string[] } {
  const file = ts.createSourceFile('i18n.ts', source, ts.ScriptTarget.Latest, true)
  const imports = file.statements
    .filter(ts.isImportDeclaration)
    .map((node) => (node.moduleSpecifier as ts.StringLiteral).text)
    .sort()
  const loaders: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'packageLocaleLoaders' &&
      ts.isArrayLiteralExpression(node.initializer)
    )
      loaders.push(...node.initializer.elements.map((element) => element.getText(file)))
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { imports, loaders: loaders.sort() }
}

/** Fails when the merged file is not valid TypeScript. */
function expectParses(source: string): void {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  })
  expect(result.diagnostics ?? []).toEqual([])
}

describe('extendAppLocales', () => {
  it('names the bond file the registry gives the app i18n core', () => {
    expect(appI18nBondFile()).toBe('i18n-default.ts')
  })

  it("adds a new package's locale bond loader to a bond that already loads others", () => {
    const existing = bond(['@molecule/app-locales-auth', '@molecule/app-locales-ui'])
    const added = bond([
      '@molecule/app-locales-auth',
      '@molecule/app-locales-ui',
      '@molecule/app-locales-billing',
    ])
    const merged = extendAppLocales(existing, added)
    expect(loads(merged)).toEqual(loads(added))
    expect(merged).toContain(
      "import { loadLocaleModule as billingLocales } from '@molecule/app-locales-billing/loader.js'",
    )
    expectParses(merged)
  })

  it('adds packageLocaleLoaders to a bond that loaded no locale bond yet', () => {
    const existing = bond([])
    expect(loads(existing).loaders).toEqual([])
    const added = bond(['@molecule/app-locales-billing', '@molecule/app-locales-clipboard'])
    const merged = extendAppLocales(existing, added)
    expect(loads(merged)).toEqual(loads(added))
    expectParses(merged)
  })

  it('keeps the rest of the file as the project has it', () => {
    const existing = bond(['@molecule/app-locales-auth']).replace(
      'export function setupI18nDefault(): void {',
      '// The project keeps this note.\nexport function setupI18nDefault(): void {',
    )
    const merged = extendAppLocales(existing, bond(['@molecule/app-locales-billing']))
    expect(merged).toContain('// The project keeps this note.')
    expect(loads(merged).loaders).toEqual(['authLocales', 'billingLocales'])
  })

  it('leaves a bond that already loads every generated locale bond unchanged', () => {
    const existing = bond(['@molecule/app-locales-auth', '@molecule/app-locales-billing'])
    expect(extendAppLocales(existing, bond(['@molecule/app-locales-billing']))).toBe(existing)
    expect(extendAppLocales(existing, bond([]))).toBe(existing)
  })

  it('imports a loader under a free name when the generated one is already bound', () => {
    const existing = bond(['@molecule/app-locales-auth']).replace(
      "import { ui as en } from '../locales/en/ui.js'",
      "import { ui as en } from '../locales/en/ui.js'\nimport { billingLocales } from './own-billing.js'",
    )
    const merged = extendAppLocales(existing, bond(['@molecule/app-locales-billing']))
    expect(merged).toContain(
      "import { loadLocaleModule as billingLocalesAdded } from '@molecule/app-locales-billing/loader.js'",
    )
    expect(loads(merged).loaders).toEqual(['authLocales', 'billingLocalesAdded'])
    expectParses(merged)
  })

  it('refuses a bond with no i18n setup call to extend, naming the file', () => {
    expect(() =>
      extendAppLocales(
        'export const i18nProvider = createProvider()\n',
        bond(['@molecule/app-locales-billing']),
      ),
    ).toThrow('Cannot extend src/bonds/i18n-default.ts')
  })
})

/**
 * The i18n bond mlcl 2.2.15 wrote for an app with managed locales: each locale bond's loader.js,
 * which lists all 79 languages, so the build carried a chunk for every language of every bond.
 */
const MANAGED_2_2_15 = `/**
 * Default i18n bond setup
 *
 * Uses setupI18nDefault from @molecule/app-i18n-default. The primary dictionary loads at startup.
 * Every other language loads when the app switches to it, from the app's
 * locales/<code>/ui.ts and from each companion locale bond the app installs, listed below.
 * \`npx mlcl add <package> --inject\` (or \`npx mlcl inject\`) rewrites this file with the new list.
 * Swap to a different i18n provider by replacing this bond.
 */

import { setupI18nDefault as setupI18nProvider } from '@molecule/app-i18n-default'
import { loadLocaleModule as authLocales } from '@molecule/app-locales-auth/loader.js'
import { loadLocaleModule as uiLocales } from '@molecule/app-locales-ui/loader.js'

import { lazyLoadUi, primaryUi, supportedLocales } from '../locales/project.js'

export const i18nProvider = setupI18nProvider({
  enUi: primaryUi,
  lazyLoadUi,
  supportedLocales,
  packageLocaleLoaders: [
    authLocales,
    uiLocales,
  ],
})

export function setupI18nDefault(): void {
  // The provider above is already bonded.
}
`

/** The bond the generator writes for an app with managed locales. */
const managed = (bindings: string[], project: { primary: string; offered?: string }): string =>
  generateI18nDefaultSetupBond(
    undefined,
    SETUP,
    'i18nProvider',
    'I18nDefault',
    [SETUP, ...bindings],
    'vite',
    project,
  )

describe('usePackageLocales', () => {
  it('moves a bond mlcl 2.2.15 wrote onto locales/packages.ts', () => {
    const migrated = usePackageLocales(MANAGED_2_2_15)
    expect(loads(migrated)).toEqual({
      imports: ['../locales/packages.js', '../locales/project.js', SETUP],
      loaders: ['loadPackageLocales'],
    })
    expect(migrated).toContain('from the companion locale bonds in locales/packages.ts.')
    expect(migrated).not.toContain('listed below')
    expectParses(migrated)
    expect(usePackageLocales(migrated)).toBe(migrated)
  })

  it('keeps a loader the app added itself', () => {
    const own = MANAGED_2_2_15.replace(
      "import { lazyLoadUi, primaryUi, supportedLocales } from '../locales/project.js'",
      "import { lazyLoadUi, primaryUi, supportedLocales } from '../locales/project.js'\nimport { loadMine } from './mine.js'",
    ).replace('    uiLocales,\n', '    uiLocales,\n    loadMine,\n')
    expect(loads(usePackageLocales(own)).loaders).toEqual(['loadMine', 'loadPackageLocales'])
  })

  it('is what `mlcl add --inject` does to a managed bond, also when French is primary', () => {
    const french = MANAGED_2_2_15.replace(
      "import { setupI18nDefault as setupI18nProvider } from '@molecule/app-i18n-default'",
      "import { setupI18nDefault as setupI18nProvider } from '@molecule/app-i18n-default/setup.js'",
    )
      .replace('lazyLoadUi, primaryUi,', 'lazyLoadUi, primaryLocale, primaryUi,')
      .replace('  enUi: primaryUi,\n', '  primaryLocale,\n  primaryUi,\n')
    const generated = managed(['@molecule/app-locales-billing'], { primary: 'fr' })
    expect(loads(generated).loaders).toEqual(['loadPackageLocales'])
    const merged = extendAppLocales(french, generated)
    expect(loads(merged).loaders).toEqual(['loadPackageLocales'])
    expect(loads(merged).imports).not.toContain('@molecule/app-locales-auth/loader.js')
  })

  it('takes the setup entry that loads no locale bond when the installed package has it', () => {
    const offered = managed(['@molecule/app-locales-auth'], {
      primary: 'en',
      offered: `${SETUP}/offered.js`,
    })
    expect(offered).toContain(
      "import { setupI18nDefault as setupI18nProvider } from '@molecule/app-i18n-default/offered.js'",
    )
    expect(loads(offered).loaders).toEqual(['loadPackageLocales'])
    expect(loads(managed(['@molecule/app-locales-auth'], { primary: 'fr' })).imports).toContain(
      `${SETUP}/setup.js`,
    )
  })
})
