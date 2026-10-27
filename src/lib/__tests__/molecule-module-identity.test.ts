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
  'app/shared/vite.config.ts.tpl',
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

describe('the app templates pin React as well', () => {
  it.each(['app/shared/vite.config.ts.tpl', 'apps/static-site/app/vite.config.ts'])(
    '%s keeps its single-React alias',
    (relative) => {
      // Adding Molecule packages to dedupe must not replace the absolute React
      // alias — dedupe alone did not stop an app-local React copy.
      expect(readFileSync(join(TEMPLATES, relative), 'utf8')).toContain('alias: singleReactAliases')
    },
  )
})
