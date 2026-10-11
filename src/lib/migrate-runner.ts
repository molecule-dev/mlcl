/**
 * The API's migration runner (`src/scripts/migrate.ts`) is written for ONE
 * database: each template imports that database bond's `createMigrator` (and
 * the Postgres one its driver). So the runner has to follow the database bond —
 * at `mlcl inject` time, and again when `mlcl swap` changes the database, or the
 * swapped project imports a package it no longer has and fails at boot.
 *
 * The runner is rendered from the target project's own api manifest, not from
 * whatever package list the caller happens to hold: the PGlite branch is
 * reachable only when the manifest declares the PGlite bond, and the Postgres
 * machinery is emitted only when the manifest declares the PostgreSQL bond (a
 * PGlite-only manifest gets a PGlite-only runner). A manifest's `dependencies`
 * AND `devDependencies` both count: `mlcl swap` writes the new database into
 * the same dep key the old one occupied, which can be `devDependencies`, and a
 * production-only reader would then see NEITHER database — keeping the imports
 * of the very bond the swap just removed. The render only decides
 * REACHABILITY; backing the emitted runner is {@link ensureMigrateRunnerImports}'
 * job — it declares the bond-setup package behind the runner's typed PGlite
 * import and promotes every bond the render emitted on a devDependencies pin
 * (the reachable PGlite branch, and the Postgres machinery's own bond) into
 * `dependencies`, so a live import never rides on a pin that production
 * deploys prune.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getMoleculeVersion } from './registry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * The database providers {@link syncMigrateRunner} re-renders a runner for.
 * PGlite ships no template of its own — it shares the Postgres runner, whose
 * browser-profile branch migrates PGlite. Every database PROVIDER in the
 * registry must be listed here: a swap onto an unlisted provider returns null
 * and strands the old database's runner, whose imports the swap just removed
 * from the manifest (TS2307 / ERR_MODULE_NOT_FOUND on a real install). The
 * test suite pins this against the registry.
 */
export const MIGRATE_RUNNER_PROVIDERS: readonly string[] = [
  '@molecule/api-database-postgresql',
  '@molecule/api-database-pglite',
  '@molecule/api-database-sqlite',
  '@molecule/api-database-mysql',
  '@molecule/api-database-d1',
]

/**
 * Providers whose bond runs where no filesystem migrator can (Workers): they
 * apply migrations OUT OF BAND with their own tooling (D1: `wrangler d1
 * migrations apply` — see the bond's README), so their runner is a guidance
 * no-op that imports no database package at all. Keeping server.ts's boot
 * import and `db:setup` resolving is the point — a runner that crashed, or one
 * still importing the provider the swap removed, would take the API down.
 */
const OUT_OF_BAND_TEMPLATE_PROVIDERS: readonly string[] = ['@molecule/api-database-d1']

/** The providers rendered from the Postgres template (PGlite included, via its browser branch). */
const POSTGRES_TEMPLATE_PROVIDERS: readonly string[] = [
  '@molecule/api-database-postgresql',
  '@molecule/api-database-pglite',
]

const POSTGRES_PACKAGE = '@molecule/api-database-postgresql'

/** The bond whose browser-profile branch the Postgres runner migrates PGlite through. */
const PGLITE_PACKAGE = '@molecule/api-database-pglite'

/**
 * The bond-setup package the Postgres runner statically imports its PGlite
 * migrator (`createMigratorPglite`) from. Every api manifest that carries that
 * runner must declare it — see {@link ensureMigrateRunnerImports}.
 */
export const MIGRATE_RUNNER_BONDS_PACKAGE = '@molecule/api-bonds-default-express'

/** What the target manifest says about the two Postgres-flavored bonds. */
export interface MigrateRunnerRender {
  /**
   * Whether the manifest declares the PGlite bond (either dependency key — a
   * `mlcl swap` lands the new database in whatever key the old one occupied).
   * Decides only whether the branch is EMITTED reachable; wherever the runner
   * lands, {@link ensureMigrateRunnerImports} also promotes the bond to a
   * production pin so the live branch survives a devDependencies-pruning
   * production deploy.
   */
  pgliteDeclared: boolean
  /**
   * Whether the manifest declares the PostgreSQL bond. Omitted when unknown —
   * the Postgres machinery is then kept, which is the safe default shape (the
   * browser branch stays gated by the flag either way).
   */
  postgresDeclared?: boolean
}

