/**
 * Enforcement guard: every `type: locales` entry in registry.json must point to
 * a REAL on-disk package whose package.json `name` matches the registry key.
 *
 * This catches the class of bug that shipped npm 404s: a bulk extraction pass
 * registered framework-specific feature locales under keys/paths DERIVED FROM
 * THE FEATURE NAME (e.g. `@molecule/app-locales-oauth-buttons-react`,
 * path `packages/app/locales/oauth-buttons-react`) when the real, shared locale
 * bond is `@molecule/app-locales-oauth-buttons` at `packages/app/locales/
 * oauth-buttons`. The phantom key has no package on disk, so when
 * resolveLocalePackages() pulled it into a scaffold's package.json,
 * `npm install` 404'd. If a future bulk pass reintroduces such a phantom, this
 * test fails loudly instead of waiting for a user's broken build.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(here, '..', '..', '..') // src/lib/__tests__ → mlcl
const moleculeRoot = join(mlclRoot, '..', 'molecule')
const registryPath = join(mlclRoot, 'registry.json')

const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
  packages: Record<string, { type?: string; path?: string }>
}

const localeEntries = Object.entries(registry.packages).filter(([, v]) => v.type === 'locales')

// The check resolves paths into the sibling molecule repo. In the polyrepo
// workspace it is always present; skip gracefully if a future isolated mlcl CI
// runs without it (rather than false-failing).
const moleculePresent = existsSync(moleculeRoot)

describe('registry locale entries map to real on-disk packages', () => {
  it('has locale entries to check (sanity)', () => {
    expect(localeEntries.length).toBeGreaterThan(0)
  })

  it('has NO phantom -react-suffixed locale keys', () => {
    const phantoms = localeEntries
      .map(([k]) => k)
      .filter((k) => /^@molecule\/(api|app)-locales-.+-react$/.test(k))
    expect(
      phantoms,
      phantoms.length
        ? `Phantom -react locale keys (locale bonds are framework-agnostic — drop the -react): ${phantoms.join(', ')}`
        : undefined,
    ).toEqual([])
  })

  it.skipIf(!moleculePresent).each(localeEntries)(
    '%s → on-disk package.json name matches the registry key',
    (key, entry) => {
      expect(entry.path, `${key} has no path`).toBeTruthy()
      const pkgJsonPath = join(moleculeRoot, entry.path!, 'package.json')
      expect(existsSync(pkgJsonPath), `${key}: missing package.json at ${entry.path}`).toBe(true)
      const diskName = JSON.parse(readFileSync(pkgJsonPath, 'utf8')).name
      expect(diskName, `${key}: package.json name "${diskName}" != registry key`).toBe(key)
    },
  )
})
