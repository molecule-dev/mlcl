import { describe, expect, it } from 'vitest'

import { buildCatalog } from '../catalog-generator.js'
import { getRawRegistry } from '../registry.js'

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
    const out = buildCatalog({ registry, framework: 'react', stack: 'full-stack' })
    expect(out).toContain('## Packages without declared intent (reference)')
  })

  it('stack=api excludes app-stack packages', () => {
    const out = buildCatalog({ registry, framework: 'react', stack: 'api' })
    expect(out).not.toContain('@molecule/app-')
  })
})