/** Opens a block of Postgres-only machinery in the runner template. */
const SECTION_OPEN = '{{#MIGRATE_POSTGRES}}'
/** Closes a block of Postgres-only machinery in the runner template. */
const SECTION_CLOSE = '{{/MIGRATE_POSTGRES}}'

/**
 * Keep or drop the `{{#MIGRATE_POSTGRES}} … {{/MIGRATE_POSTGRES}}` blocks of
 * the runner template. Markers always stand alone on their own line (never
 * nested, never inline), so processing is line-wise: marker lines disappear,
 * body lines survive only when the block is kept.
 *
 * @param raw - Template source, section markers intact.
 * @param include - Whether the Postgres machinery should remain in the output.
 * @returns The template with every section either kept (markers removed) or
 *   dropped (markers and body removed).
 */
function renderPostgresSections(raw: string, include: boolean): string {
  const out: string[] = []
  let skipping = false
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === SECTION_OPEN) {
      skipping = !include
      continue
    }
    if (trimmed === SECTION_CLOSE) {
      skipping = false
      continue
    }
    if (skipping) continue
    out.push(line)
  }
  return out.join('\n')
}

/**
 * The right-hand side of the emitted runner's `const BROWSER_PROFILE = …` line
 * for the dual render (Postgres machinery present AND the PGlite bond
 * declared): the app runs on Postgres normally and on PGlite in the browser
 * profile. Exported so the reachability check in
 * {@link ensureMigrateRunnerImports} reads the SAME literal the renderer
 * writes, instead of repeating the phrasing.
 */
export const BROWSER_PROFILE_GATE = "process.env.MOL_BOND_PROFILE === 'browser'"

/**
 * Substitute the scaffold placeholder in a migration-runner template.
 *
 * `{{MIGRATE_BROWSER_PROFILE}}` renders the WHOLE right-hand side of the
 * runner's `const BROWSER_PROFILE = …`, because what the line expresses is a
 * reachability decision, not a boolean literal:
 *
 * - `false` — the api manifest declares no PGlite bond, so the browser branch
 *   is unreachable code instead of a deferred `ERR_MODULE_NOT_FOUND` (the
 *   browser-profile bonds lazily import the package at call time; see
 *   templates/api/migrate.ts.tpl).
 * - a bare `true` — the manifest declares PGlite and NOT the PostgreSQL bond,
 *   and the Postgres machinery is stripped ({@link renderPostgresSections}):
 *   PGlite is that app's only database, so migrations run on it in every
 *   profile. A swapped-in PGlite must not keep importing a PostgreSQL bond the
 *   swap just removed.
 * - `process.env.MOL_BOND_PROFILE === 'browser'`
 *   ({@link BROWSER_PROFILE_GATE}) — the dual render: Postgres machinery
 *   present, browser branch reachable.
 *
 * The rendered line is always ONE complete expression, never a literal glued
 * to a gate with `&&`: `true && <gate>` and `false && <gate>` are both
 * `no-constant-binary-expression` errors under the eslint config every
 * scaffolded project ships (`eslint.configs.recommended` enables that rule as
 * an error against the generated `src/scripts/migrate.ts`), so either shape
 * made the project's very first `npm run lint` fail on a line mlcl wrote. The
 * constant cases render the literal alone and the dual case renders the
 * comparison alone — which is also exactly what `true && gate` USED to mean.
 *
 * The section decision keys on the PostgreSQL declaration itself, never on
 * "is this PGlite-only": a manifest declaring NEITHER database gets the
 * machinery stripped too, so the emitted runner imports no `pg` /
 * postgresql-bond package the manifest does not declare (the module doc's
 * rule — emit the machinery only when the manifest declares the bond).
 *
 * @param raw - Template source, `{{…}}` placeholders intact.
 * @param render - What the target manifest declares.
 * @returns The runner source, ready to write into a project.
 */
