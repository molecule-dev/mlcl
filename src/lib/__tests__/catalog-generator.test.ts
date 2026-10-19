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
})
