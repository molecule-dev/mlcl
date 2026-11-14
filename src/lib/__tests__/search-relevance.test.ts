import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { projectFramework, scorePackage, toSearchEntry } from '../../commands/search.js'
import { frameworksAcceptedBy, searchPackages } from '../package-search.js'
import { loadAppFrameworks, loadRegistry } from '../registry.js'
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

  // Every framework binding exports the same hook names, so a symbol query
  // finds each of them with the same score; the project's framework picks one.
  const bindings = [
    '@molecule/app-angular',
    '@molecule/app-react',
    '@molecule/app-solid',
    '@molecule/app-svelte',
    '@molecule/app-vue',
  ]
  it.each(['useProfileForm', 'useprofileform', 'useProfileForm()'])(
    'finds every framework binding exporting %s',
    (query) => {
      expect(names(query).slice(0, bindings.length)).toEqual(bindings)
    },
  )

  it.each([
    ['react', '@molecule/app-react'],
    ['vue', '@molecule/app-vue'],
    ['svelte', '@molecule/app-svelte'],
    ['solid', '@molecule/app-solid'],
    ['angular', '@molecule/app-angular'],
  ])("returns the %s project's binding for useProfileForm", (framework, binding) => {
    const hits = searchPackages(packages.map(toSearchEntry), 'useProfileForm', { framework })
    expect(hits[0]?.name).toBe(binding)
    expect(hits.map((hit) => hit.name).filter((name) => bindings.includes(name))).toEqual([binding])
  })

  it('counterexample: a framework keeps framework-neutral packages', () => {
    const all = searchPackages(packages.map(toSearchEntry), 'payments', { limit: 100 })
    const vue = searchPackages(packages.map(toSearchEntry), 'payments', {
      framework: 'vue',
      limit: 100,
    })
    expect(all.length).toBeGreaterThan(0)
    expect(vue.map((hit) => hit.name)).toEqual(
      all
        .map((hit) => hit.name)
        .filter((name) => {
          const framework = packages.find((p) => p.name === name)?.molecule?.framework
          return !framework || framework === 'vue'
        }),
    )
  })

  const appFrameworks = loadAppFrameworks()

  it.each([
    ['react', ['react']],
    ['vue', ['vue']],
    ['svelte', ['svelte']],
    ['solid', ['solid']],
    ['angular', ['angular']],
    // A native project installs no react-dom, so React DOM packages are not its own.
    ['react-native', ['react-native']],
    // react-native-web renders with the react-native UI set on React DOM + react-router.
    ['react-native-web', ['react-native-web', 'react-native', 'react']],
  ])('a %s project imports packages written for %j', (project, accepted) => {
    expect(frameworksAcceptedBy(project, appFrameworks)).toEqual(accepted)
  })

  it('accepts only its own key for a framework the registry does not know, and skips malformed entries', () => {
    expect(frameworksAcceptedBy('qwik', appFrameworks)).toEqual(['qwik'])
    const malformed = { web: { dependencies: { a: '1' } }, broken: null } as unknown as Record<
      string,
      { dependencies?: Record<string, string> }
    >
    expect(frameworksAcceptedBy('web', malformed)).toEqual(['web'])
  })

  it('keeps React and react-native packages for a react-native-web project', () => {
    const entries = packages.map(toSearchEntry)
    const rnw = searchPackages(entries, 'useProfileForm', {
      framework: 'react-native-web',
      appFrameworks,
    })
    expect(rnw[0]?.name).toBe('@molecule/app-react')
    expect(rnw.map((hit) => hit.name).filter((name) => bindings.includes(name))).toEqual([
      '@molecule/app-react',
    ])
    const ui = searchPackages(entries, 'react native ui', {
      framework: 'react-native-web',
      appFrameworks,
      limit: 100,
    }).map((hit) => hit.name)
    expect(ui).toContain('@molecule/app-ui-react-native')
    // Counterexamples: a React project does not get the react-native UI set, and a
    // native project does not get React DOM bindings.
    expect(
      searchPackages(entries, 'react native ui', {
        framework: 'react',
        appFrameworks,
        limit: 100,
      }).map((hit) => hit.name),
    ).not.toContain('@molecule/app-ui-react-native')
    expect(
      searchPackages(entries, 'useProfileForm', { framework: 'react-native', appFrameworks }).map(
        (hit) => hit.name,
      ),
    ).not.toContain('@molecule/app-react')
  })

  it('reads the framework a project declares, from its app half or its own manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'search-framework-'))
    try {
      expect(projectFramework(dir)).toBeUndefined()
      // Counterexample: depending on a framework (mlcl depends on React for its tests)
      // is not declaring one.
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { react: '19.3.1' } }),
      )
      expect(projectFramework(dir)).toBeUndefined()
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ molecule: { framework: 'vue' } }))
      expect(projectFramework(dir)).toBe('vue')
      mkdirSync(join(dir, 'app'))
      writeFileSync(
        join(dir, 'app', 'package.json'),
        JSON.stringify({ molecule: { framework: 'svelte' } }),
      )
      expect(projectFramework(dir)).toBe('svelte')
      writeFileSync(join(dir, 'app', 'package.json'), '{ not json')
      expect(projectFramework(dir)).toBe('vue')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

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
