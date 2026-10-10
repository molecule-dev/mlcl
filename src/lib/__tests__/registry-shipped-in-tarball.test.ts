/**
 * `mlcl`'s only copy of the fleet registry is `mlcl/registry.json`, and
 * `registry.ts` resolves that file RELATIVE TO THE PACKAGE ROOT
 * (`join(__dirname, '..', '..', 'registry.json')` — `src/lib` in a checkout,
 * `dist/lib` in the installed package, both two levels below the root). npm's
 * `files` array ships ONLY the patterns it names, so a root-level file missing
 * from that array is absent from the tarball: the installed CLI then throws
 * `Registry not found: …/registry.json` out of `loadRegistry()` — and every
 * `getRawRegistry()` reader (framework detection, `getMoleculeVersion`, the
 * toolchain pins) silently answers from an empty fleet instead. The tarball is
 * built and published outside this repo (`prepack` runs the TS build, the
 * oclif manifest and the README counts; the owner publishes), so nothing else
 * here ever sees the manifest's `files` array — this assertion is the only
 * thing standing between a forgotten entry and a CLI no one can run.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getRegistryPath } from '../registry.js'

/** The package root — the directory whose `package.json` holds the `files` array. */
const PACKAGE_ROOT = join(import.meta.dirname, '..', '..', '..')

/**
 * npm's `files` semantics for the shapes this manifest uses: a listed file
 * pattern matches that file, a listed directory matches everything under it.
 */
function ships(pattern: string, relPath: string): boolean {
  const entry = pattern.replace(/^\.?\//, '').replace(/\/+$/, '')
  return relPath === entry || relPath.startsWith(`${entry}/`)
}

describe('the tarball carries the registry the CLI reads', () => {
  it('names the registry file package.json resolves in its `files` array', () => {
    delete process.env.MLCL_REGISTRY_PATH
    const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      files?: string[]
    }
    const rel = relative(PACKAGE_ROOT, getRegistryPath()).split(sep).join('/')
    // Resolved from this module's own directory, the default path IS the
    // package's copy — `../registry.json` would mean DEFAULT_REGISTRY_PATH's
    // depth no longer matches the layout (dist/lib → package root).
    expect(rel).toBe('registry.json')
    expect(existsSync(getRegistryPath())).toBe(true)

    const patterns = manifest.files ?? []
    expect(
      patterns.some((pattern) => ships(pattern, rel)),
      `package.json \`files\` does not ship ${rel} — an installed mlcl cannot find its ` +
        `registry; add "/${rel}" to the \`files\` array`,
    ).toBe(true)
  })
})
