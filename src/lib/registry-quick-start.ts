/**
 * The registry's copy of each package's README Quick Start, which search returns on its first hits.
 *
 * Search used to fetch those READMEs at call time: in a directory with nothing installed, three
 * npm documents per search, about 1 s in the harness eval `find` (2026-11-23). The registry ships
 * with the CLI, so a copy there answers offline and at once. Features and locales are left out:
 * together they are two thirds of the Quick Start text, a feature's README is read when it is a
 * top hit, and a locale bond is never one.
 *
 * The copy is built from the package source the way its README's Quick Start is (the module
 * `@example` blocks of `src/index.ts`, through the generator's own section builder and formatter),
 * not read from the README: molecule's pre-commit checks the registry before it regenerates
 * READMEs, so a README-based check would compare against the README the commit is replacing.
 * `sync-registry` (or `--scan-quick-starts` alone) writes it;
 * `scripts/check-registry-exports.mjs` fails when it drifts.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { extractModuleExamples } from './api-extractor.js'
import { generateUsageSection } from './docs-generator.js'
import { formatGeneratedMarkdown } from './format.js'
import { quickStartOf } from './package-search.js'

/** The package types whose registry entry carries no Quick Start. */
const LEFT_OUT_TYPES: ReadonlySet<string> = new Set(['feature', 'locales'])

/**
 * Whether the registry carries this package's Quick Start.
 *
 * @param entry - A registry entry.
 * @param entry.type - Its package type.
 * @returns True for every type but features and locales.
 */
export function carriesQuickStart(entry: { type?: string }): boolean {
  return typeof entry.type === 'string' && !LEFT_OUT_TYPES.has(entry.type)
}

/**
 * The Quick Start a registry entry should carry: the code its generated README's Quick Start shows.
 *
 * @param entry - The registry entry.
 * @param entry.type - Its package type.
 * @param packageDir - The package's directory.
 * @returns The Quick Start code; undefined when the entry carries none or the source has none.
 *   Null when the package has no `src/` here, so a caller without its source keeps what it has.
 */
export async function expectedQuickStart(
  entry: { type?: string },
  packageDir: string,
): Promise<string | undefined | null> {
  if (!existsSync(join(packageDir, 'src'))) return null
  if (!carriesQuickStart(entry)) return undefined
  const index = join(packageDir, 'src', 'index.ts')
  const examples = existsSync(index) ? extractModuleExamples(readFileSync(index, 'utf8')) : []
  if (examples.length === 0) return undefined
  const section = generateUsageSection(examples)
  return quickStartOf(await formatGeneratedMarkdown(section, join(packageDir, 'README.md')))
}

/**
 * Bring an entry's `quickStart` in line with its source.
 *
 * @param entry - The registry entry, changed in place.
 * @param entry.type - Its package type.
 * @param entry.quickStart - Its recorded Quick Start.
 * @param packageDir - The package's directory.
 * @returns True when the entry changed.
 */
export async function syncQuickStart(
  entry: { type?: string; quickStart?: string },
  packageDir: string,
): Promise<boolean> {
  const expected = await expectedQuickStart(entry, packageDir)
  if (expected === null || expected === entry.quickStart) return false
  if (expected === undefined) delete entry.quickStart
  else entry.quickStart = expected
  return true
}
