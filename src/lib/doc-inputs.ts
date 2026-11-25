/**
 * Which package.json and registry.json changes can alter a generated README.
 *
 * README.md is generated from three inputs: a package's SOURCE
 * (`api-extractor.ts`), its registry entry, and a small projection of its
 * manifest (`docs-generator.ts`). The manifest projection is only:
 *
 * - `name` — the title, install line, and every import example;
 * - `peerDependencies` — the Injection Notes `Requirements` list;
 * - `devDependencies` — only as `@types/<dep>` presence checks against a
 *   registry `runtimeDependencies` entry, for the extra `npm install -D` line.
 *
 * Everything else in the manifest (the version, scripts, a test runner, the
 * `files` array) is never read. The docs scope selection did not know that: it
 * selected a package on ANY package.json change, so a fleet-wide test-tool pin
 * (vitest 4.1.11 → 4.1.12 across 1030 manifests) made every pre-commit README
 * regen and the release's docs gate regenerate/check the whole fleet — over ten
 * minutes per attempt (2026-10-22). This module answers the narrower question
 * those callers actually need: does this manifest edit touch a generation input?
 *
 * The exemption is a NARROW allowlist, not a projection of "doc-relevant
 * fields". Any other change — a runtime dependency, a peer range, an `@types`
 * version, a script, a version bump, a field this module has never heard of —
 * stays in scope, so a scope decision can only ever skip an edit that is proven
 * not to be an input. `@types` entries are never skipped: they drive the
 * Installation section and can change type resolution during extraction.
 *
 * The registry has the same shape of problem: `toolchain` and `moleculeVersions`
 * are machine-maintained version pins (`sync-registry --sync-toolchain`, the
 * release's pin bump) that no document reads, while `packages` metadata and the
 * app-framework tokens do. {@link registryChangeAffectsDocs} ignores exactly
 * those two sections so a pin bump does not force a full fleet check.
 *
 * @module
 */

/**
 * Devdependency names that are never an input to generated documentation.
 *
 * Vitest is a test runner: the generator reads no test runner, and the coupled
 * `@vitest/*` packages move only as its own peers/transitives. Keep this list
 * to tools whose absence from the generator has been verified — adding another
 * name widens what the docs gates stop checking.
 */
const TEST_TOOL_DEPENDENCIES = new Set(['vitest'])

/** The scope prefix of the test-runner family that moves with {@link TEST_TOOL_DEPENDENCIES}. */
const TEST_TOOL_SCOPE = '@vitest/'

/**
 * A manifest with its test-tool devDependency pins removed, serialized for
 * comparison.
 *
 * `devDependencies` is normalized to an object even when absent so that adding
 * or removing a manifest's only test-runner pin reads as the same projection.
 * Key order is left alone: a reordered manifest serializes differently and is
 * therefore kept in scope, which is the safe direction.
 *
 * @param raw - A package.json document.
 * @returns The canonical projection string.
 * @throws When `raw` is not a JSON object, or its `devDependencies` is not an
 *   object — a shape this predicate cannot reason about, so the caller keeps
 *   the package in scope.
 */
function docInputProjection(raw: string): string {
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('package.json must be a JSON object')
  }
  const manifest = parsed as Record<string, unknown>
  const devDependencies = manifest.devDependencies

  // A malformed devDependencies is not provably inert: refuse to reason about
  // the manifest at all rather than comparing a shape the generator could not
  // have produced. The predicate catches this and keeps the package in scope.
  if (
    devDependencies !== undefined &&
    (devDependencies === null ||
      typeof devDependencies !== 'object' ||
      Array.isArray(devDependencies))
  ) {
    throw new TypeError('devDependencies must be a JSON object')
  }

  let relevantDevDependencies: Record<string, unknown> = {}
  if (devDependencies !== undefined) {
    if (!Object.values(devDependencies).every((value) => typeof value === 'string')) {
      throw new Error('Unknown dependency version shape')
    }
    relevantDevDependencies = Object.fromEntries(
      Object.entries(devDependencies as Record<string, unknown>).filter(
        ([name]) => !TEST_TOOL_DEPENDENCIES.has(name) && !name.startsWith(TEST_TOOL_SCOPE),
      ),
    )
  }

  // Delete before assigning so the key always lands in the SAME position whether
  // it was present or absent — otherwise adding a manifest's only test-runner
  // pin would reorder the projection and read as a change.
  delete manifest.devDependencies
  manifest.devDependencies = relevantDevDependencies
  return JSON.stringify(manifest)
}

