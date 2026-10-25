/**
 * The mlcl-only registry invariant for version-tagged setup SQL.
 *
 * `setupSql` is the DDL of ONE package version and `setupSqlVersion` names that
 * version. The pair is load-bearing: a scaffold may copy (and preflight) the
 * bundled bytes only when the selection pins exactly `setupSqlVersion`. A
 * registry entry that carries the bytes with no version — the half-applied state
 * that produced P18 E1 — is unusable, and an entry whose version lags its own
 * pin (a release that moved `moleculeVersions` but not the bundle, P18 N2) is a
 * different release's schema waiting to be written.
 *
 * This check needs NO molecule sibling: it compares the registry to itself, so it
 * also runs in mlcl's plain CI, where only `registry.json` is present. The byte
 * comparison against package sources is the separate, workspace-only guard in
 * `registry.test.ts`.
 *
 * Callers pass what they know — the parsed registry and the pin reader — rather
 * than having this module rediscover the pin (or the file path).
 *
 * @module
 */
import { compareVersions } from './package-upgrades.js'
import type { Registry } from './schema.js'

/** Every problem with a registry's setup-SQL version tags; empty when sound. */
export interface SetupSqlVersionProblem {
  /** The package entry the problem is on. */
  name: string
  /** One sentence a release log or a test message can print. */
  message: string
}

/**
 * Check every entry that carries `setupSql` against the version its pin names.
 *
 * - `setupSql` without a usable `setupSqlVersion` is an error (half-applied).
 * - `setupSqlVersion` without `setupSql` is an error (half-removed).
 * - `setupSqlVersion` must equal the package's version pin exactly.
 * - Entries without either field are untouched: not every package ships SQL.
 *
 * @param registry - The parsed registry (for example `getRawRegistry()`).
 * @param readVersion - The version the registry pins for a package (for example
 *   `getMoleculeVersion`). Passed in so callers and tests state their own source.
 * @returns Every problem found, in package order.
 */
export function setupSqlVersionProblems(
  registry: Pick<Registry, 'packages'>,
  readVersion: (name: string) => string,
): SetupSqlVersionProblem[] {
  const problems: SetupSqlVersionProblem[] = []
  for (const [name, entry] of Object.entries(registry.packages ?? {})) {
    if (!entry || typeof entry !== 'object') continue
    const hasSql = entry.setupSql !== undefined
    const hasVersion = entry.setupSqlVersion !== undefined
    if (!hasSql) {
      if (hasVersion)
        problems.push({
          name,
          message: `${name} carries setupSqlVersion without setupSql`,
        })
      continue
    }
    const version = entry.setupSqlVersion
    if (typeof version !== 'string' || version.trim() === '') {
      problems.push({ name, message: `${name} carries setupSql without setupSqlVersion` })
      continue
    }
    const pinned = readVersion(name)
    if (pinned !== version)
      problems.push({
        name,
        message:
          `${name} carries setupSqlVersion ${version} but the registry pins ${pinned} — ` +
          'run `mlcl sync-registry --scan-tables` in the same change as the pin move',
      })
  }
  return problems
}

/** One declared table of a package: the table and the file that creates it. */
export interface SetupSqlTableDeclaration {
  /** Table name. */
  name: string
  /** Package-relative SQL file (or absolute, before the scanner relativizes it). */
  sqlFile: string
}

/** The registry entry fields the pin-aware table sync judges and rewrites. */
export interface SetupSqlEntryState {
  /** `tables` as the registry entry holds them. */
  tables?: ReadonlyArray<SetupSqlTableDeclaration>
  /** `setupSql` as the registry entry holds it. */
  setupSql?: Readonly<Record<string, string>>
  /** `setupSqlVersion` as the registry entry holds it. */
  setupSqlVersion?: string
}

/** What a molecule checkout currently offers for one package. */
export interface SetupSqlSiblingState {
  /** The tables the scanner found on disk. */
  tables: ReadonlyArray<SetupSqlTableDeclaration>
  /** The scanned setup-SQL bundle, or null when the package ships none. */
  bundle: { version: string; files: Record<string, string> } | null
  /**
   * The sibling package's OWN `package.json` version, when it declares an exact
   * one. Read even when no bundle scans: a package that GAINED or DROPPED setup
   * SQL between releases has no bundle to compare, and the version is the only
   * way to know the checkout is not the pinned release.
   */
  version: string | null
}

/**
 * What `sync-registry --scan-tables`/`--check` should do with one package, given
 * the registry entry, the molecule checkout and the registry's PIN.
 *
 * - `in-sync` — the entry already holds exactly the pinned release's metadata.
 * - `update` — the checkout is the pinned release and the entry differs: write
 *   these values.
 * - `held` — the checkout is AHEAD of the pin (a held, blocked or unpinned
 *   package). The entry keeps the pinned release's metadata and is NOT an
 *   update: no sibling bytes can match a release the checkout no longer has.
 * - `unresolved` — no state this command can write is correct. Either the
 *   checkout cannot produce the pin's metadata (it is behind the pin, or the
 *   held entry's tag does not name the pin), or the scan is not the pin's. The
 *   caller reports it and fails; it never silently retags.
 */
export type SetupSqlSyncPlan =
  | { kind: 'in-sync' }
  | {
      kind: 'update'
      tables: SetupSqlTableDeclaration[]
      setupSql: Record<string, string> | undefined
      setupSqlVersion: string | undefined
    }
  | { kind: 'held'; detail: string }
  | { kind: 'unresolved'; detail: string }

/**
 * A stable signature of a `tables` list, order-insensitive.
 *
 * @param tables - The declarations.
 * @returns A string equal for equal sets.
 */
