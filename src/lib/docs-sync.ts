/**
 * Shared README.md generation orchestration.
 *
 * The single implementation behind both `mlcl sync-docs --generate/--check`
 * (oclif command, runs from dist) and the scoped pre-commit regenerator
 * (`scripts/regen-molecule-docs.mjs`, runs via tsx against source). Extracted
 * so the two callers can never drift — both produce byte-identical README.md
 * for a given (source, registry) state.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { extractPackageApi } from './api-extractor.js'
import { generateMoleculeMd, type PackageJson } from './docs-generator.js'
import { stripFrameworkSuffix } from './features.js'
import { formatGeneratedMarkdown } from './format.js'
import type { Registry, RegistryEntry } from './schema.js'

/** One generated package doc, not yet written to disk. */
export interface GeneratedDoc {
  /** Package name, e.g. `@molecule/api-logger`. */
  name: string
  /** The package's registry entry. */
  entry: RegistryEntry
  /**
   * Absolute path of the package's README.md — the single generated document.
   *
   * This was `MOLECULE.md` until 2026-08-04. The two files had become
   * byte-identical, and the bespoke name lost on every axis: npm renders only
   * README.md, GitHub shows only README.md, and a coding agent working in a
   * user's `node_modules` looks for README.md without having to learn anything
   * about molecule — which is what "AI-first" actually requires. The content was
   * always what made the doc AI-first; the filename never was.
   *
   * The one thing the old name conveyed for free — "this is generated, do not
   * hand-edit" — is now stated explicitly in the file's banner.
   */
  readmePath: string
  /** Full generated markdown content. */
  md: string
}

/**
 * Resolve a feature package's companion locale bond, if one exists. Tries the
 * exact suffix first, then with a trailing framework suffix stripped — locale
 * bonds are framework-agnostic, so a feature like
 * `@molecule/app-oauth-buttons-react` has companion
 * `@molecule/app-locales-oauth-buttons` (no `-react`). Same rule as
 * `resolveLocalePackages()` so docs and scaffolding never disagree.
 *
 * @param name - Feature package name
 * @param entry - The feature package's registry entry
 * @param registry - Full raw registry
 * @returns The companion locale package name, or undefined if none exists
 */
export function companionLocaleFor(
  name: string,
  entry: RegistryEntry,
  registry: Registry,
): string | undefined {
  const localeMatch = name.match(/^@molecule\/(api|app)-(.+)$/)
  if (!localeMatch || entry.type === 'locales') return undefined
  const [, stack, rest] = localeMatch
  const fwBase = stripFrameworkSuffix(rest)
  for (const suffix of fwBase ? [rest, fwBase] : [rest]) {
    const localeName = `@molecule/${stack}-locales-${suffix}`
    if (registry.packages[localeName]) return localeName
  }
  return undefined
}

/** The export syntax that embeds another molecule package's API in this one's README. */
const REEXPORT_RE =
  /export (\* (as [A-Za-z0-9_]+ )?|(type )?\{[^}]*\} )?from '(@molecule\/[a-z0-9-]+)'/

/** Directories never scanned for re-exports: generated output and installed packages. */
const REEXPORT_SKIP_DIRS = new Set(['node_modules', 'dist'])

