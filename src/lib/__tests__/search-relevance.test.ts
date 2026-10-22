import { describe, expect, it } from 'vitest'

import { scorePackage } from '../../commands/search.js'
import { loadRegistry } from '../registry.js'
import type { InferredPackage } from '../schema.js'

const packages = loadRegistry()
const react = packages.find((pkg) => pkg.name === '@molecule/app-react')!

/** Small packages using the same inferred-package shape as the actual CLI. */
function pkg(name: string, hints: string[] = [], exports: string[] = []): InferredPackage {
  return {
    ...react,
    name,
    description: '',
    exports,
    molecule: { ...react.molecule!, label: name, category: 'example', intentHints: hints },
  }
}

/** The command's existing one-score ordering against the full canonical catalog. */
function names(query: string): string[] {
  return packages
    .map((p) => ({ name: p.name, score: scorePackage(p, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 20)
    .map((hit) => hit.name)
}

describe('search capability and symbol relevance', () => {
  it.each([
    'profile form',
    'profile settings form',
    'edit profile',
    'profile form hook',
    'account profile form',
  ])('finds the shared profile controller for %s', (query) => {
    expect(names(query)[0]).toBe('@molecule/app-react')
  })

  it.each(['useProfileForm', 'useprofileform', 'useProfileForm()'])(
    'finds the package exporting %s',
    (query) => {
      expect(names(query)[0]).toBe('@molecule/app-react')
    },
  )

  it('makes full phrase evidence outrank an incidental name substring generically', () => {
    const capability = pkg('@molecule/app-bindings', ['account editor'])
    const incidental = pkg('@molecule/app-account-editorial')
    const partialHint = pkg('@molecule/app-different', ['account editorial'])
    expect(scorePackage(capability, 'account editor')).toBeGreaterThan(
      scorePackage(incidental, 'account editor'),
    )
    expect(scorePackage(capability, 'account editor')).toBeGreaterThan(
      scorePackage(partialHint, 'account editor'),
    )
    expect(scorePackage(capability, 'Account-Editor')).toBeGreaterThan(0)
  })

  it('matches a whole exported symbol, never its substring or a longer invented name', () => {
    const capability = pkg('@molecule/app-bindings', [], ['useAccountEditor'])
    expect(scorePackage(capability, 'useAccountEditor')).toBeGreaterThan(0)
    expect(scorePackage(capability, 'use')).toBe(0)
    expect(scorePackage(capability, 'useAccountEditorState')).toBe(0)
    expect(scorePackage(pkg('@molecule/app-other', [], ['*']), '!!!')).toBe(0)
    expect(scorePackage(pkg('@molecule/app-other', [], ['account_editor']), 'account-editor')).toBe(
      0,
    )
    expect(scorePackage(pkg('@molecule/app-other', [], ['$']), '$')).toBeGreaterThan(0)
  })

  it('preserves partial package-name and ordinary category/provider discovery', () => {
    expect(names('postgres')[0]).toBe('@molecule/api-database-postgresql')
    expect(names('postg')[0]).toBe('@molecule/api-database-postgresql')
    expect(names('database').slice(0, 5)).toContain('@molecule/api-database')
    expect(
      names('query')
        .slice(0, 3)
        .every((name) => packages.find((p) => p.name === name)?.molecule?.category === 'query'),
    ).toBe(true)
    expect(names('payment')[0]).toBe('@molecule/api-payments-capture')
    expect(names('waveform')[0]).toBe('@molecule/app-feature-audio-waveform-react')
    expect(names('URL pagination filters').slice(0, 3)).toContain(
      '@molecule/app-routing-react-router',
    )
  })

  it('keeps exact package names above incidental symbols and rejects unrelated phrase matches', () => {
    const exact = pkg('@molecule/app-bindings')
    const symbol = pkg('@molecule/app-other', [], ['app-bindings'])
    expect(scorePackage(exact, '@molecule/app-bindings')).toBeGreaterThan(
      scorePackage(symbol, 'app-bindings'),
    )
    expect(names('profile format').slice(0, 3)).not.toContain('@molecule/app-react')
    expect(names('useProfileFormState')).not.toContain('@molecule/app-react')
  })
})
