/**
 * Refuse to generate a project whose database bond cannot honour the SQL its
 * setup migrations need — BEFORE anything is written.
 *
 * Every `@molecule/api-resource-*` package publishes Postgres-dialect setup SQL
 * (`src/__setup__/*.sql`, replayed by the generated runner's `__setup__` step),
 * and so do several feature/utility/provider packages. Non-Postgres bonds
 * translate syntax as they apply it, but some constructs carry SEMANTICS a
 * provider cannot reproduce. On 2026-10-24, on the real engine, DuckDB rejected
 * a foreign-key referential action (`ON DELETE`/`ON UPDATE` `CASCADE`,
 * `SET NULL`, `SET DEFAULT`) outright — 21 of the 55 registry packages with
 * setup SQL need one — while the generated `server.ts` awaits
 * `runMigrations()` before it starts. Those apps did not boot at all, and
 * "fixing" the SQL by dropping the clause would silently turn a cascading
 * delete into one that refuses while child rows exist.
 *
 * The decision itself is the shared contract, not this module's opinion:
 * `@molecule/api-database/sql-compatibility.js` owns the TYPE vocabulary (which
 * features exist, what a provider declares, what a diagnostic is), and
 * `./sql-requirements.js` — this CLI's shared utility — owns the SQL analysis and
 * the compatibility check, because deciding whether a selection can compile is
 * compilation work. Each database provider declares what it can do in its own
 * source (`sqlCapabilities`, mirrored into its `registry.json` entry so the CLI
 * needs no provider install). This module is the mlcl layer the interface asks
 * for:
 *
 * 1. collect the SQL the project will ACTUALLY replay — a `create` selection's
 *    setup files, resolved by `./setup-sql.js` (the SAME resolver
 *    `copySqlSetupScripts` writes from: installed copy, then source tree, then
 *    the exact bytes `sync-registry` bundled into the registry), plus, for
 *    `inject`/`swap`, the `__setup__` and `migrations` copies already on disk,
 *    which is what the runner reads;
 * 2. run the shared check with the SELECTED provider's declaration;
 * 3. refuse with the package, the file and the provider's own explanation.
 *
 * Manifest KEYS are never the source set: a transitive molecule peer gets a pin
 * without its SQL ever being copied, and judging that refuses SQL nothing
 * replays (a `mlcl inject` that could never succeed again).
 *
 * Absence is never support: a provider that has no declaration for a feature the
 * SQL uses is refused as missing metadata, and a declared setup file whose bytes
 * cannot be resolved is refused too (an app that boots without its tables is the
 * same class of failure as one that cannot migrate). There is no "cannot tell
 * yet" state: the registry bundles the exact SQL, so a package that is not
 * installed is still judged from real bytes.
 *
 * @module
 */

import type {
  SqlCapabilities,
  SqlCompatibilityIssue,
  SqlRequirement,
} from '@molecule/api-database/sql-compatibility.js'

import { databasePackageOf } from './migration-dialect.js'
import { loadRegistry } from './registry.js'
import type { InferredPackage } from './schema.js'
import type { SetupSqlProblem, SetupSqlSource } from './setup-sql.js'
import { resolveSetupSqlSources, resolveSqlDirectorySources } from './setup-sql.js'
import { analyzeSqlRequirements, checkSqlCompatibility } from './sql-requirements.js'

/** What the preflight found for one selection. */
export interface SqlCompatibilityReport {
  /** The database provider package the app would run on. */
  database: string
  /** The provider's display name (`DuckDB`, `PostgreSQL`, …). */
  providerLabel: string
  /** Its declaration, when the registry carries one. */
  capabilities: SqlCapabilities | undefined
  /** The setup files that were read. */
  sources: SetupSqlSource[]
  /** Declared setup files whose bytes could not be resolved. */
  missing: SetupSqlProblem[]
  /** Every construct the SQL requires. */
  requirements: SqlRequirement[]
  /** Every construct the provider cannot honour. */
  issues: SqlCompatibilityIssue[]
}

/**
 * Raised when the selected database cannot run the project's setup SQL. Thrown
 * BEFORE generation, so no half-built project and no boot-broken app is left.
 */
export class DatabaseDdlCompatibilityError extends Error {
  /** Stable discriminator for callers that present different remedies. */
  readonly code = 'unsupported-ddl'

  constructor(
    /** The preflight that produced the refusal. */
    readonly report: SqlCompatibilityReport,
  ) {
    super(DatabaseDdlCompatibilityError.describe(report))
    this.name = 'DatabaseDdlCompatibilityError'
  }