/**
 * A package's source re-exports another package's API, so its README embeds that
 * package's documentation: `@molecule/app-react-native` does `export * from
 * '@molecule/app-react'`, and api-resource's utilities barrel re-exports
 * `@molecule/api-utilities-validation`. A change to the re-exported package
 * therefore changes the re-exporter's README without touching its worktree — how
 * `react-native/README.md` drifted past the pre-commit hook on 2026-08-29.
 *
 * Discovered by reading the tree's own sources, NOT through `git grep`. The
 * relation decides which packages a scoped docs check must include, so it has to
 * be read from the SAME tree the docs are generated from — and that tree is not
 * always a git checkout. The release's gates generate from `git archive HEAD`
 * into `.release-committed/`, where `git grep` found nothing at all: it ran
 * against the surrounding workspace repo (which tracks no file under that
 * directory) and reported zero re-exports instead of failing, silently narrowing
 * the gate — and outright crashing with `fatal: not a git repository` when the
 * export sat outside any repo. Reading the sources has neither failure mode, and
 * costs ~0.3s over the fleet (22k files).
 *
 * Line-based, so a multi-line named re-export is not seen; the fleet occurrences
 * of that shape are provider→core type re-exports, which the core/provider
 * expansion covers.
 *
 * What this CANNOT see is the other way a README embeds another package's API: a
 * package whose exported signatures REFERENCE its types without re-exporting them
 * — `@molecule/app-react` imports `HttpClient` from `@molecule/app-http` and
 * publishes it in its own context types, so app-http's API is documented in
 * react's README with no `export … from` anywhere. Only generation finds that
 * relation, which is why a changed CORE can leave its consumers' READMEs stale
 * until the full fleet check runs (the nightly lint-health cron, and the release's
 * own fallback to a full check). Widening this scan to imports would not help —
 * the dependency is a type reference, not an import of the documented surface —
 * and would balloon a pre-commit scope to every consumer of a core.
 *
 * @param registry - Full raw registry (package name → repo-relative path).
 * @param moleculeDir - Absolute path of the molecule tree to read.
 * @returns Map of re-exported package name → the packages that embed it.
 * @throws When the tree has no `packages/` directory — a silently empty relation
 *   would weaken the check instead of failing it.
 */
export function discoverReexporters(
  registry: Registry,
  moleculeDir: string,
): Map<string, string[]> {
  const packagesRoot = join(moleculeDir, 'packages')
  if (!existsSync(packagesRoot) || !statSync(packagesRoot).isDirectory()) {
    throw new Error(`no packages/ directory under ${moleculeDir} — cannot discover re-exports`)
  }

  const nameByPath = new Map<string, string>()
  for (const [name, entry] of Object.entries(registry.packages)) {
    nameByPath.set(entry.path.replace(/\/+$/, ''), name)
  }

  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!REEXPORT_SKIP_DIRS.has(entry.name)) walk(path)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(path)
      }
    }
  }
  walk(packagesRoot)

  const byTarget = new Map<string, string[]>()
  for (const file of files) {
    if (!file.includes(`${sep}src${sep}`)) continue
    const reexporter = nameByPath.get(
      relative(moleculeDir, file)
        .replace(/\/src\/.*$/, '')
        .replace(/\\/g, '/'),
    )
    if (!reexporter) continue
    for (const line of readFileSync(file, 'utf-8').split('\n')) {
      if (!line.includes("from '@molecule/")) continue
      const target = line.match(REEXPORT_RE)?.[4]
      if (!target || target === reexporter || !registry.packages[target]) continue
      const list: string[] = byTarget.get(target) ?? []
      if (!list.includes(reexporter)) list.push(reexporter)
      byTarget.set(target, list)
    }
  }
  return byTarget
}

/**
 * Generate README.md content for the given packages (every registry package
 * when `packageNames` is omitted). Pure generation — callers decide whether to
 * write, diff, or check. Packages whose directory has no package.json are
 * skipped. Cross-package inputs (provider lists, companion locales, a core's
 * inherited `@e2e` text) always resolve against the FULL registry, so a scoped
 * call produces the same bytes a full regeneration would.
 *
 * Output is run through Prettier (markdown parser, config resolved from the
 * target path) before it is returned, so a generated doc is byte-identical to
 * what `prettier --check` expects. Without this the generator was the one writer
 * in the repo exempt from the formatting standard, and every README.md was
 * unformatted — invisible only because `*.md` was `.prettierignore`d.
 *
 * @param registry - Full raw registry (all packages, not just the scoped set)
 * @param moleculeDir - Absolute path to the molecule repo root
 * @param packageNames - Optional package-name scope; omit for the whole fleet
 * @returns Generated docs in registry order
 */