export function renderMigrateRunner(raw: string, render: MigrateRunnerRender): string {
  const postgresMachinery = render.postgresDeclared ?? true
  const browserProfile = !render.pgliteDeclared
    ? 'false'
    : postgresMachinery
      ? BROWSER_PROFILE_GATE
      : 'true'
  return renderPostgresSections(raw, postgresMachinery).replaceAll(
    '{{MIGRATE_BROWSER_PROFILE}}',
    browserProfile,
  )
}

/**
 * Read every package name a manifest declares in `dependencies` OR
 * `devDependencies`.
 *
 * Both keys count for the runner render: `applyBondSwap` (`mlcl swap`) writes
 * the new database into the SAME key the old one occupied, which can be
 * `devDependencies`, and the injector's `mlcl add --inject` flow honors the
 * caller's `--dev` the same way. A production-only reader would then see
 * neither the old nor the new database and render a runner whose imports the
 * manifest no longer backs. (Reachability is only half the rule — the other
 * half is {@link ensureMigrateRunnerImports} promoting a reachable PGlite
 * branch's pin into `dependencies`, so counting `devDependencies` here never
 * leaves a live branch on a pruned pin.)
 *
 * @param manifestPath - Path to the api workspace's package.json.
 * @returns The declared package names across both dependency keys, or null
 *   when the manifest is missing or unparseable.
 */
async function manifestDeclaredPackages(manifestPath: string): Promise<Set<string> | null> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ])
  } catch (_error) {
    // A missing or unparseable manifest declares nothing. The two callers fall
    // back differently: readMigrateRunnerForManifest renders the conservative
    // shape (no PGlite branch, Postgres machinery kept), while readMigrateRunner
    // falls back to the caller's list alone — the injection's own truth, whose
    // emitted imports ensureMigrateRunnerImports then backs in the manifest.
    return null
  }
}

/**
 * Pick the migration-runner template for a project's packages. The default is
 * Postgres (pg.Client + CREATE DATABASE); SQLite needs no server-side database
 * and applies files via better-sqlite3 `exec()`; MySQL creates the schema and
 * applies files over a multi-statement connection. PGlite shares the Postgres
 * template — its browser-profile branch is the PGlite half. An out-of-band
 * provider (D1) wins over everything: its bond runs where no filesystem
 * migrator exists, so it must not inherit a runner that opens a local driver.
 * Each of the others delegates to its bond's `createMigrator`.
 *
 * Only the Postgres template carries a SECOND database's branch in one runner
 * (PGlite's, behind the browser-profile gate) — the SQLite/MySQL/D1 templates
 * each cover their one database. A package set that mixes template-
 * incompatible server databases therefore resolves to a single database's
 * runner by the precedence above (D1 > SQLite > MySQL > Postgres): the
 * highest-precedence database in the set wins, whether it was declared first
 * or injected last. Injecting SQLite into a Postgres project re-points the
 * runner at the SQLite file; injecting Postgres into a SQLite project leaves
 * the runner on the SQLite file the injected wiring no longer reads (`mlcl
 * add` does not guard a second server database). Rewriting the runner AND the
 * manifest to ONE database together is `mlcl swap`'s job.
 *
 * @param packageNames - The project's `@molecule/*` package names.
 * @returns The template path, relative to mlcl's `templates/` directory.
 */
export function migrateTemplateFor(packageNames: readonly string[]): string {
  if (OUT_OF_BAND_TEMPLATE_PROVIDERS.some((p) => packageNames.includes(p))) {
    return 'api/migrate-outofband.ts.tpl'
  }
  if (packageNames.includes('@molecule/api-database-sqlite')) return 'api/migrate-sqlite.ts.tpl'
  if (packageNames.includes('@molecule/api-database-mysql')) return 'api/migrate-mysql.ts.tpl'
  return 'api/migrate.ts.tpl'
}

