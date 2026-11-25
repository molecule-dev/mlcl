import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { projectFramework, scorePackage, toSearchEntry } from '../../commands/search.js'
import { frameworksAcceptedBy, searchPackages, type SearchSourceEntry } from '../package-search.js'
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

const appFrameworks = loadAppFrameworks()

/**
 * The command's ranking against the full canonical catalog, as `mlcl search` runs it outside a
 * project: the registry's appFrameworks and no framework filter.
 */
function names(query: string): string[] {
  return searchPackages(packages.map(toSearchEntry), query, { appFrameworks }).map(
    (hit) => hit.name,
  )
}

describe('search capability and symbol relevance', () => {
  it.each([
    'server backed toggle',
    'optimistic toggle',
    'follow button',
    'favorite button',
    'star button',
    'thread subscription',
  ])('discovers the headless server toggle and its contract for %s', (query) => {
    const [hit] = searchPackages(packages.map(toSearchEntry), query, {
      stack: 'app',
      framework: 'react',
    })
    expect(hit?.name).toBe('@molecule/app-react')
    expect(hit?.description).toContain('useOptimisticToggle')
    expect(hit?.description).toContain('toggle()')
    expect(hit?.description).toContain('commit(desired)')
  })

  it('keeps a local toggle switch discoverable as a UI primitive', () => {
    const [hit] = searchPackages(packages.map(toSearchEntry), 'toggle switch', {
      stack: 'app',
      framework: 'react',
    })
    expect(hit?.name).toBe('@molecule/app-ui-react')
  })

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
  // Without one they come in the registry's appFrameworks order, React's first.
  // app-react-native re-exports app-react's hooks, and its entry lists them.
  const bindings = [
    '@molecule/app-react',
    '@molecule/app-vue',
    '@molecule/app-svelte',
    '@molecule/app-solid',
    '@molecule/app-angular',
    '@molecule/app-react-native',
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

  it('offers a renamed package only under the name that replaced it', () => {
    const entries = [
      {
        name: '@molecule/app-widget-react',
        stack: 'app' as const,
        replacedBy: '@molecule/app-widget',
        label: 'Widget',
        description: 'Widget setup',
      },
      {
        name: '@molecule/app-widget',
        stack: 'app' as const,
        label: 'Widget',
        description: 'Widget setup',
      },
    ]
    expect(searchPackages(entries, 'widget').map((hit) => hit.name)).toEqual([
      '@molecule/app-widget',
    ])
    expect(searchPackages(entries, 'widget react').map((hit) => hit.name)).toEqual([
      '@molecule/app-widget',
    ])
  })

  it('never offers a tooling package as a capability, with or without a stack filter', () => {
    const entries = [
      {
        name: '@molecule/eslint-config',
        stack: 'tooling' as const,
        label: 'ESLint config',
        description: 'ESLint config',
      },
      {
        name: '@molecule/app-eslint-report',
        stack: 'app' as const,
        label: 'ESLint report',
        description: 'ESLint report',
      },
    ]
    expect(searchPackages(entries, 'eslint').map((hit) => hit.name)).toEqual([
      '@molecule/app-eslint-report',
    ])
    expect(searchPackages(entries, 'eslint', { stack: 'app' }).map((hit) => hit.name)).toEqual([
      '@molecule/app-eslint-report',
    ])
  })

  // Round 34: Claude's searches ranked the template bundles, it named both in a custom stack, and
  // the Express bond bundle's required peers added 43 dependencies (Stripe, S3, Meilisearch, ...).
  it.each([
    ['express http server', '@molecule/api-server-default-express'],
    ['api authentication JWT login register', '@molecule/api-bonds-default-express'],
    ['default express bond setup', '@molecule/api-bonds-default-express'],
    ['default react bonds', '@molecule/app-bonds-default-react'],
  ])('never offers a bundle only the scaffolds choose: %s (OLD MUSTFAIL)', (query, bundle) => {
    const entries = packages.map(toSearchEntry)
    const stack = bundle.startsWith('@molecule/api-') ? 'api' : 'app'
    for (const options of [{ limit: 100 }, { stack, limit: 100 } as const])
      expect(searchPackages(entries, query, options).map((hit) => hit.name)).not.toContain(bundle)
  })

  it('counterexample: still offers the capabilities those searches are for, a hidden core and the PWA defaults', () => {
    const entries = packages.map(toSearchEntry)
    const names = (query: string): string[] =>
      searchPackages(entries, query, { limit: 10 }).map((hit) => hit.name)
    expect(names('api authentication JWT login register')).toContain('@molecule/api-resource-user')
    expect(names('api config')).toContain('@molecule/api-config')
    expect(names('pwa default')).toContain('@molecule/app-pwa-default')
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
      '@molecule/app-react-native',
    ])
    // A native project finds the hook in its own binding, which re-exports React's.
    const native = searchPackages(entries, 'useProfileForm', {
      framework: 'react-native',
      appFrameworks,
    })
    expect(native[0]?.name).toBe('@molecule/app-react-native')
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
    // The two packages `payment` names lead; the in-memory capture provider no longer wins a tie.
    expect(names('payment').slice(0, 2).sort()).toEqual([
      '@molecule/api-payments',
      '@molecule/api-resource-payment',
    ])
    expect(names('waveform')[0]).toBe('@molecule/app-feature-audio-waveform-react')
    // Framework counterparts can occupy every leading unfiltered hit. Exercise
    // the project's framework filter, as the CLI does for a React app.
    const routing = searchPackages(packages.map(toSearchEntry), 'URL pagination filters', {
      stack: 'app',
      framework: 'react',
    })
    expect(routing.slice(0, 3).map((hit) => hit.name)).toContain(
      '@molecule/app-routing-react-router',
    )
  })

  it("gives a feature's framework counterparts one place when no framework is named", () => {
    const frameworks = ['react', 'vue', 'svelte', 'solid', 'angular']
    const entries: SearchSourceEntry[] = [
      ...frameworks.map((framework): SearchSourceEntry => ({
        name: `@molecule/app-feature-wave-${framework}`,
        stack: 'app',
        category: 'audio-waveform',
        label: `Wave ${framework}`,
        description: 'Draws an audio waveform',
        framework,
      })),
      {
        name: '@molecule/app-wave-peaks',
        stack: 'app',
        category: 'audio',
        label: 'Peaks',
        description: 'Waveform peaks',
      },
    ]
    const run = (query: string, framework?: string): string[] =>
      searchPackages(entries, query, { appFrameworks, framework }).map((hit) => hit.name)

    // All six score the same: React's counterpart leads its group (the registry lists it first,
    // although angular sorts first by name), the other feature comes next, then the rest of the
    // group in the registry's framework order.
    expect(run('waveform')).toEqual([
      '@molecule/app-feature-wave-react',
      '@molecule/app-wave-peaks',
      ...['vue', 'svelte', 'solid', 'angular'].map((key) => `@molecule/app-feature-wave-${key}`),
    ])
    // A query naming a framework leads with that framework's counterpart.
    expect(run('waveform angular').slice(0, 2)).toEqual([
      '@molecule/app-feature-wave-angular',
      '@molecule/app-wave-peaks',
    ])
    // Counterexample: a framework filter keeps only the importable counterpart, in score order.
    expect(run('waveform', 'vue')).toEqual([
      '@molecule/app-feature-wave-vue',
      '@molecule/app-wave-peaks',
    ])
  })

  it('counts a query that names a category and an export once, so the core leads its providers', () => {
    // Mailgun, Sendmail and SES export an alias named `email`: with both bonuses a query for the
    // category put all three above @molecule/api-emails, and Codex searched again for the core
    // (harness eval `find`, 2026-11-25).
    const api = searchPackages(packages.map(toSearchEntry), 'email', { stack: 'api', limit: 6 })
    expect(api[0]?.name).toBe('@molecule/api-emails')
    const core = { ...pkg('@molecule/app-widgets'), name: '@molecule/app-widgets' }
    const provider = pkg('@molecule/app-widgets-acme', [], ['example'])
    expect(scorePackage(core, 'example')).toBeGreaterThanOrEqual(scorePackage(provider, 'example'))
    // Counterexample: an export alone still finds its package, and a category member that exports
    // the name still outranks a package that only exports it.
    const owner = { ...pkg('@molecule/app-elsewhere', [], ['example']) }
    owner.molecule = { ...owner.molecule!, category: 'other' }
    expect(scorePackage(owner, 'example')).toBeGreaterThan(0)
    expect(scorePackage(provider, 'example')).toBeGreaterThan(scorePackage(owner, 'example'))
  })

  it('gives an equal score to the package the other matches build on', () => {
    type Entry = SearchSourceEntry
    const entry = (name: string, runtimeDependencies?: string[]): Entry => ({
      name,
      stack: 'api',
      category: 'widgets',
      label: 'Widgets',
      description: 'Widgets',
      ...(runtimeDependencies ? { runtimeDependencies } : {}),
    })
    const order = (list: Entry[]): string[] =>
      searchPackages(list, 'widgets').map((hit) => hit.name)
    // All three score the same; api-alpha-widgets sorts first by name, api-zeta-widgets builds on
    // api-base-widgets.
    expect(
      order([
        entry('@molecule/api-alpha-widgets'),
        entry('@molecule/api-base-widgets'),
        entry('@molecule/api-zeta-widgets', ['@molecule/api-base-widgets']),
      ]),
    ).toEqual([
      '@molecule/api-base-widgets',
      '@molecule/api-alpha-widgets',
      '@molecule/api-zeta-widgets',
    ])
    // Counterexample: with nothing built on any of them, the shorter name leads (it holds more of
    // the query), then the name decides as before.
    expect(
      order([
        entry('@molecule/api-zeta-widgets'),
        entry('@molecule/api-base-widgets'),
        entry('@molecule/api-alpha-widgets'),
        entry('@molecule/api-widgets'),
      ]),
    ).toEqual([
      '@molecule/api-widgets',
      '@molecule/api-alpha-widgets',
      '@molecule/api-base-widgets',
      '@molecule/api-zeta-widgets',
    ])
    expect(names('transactional email')[0]).toBe('@molecule/api-emails')
  })

  // An agent asked for `users`, `api-users` and `api-server-express` in turn: the first ranked
  // email, feature flags and notifications, the second found nothing, so it guessed more names
  // before it read the user resource's doc (harness eval `scaffold`, 2026-11-25; OLD MUSTFAIL).
  it('finds a package by a plural word or a hyphenated name of its words', () => {
    for (const query of ['users', 'api-users', 'api-user', '@molecule/api-users'])
      expect(names(query)[0], query).toBe('@molecule/api-resource-user')
    expect(scorePackage(pkg('@molecule/app-cookie-banner'), 'cookies')).toBeGreaterThan(0)
    expect(scorePackage(pkg('@molecule/api-category'), 'categories')).toBeGreaterThan(0)
    expect(scorePackage(pkg('@molecule/app-class-list'), 'classes')).toBeGreaterThan(0)
    expect(scorePackage(pkg('@molecule/app-auth-ui-react'), 'react-auth')).toBeGreaterThan(0)
    // Every word of the query in one hint (`url backed pagination filters`) puts the router first.
    expect(names('URL pagination filters')[0]).toBe('@molecule/app-routing-react-router')
  })

  it('counterexample: a hyphenated name needs every word, and a word ending in ss stays whole', () => {
    // The bundle `api-server-express` names is scaffold-only, and no other package has both words.
    expect(names('api-server-express')).toEqual([])
    expect(scorePackage(pkg('@molecule/api-middleware-express'), 'api-server-express')).toBe(0)
    // Prose spellings are not names: `sign-up` does not match a package named `signup`.
    expect(scorePackage(pkg('@molecule/app-signup-form'), 'sign-up')).toBe(0)
    expect(scorePackage(pkg('@molecule/app-clas'), 'class')).toBe(0)
    // A hint holding every query word ranks below one holding the phrase.
    const phrase = pkg('@molecule/app-one', ['favorite button'])
    const words = pkg('@molecule/app-two', ['favorite unfavorite button'])
    expect(scorePackage(phrase, 'favorite button')).toBeGreaterThan(
      scorePackage(words, 'favorite button'),
    )
    expect(scorePackage(words, 'favorite button')).toBeGreaterThan(0)
  })

  // The icon set exports an icon named `user`, and the export alone put it first for `user`;
  // the locale bond's description holds "user resource", which put it above the resource for
  // that query (OLD MUSTFAIL).
  it('leads a word query with the package it names, ahead of an icon export or a locale bond', () => {
    expect(names('user')[0]).toBe('@molecule/api-resource-user')
    expect(names('user resource')[0]).toBe('@molecule/api-resource-user')
    for (const [query, name] of [
      ['upload', '@molecule/api-uploads'],
      ['uploads', '@molecule/api-uploads'],
      ['map', '@molecule/app-maps'],
      ['vue', '@molecule/app-vue'],
      // A category's name leads with its core, ahead of the capture provider and the queue backends.
      ['payments', '@molecule/api-payments'],
      ['queue', '@molecule/api-queue'],
      ['cache', '@molecule/api-cache'],
    ])
      expect(names(query)[0], query).toBe(name)
    expect(scorePackage(pkg('@molecule/app-widget'), 'widget')).toBeGreaterThan(160)
    // Counterexample: a query naming a provider still leads with it.
    expect(names('stripe')[0]).toBe('@molecule/api-payments-stripe')
  })

  it('counterexample: a name word, a locale bond and a symbol-cased query get no name credit', () => {
    const owner = pkg('@molecule/app-widget')
    const word = pkg('@molecule/app-widget-shelf')
    const locale = { ...pkg('@molecule/app-locales-widget') }
    locale.molecule = { ...locale.molecule!, type: 'locales' }
    // Only the package the word names gets the name's weight (160): the one holding it as one of
    // its words, the locale bond and a capitalized symbol lookup get their word scores alone.
    expect(scorePackage(word, 'widget')).toBeLessThan(100)
    expect(scorePackage(locale, 'widget')).toBeLessThan(100)
    expect(scorePackage(owner, 'Widget')).toBeLessThan(100)
    // The core of the category keeps its place: the payments resource holds the word, not the name.
    expect(names('payments').slice(0, 3)).toContain('@molecule/api-payments')
    expect(names('User')[0]).toBe('@molecule/app-icons-molecule')
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