export async function generateDocs(
  registry: Registry,
  moleculeDir: string,
  packageNames?: Iterable<string>,
): Promise<GeneratedDoc[]> {
  const scope = packageNames ? new Set(packageNames) : undefined
  const entries = Object.entries(registry.packages).filter(([name]) => !scope || scope.has(name))

  // Build a provider lookup: core package name -> list of providers
  const providersByCore = new Map<string, Array<{ name: string; entry: RegistryEntry }>>()
  for (const [name, entry] of Object.entries(registry.packages)) {
    if (entry.implements) {
      const existing = providersByCore.get(entry.implements) ?? []
      existing.push({ name, entry })
      providersByCore.set(entry.implements, existing)
    }
  }

  // Find bond infrastructure package names (for named bond wiring examples)
  const apiBondPkg = Object.entries(registry.packages).find(
    ([, e]) => e.type === 'infrastructure' && e.category === 'bond' && e.stack === 'api',
  )?.[0]
  const appBondPkg = Object.entries(registry.packages).find(
    ([, e]) => e.type === 'infrastructure' && e.category === 'bond' && e.stack === 'app',
  )?.[0]

  // All known package names — lets locale docs resolve the real (possibly
  // framework-suffixed) feature they translate.
  const knownPackages = new Set(Object.keys(registry.packages))

  // Lazily-extracted module-level @e2e text from core interface packages,
  // keyed by core package name. Providers inherit their category's E2E
  // guidance without each bond duplicating the text in its own JSDoc.
  const coreE2eCache = new Map<string, string | undefined>()
  const getCoreE2e = (coreName: string, coreEntry: RegistryEntry): string | undefined => {
    if (!coreE2eCache.has(coreName)) {
      coreE2eCache.set(
        coreName,
        extractPackageApi(join(moleculeDir, coreEntry.path), { rootDir: moleculeDir }).e2e,
      )
    }
    return coreE2eCache.get(coreName)
  }

  const docs: GeneratedDoc[] = []

  for (const [name, entry] of entries) {
    const pkgDir = join(moleculeDir, entry.path)
    const pkgJsonPath = join(pkgDir, 'package.json')

    if (!existsSync(pkgJsonPath)) continue

    const pkgJson: PackageJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

    // Extract API from source. `rootDir` is the tree being documented (molecule's
    // own root): it anchors the section ORDER only, so generating from a
    // `git archive` export yields the same bytes as the live checkout.
    const extracted = extractPackageApi(pkgDir, { rootDir: moleculeDir })

    const companionLocale = companionLocaleFor(name, entry, registry)

    // Look up core interface entry for provider packages (to derive setter names)
    let coreInterfaceEntry: RegistryEntry | undefined
    let coreInterfaceName: string | undefined
    if (entry.implements && registry.packages[entry.implements]) {
      coreInterfaceName = entry.implements
      coreInterfaceEntry = registry.packages[entry.implements]
    }

    // Select the correct bond package based on stack
    const bondPkg = entry.stack === 'app' ? appBondPkg : apiBondPkg

    // Providers without their own @e2e inherit the core interface's
    const coreE2e =
      !extracted.e2e && coreInterfaceName && coreInterfaceEntry
        ? getCoreE2e(coreInterfaceName, coreInterfaceEntry)
        : undefined

    const md = generateMoleculeMd(extracted, entry, pkgJson, {
      providers: providersByCore.get(name),
      companionLocale,
      moleculeDir,
      coreInterfaceEntry,
      coreInterfaceName,
      coreE2e,
      bondPkg,
      knownPackages,
    })

    const readmePath = join(pkgDir, 'README.md')
    docs.push({
      name,
      entry,
      readmePath,
      md: await formatGeneratedMarkdown(md, readmePath),
    })
  }

  return docs
}