/**
 * Read the migration-runner template for a project's packages, placeholders
 * substituted from what the project will actually declare: the manifest's own
 * entries UNION the caller's list.
 *
 * The caller's list is additive evidence, never subtractive — on every inject
 * flow the target manifest already declares the injected packages (`mlcl add`
 * writes the dependency before handing off; a bare `mlcl inject` reads its
 * pending molecules FROM the manifest; `mlcl create` runs addPackages first),
 * but it also declares everything the project had BEFORE this injection. A
 * render from the list alone would decide, from one injected package, that the
 * project's other database does not exist: injecting PGlite into a Postgres
 * project shipped a PGlite-only runner that silently stopped migrating the
 * real database, and injecting PostgreSQL into a browser-profile (PGlite-only)
 * project dead-gated its only database's branch. That union keeps BOTH
 * databases only where one runner can carry them — the Postgres pair; a mix of
 * template-incompatible server databases still resolves to a single runner
 * (see {@link migrateTemplateFor}).
 *
 * @param packageNames - The `@molecule/*` package names being injected.
 * @param apiDir - The api workspace receiving them (the directory holding
 *   package.json). Omitted by callers with no target manifest (the swap path
 *   for single-provider templates), which renders from the list alone.
 * @returns The runner source.
 */
export async function readMigrateRunner(
  packageNames: readonly string[],
  apiDir?: string,
): Promise<string> {
  const declared = apiDir ? await manifestDeclaredPackages(join(apiDir, 'package.json')) : null
  const render = declared ? [...new Set([...declared, ...packageNames])] : [...packageNames]
  const raw = await readFile(
    join(__dirname, '..', '..', 'templates', migrateTemplateFor(render)),
    'utf-8',
  )
  return renderMigrateRunner(raw, {
    pgliteDeclared: render.includes(PGLITE_PACKAGE),
    postgresDeclared: render.includes(POSTGRES_PACKAGE),
  })
}

/**
 * Read the migration runner for an EXISTING project, substituting both render
 * inputs from the project's own api manifest (both dependency keys — see
 * {@link manifestDeclaredPackages}) — the scaffold refresh and database-swap
 * paths, where the package list that drove the original scaffold is no longer
 * the truth.
 *
 * The TEMPLATE follows the manifest too: rendering a SQLite- or MySQL-only
 * manifest into the Postgres template strips every Postgres section (the
 * manifest declares no PostgreSQL bond) and leaves a runner whose only
 * branch is the unreachable browser profile — a silent no-op OVERWRITING the
 * working runner the project already had. {@link migrateTemplateFor} resolves
 * the same precedence the inject/swap paths use; an unreadable manifest keeps
 * the conservative Postgres shape it always rendered.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns The runner source.
 */
export async function readMigrateRunnerForManifest(apiDir: string): Promise<string> {
  const deps = await manifestDeclaredPackages(join(apiDir, 'package.json'))
  const raw = await readFile(
    join(
      __dirname,
      '..',
      '..',
      'templates',
      deps ? migrateTemplateFor([...deps]) : 'api/migrate.ts.tpl',
    ),
    'utf-8',
  )
  return renderMigrateRunner(raw, {
    pgliteDeclared: deps?.has(PGLITE_PACKAGE) ?? false,
    postgresDeclared: deps === null ? true : deps.has(POSTGRES_PACKAGE),
  })
}