  /**
   * The operator-facing refusal: one line per construct/file the provider
   * cannot honour (its own note included), then what to do about it.
   *
   * @param report - The preflight result.
   * @returns The multi-line message.
   */
  private static describe(report: SqlCompatibilityReport): string {
    return [
      `${report.providerLabel} (${report.database}) cannot run this project's database setup:`,
      ...report.issues.map((issue) => `  - ${issue.message}`),
      ...report.missing.map((problem) => `  - ${problem.message}`),
      'Choose a database provider that supports these packages, or remove them from the project.',
    ].join('\n')
  }
}

/**
 * A provider's SQL capability declaration from its registry entry.
 *
 * @param entry - The database provider's registry entry, if resolvable.
 * @returns Its `sqlCapabilities`, or undefined when the entry carries none.
 */
export function providerSqlCapabilities(
  entry: InferredPackage | undefined,
): SqlCapabilities | undefined {
  return entry?.molecule?.sqlCapabilities as SqlCapabilities | undefined
}

/**
 * Run the shared compatibility check over the SQL a project will replay.
 *
 * @param options - The api workspace, the setup-SQL package names and their
 *   intended exact versions, the directories the runner replays, and the
 *   database to judge against.
 * @param options.projectPath - The api workspace (holds `node_modules`).
 * @param options.packageNames - `@molecule/*` names whose setup SQL will be
 *   copied into `__setup__` (a `create` selection, or the packages an `inject`
 *   will write migrations for). Omit on `inject`/`swap` for the on-disk copies
 *   alone; those read `sqlDirs`.
 * @param options.versions - The exact version intended for each named package,
 *   from the caller's own manifest/selection. A name without one is refused: the
 *   SQL cannot be bound to a schema version (see `setup-sql.ts`).
 * @param options.packages - Registry entries (defaults to {@link loadRegistry}).
 * @param options.sqlDirs - Directories the runner replays (`__setup__`,
 *   `migrations`).
 * @param options.sqlSources - Bytes the caller is about to WRITE, already
 *   resolved (an `inject`'s planned migrations). Judging these makes the verdict
 *   about exactly what will be replayed, with no second resolution that could
 *   pick another copy (r6 acceptance review, F7).
 * @param options.database - The provider to judge against; defaults to the one
 *   the package set names. `inject`/`swap` pass it explicitly, because on inject
 *   the package set is empty and on swap the manifest still declares the
 *   database being replaced.
 * @returns The report, or null when no database is named (nothing is replayed,
 *   so there is nothing to judge).
 */
export async function preflightSqlCompatibility(options: {
  projectPath: string
  packageNames?: readonly string[]
  versions?: Readonly<Record<string, string | undefined>>
  packages?: readonly InferredPackage[]
  sqlDirs?: readonly string[]
  sqlSources?: readonly SetupSqlSource[]
  database?: string
}): Promise<SqlCompatibilityReport | null> {
  const packages = options.packages ?? loadRegistry()
  const packageNames = options.packageNames ?? []
  const database = options.database ?? databasePackageOf(packageNames)
  if (!database) return null
  const entry = packages.find((pkg) => pkg.name === database)
  const capabilities = providerSqlCapabilities(entry)
  const providerLabel = entry?.molecule?.label ?? database
  const setup = await resolveSetupSqlSources({
    projectPath: options.projectPath,
    packageNames,
    versions: options.versions ?? {},
    packages,
  })
  const disk = await resolveSqlDirectorySources(options.sqlDirs ?? [])
  const sources = [...setup.sources, ...disk.sources, ...(options.sqlSources ?? [])]
  const missing = [...setup.problems, ...disk.problems]
  const requirements = sources.flatMap((source) =>
    analyzeSqlRequirements(source.sql, source.source),
  )
  const issues = checkSqlCompatibility(requirements, capabilities, { provider: providerLabel })
  return {
    database,
    providerLabel,
    capabilities,
    sources,
    missing,
    requirements,
    issues,
  }
}

/**
 * Throw when the selected database cannot run the SQL the project will replay.
 *
 * The generation paths call this BEFORE they write anything — `mlcl create`
 * before the scaffold, `mlcl inject` before any plan executes, `mlcl add` before
 * the manifest is touched, `mlcl swap` before any mutation — so a refused
 * combination leaves no half-built, boot-broken app.
 *
 * @param options - Same options as {@link preflightSqlCompatibility}.
 * @throws {DatabaseDdlCompatibilityError} when the provider cannot honour the
 *   SQL, when its declaration is missing, or when a declared file's bytes cannot
 *   be resolved.
 */
export async function assertDdlCompatibility(options: {
  projectPath: string
  packageNames?: readonly string[]
  versions?: Readonly<Record<string, string | undefined>>
  packages?: readonly InferredPackage[]
  sqlDirs?: readonly string[]
  sqlSources?: readonly SetupSqlSource[]
  database?: string
}): Promise<void> {
  const report = await preflightSqlCompatibility(options)
  if (!report) return
  if (report.issues.length > 0 || report.missing.length > 0) {
    throw new DatabaseDdlCompatibilityError(report)
  }
}
