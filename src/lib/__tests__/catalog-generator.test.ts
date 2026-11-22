import { describe, expect, it } from 'vitest'

import { buildCatalog } from '../catalog-generator.js'
import { getRawRegistry } from '../registry.js'
import type { Registry } from '../schema.js'

describe('catalog-generator', () => {
  const registry = getRawRegistry()

  it('produces deterministic output for react/app', () => {
    const a = buildCatalog({ registry, framework: 'react', stack: 'app' })
    const b = buildCatalog({ registry, framework: 'react', stack: 'app' })
    expect(a).toBe(b)
  })

  it('sorts intents and packages alphabetically', () => {
    const out = buildCatalog({ registry, framework: 'react', stack: 'full-stack' })
    const intentHeadings = [...out.matchAll(/^## Intent: (.+)$/gm)].map((m) => m[1])
    const sorted = [...intentHeadings].sort((a, b) => a.localeCompare(b))
    expect(intentHeadings).toEqual(sorted)
  })

  it('groups seeded packages under their intent hints', () => {
    const out = buildCatalog({ registry, framework: 'react', stack: 'app' })
    expect(out).toContain('## Intent: social login')
    expect(out).toMatch(/## Intent: social login[\s\S]*?@molecule\/app-oauth-logos-react/)
    expect(out).toContain('## Intent: pagination')
    expect(out).toMatch(/## Intent: pagination[\s\S]*?@molecule\/app-pagination-bar-react/)
  })

  it('filters out framework-mismatched packages', () => {
    const react = buildCatalog({ registry, framework: 'react', stack: 'app' })
    const vue = buildCatalog({ registry, framework: 'vue', stack: 'app' })
    // react-only package should appear in react output and not in vue output
    expect(react).toContain('@molecule/app-oauth-logos-react')
    expect(vue).not.toContain('@molecule/app-oauth-logos-react')
  })

  it('lists feature packages without hints in the reference section', () => {
    // The live registry declares a hint for every feature package now, so the
    // section is legitimately absent there; the behavior under test is the
    // fallback a registry with an unhinted feature package still gets.
    const fixture = {
      version: 1,
      apiFrameworks: {},
      appFrameworks: {},
      packages: {
        '@molecule/app-unhinted-react': {
          type: 'feature',
          category: 'test',
          stack: 'app',
          label: 'Unhinted',
          description: 'No intent hint',
        },
        '@molecule/app-hinted-react': {
          type: 'feature',
          category: 'test',
          stack: 'app',
          label: 'Hinted',
          intentHints: ['something'],
        },
      },
    } as unknown as Registry
    const out = buildCatalog({ registry: fixture, framework: 'react', stack: 'full-stack' })
    expect(out).toContain('## Packages without declared intent (reference)')
    expect(out).toMatch(
      /## Packages without declared intent \(reference\)[\s\S]*app-unhinted-react/,
    )
    expect(out).not.toMatch(
      /## Packages without declared intent \(reference\)[\s\S]*app-hinted-react/,
    )
  })

  it('stack=api excludes app-stack packages', () => {
    const out = buildCatalog({ registry, framework: 'react', stack: 'api' })
    expect(out).not.toContain('@molecule/app-')
  })

  it('lists a renamed package under its replacement only, in every stack', () => {
    const entry = registry.packages['@molecule/app-i18n-default']
    expect(entry, 'the fixture registry has the default i18n setup').toBeDefined()
    const renamed: Registry = {
      ...registry,
      packages: {
        ...registry.packages,
        '@molecule/app-i18n-default-old': { ...entry, replacedBy: '@molecule/app-i18n-default' },
      },
    }
    for (const stack of ['app', 'full-stack'] as const) {
      const out = buildCatalog({ registry: renamed, framework: 'react', stack })
      expect(out).not.toContain('@molecule/app-i18n-default-old')
      expect(out).toMatch(/@molecule\/app-i18n-default(?![-\w])/)
    }
  })

  it('offers no tooling package, even a hinted one, in any stack', () => {
    const withTooling: Registry = {
      ...registry,
      packages: {
        ...registry.packages,
        '@molecule/lint-thing': {
          language: 'typescript',
          runtime: 'node',
          type: 'utility',
          category: 'lint-thing',
          label: 'Lint thing',
          description: 'Shared lint config',
          stack: 'tooling',
          exports: [],
          secrets: [],
          runtimeDependencies: [],
          path: 'packages/tooling/lint-thing',
          intentHints: ['social login'],
        },
      },
    }
    for (const stack of ['api', 'app', 'full-stack'] as const) {
      const out = buildCatalog({ registry: withTooling, framework: 'react', stack })
      expect(out).not.toContain('@molecule/lint-thing')
    }
    // Counterexample: the same intent still lists its app packages.
    expect(buildCatalog({ registry: withTooling, framework: 'react', stack: 'app' })).toMatch(
      /## Intent: social login[\s\S]*?@molecule\/app-oauth-logos-react/,
    )
  })
})