export function setupSqlTablesSignature(
  tables: readonly SetupSqlTableDeclaration[] | undefined,
): string {
  return JSON.stringify(
    [...(tables ?? [])]
      .map((table) => ({ name: table.name, sqlFile: table.sqlFile }))
      .sort((a, b) => `${a.name}|${a.sqlFile}`.localeCompare(`${b.name}|${b.sqlFile}`)),
  )
}

/**
 * A stable signature of a setup-SQL bundle, key-order-insensitive.
 *
 * @param bundle - Path → SQL bytes, or undefined.
 * @returns A string equal for equal maps.
 */
export function setupSqlBundleSignature(
  bundle: Readonly<Record<string, string>> | undefined,
): string {
  const files = bundle ?? {}
  return JSON.stringify(
    Object.keys(files)
      .sort()
      .map((path) => [path, files[path]]),
  )
}

/**
 * Decide whether one registry entry already describes the PINNED release, and
 * what to write when it does not.
 *
 * This is the one rule both gates use — `sync-registry --check` (the release's
 * first gate) and mlcl's `registry.test.ts` — so a held package cannot pass one
 * and fail the other (P18 r11 review, R11-1/R11-2).
 *
 * The PIN is the authority. A checkout AHEAD of it (a held/blocked/off-map
 * package: `pins` has not moved yet) cannot supply the pinned release's bytes,
 * so its entry keeps whatever the pinned release recorded and only the KEPT tag
 * is judged. A checkout BEHIND the pin cannot produce it either — that is a
 * stale checkout, not a registry defect, and it is reported as unresolved
 * rather than written. Only a checkout AT the pin is scanned into the entry.
 *
 * The version judgement only applies where there IS setup SQL to judge: a
 * package with no `tables`, no `setupSql` and no bundle on either side has
 * nothing this command can sync, so a stale checkout of THAT package is not a
 * setup-SQL problem and must not refuse the release (P19 composition: the
 * recorded r11 molecule base is behind twelve non-SQL pins).
 *
 * @param options - The package, its registry entry, the checkout's scan and the pin.
 * @param options.name - The package name (for the diagnostics).
 * @param options.entry - The registry entry's `tables`/`setupSql`/`setupSqlVersion`.
 * @param options.sibling - What the molecule checkout offers.
 * @param options.pinned - The exact version the registry pins for the package.
 * @returns The decision.
 */
export function planSetupSqlEntrySync(options: {
  name: string
  entry: SetupSqlEntryState
  sibling: SetupSqlSiblingState
  pinned: string
}): SetupSqlSyncPlan {
  const { name, entry, sibling, pinned } = options
  const siblingVersion = sibling.version ?? sibling.bundle?.version ?? null
  // Nothing to sync: neither the entry nor the checkout carries setup SQL. The
  // package version is then irrelevant to this command, and a checkout behind
  // the pin must not be reported as a setup-SQL defect.
  const hasSetupState =
    entry.setupSql !== undefined ||
    entry.setupSqlVersion !== undefined ||
    (entry.tables?.length ?? 0) > 0 ||
    sibling.bundle !== null ||
    sibling.tables.length > 0
  if (!hasSetupState) return { kind: 'in-sync' }

  if (siblingVersion !== null) {
    const order = compareVersions(siblingVersion, pinned)
    if (order > 0) {
      // Held: the checkout is another (newer) release. Keep the pinned
      // metadata; only verify what was kept.
      if (entry.setupSql !== undefined && entry.setupSqlVersion !== pinned)
        return {
          kind: 'unresolved',
          detail:
            `${name}: the molecule checkout has ${siblingVersion} but registry.json pins ${pinned}, ` +
            `and the entry's bundle is tagged ${entry.setupSqlVersion ?? 'untagged'} — restore the ` +
            `${pinned} bundle (or move the pin) in one change; a checkout ahead of the pin cannot ` +
            'regenerate it.',
        }
      if (entry.setupSql === undefined && entry.setupSqlVersion !== undefined)
        return {
          kind: 'unresolved',
          detail:
            `${name}: the entry carries setupSqlVersion ${entry.setupSqlVersion} with no setupSql, ` +
            `and the molecule checkout (${siblingVersion}) is ahead of the pin ${pinned}: neither ` +
            'side can supply the other half. Restore the entry from the pinned release.',
        }
      return { kind: 'held', detail: `${name} (source ${siblingVersion}, pinned ${pinned})` }
    }
    if (order < 0)
      return {
        kind: 'unresolved',
        detail:
          `${name}: the molecule checkout has ${siblingVersion}, behind the registry pin ${pinned} — ` +
          'its setup SQL cannot be tagged with the pin. Update the molecule checkout (or scan at ' +
          'the pin) before syncing.',
      }
  }

  if (sibling.bundle && sibling.bundle.version !== pinned)
    return {
      kind: 'unresolved',
      detail:
        `${name}: the scanned setup SQL is tagged ${sibling.bundle.version} but the registry pins ` +
        `${pinned} — a bundle can only be recorded for the version it was scanned from.`,
    }

  const tablesMatch =
    setupSqlTablesSignature(entry.tables) === setupSqlTablesSignature(sibling.tables)
  const sqlMatch =
    setupSqlBundleSignature(entry.setupSql) ===
      setupSqlBundleSignature(sibling.bundle?.files ?? undefined) &&
    entry.setupSqlVersion === sibling.bundle?.version
  if (tablesMatch && sqlMatch) return { kind: 'in-sync' }

  return {
    kind: 'update',
    tables: [...sibling.tables],
    setupSql: sibling.bundle ? sibling.bundle.files : undefined,
    setupSqlVersion: sibling.bundle ? sibling.bundle.version : undefined,
  }
}
