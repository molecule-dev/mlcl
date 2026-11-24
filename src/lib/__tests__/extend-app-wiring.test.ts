/**
 * The merge `mlcl inject -m` applies to an app project's existing i18n bond, so a companion
 * locale bond that `mlcl add --inject` installs is loaded, not only declared.
 *
 * @module
 */
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { appI18nBondFile, extendAppLocales } from '../extend-app-wiring.js'
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
