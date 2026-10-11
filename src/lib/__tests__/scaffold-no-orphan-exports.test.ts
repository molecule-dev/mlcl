/**
 * Every function `scaffold.ts` exports is referenced by SOMEONE.
 *
 * `scaffold.ts` is the CLI's largest module, and its exports are internal — the
 * package entry (`src/index.ts`) exports only oclif's `run`, so nothing here is
 * a published API surface that outside code could depend on. An export nothing
 * calls is therefore dead weight that also LIES about the module: two lived
 * here until 2026-10-11, and both were deleted for it.
 *
 *   - `generateFontLinks` — a `@deprecated` alias of `generateFontHtml` that no
 *     caller had used since it was introduced (the whole fleet works through
 *     `generateFontHtml` directly), so it only kept a second name for one
 *     function alive.
 *   - `resolveLocalPackagePaths` — whose doc said "Used by `create` to resolve
 *     local packages instead of npm registry versions", while `create` never
 *     called it: the create flow resolves local packages through npm workspaces,
 *     and the only `file:` handling left in the CLI is the injector's read of a
 *     dependency the manifest already pins.
 *
 * The scan is what caught them: a name counts as referenced when it appears
 * anywhere in mlcl's own tree beyond its definition line — a caller, a test, or
 * a documented mention in a skill. `templates/` is deliberately NOT scanned: a
 * scaffold export is consumed by the CLI, never by a generated project, so a
 * name that appears only there is still an orphan.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const PACKAGE_ROOT = join(import.meta.dirname, '..', '..', '..')
const SCAFFOLD_PATH = join(PACKAGE_ROOT, 'src', 'lib', 'scaffold.ts')

/**
 * This gate's own file — excluded from the haystack.
 *
 * The JSDoc above NAMES the two orphans it documents (`generateFontLinks`,
 * `resolveLocalPackagePaths`), and those names live inside `src/`, which the
 * scan walks. Counting that prose as a reference made the gate PASS for exactly
 * the exports it exists to catch: re-adding either `export function` would have
 * put the declaration (1) plus this doc comment (1) over the `>= 2` bar, so the
 * orphan the gate was written for stayed green. The gate is a READER of the
 * tree, never a consumer of the exports.
 */
const GATE_PATH = fileURLToPath(import.meta.url)

/**
 * Every directory that can hold a caller of — or a documented mention of — a
 * scaffold export: the CLI itself, its scripts and hooks, the `mcp/` package,
 * `bin/`, the agent skills and the user-facing docs.
 */
const SCAN_DIRS = ['src', 'scripts', 'mcp/src', 'mcp/scripts', 'bin', '.agents', 'docs']

/** Build output and installed packages never contain a source-level caller. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])

/** Every scannable file under `dir`, recursively. */
function collectFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      collectFiles(join(dir, entry.name), acc)
    } else if (/\.(ts|tsx|mjs|js|md|json)$/.test(entry.name)) {
      const file = join(dir, entry.name)
      // The gate's own prose is not a consumer — see GATE_PATH.
      if (file !== GATE_PATH) acc.push(file)
    }
  }
  return acc
}

/**
 * Every scannable file under {@link SCAN_DIRS}, concatenated — the tree a
 * scaffold export would be referenced from.
 *
 * @returns The scan haystack, this gate's own file excluded.
 */
function referenceHaystack(): string {
  return SCAN_DIRS.flatMap((dir) => collectFiles(join(PACKAGE_ROOT, dir)))
    .map((file) => readFileSync(file, 'utf-8'))
    .join('\n')
}

/**
 * How many times `name` appears as a whole word in `haystack`.
 *
 * @param name - The identifier to count.
 * @param haystack - The tree to search.
 * @returns The whole-word match count.
 */
function mentionsOf(name: string, haystack: string): number {
  return haystack.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0
}

describe('scaffold.ts exports no function nothing calls', () => {
  it('every exported function is referenced outside its own declaration', () => {
    const source = readFileSync(SCAFFOLD_PATH, 'utf-8')
    const names = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]!)
    // Non-vacuousness: the module exports many functions, so a scan that found
    // none would be reading the wrong file (a rename, a moved module).
    expect(names.length).toBeGreaterThan(20)

    const haystack = referenceHaystack()

    // `>= 2` occurrences: the declaration line itself, plus at least one use,
    // test or documented mention.
    const orphans = names.filter((name) => mentionsOf(name, haystack) < 2)

    expect(
      orphans,
      `scaffold.ts exports ${orphans.join(', ')} with no caller anywhere in mlcl ` +
        '(src, scripts, mcp, bin, .agents, docs) — delete it, or wire the caller its doc promises',
    ).toEqual([])
  })

  it('cannot be satisfied by this gate’s own prose — the names it documents do not count as callers', () => {
    // The regression this gate was written for, and the one way it could not
    // fire: re-adding `export function generateFontLinks()` (or
    // `resolveLocalPackagePaths()`) to scaffold.ts. The JSDoc above NAMES both,
    // so with this file in the haystack each name matched twice — the
    // declaration plus this comment — and the orphan check that exists for them
    // stayed green. The names must have ZERO references in the scanned tree, so
    // re-declaring either one is reported as the orphan it is.
    const haystack = referenceHaystack()
    for (const documented of ['generateFontLinks', 'resolveLocalPackagePaths']) {
      expect(
        mentionsOf(documented, haystack),
        `"${documented}" appears in the scanned tree outside scaffold.ts — the gate can no ` +
          'longer fail for the orphan it documents; keep this gate’s own file out of the haystack',
      ).toBe(0)
    }
    // …and the exclusion must not have grown into "nothing is ever counted": a
    // function with real callers still shows its references.
    expect(mentionsOf('copyFontFiles', haystack)).toBeGreaterThanOrEqual(1)
  })
})