/**
 * Make the api manifest back the migration runner on disk.
 *
 * Every runtime import the emitted runner can carry must sit in
 * `dependencies` (production deploys prune `devDependencies` — `--omit=dev` —
 * and the workspace's hoisted node_modules hides exactly this class of hole):
 *
 * - {@link MIGRATE_RUNNER_BONDS_PACKAGE}, which the Postgres-flavor runner
 *   imports `createMigratorPglite` from unconditionally — without it `tsc`
 *   fails TS2307 and `db:setup` dies with ERR_MODULE_NOT_FOUND on a real
 *   install.
 * - {@link PGLITE_PACKAGE}, whenever the runner's browser branch is emitted
 *   reachable — the wrapper imports that bond LAZILY at call time, so a
 *   devDependencies-only pin (from `mlcl add --dev`, or a swap out of
 *   `devDependencies`) leaves a branch that crashes boot-time
 *   `runMigrations()` with ERR_MODULE_NOT_FOUND exactly where it fires, after
 *   the production prune.
 * - {@link POSTGRES_PACKAGE}, whenever the runner emits the Postgres
 *   machinery (`import pg from 'pg'` and the bond's `deriveSsl`). The render
 *   counts a devDependencies declaration as declaring the database — a swap
 *   lands the new database in the SAME key the old one occupied — so a
 *   dev-key postgresql renders a full Postgres runner whose bond, and with it
 *   the `pg` driver the bond depends on, a production prune would drop.
 *
 * Each pin is MOVED into `dependencies` (keeping the version the manifest
 * already carries), or added at the registry pin when the manifest carries
 * none. The flagship templates declare all three in their manifests; this
 * closes the custom `mlcl create`, `mlcl inject`/`mlcl add --inject` and
 * `mlcl swap` paths the same way. Idempotent, and a no-op for runners that
 * need none of them (SQLite/MySQL/D1 templates, or no runner at all). The
 * manifest write is guarded: a failed write restores the bytes the manifest
 * was parsed from, so a partial write cannot leave a corrupt package.json
 * behind.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns The dependency names gained in `dependencies` (empty when nothing
 *   needed doing).
 */
export async function ensureMigrateRunnerImports(apiDir: string): Promise<string[]> {
  let runner: string
  try {
    runner = await readFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      // No runner on disk — a database-less project never gets one, so there is
      // nothing whose imports need declaring.
      return []
    }
    // Any OTHER read failure (EACCES on a mode-000 runner, EISDIR) must not be
    // recorded as "no runner": the imports this function exists to declare stay
    // undeclared and the caller reports success over a project that fails
    // `tsc`/boot with TS2307 far from the cause. Rethrow — the same
    // ENOENT-only rule writeMigrateRunnerGuarded applies to this exact file.
    throw error
  }
  const importsWrapper = runner.includes(`from '${MIGRATE_RUNNER_BONDS_PACKAGE}'`)
  // The browser branch is reachable in the two renders mlcl emits with a live
  // gate: the bare `true` of a PGlite-only runner, and the profile comparison
  // of the dual one (`const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE ===
  // 'browser'` — see renderMigrateRunner). A bare-`false` render can never call
  // it, so its manifest needs no PGlite pin.
  const pgliteBranchReachable =
    runner.includes('const BROWSER_PROFILE = true') ||
    runner.includes(`const BROWSER_PROFILE = ${BROWSER_PROFILE_GATE}`)
  // The Postgres machinery imports the PostgreSQL bond itself (`deriveSsl`).
  // The render emits it whenever the manifest declared the bond in EITHER
  // key, so a dev-key declaration produces a runner whose import a production
  // prune breaks exactly like the PGlite branch it sits next to.
  const importsPostgres = runner.includes(`from '${POSTGRES_PACKAGE}'`)
  // Every import the runner on disk needs backed — also the list named when
  // the manifest cannot be read.
  const needed = [
    importsWrapper ? MIGRATE_RUNNER_BONDS_PACKAGE : null,
    pgliteBranchReachable ? PGLITE_PACKAGE : null,
    importsPostgres ? POSTGRES_PACKAGE : null,
  ].filter((name): name is string => name !== null)
  if (needed.length === 0) {
    // A SQLite/MySQL/out-of-band runner (or a hand-written one) needs none.
    return []
  }
  const manifestPath = join(apiDir, 'package.json')
  let manifestBytes: Buffer
  let manifest: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  try {
    manifestBytes = await readFile(manifestPath)
    manifest = JSON.parse(manifestBytes.toString('utf-8')) as typeof manifest
  } catch (error) {
    console.warn(
      `[migrate-runner] ${manifestPath} is missing or unparseable — cannot back ` +
        `src/scripts/migrate.ts's imports (${needed.join(', ')}): ` +
        `${error instanceof Error ? error.message : String(error)}`,
    )
    return []
  }
  const deps = manifest.dependencies ?? {}
  const devDeps = manifest.devDependencies
  const gained: string[] = []
  const promote = (name: string): void => {
    if (deps[name]) return
    // Keep the version the manifest already pins (an explicit `mlcl add`
    // resolved it from npm); only the KEY moves. A manifest with no pin at
    // all gets the registry pin — the same rule every backed import follows.
    deps[name] = devDeps?.[name] ?? getMoleculeVersion(name)
    if (devDeps?.[name]) {
      delete devDeps[name]
      manifest.devDependencies = Object.fromEntries(
        Object.entries(devDeps).sort(([a], [b]) => a.localeCompare(b)),
      )
    }
    gained.push(name)
  }

  if (importsWrapper) promote(MIGRATE_RUNNER_BONDS_PACKAGE)
  if (pgliteBranchReachable) promote(PGLITE_PACKAGE)
  if (importsPostgres) promote(POSTGRES_PACKAGE)

  if (gained.length === 0) return []
  manifest.dependencies = Object.fromEntries(
    Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
  )
  try {
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  } catch (error) {
    // A failed write may have landed PARTIALLY (a full disk), leaving a
    // corrupt package.json — strictly worse than before this step ran, and
    // unparseable for every later step. Restore the bytes the manifest was
    // parsed from (the same policy executeInjection's rollback enforces for
    // its own manifest write), best-effort, then surface the failure.
    try {
      await writeFile(manifestPath, manifestBytes)
    } catch (_restoreError) {
      // Nothing further to do — the primary failure is rethrown below.
    }
    throw error
  }
  return gained
}

