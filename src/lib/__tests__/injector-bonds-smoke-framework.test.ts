/**
 * The generated `bonds.test.ts` stubs a shared setup (`setupAllDefaultBonds`,
 * `setupI18nDefault`) and keeps the rest of that package real. It used to do so only for
 * the React names, so a Vue, Solid, Svelte or Angular project got the generic mock
 * instead: every export of its `@molecule/app-bonds-default-*` package replaced, with
 * `bootstrapApp` and the theme provider as `{}` and `vi.fn()`. The rule is now read
 * from the registry: a package exporting one of those setups gets the same mock on
 * every framework.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const plan: InjectionPlan = {
  molecule: '@molecule/app-theme-css-variables',
  moleculePackage: {
    name: '@molecule/app-theme-css-variables',
    version: '1.0.0',
    type: 'provider',
    routes: [],
    tables: [],
    exports: [],
    path: '/tmp/test-app',
  },
  files: [],
  dependencies: [],
  migrations: [],
  bondSetup: {
    providerPackage: '@molecule/app-theme-css-variables',
    interfacePackage: '@molecule/app-theme',
    interfaceType: 'theme',
    setupCode: '',
  },
  conflicts: [],
}

/** The generated smoke test for a project on `framework`'s default bonds. */
function bondsTest(framework: string): string {
  const installed = [
    '@molecule/app-theme',
    '@molecule/app-theme-css-variables',
    `@molecule/app-bonds-default-${framework}`,
    '@molecule/app-i18n',
    '@molecule/app-i18n-default-react',
  ]
  const file = synthesizeAppProjectFiles([plan], installed, '/tmp/test-app', loadRegistry()).find(
    (f) => f.targetPath === '/tmp/test-app/src/__tests__/bonds.test.ts',
  )
  if (!file?.content) throw new Error('no generated bonds.test.ts')
  return file.content
}

describe('bonds smoke test on every framework', () => {
  const react = bondsTest('react')

  it('stubs only the shared setups on React', () => {
    expect(react).toContain(
      "vi.mock('@molecule/app-bonds-default-react', async (importOriginal) => ({",
    )
    expect(react).toContain('  setupAllDefaultBonds: vi.fn(),')
    expect(react).toContain(
      "vi.mock('@molecule/app-i18n-default-react', async (importOriginal) => ({",
    )
    expect(react).toContain('  setupI18nDefault: vi.fn(() => ({})),')
  })

  it.each(['vue', 'solid', 'svelte', 'angular'])(
    'generates the same test for %s as for React, with its own package name',
    (framework) => {
      const generated = bondsTest(framework)
      expect(generated).not.toContain('bootstrapApp: {}')
      expect(
        generated.replaceAll(
          `@molecule/app-bonds-default-${framework}`,
          '@molecule/app-bonds-default-react',
        ),
      ).toBe(react)
    },
  )

  it('keeps the generic mock for a package without a shared setup', () => {
    // The framework-neutral `@molecule/app-bonds-default` exports bond setups but no
    // `setupAllDefaultBonds`: it is mocked export by export, like any other package.
    const file = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-theme', '@molecule/app-theme-css-variables', '@molecule/app-bonds-default'],
      '/tmp/test-app',
      loadRegistry(),
    ).find((f) => f.targetPath === '/tmp/test-app/src/__tests__/bonds.test.ts')
    const mock = mockOf(file?.content ?? '', '@molecule/app-bonds-default')
    expect(mock).toContain('setupAppThemeCssVariables: vi.fn(),')
    expect(mock).toContain('createDefaultHttpClient: vi.fn(() =>')
    expect(mock).not.toContain('setupAllDefaultBonds')
  })

  it('keeps the real exports a loaded package calls at import, stubbing only the recorded functions', () => {
    // A test run resolves @molecule packages through Vite, so a mock reaches every real
    // package that imports the mocked one: `@molecule/app-ui-tailwind` calls `cva` from
    // `@molecule/app-styling` as it loads, and the old `cva: {}` placeholder threw
    // "cva is not a function" in 10 flagship bonds tests.
    const file = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-theme', '@molecule/app-theme-css-variables', '@molecule/app-styling'],
      '/tmp/test-app',
      loadRegistry(),
    ).find((f) => f.targetPath === '/tmp/test-app/src/__tests__/bonds.test.ts')
    const mock = mockOf(file?.content ?? '', '@molecule/app-styling')
    expect(mock.split('\n').slice(0, 2)).toEqual([
      "vi.mock('@molecule/app-styling', async (importOriginal) => ({",
      '  ...(await importOriginal<Record<string, unknown>>()),',
    ])
    expect(mock).toContain('setClassMerger: vi.fn(),')
    expect(mock).not.toMatch(/\b(cva|cn|themeToCSS): /)
  })
  it('keeps the full stub for a provider, whose real module may need a browser', () => {
    // The project's bond files receive the provider stub; loading the real
    // `@molecule/app-rich-text-quill` would load Quill, which reads `document` as it loads
    // and fails a node test.
    const file = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-theme', '@molecule/app-theme-css-variables', '@molecule/app-rich-text-quill'],
      '/tmp/test-app',
      loadRegistry(),
    ).find((f) => f.targetPath === '/tmp/test-app/src/__tests__/bonds.test.ts')
    const mock = mockOf(file?.content ?? '', '@molecule/app-rich-text-quill')
    expect(mock.split('\n')[0]).toBe("vi.mock('@molecule/app-rich-text-quill', () => ({")
    expect(mock).not.toContain('importOriginal')
  })
})

/** The generated `vi.mock` call for one package, through its closing line. */
function mockOf(content: string, pkg: string): string {
  const start = content.indexOf(`vi.mock('${pkg}',`)
  if (start < 0) return ''
  // The mock's own closing line: a factory entry inside it closes with `}))` too.
  return content.slice(start, content.indexOf('\n}))', start) + 4)
}