/**
 * Whether a package.json edit can change the package's generated README.
 *
 * The callers pass immutable inputs: two blobs from pinned commits, two blobs
 * from the index, or — for `regen-molecule-docs --changed` only — the
 * working-tree file against its committed blob. Never substitute a working-tree
 * read for a pinned/staged comparison.
 *
 * A missing side (a package added or deleted in the range), unparseable JSON,
 * or any non-test-tool change returns `true`, so an unknown input widens the
 * scope instead of narrowing it.
 *
 * @param before - The pre-change package.json contents, or `null` when absent/unreadable.
 * @param after - The post-change package.json contents, or `null` when absent/unreadable.
 * @returns `true` when the package's README must be (re)generated or checked.
 */
export function manifestChangeAffectsDocs(
  before: string | null | undefined,
  after: string | null | undefined,
): boolean {
  if (before === null || before === undefined || after === null || after === undefined) return true
  try {
    return docInputProjection(before) !== docInputProjection(after)
  } catch (_error) {
    // Unparseable manifest = an input this predicate cannot reason about. Keep
    // it in scope; treating malformed JSON as "no relevant change" would hide
    // exactly the kind of broken manifest that makes a README stale.
    return true
  }
}

/**
 * Registry sections that are NOT documentation inputs.
 *
 * `toolchain` holds the dev-dependency versions the scaffolder writes;
 * `moleculeVersions` holds the published pin per package, rewritten by every
 * release. `docs-generator.ts` reads package metadata from `packages` and the
 * framework tokens from `appFrameworks` (through `loadAppFrameworks` in
 * `inferTranslatedPackage`); nothing in the docs pipeline reads these two
 * sections. Comparing the rest of the document keeps every metadata edit — and
 * any section this module has not seen — in scope.
 */
const NON_DOC_REGISTRY_SECTIONS = ['toolchain', 'moleculeVersions']

/**
 * Package entry fields that are NOT documentation inputs: `quickStart` is copied FROM the README
 * (../lib/registry-quick-start.ts), so a change to it never makes a README stale.
 */
const NON_DOC_ENTRY_FIELDS = ['quickStart']

/**
 * A package entry without its {@link NON_DOC_ENTRY_FIELDS}.
 *
 * @param entry - A registry package entry, or anything else (returned as it is).
 * @returns The entry's documentation inputs.
 */
function docEntry(entry: unknown): unknown {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry
  const copy = { ...(entry as Record<string, unknown>) }
  for (const field of NON_DOC_ENTRY_FIELDS) delete copy[field]
  return copy
}

/**
 * A registry with its version-pin sections removed, serialized for comparison.
 *
 * @param raw - A registry.json document.
 * @returns The canonical projection string.
 * @throws When `raw` is not a JSON object.
 */
function registryProjection(raw: string): string {
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('registry.json must be a JSON object')
  }
  const registry = parsed as Record<string, unknown>
  for (const section of NON_DOC_REGISTRY_SECTIONS) delete registry[section]
  for (const section of PACKAGE_REGISTRY_SECTIONS) {
    const entries = registry[section]
    if (entries !== null && typeof entries === 'object' && !Array.isArray(entries))
      registry[section] = Object.fromEntries(
        Object.entries(entries).map(([name, entry]) => [name, docEntry(entry)]),
      )
  }
  return JSON.stringify(registry)
}