/**
 * Write the migration runner, restoring the previous bytes when the write
 * fails mid-flight. A short write (a full disk) truncates the file — and
 * `src/scripts/migrate.ts` is server.ts's boot import, so a truncated runner
 * does not just fail the step, it takes the API down on the next boot. The
 * same policy {@link ensureMigrateRunnerImports} applies to the manifest it
 * backs the runner with: a failed write leaves the file as it was, never
 * worse. When the runner did not exist yet (ENOENT — the ONLY read failure
 * that means "no previous bytes"), a failure after the truncating open removes
 * the partial file instead. Any OTHER read failure (EACCES on an unreadable
 * file, EISDIR) is rethrown rather than recorded as "did not exist": that
 * entry is what the failure path `rm`s, so a failed write over a file this
 * call could not read would DELETE a runner that predates it — the same
 * "never delete what you could not read" rule the injector's
 * `snapshotForRollback` and scaffold's `writeGuarded` enforce.
 *
 * @param path - The runner's path.
 * @param next - The rendered runner source.
 */
export async function writeMigrateRunnerGuarded(path: string, next: string): Promise<void> {
  let prior: Buffer | null
  try {
    prior = await readFile(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    prior = null
  }
  try {
    await writeFile(path, next, 'utf-8')
  } catch (error) {
    try {
      if (prior === null) await rm(path, { force: true })
      else await writeFile(path, prior)
    } catch (_restoreError) {
      // Best-effort restore; the primary failure is rethrown below.
    }
    throw error
  }
}

/**
 * Whether the api manifest this refresh renders FROM — and backs the rendered
 * runner in — can be read and parsed.
 *
 * The refresh is a TWO-write unit: it replaces `src/scripts/migrate.ts` and
 * then declares the imports that runner carries in this manifest
 * ({@link ensureMigrateRunnerImports}). That second step only WARNS when the
 * manifest is unreadable (its own documented policy — see its doc), so it
 * cannot undo the first one: a refresh that ran on an unreadable manifest left
 * the runner REPLACED by a render derived from nothing (the conservative
 * Postgres shape — `readMigrateRunnerForManifest`'s fallback) and unbacked,
 * i.e. exactly the TS2307 / ERR_MODULE_NOT_FOUND at boot this function's own
 * doc forbids, in place of the intact checked-in copy it started from. Read the
 * manifest FIRST and refuse, so the runner is never replaced by a render the
 * project's manifest cannot be made to back.
 *
 * A MISSING manifest counts as unreadable here: the refresh's whole job is to
 * re-render from the project's OWN manifest, so a project that has none has
 * nothing to refresh from (and nothing to declare the imports in).
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns True when the manifest can be read and parsed.
 */
async function manifestIsReadable(apiDir: string): Promise<boolean> {
  try {
    JSON.parse(await readFile(join(apiDir, 'package.json'), 'utf-8'))
    return true
  } catch (_error) {
    // ENOENT (no manifest), EACCES, EISDIR or a JSON syntax error — all mean
    // this refresh cannot do the job it exists for. Refuse.
    return false
  }
}

/**
 * Re-render an EXISTING project's migration runner from its own manifest and
 * back its imports — the refresh `copyTemplateInstance` runs on every template
 * scaffold (`mlcl create --template`), where the checked-in copy predates the
 * current template mechanics. A project with no runner is left alone — it
 * never had one to refresh. The write is guarded
 * ({@link writeMigrateRunnerGuarded}): a failed write restores the copied
 * bytes, so the "refresh skipped" log the caller prints on failure cannot
 * describe a truncated runner the failed write left behind.
 *
 * The two writes are ONE unit, the same rule the activity-capture wiring
 * states: the re-rendered runner imports packages (the bond-setup wrapper, the
 * PGlite branch's bond) that {@link ensureMigrateRunnerImports} declares in the
 * manifest right after. That step restores the manifest and rethrows when its
 * own write fails — and without the matching restore here the REFRESHED runner
 * would survive it: a boot import of a package the manifest does not declare
 * (TS2307, then ERR_MODULE_NOT_FOUND on a real install), strictly worse than
 * the stale copy it replaced. So the runner's prior bytes are put back too, and
 * a failed refresh leaves the project exactly as it was.
 *
 * A manifest that cannot be READ is the same hazard one step earlier, so it is
 * refused before the runner is touched ({@link manifestIsReadable}): the
 * backing step warns instead of throwing there, which would leave the runner
 * replaced by a render nothing can declare the imports of.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @throws When the project's package.json is missing or unparseable — the
 *   refresh has nothing to render from, so the copied runner is kept as-is.
 */
export async function refreshMigrateRunnerForManifest(apiDir: string): Promise<void> {
  const path = join(apiDir, 'src', 'scripts', 'migrate.ts')
  if (!existsSync(path)) return
  // The manifest is this refresh's INPUT (the render follows it) and the place
  // the refreshed runner's imports are declared straight after. Refuse before
  // touching the runner when it cannot be read — see manifestIsReadable: the
  // step that would back the new runner only warns in that state, so the
  // replacement would be permanent (and the caller, which logs a skipped
  // refresh, keeps the intact copy it shipped).
  if (!(await manifestIsReadable(apiDir))) {
    throw new Error(
      `${join(apiDir, 'package.json')} is missing or unparseable — refusing to re-render ` +
        'src/scripts/migrate.ts from a manifest that cannot be read (and that could not ' +
        'declare the imports the refreshed runner carries)',
    )
  }
  const next = await readMigrateRunnerForManifest(apiDir)
  // The pre-refresh bytes, for the rollback below. Read here rather than inside
  // the guard because the guard's own snapshot is gone by the time the manifest
  // step can fail.
  const prior = await readFile(path, 'utf-8')
  await writeMigrateRunnerGuarded(path, next)
  try {
    await ensureMigrateRunnerImports(apiDir)
  } catch (error) {
    try {
      // Guarded like every other write here: restores the refreshed copy if
      // this restore itself fails mid-flight, so the rollback is never the
      // thing that leaves a truncated runner behind.
      await writeMigrateRunnerGuarded(path, prior)
    } catch (_restoreError) {
      // Best-effort: the manifest step's own failure is rethrown below.
    }
    throw error
  }
}

/** What {@link syncMigrateRunner} did. */
export interface MigrateRunnerSync {
  /** The runner's path. */
  path: string
  /** True when the file was rewritten for the new database. */
  updated: boolean
}

/**
 * After a database swap, rewrite `src/scripts/migrate.ts` for the new database
 * when the project has one and it differs from the matching template. A project
 * with no runner is left alone — it never had one to break. A swap onto either
 * Postgres-template provider (PostgreSQL, PGlite) re-derives both render inputs
 * from the project's own (already-swapped) manifest: a swap ONTO PGlite then
 * emits the PGlite-only runner (no imports of the PostgreSQL bond the swap just
 * removed) and a swap onto PostgreSQL keeps a browser-profile app's PGlite
 * branch. The SQLite/MySQL/out-of-band templates carry no render inputs, so
 * those swaps render from the swapped-in package alone. Every import the
 * re-rendered runner carries is declared on the SUCCESS path — the bond-setup
 * package, and any bond the swap landed on a devDependencies pin gets MOVED
 * into `dependencies` (see {@link ensureMigrateRunnerImports}). When that
 * backing step FAILS the runner write is deliberately NOT rolled back: the
 * runner was re-rendered from the manifest the swap has ALREADY rewritten, so
 * restoring the previous bytes would put back a runner importing the database
 * package the same swap just removed (`tsc`: TS2307; `db:setup`:
 * ERR_MODULE_NOT_FOUND) — strictly worse than a runner whose remaining
 * undefined import is the bond-setup package the failed step could not
 * declare. The failure is rethrown with the consequence and the remedy spelled
 * out instead, because the caller (`mlcl swap`) reports whatever message
 * reaches it with a WARNING: left as a bare `ENOSPC` the operator was told
 * nothing about the runner on disk that will not build.
 *
 * @param projectPath - The API workspace (the directory holding package.json).
 * @param newDatabasePackage - The database provider swapped in.
 * @returns What was done, or null when the project has no runner or the new
 *   provider ships no runner template.
 *
 * A swap onto an out-of-band provider (D1) swaps in the guidance no-op runner:
 * the alternative — leaving the old provider's runner — keeps imports of a
 * bond the swap just removed from the manifest, so `tsc` and `db:setup` break
 * on a real install.
 */
export async function syncMigrateRunner(
  projectPath: string,
  newDatabasePackage: string,
): Promise<MigrateRunnerSync | null> {
  if (!MIGRATE_RUNNER_PROVIDERS.includes(newDatabasePackage)) return null
  const path = join(projectPath, 'src', 'scripts', 'migrate.ts')
  if (!existsSync(path)) return null
  const next = POSTGRES_TEMPLATE_PROVIDERS.includes(newDatabasePackage)
    ? await readMigrateRunnerForManifest(projectPath)
    : await readMigrateRunner([newDatabasePackage])
  const current = await readFile(path, 'utf-8')
  // The write is guarded: a short write (a full disk) must not leave a
  // truncated runner behind — server.ts imports it at boot, so a corrupt
  // runner is a project that never boots again (see
  // writeMigrateRunnerGuarded).
  if (current !== next) await writeMigrateRunnerGuarded(path, next)
  // Even an unchanged runner must have its imports declared — a swap target
  // that never declared the bond-setup package gets it now. A failure here is
  // rethrown with its consequence and remedy (the no-rollback decision and why:
  // see the function doc) — `mlcl swap` turns this into a warning, so the
  // message IS the operator's only account of the state the swap left.
  try {
    await ensureMigrateRunnerImports(projectPath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${path} was re-rendered for ${newDatabasePackage}, but ${join(projectPath, 'package.json')} ` +
        `could not be made to declare its imports: ${detail}. The runner on disk imports packages ` +
        'the manifest does not declare — fix the manifest (or its permissions) and re-run `mlcl swap` ' +
        '(or `mlcl inject`); until then `npm run build` fails with TS2307 and the API cannot boot.',
      { cause: error },
    )
  }
  return { path, updated: current !== next }
}
