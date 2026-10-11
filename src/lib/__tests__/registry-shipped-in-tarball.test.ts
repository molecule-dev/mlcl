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

import { existsSync, readdirSync, readFileSync } from 'node:fs'
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
    // `registryFilePath()` is resolved per call, so a leftover override would
    // re-point every later registry read in this process. Restore whatever the
    // environment brought in — the same hygiene every registry cache test
    // applies.
    const originalPath = process.env.MLCL_REGISTRY_PATH
    delete process.env.MLCL_REGISTRY_PATH
    try {
      assertTarballShipsRegistry()
    } finally {
      if (originalPath === undefined) delete process.env.MLCL_REGISTRY_PATH
      else process.env.MLCL_REGISTRY_PATH = originalPath
    }
  })

  function assertTarballShipsRegistry(): void {
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
  }
})

describe('the tarball carries only docs a consumer can reach', () => {
  it('ships no doc the README does not link', () => {
    // The guides the npm tarball carries are USER-FACING content — AGENTS.md:
    // "docs/ — user-facing guides (…). These ship on GitHub and in the npm
    // tarball — no internal narrative." So a doc named in `files` is a promise
    // it is written for the package's consumers, and the README is where a
    // consumer reaches the shipped docs from. An owner/ops doc left in the
    // array (an internal spec, a maintainer runbook) then ships to every
    // anonymous npm download with no reader — the exact "internal narrative in
    // a public artifact" the promise rules out. `docs/DASHBOARDS.md` — an
    // owner reminder + build spec nothing in the repo links — was shipped this
    // way; this assertion is what keeps the array to the guides.
    const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      files?: string[]
    }
    const patterns = manifest.files ?? []
    const readme = readFileSync(join(PACKAGE_ROOT, 'README.md'), 'utf-8')
    const shippedDocs = readdirSync(join(PACKAGE_ROOT, 'docs'))
      .filter((name) => name.endsWith('.md'))
      .map((name) => `docs/${name}`)
      .filter((rel) => patterns.some((pattern) => ships(pattern, rel)))

    // The guides themselves must still ship — a `files` array that dropped
    // them would satisfy the loop below vacuously.
    expect(shippedDocs.length, 'the tarball ships no docs/ guide').toBeGreaterThan(0)
    for (const rel of shippedDocs) {
      expect(
        readme.includes(rel),
        `package.json \`files\` ships ${rel}, but README.md never links it — an ` +
          `unreferenced doc is not user-facing content; drop "/${rel}" from \`files\``,
      ).toBe(true)
    }
  })
})
