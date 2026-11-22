/**
 * One module identity per `@molecule` package in every emitted/scaffolded Vite
 * config, whichever install path an importer reaches it through.
 *
 * Bond state (`@molecule/app-bond`'s registry) and the query client are
 * module-level singletons. These configs all set `preserveSymlinks: true`, so
 * the same install reached through two paths — a `node_modules/node_modules`
 * self-link, a nested copy, a bind-mounted workspace — loads twice and the two
 * copies hold separate registries. The app's `setProvider()` bonds one and
 * `getQueryClient()` in a package that resolved the other throws "No provider
 * bonded" (X1 xr-molecule-flash-l148). The mechanism is Vite's `resolve.dedupe`
 * over every discovered `@molecule` package: dedupe goes through normal package
 * resolution, so exports maps, conditions and subpaths still apply — an alias
 * that rewrites the specifier to a package directory would bypass them.
 *
 * The files here are templates, not modules this suite can execute (they carry
 * `{{…}}` placeholders and read the app's `node_modules` at load), so this pins
 * the emitted text; the resolver behaviour itself is covered against a real
 * Vite resolver by `@molecule/app-vite-config-default`'s
 * `molecule-identity.test.ts`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'templates')

const CONFIGS = [
  'static/vite.config.ts.tpl',
  'apps/static-site/app/vite.config.ts',
  'showcase/react/vite.config.ts',
  'showcase/react-native-web/vite.config.ts',
  'showcase/vue/vite.config.ts',
  'showcase/svelte/vite.config.ts',
  'showcase/solid/vite.config.ts',
  'showcase/angular/vite.config.ts',
]

/** The `dedupe: [...]` array of a config file, or `undefined` when it has none. */
const dedupeList = (source: string): string | undefined =>
  /dedupe:\s*\[([^\]]*)\]/.exec(source)?.[1]

describe.each(CONFIGS)('%s', (relative) => {
  const source = readFileSync(join(TEMPLATES, relative), 'utf8')

  it('dedupes every installed @molecule package', () => {
    // `moleculePackages` is the config's own discovery of node_modules/@molecule
    // — the list already used for optimizeDeps.exclude. Two identities for any
    // of those packages means two bond registries.
    expect(dedupeList(source)).toContain('...moleculePackages')
  })

  it('keeps preserveSymlinks, so the fix is what canonicalizes the path', () => {
    // Without preserveSymlinks Vite realpaths symlinked modules and the
    // duplicate never appears; with it, dedupe is the canonicalizer. Both must
    // stay, or this regression class reopens on a symlinked install.
    expect(source).toContain('preserveSymlinks: true')
  })
})

describe('app/shared/vite.config.ts.tpl', () => {
  it('takes dedupe, preserveSymlinks and the React pin from createFrameworkViteConfig', () => {
    // One copy of the resolve block, in @molecule/app-vite-config-default (whose
    // molecule-identity.test.ts runs it against a real Vite resolver); a second one here
    // would drift from the flagships'.
    const source = readFileSync(join(TEMPLATES, 'app/shared/vite.config.ts.tpl'), 'utf8')
    expect(source).toContain('createFrameworkViteConfig(')
    expect(dedupeList(source)).toBeUndefined()
    expect(source).not.toContain('preserveSymlinks')
  })
})

describe('the static-site template pins React as well', () => {
  it('apps/static-site/app/vite.config.ts resolves React from the app root in the browser only', () => {
    // A directory alias maps react-dom/static to its CommonJS shim and keeps the dev SSR
    // runner from externalizing React, so no route prerendered (`module is not defined`).
    const source = readFileSync(join(TEMPLATES, 'apps/static-site/app/vite.config.ts'), 'utf8')
    expect(source).toContain('singleReactPlugin,')
    expect(source).toContain("applyToEnvironment: (environment) => environment.name === 'client'")
    expect(source).not.toContain('alias: singleReactAliases')
  })
})