/**
 * Whether a registry.json edit can change any package's generated README.
 *
 * A `toolchain` / `moleculeVersions`-only edit (a test-tool pin sync, a release
 * pin bump) cannot. Any package-metadata change can, so it returns `true`.
 * Missing or unparseable documents return `true` — unknown inputs widen the
 * scope, never narrow it.
 *
 * @param before - The pre-change registry.json contents, or `null` when absent/unreadable.
 * @param after - The post-change registry.json contents, or `null` when absent/unreadable.
 * @returns `true` when the registry edit can alter generated documentation.
 */
export function registryChangeAffectsDocs(
  before: string | null | undefined,
  after: string | null | undefined,
): boolean {
  if (before === null || before === undefined || after === null || after === undefined) return true
  try {
    return registryProjection(before) !== registryProjection(after)
  } catch (_error) {
    // A malformed registry is not provably inert; keep the full check.
    return true
  }
}

/** The registry sections whose entries are keyed by package name, each one a README input. */
const PACKAGE_REGISTRY_SECTIONS = ['packages', 'pendingPackages']

/**
 * Registry sections the docs pipeline never reads, beyond the version pins. Checked by reading
 * every registry access in `docs-generator.ts`, `docs-sync.ts`, `features.ts` and
 * `regen-molecule-docs.mjs`: they read `packages`, `pendingPackages` and the KEYS of
 * `appFrameworks` (the framework suffixes `stripFrameworkSuffix` removes), nothing else.
 */
const UNREAD_REGISTRY_SECTIONS = ['version', 'typeDefaults', 'apiFrameworks', 'stagingDrivers']

/**
 * The packages whose registry entry a registry.json edit changes, so a caller can check those
 * packages' READMEs (the regenerator adds the READMEs that list them: a core's providers, a
 * locale's feature) instead of the whole fleet.
 *
 * An entry added, removed or changed in `packages` or `pendingPackages` counts. A changed set of
 * `appFrameworks` names, a change to a section this module has never seen, or a missing or
 * unparseable side can alter any README, so the answer is `null`. The version pins and the other
 * unread sections are ignored, as is a framework's own configuration.
 *
 * @param before - The pre-change registry.json contents, or `null` when absent/unreadable.
 * @param after - The post-change registry.json contents, or `null` when absent/unreadable.
 * @returns The changed package names, sorted; `[]` when no README input changed; `null` when the
 *   change can alter any README.
 */
export function registryChangedPackages(
  before: string | null | undefined,
  after: string | null | undefined,
): string[] | null {
  if (before === null || before === undefined || after === null || after === undefined) return null
  let old: unknown
  let now: unknown
  try {
    old = JSON.parse(before)
    now = JSON.parse(after)
  } catch (_error) {
    // A malformed registry is not provably limited to some packages.
    return null
  }
  const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
  if (!isObject(old) || !isObject(now)) return null
  const ignored = new Set([...NON_DOC_REGISTRY_SECTIONS, ...UNREAD_REGISTRY_SECTIONS])
  for (const section of new Set([...Object.keys(old), ...Object.keys(now)])) {
    if (ignored.has(section) || PACKAGE_REGISTRY_SECTIONS.includes(section)) continue
    const a = old[section]
    const b = now[section]
    if (
      section === 'appFrameworks' &&
      (a === undefined || isObject(a)) &&
      (b === undefined || isObject(b))
    ) {
      if (
        JSON.stringify(Object.keys(a ?? {}).sort()) !== JSON.stringify(Object.keys(b ?? {}).sort())
      )
        return null
      continue
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) return null
  }
  const changed = new Set<string>()
  for (const section of PACKAGE_REGISTRY_SECTIONS) {
    const a = old[section] ?? {}
    const b = now[section] ?? {}
    if (!isObject(a) || !isObject(b)) return null
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (JSON.stringify(docEntry(a[name])) !== JSON.stringify(docEntry(b[name]))) changed.add(name)
  }
  return [...changed].sort()
}
