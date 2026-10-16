/**
 * `mlcl swap` to another database used to leave `src/scripts/migrate.ts` on the
 * OLD database's runner — importing a bond the swap had just removed from
 * package.json, so the swapped project failed at boot. The runner now follows
 * the database bond, through the same helper `mlcl inject` uses.
 *
 * The PGlite flag tests pin the 2026-10-08 browser-profile defect: the runner
 * reached `@molecule/api-database-pglite` through a variable-specifier dynamic
 * import that no gate could see, in apps that declared the package only as a
 * devDependency — which production deploys prune. The flag counts either
 * dependency key (a `mlcl swap` writes the new database into the key the old
 * one occupied — a production-only render reader would keep the removed
 * bond's imports), the emitted runner has no raw lazy import left to
 * misdeclare, and the production half is closed by `ensureMigrateRunnerImports`:
 * wherever the runner lands, a REACHABLE branch gets its PGlite pin promoted
 * into `dependencies` — the flag is never live without a production pin
 * behind it. The Postgres machinery's own bond is backed the same way: the
 * render counts a devDependencies declaration as declaring the database (a
 * swap lands the new database in the SAME key the old one occupied), so a
 * dev-key postgresql still emits the full `pg` runner — the backing step
 * moves that pin into `dependencies` too, or a production prune breaks the
 * boot exactly where it broke the PGlite branch.
 *
 * The manifest tests pin the same-day follow-ups: the runner's typed wrapper
 * import (`createMigratorPglite` from `@molecule/api-bonds-default-express`)
 * must be DECLARED by whatever manifest receives the runner (custom creates
 * and swaps, not just the flagship templates), and a swap onto PGlite must
 * re-render the runner PGlite-only instead of keeping imports of the
 * PostgreSQL bond the swap removed.
 *
 * The union tests pin the render-input contract end to end: the runner is
 * rendered from what the target manifest declares (either dependency key —
 * `mlcl swap` writes the new database into the key the old one occupied) PLUS
 * the injected list, never from the injected list alone — `mlcl add
 * @molecule/api-database-pglite --inject` into a Postgres project used to ship
 * a PGlite-only runner that silently stopped migrating the real database, and
 * the reverse injection dead-gated a browser-profile app's only database.
 *
 * The coverage test pins MIGRATE_RUNNER_PROVIDERS against the registry: a
 * database provider missing from it (D1 was) strands the old runner's imports
 * on swap — TS2307 / ERR_MODULE_NOT_FOUND on a real install.
 *
 * The failure-semantics tests pin the runner's per-file catches — the
 * migrations loop AND the `__setup__/*.sql` replay: only already-applied
 * idempotency failures may continue, and the recognized class is the BOND
 * migrator's whole one (its IDEMPOTENT_PG_CODES plus message fallback —
 * duplicate columns and the 42P16 "multiple primary keys" re-run included).
 * The predicate used to whitelist three codes while the frozen delegates it
 * replaced called the bond's `createMigrator`, so the first restart against a
 * persistent database raised 42701/42P16, `runMigrations()` threw before the
 * server could listen, and the app crash-looped. A drift guard reads the
 * bond's own list so the two implementations cannot diverge again. Every
 * other failure must fail `db:setup` instead of exiting 0 over a broken
 * schema (the __setup__ swallow used to do exactly that: one warn line, boot
 * green, resource tables missing, and every request to them 500s with
 * "relation does not exist"). The flip side, stated where the code lives too:
 * the codes are matched BEFORE the message, so they admit FIRST-run members
 * of those SQLSTATE classes as well (a 42P16 that is not "multiple primary
 * keys") — the deliberate price of bond parity, fixable only in the bond
 * migrator first.
 *
 * The admin-lifecycle tests pin the step-1 connection: a failed pg_database
 * probe or CREATE DATABASE (role without CREATEDB, a duplicate-database race
 * between two booting replicas) must still close the admin socket — an open
 * one kept the Node event loop alive, so `npm run db:setup` hung forever at
 * exit right after printing "Migrations complete."
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ensureMigrateRunnerImports,
  MIGRATE_RUNNER_PROVIDERS,
  migrateTemplateFor,
  readMigrateRunner,
  readMigrateRunnerForManifest,
  renderMigrateRunner,
  syncMigrateRunner,
} from '../migrate-runner.js'
import { getMoleculeVersion, loadRegistry } from '../registry.js'

/**
 * The PostgreSQL bond's migrator — the implementation this template's
 * predicate must stay aligned with (see the failure-semantics tests). Only
 * present in a workspace checkout; mlcl-only clones skip the drift guard.
 */
const BOND_MIGRATOR_SOURCE = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'molecule',
  'packages',
  'api',
  'bonds',
  'database',
  'postgresql',
  'src',
  'migrator.ts',
)

/**
 * One-shot intercept for the guarded manifest write: armed, the next
 * `writeFile` to a package.json truncates it to garbage and THEN throws —
 * the shape of a short write on ENOSPC, which no stub of the inputs can
 * produce. `ensureMigrateRunnerImports` must restore the pre-write bytes
 * (the same policy executeInjection's rollback enforces for its manifest).
 */
const manifestIntercept = vi.hoisted(() => ({ armed: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  type WriteFileArgs = Parameters<(typeof actual)['writeFile']>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (manifestIntercept.armed && typeof path === 'string' && path.endsWith('package.json')) {
        // Partial write first, then the failure — the corrupt-manifest shape.
        // The intercept fires ONCE: the guard's own restore write must go
        // through (a transient ENOSPC does not repeat).
        manifestIntercept.armed = false
        await actual.writeFile(path, '{ "corrupted')
        throw new Error('write failed mid-flight (simulated ENOSPC)')
      }
      return actual.writeFile(path, data, options)
    },
  }
})

let dir: string | null = null
afterEach(async () => {
  manifestIntercept.armed = false
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function projectWithRunner(dbPackage: string): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await writeFile(join(dir, 'src', 'scripts', 'migrate.ts'), await readMigrateRunner([dbPackage]))
  return dir
}

async function writeManifest(dependencies: Record<string, string>): Promise<void> {
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies }))
}

async function readManifest(): Promise<{
  dependencies: Record<string, string>
  devDependencies?: Record<string, string>
}> {
  return JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
}

/**
 * Execute the RENDERED `isBenignMigrationError` — the exact code a scaffold
 * ships, not a copy. `new Function` parses plain JS, so only the signature's
 * type annotations are dropped; the body (and its inlined idempotency-code
 * set) runs verbatim.
 */
async function renderedIsBenign(): Promise<(err: unknown) => boolean> {
  const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
  const source = runner.match(/function isBenignMigrationError[\s\S]*?\n}/)?.[0]
  expect(source).toBeDefined()
  expect(source).toContain('function isBenignMigrationError(err: unknown): boolean {')
  const jsSource = source!.replace(
    'function isBenignMigrationError(err: unknown): boolean {',
    'function isBenignMigrationError(err) {',
  )
  return new Function(`${jsSource}; return isBenignMigrationError`)() as (err: unknown) => boolean
}

describe('migrateTemplateFor', () => {
  it('picks the runner for the wired database', () => {
    expect(migrateTemplateFor(['@molecule/api-database-sqlite'])).toBe('api/migrate-sqlite.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-mysql'])).toBe('api/migrate-mysql.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-postgresql'])).toBe('api/migrate.ts.tpl')
    // PGlite shares the Postgres runner — its browser branch is the PGlite half.
    expect(migrateTemplateFor(['@molecule/api-database-pglite'])).toBe('api/migrate.ts.tpl')
    // D1 has no filesystem migrator on Workers — an out-of-band guidance
    // runner, never one that opens a local driver.
    expect(migrateTemplateFor(['@molecule/api-database-d1'])).toBe('api/migrate-outofband.ts.tpl')
    // …and it wins even next to a declared server database: a D1 project must
    // not run the SQLite/Postgres runner against a Workers binding.
    expect(migrateTemplateFor(['@molecule/api-database-d1', '@molecule/api-database-sqlite'])).toBe(
      'api/migrate-outofband.ts.tpl',
    )
  })

  it('a mixed server-database set follows the precedence, not the injection order', () => {
    // SQLite declared + PostgreSQL injected (`mlcl add
    // @molecule/api-database-postgresql --inject`): the union still declares
    // SQLite, so the runner stays on the SQLite file — the precedence winner —
    // even though the injected bond is what the regenerated wiring uses. The
    // runner follows the precedence list; only an injection that itself wins
    // re-points it (`mlcl add` does not guard a second server database).
    expect(
      migrateTemplateFor(['@molecule/api-database-postgresql', '@molecule/api-database-sqlite']),
    ).toBe('api/migrate-sqlite.ts.tpl')
    // Same rule between the two file-based servers: SQLite beats MySQL.
    expect(
      migrateTemplateFor(['@molecule/api-database-mysql', '@molecule/api-database-sqlite']),
    ).toBe('api/migrate-sqlite.ts.tpl')
  })
})

describe('renderMigrateRunner', () => {
  it('renders the browser-profile line as ONE expression, never `true && …` / `false && …`', () => {
    // The exact lint-error shape a scaffolded project's own `npm run lint`
    // rejects (`no-constant-binary-expression`, enabled by the shared
    // `eslint.configs.recommended`): a constant operand of `&&`. The substitute
    // is the complete right-hand side, so neither constant case can produce it.
    const template = 'const BROWSER_PROFILE = {{MIGRATE_BROWSER_PROFILE}}'
    const dual = renderMigrateRunner(template, {
      pgliteDeclared: true,
      postgresDeclared: true,
    })
    expect(dual).toBe("const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'")
    const pgliteOnly = renderMigrateRunner(template, {
      pgliteDeclared: true,
      postgresDeclared: false,
    })
    expect(pgliteOnly).toBe('const BROWSER_PROFILE = true')
    const neither = renderMigrateRunner(template, {
      pgliteDeclared: false,
      postgresDeclared: true,
    })
    expect(neither).toBe('const BROWSER_PROFILE = false')
    // Pin the MATCHER itself: applied only to the three strings pinned above,
    // this check could never be the one that failed. An always-false regex would
    // silently stop protecting a scaffolded project's `npm run lint`.
    const forbidden = /BROWSER_PROFILE = (true|false) &&/
    expect(forbidden.test('const BROWSER_PROFILE = true && process.env.X')).toBe(true)
    expect(forbidden.test('const BROWSER_PROFILE = false && process.env.X')).toBe(true)
    for (const rendered of [dual, pgliteOnly, neither]) {
      expect(rendered).not.toMatch(forbidden)
    }
  })

  it('is a no-op for templates without the placeholders', () => {
    expect(renderMigrateRunner('const a = 1', { pgliteDeclared: true })).toBe('const a = 1')
  })

  it('keeps the Postgres machinery when Postgres is declared', () => {
    const runner = renderMigrateRunner(
      'a\n{{#MIGRATE_POSTGRES}}\npg\n{{/MIGRATE_POSTGRES}}\nb\n{{#MIGRATE_POSTGRES}}\nderiveSsl\n{{/MIGRATE_POSTGRES}}\nc',
      { pgliteDeclared: false, postgresDeclared: true },
    )
    expect(runner).toBe('a\npg\nb\nderiveSsl\nc')
  })

  it('strips the Postgres machinery when NEITHER database is declared', () => {
    // The section decision keys on the PostgreSQL declaration itself, not on
    // "is this PGlite-only" — with both flags false the old
    // `renderPostgresSections(raw, !pgliteOnly)` KEPT the machinery, emitting
    // `pg` / deriveSsl imports a manifest declaring neither bond cannot
    // resolve (TS2307 / ERR_MODULE_NOT_FOUND on a real install).
    const runner = renderMigrateRunner(
      "a\n{{#MIGRATE_POSTGRES}}\nimport pg from 'pg'\n{{/MIGRATE_POSTGRES}}\nb",
      { pgliteDeclared: false, postgresDeclared: false },
    )
    expect(runner).toBe('a\nb')
  })
})

describe('readMigrateRunner PGlite gating', () => {
  it('emits an unreachable browser branch unless the PGlite bond is selected', async () => {
    const without = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // A bare `false` — the `false && <gate>` shape is a
    // no-constant-binary-expression lint error in the projects this lands in.
    expect(without).toContain('const BROWSER_PROFILE = false\n')
    expect(without).not.toContain('false && process.env.MOL_BOND_PROFILE')
    const withPglite = await readMigrateRunner([
      '@molecule/api-database-postgresql',
      '@molecule/api-database-pglite',
    ])
    // The dual render: the runtime comparison alone, never `true && <gate>` —
    // that shape is a `no-constant-binary-expression` lint ERROR under the
    // eslint config every scaffolded project ships, so the generated runner
    // failed the project's own `npm run lint`.
    expect(withPglite).toContain(
      "const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'",
    )
    expect(withPglite).not.toMatch(/BROWSER_PROFILE = (true|false) &&/)
  })

  it('carries no raw variable-specifier @molecule import — only the typed wrapper', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    expect(runner).toContain(
      "import { createMigratorPglite } from '@molecule/api-bonds-default-express'",
    )
    expect(runner).toContain('await createMigratorPglite(migrationsDir, setupDir)()')
    expect(runner).not.toMatch(/import\(\s*\w*[Pp]glite\w*\s*\)/)
  })

  it('leaves no scaffold marker or garbled comment text in the output', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // Every {{…}} token — the flag and the section markers — must be
    // substituted or stripped; and the explanatory comment must not have the
    // flag token rewritten inside it (it reads "The MIGRATE_BROWSER_PROFILE
    // scaffold placeholder", not "…). false scaffold placeholder …").
    expect(runner).not.toContain('{{')
    expect(runner).toContain('The MIGRATE_BROWSER_PROFILE scaffold placeholder')
  })

  it('keeps the Postgres machinery for a Postgres selection', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    expect(runner).toContain("import pg from 'pg'")
    expect(runner).toContain("from '@molecule/api-database-postgresql'")
    expect(runner).toContain('CREATE DATABASE')
    expect(runner).toContain('resolveDatabaseUrl')
  })

  it('renders a PGlite-only runner when PGlite is selected without Postgres', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-pglite'])
    // PGlite is the only database: migrations run on it in every profile…
    expect(runner).toContain('const BROWSER_PROFILE = true\n')
    // …and none of the Postgres machinery (or its imports) is emitted for a
    // swap to prune — only the explanatory comment may still name the bond.
    expect(runner).not.toContain("from 'pg'")
    expect(runner).not.toContain("from '@molecule/api-database-postgresql'")
    expect(runner).not.toContain('deriveSsl')
    expect(runner).not.toContain('CREATE DATABASE')
    expect(runner).not.toContain('resolveDatabaseUrl')
    // the typed wrapper import stays — it is what tsc can always see
    expect(runner).toContain(
      "import { createMigratorPglite } from '@molecule/api-bonds-default-express'",
    )
    expect(runner).toContain('await createMigratorPglite(migrationsDir, setupDir)()')
  })

  it('readMigrateRunnerForManifest follows the manifest, not the caller', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await writeManifest({ '@molecule/api-database-pglite': '1.0.0' })
    // PGlite declared, Postgres not → PGlite-only runner.
    expect(await readMigrateRunnerForManifest(dir)).toContain('const BROWSER_PROFILE = true\n')
    // A devDependencies pin counts too: `mlcl swap` (applyBondSwap) writes the
    // new database into the SAME dep key the old one occupied, which can be
    // devDependencies — a production-only reader would see NEITHER database
    // and keep the imports of the very bond the swap just removed.
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@molecule/api-database-pglite': '1.0.0' },
        devDependencies: { '@molecule/api-database-postgresql': '1.0.5' },
      }),
    )
    const mixed = await readMigrateRunnerForManifest(dir)
    expect(mixed).toContain("import pg from 'pg'")
    expect(mixed).toContain("const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'")
    // Both in dependencies → the dual-profile runner (Postgres machinery +
    // reachable browser branch), the shape the flagship templates ship.
    await writeManifest({
      '@molecule/api-database-pglite': '1.0.0',
      '@molecule/api-database-postgresql': '1.0.5',
    })
    const both = await readMigrateRunnerForManifest(dir)
    expect(both).toContain("const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'")
    expect(both).toContain("import pg from 'pg'")
  })

  it('readMigrateRunnerForManifest falls back to the conservative shape on an unreadable manifest', async () => {
    // manifestDeclaredPackages returns null for a missing OR unparseable
    // manifest, and this reader's documented fallback is the conservative
    // render: no PGlite branch, Postgres machinery kept (the safe default
    // shape — see the manifestDeclaredPackages doc). This is the path the
    // template scaffold's refresh walks when a manifest is unreadable, so a
    // regression here (throwing, or rendering the wrong shape) must fail a
    // test, not the first scaffold.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    // No manifest at all.
    let runner = await readMigrateRunnerForManifest(dir)
    expect(runner).toContain('const BROWSER_PROFILE = false\n')
    expect(runner).not.toContain(
      "const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'",
    )
    expect(runner).toContain("import pg from 'pg'")
    expect(runner).toContain('CREATE DATABASE')
    // A corrupt manifest — same fallback.
    await writeFile(join(dir, 'package.json'), '{ this is not json')
    runner = await readMigrateRunnerForManifest(dir)
    expect(runner).toContain('const BROWSER_PROFILE = false\n')
    expect(runner).toContain("import pg from 'pg'")
  })

  it('readMigrateRunnerForManifest renders the template the manifest’s own database implies', async () => {
    // A SQLite-only manifest must not be "refreshed" into the Postgres
    // template: no PostgreSQL bond is declared, so every Postgres section is
    // stripped and the output is a runner whose only branch is the UNREACHABLE
    // browser profile — a silent no-op overwriting the working runner the
    // project already had. The template follows the manifest, the same
    // precedence the inject and swap paths resolve.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await writeManifest({ '@molecule/api-database-sqlite': '1.0.0' })
    const sqlite = await readMigrateRunnerForManifest(dir)
    expect(sqlite).toContain("from '@molecule/api-database-sqlite'")
    expect(sqlite).not.toContain("import pg from 'pg'")
    expect(sqlite).not.toContain('CREATE DATABASE')
    expect(sqlite).not.toContain('{{')
  })

  it('renders from the manifest ∪ injected list — one injected database never erases a declared one', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    // `mlcl add @molecule/api-database-pglite --inject` into an existing
    // Postgres project: the manifest already declares postgresql (add wrote
    // the new dep before inject runs), while the injector's list is the one
    // injected package. The runner must stay dual-profile — rendering it from
    // the list alone shipped a PGlite-only runner that silently stopped
    // migrating the real database.
    await writeManifest({ '@molecule/api-database-postgresql': '1.0.5' })
    const addPglite = await readMigrateRunner(['@molecule/api-database-pglite'], dir)
    expect(addPglite).toContain("import pg from 'pg'")
    expect(addPglite).toContain('CREATE DATABASE')
    expect(addPglite).toContain(
      "const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'",
    )
    // The reverse — injecting PostgreSQL into a PGlite-only (browser-profile)
    // project — must keep the browser branch reachable: a dead gate made boot
    // resolve DATABASE_URL on a database the app does not use and exit(1).
    await writeManifest({ '@molecule/api-database-pglite': '1.0.0' })
    const addPostgres = await readMigrateRunner(['@molecule/api-database-postgresql'], dir)
    expect(addPostgres).toContain(
      "const BROWSER_PROFILE = process.env.MOL_BOND_PROFILE === 'browser'",
    )
    expect(addPostgres).toContain("import pg from 'pg'")
    // No manifest to read (a fresh selection) → the list is the whole truth,
    // exactly as before: PGlite alone still renders the PGlite-only runner.
    await rm(join(dir, 'package.json'), { force: true })
    const fresh = await readMigrateRunner(['@molecule/api-database-pglite'], dir)
    expect(fresh).toContain('const BROWSER_PROFILE = true\n')
    expect(fresh).not.toContain("import pg from 'pg'")
    // An UNPARSEABLE manifest returns the same null (the read throws inside
    // manifestDeclaredPackages) — the same list-alone fallback, not a crash.
    await writeFile(join(dir, 'package.json'), '{ this is not json')
    const corrupt = await readMigrateRunner(['@molecule/api-database-pglite'], dir)
    expect(corrupt).toContain('const BROWSER_PROFILE = true\n')
    expect(corrupt).not.toContain("import pg from 'pg'")
  })

  it('keeps a declaring project’s branch across a Postgres re-swap', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // What applyBondSwap leaves behind on pglite → postgresql: both declared.
    await writeManifest({
      '@molecule/api-database-pglite': '1.0.0',
      '@molecule/api-database-postgresql': '1.0.5',
    })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunnerForManifest(dir),
    )
    expect((await syncMigrateRunner(dir, '@molecule/api-database-postgresql'))?.updated).toBe(false)
  })
})

describe('migrate runner secret hygiene', () => {
  it('never logs the raw DATABASE_URL — the connect-failure hint is redacted', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // CI and deploy logs retain stderr, and the scaffolded CI workflow runs
    // migrations — a failed connect (DB not up yet, wrong host) used to print
    // the full connection string, password included. The raw URL may only
    // ever flow into pg's connectionString, never a console.* call.
    const leaking = runner
      .split('\n')
      .filter((line) => line.includes('console.') && line.includes('${DATABASE_URL'))
    expect(leaking).toEqual([])
    expect(runner).toContain('Check DATABASE_URL in .env: ${redactDatabaseUrl(DATABASE_URL)}')
  })

  it('redactDatabaseUrl keeps host/db but drops the password', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const source = runner.match(/function redactDatabaseUrl[\s\S]*?\n}/)?.[0]
    expect(source).toBeDefined()
    // Execute the RENDERED helper — the exact code a scaffold ships, not a
    // copy. new Function parses plain JS, so drop only the signature type
    // annotations; the body runs verbatim.
    expect(source).toContain('function redactDatabaseUrl(raw: string): string {')
    const jsSource = source!.replace(
      'function redactDatabaseUrl(raw: string): string {',
      'function redactDatabaseUrl(raw) {',
    )
    const redact = new Function(`${jsSource}; return redactDatabaseUrl`)() as (
      raw: string,
    ) => string
    // Assemble the fixtures from URL parts so this test source itself never
    // carries a user:password@ literal — the pre-commit secret scanner
    // pattern-matches exactly that shape.
    const credentialed = new URL('postgres://db.example.com:5432/myapp')
    credentialed.username = 'svc'
    credentialed.password = 'sup3r-secret'
    expect(redact(credentialed.toString())).toBe(
      `${credentialed.protocol}//svc:***@${credentialed.host}${credentialed.pathname}`,
    )
    // Password set but no username → no userinfo marker at all.
    const passwordOnly = new URL('postgres://db.example.com/myapp')
    passwordOnly.password = 'sup3r-secret'
    expect(redact(passwordOnly.toString())).toBe(
      `${passwordOnly.protocol}//${passwordOnly.host}${passwordOnly.pathname}`,
    )
    // An unparseable value is reported without echoing any part of it.
    expect(redact('definitely not a url')).toBe('(unparseable DATABASE_URL)')
    // The PGlite-only runner strips the helper along with the machinery — it
    // resolves no DATABASE_URL at all, so it cannot log one.
    expect(await readMigrateRunner(['@molecule/api-database-pglite'])).not.toContain(
      'DATABASE_URL = ',
    )
  })
})

describe('migration failure semantics', () => {
  it('fails the run on a real migration error — only already-applied objects continue', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // The per-file catch must rethrow everything the benign-code predicate
    // does not whitelist: each file runs as ONE query, so a swallowed failure
    // (syntax error, missing permission, mid-file abort — the whole file
    // rolled back) used to print "Migrations complete.", exit 0, and ship the
    // failure to runtime as a "relation does not exist" far from the cause.
    expect(runner).toContain('if (!isBenignMigrationError(err)) throw err')
  })

  it('fails the run on a real __setup__ error too — only already-applied DDL continues', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // Step 3's `__setup__/*.sql` replay must gate on the same benign-code
    // predicate as step 2: a duplicate_* is the expected re-run there (the
    // squashed app migration may already own the resource tables), but the
    // unconditional swallow let a real failure — the app role lacking CREATE
    // on the schema, a typo, a referenced-but-absent enum — print one warn
    // line, resolve, exit 0, and boot the server to 500 on every request to
    // the missing tables. Executes the RENDERED block with the RENDERED
    // helper — the exact code a scaffold ships, not a copy.
    const helperSource = runner.match(/function isBenignMigrationError[\s\S]*?\n}/)?.[0]
    // Steps 2–3 sit inside one try/finally (the connection closes on every
    // path), so this block is indented one level deeper than it used to be —
    // `{4}` matches the block's own close, not the enclosing try's.
    const blockSource = runner.match(/if \(existsSync\(setupDir\)\)[\s\S]*?\n {4}\}/)?.[0]
    expect(helperSource).toBeDefined()
    expect(blockSource).toBeDefined()
    expect(blockSource).toContain('if (!isBenignMigrationError(err)) throw err')
    // new Function parses plain JS, so drop only the signature's type
    // annotations; the bodies run verbatim.
    const jsHelper = helperSource!.replace(
      'function isBenignMigrationError(err: unknown): boolean {',
      'function isBenignMigrationError(err) {',
    )
    const runSetup = new Function(
      'existsSync',
      'readdirSync',
      'readFileSync',
      'join',
      'setupDir',
      'rawClient',
      'console',
      // The applied-file record (step 2 sets it up): nothing recorded yet, and its inserts
      // are answered here so the stub sees only the setup files.
      "const applied = new Set(); const recordSql = 'RECORD'; " +
        'const client = { query: (s, p) => (s === recordSql ? Promise.resolve() : rawClient.query(s)) }; ' +
        `${jsHelper}; return (async () => { ${blockSource} })()`,
    ) as (
      ...args: [
        existsSync: (path: string) => boolean,
        readdirSync: (path: string) => string[],
        readFileSync: (path: string, encoding: string) => string,
        join: (...parts: string[]) => string,
        setupDir: string,
        client: { query: (sql: string) => Promise<unknown> },
        console: { log: (msg: string) => void; warn: (msg: string) => void },
      ]
    ) => Promise<void>
    const logs: string[] = []
    const warns: string[] = []
    const stubConsole = {
      log: (msg: string) => logs.push(msg),
      warn: (msg: string) => warns.push(msg),
    }
    const stubFs = [
      () => true,
      () => ['payments.sql', 'todos.sql'],
      (_path: string, _encoding: string) => 'CREATE TABLE IF NOT EXISTS payments ()',
      (dir: string, file: string) => `${dir}/${file}`,
      '__setup__',
    ] as const

    // A duplicate_* failure on the first file is logged and the replay
    // CONTINUES to the remaining files.
    const benign = Object.assign(new Error('relation "payments" already exists'), { code: '42P07' })
    const replayed: string[] = []
    await runSetup(
      ...stubFs,
      {
        query: (sql: string) => {
          replayed.push(sql)
          return replayed.length === 1 ? Promise.reject(benign) : Promise.resolve(undefined)
        },
      },
      stubConsole,
    )
    expect(replayed).toHaveLength(2)
    expect(warns.some((w) => w.includes('payments.sql') && w.includes('already exists'))).toBe(true)
    expect(logs).toContain('✓ __setup__/todos.sql')

    // Any other code fails the run — the boot-time caller (the injector's
    // awaited runMigrations) sees the rejection instead of a green exit.
    const denied = Object.assign(new Error('permission denied for schema public'), {
      code: '42501',
    })
    const attempted: string[] = []
    await expect(
      runSetup(
        ...stubFs,
        {
          query: (sql: string) => {
            attempted.push(sql)
            return Promise.reject(denied)
          },
        },
        stubConsole,
      ),
    ).rejects.toBe(denied)
    expect(attempted).toHaveLength(1)
  })

  it('keeps the __setup__ block inside the client-closing try/finally — the guard stays on the block itself', async () => {
    // Steps 2–3 sit inside one try/finally (the connection closes on every
    // path), so the block is indented one level deeper; this pins that the
    // slice above still captures the block itself — not the enclosing try's
    // finally — and that the benign-error guard survived the re-indent.
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const blockSource = runner.match(/if \(existsSync\(setupDir\)\)[\s\S]*?\n {4}\}/)?.[0]
    expect(blockSource).toBeDefined()
    expect(blockSource).toContain('if (!isBenignMigrationError(err)) throw err')
    expect(blockSource).not.toContain('finally')
  })

  it('isBenignMigrationError recognizes the whole idempotency re-run class a second boot raises', async () => {
    const isBenign = await renderedIsBenign()
    // Every boot re-runs every migration file, so an already-applied file
    // fails again — and that class is wider than duplicate objects: a bare
    // ADD COLUMN re-run raises 42701, and an already-applied
    // ADD CONSTRAINT ... PRIMARY KEY raises 42P16 (Postgres checks the
    // has-a-primary-key rule BEFORE the constraint name, so the pg_dump shape
    // most schemas ship reports "multiple primary keys", not 42710). The old
    // three-code whitelist let the run rethrow those, and the boot-time
    // caller awaits runMigrations() before listen() — status-page,
    // accounting-invoicing, applicant-tracking and weather-dashboard started
    // once, then crash-looped forever against a persistent database.
    for (const [code, message] of [
      ['42P07', 'relation "payments" already exists'],
      ['42701', 'column "seats" of relation "users" already exists'],
      ['42710', 'type "plan_tier" already exists'],
      ['42P06', 'schema "analytics" already exists'],
      ['42P04', 'database "myapp" already exists'],
      ['42723', 'function update_totals() already exists with same argument types'],
      ['42P16', 'multiple primary keys for table "alert_preferences" are not allowed'],
    ] as const) {
      expect(isBenign(Object.assign(new Error(message), { code }))).toBe(true)
    }
    // Message fallback (same three shapes the bond migrator matches): a
    // hand-written migration that wraps the pg error keeps its phrasing.
    expect(isBenign(new Error('ALTER TABLE: relation "statuses" already exists'))).toBe(true)
    expect(isBenign(new Error('duplicate column name "currency"'))).toBe(true)
    expect(isBenign(new Error('multiple primary keys for table "t" are not allowed'))).toBe(true)
    // Everything else must fail the run: a SQL syntax error, a permission
    // denial — and a non-pg error with no code at all (or a bare string).
    expect(
      isBenign(Object.assign(new Error('syntax error at or near "FROM"'), { code: '42601' })),
    ).toBe(false)
    expect(
      isBenign(Object.assign(new Error('password authentication failed'), { code: '28P01' })),
    ).toBe(false)
    expect(
      isBenign(Object.assign(new Error('permission denied for schema public'), { code: '42501' })),
    ).toBe(false)
    expect(isBenign(new Error('ECONNREFUSED 127.0.0.1:5432'))).toBe(false)
    expect(isBenign('42P07')).toBe(false)
    expect(isBenign(null)).toBe(false)
    // The PGlite-only runner has no Postgres migration loop — the helper is
    // stripped along with the machinery, not shipped dead.
    expect(await readMigrateRunner(['@molecule/api-database-pglite'])).not.toContain(
      'isBenignMigrationError',
    )
  })

  it.runIf(existsSync(BOND_MIGRATOR_SOURCE))(
    'never drifts narrower than the bond migrator’s IDEMPOTENT_PG_CODES',
    async () => {
      // The scaffold renders THIS template over the frozen delegates to the
      // bond's createMigrator, so the two implementations of the same
      // predicate must agree: a code the bond treats as idempotent but this
      // helper rethrew is exactly how 42701/42P16 boot-looped the fleet. Read
      // the bond's own list and probe the rendered helper with each of its
      // codes (mlcl-only clones without the sibling repo skip this test).
      const isBenign = await renderedIsBenign()
      const bond = await readFile(BOND_MIGRATOR_SOURCE, 'utf-8')
      const block = bond.match(/const IDEMPOTENT_PG_CODES = new Set\(\[([\s\S]*?)\]\)/)?.[1]
      expect(block).toBeDefined()
      const codes = [...block!.matchAll(/'([0-9A-Z]{5})'/g)].map((m) => m[1])
      // The scan must actually read the bond's list, or the guard is vacuous.
      expect(codes.length).toBeGreaterThanOrEqual(7)
      for (const code of codes) {
        // The message is deliberately inert — this probes the code path only.
        expect(isBenign(Object.assign(new Error(`probe ${code}`), { code }))).toBe(true)
      }
    },
  )
})

describe('admin connection lifecycle', () => {
  /**
   * Execute the RENDERED step-1 block (the exact code a scaffold ships): the
   * pg.Client, DATABASE_URL, sslConfig, dbName and console it closes over are
   * injected; the declaration's one TS annotation is stripped the same way
   * the predicate's signature is, and the body runs verbatim.
   */
  async function runStep1(
    stub: {
      connect: () => Promise<void>
      query: (sql: string) => Promise<unknown>
      end: () => Promise<void>
    },
    dbName = 'myapp',
  ): Promise<{
    logs: string[]
    warns: string[]
    clients: Array<{ ends: number }>
    queries: string[]
  }> {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const start = runner.indexOf('// Step 1: Try to create the database')
    const end = runner.indexOf('// Step 2: Run migrations')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const step1 = runner
      .slice(start, end)
      .replace('let adminClient: pg.Client | null = null', 'let adminClient = null')
    expect(step1).not.toContain(': pg.Client')
    const clients: Array<{ ends: number }> = []
    class StubAdminClient {
      ends = 0
      constructor() {
        clients.push(this)
      }
      connect = stub.connect
      // The applied-file record's own queries are answered here, so each stub sees only the
      // migration files it scripts.
      query = (sql: string, params?: unknown[]): Promise<unknown> =>
        /_molecule_migrations|information_schema\.tables|to_regclass/.test(sql)
          ? Promise.resolve({ rows: [] })
          : params === undefined
            ? stub.query(sql)
            : (stub.query as (s: string, p: unknown[]) => Promise<unknown>)(sql, params)
      end = async (): Promise<void> => {
        this.ends++
        await stub.end()
      }
    }
    const logs: string[] = []
    const warns: string[] = []
    const queries: string[] = []
    const instrumented: typeof stub = {
      ...stub,
      query: (sql: string) => {
        queries.push(sql)
        return stub.query(sql)
      },
    }
    class RecordingAdminClient extends StubAdminClient {
      connect = instrumented.connect
      query = instrumented.query
      end = async (): Promise<void> => {
        this.ends++
        await instrumented.end()
      }
    }
    const run = new Function(
      'pg',
      'DATABASE_URL',
      'sslConfig',
      'dbName',
      'console',
      `return (async () => {\n${step1}\n})()`,
    ) as (...args: unknown[]) => Promise<void>
    await run(
      { Client: RecordingAdminClient },
      'postgres://db.example.com:5432/myapp',
      false,
      dbName,
      {
        log: (m: string) => logs.push(m),
        warn: (m: string) => warns.push(m),
      },
    )
    return { logs, warns, clients, queries }
  }

  it('closes the admin connection when the CREATE DATABASE probe fails — db:setup must still exit', async () => {
    // The probe failure paths (the role lacks CREATEDB; a 42P04
    // duplicate-database race between two simultaneously booting replicas)
    // warn and continue — but the OPEN SOCKET kept the Node event loop alive,
    // so `npm run db:setup` hung forever after printing "Migrations
    // complete.", and every server boot left one idle connection behind.
    const { warns, clients } = await runStep1({
      connect: async () => {},
      query: () =>
        Promise.reject(
          Object.assign(new Error('permission denied to create database'), { code: '42501' }),
        ),
      end: async () => {},
    })
    expect(warns.some((w) => w.includes('Could not auto-create database'))).toBe(true)
    expect(clients[0]?.ends).toBe(1)
  })

  it('escapes a quote-bearing dbName in the CREATE DATABASE statement', async () => {
    // The statement is a security-relevant data-to-identifier conversion, and
    // a source-shape regex cannot pin what it PRODUCES — a correct-but-different
    // escaping fails a shape pin while an arbitrary re-wrapping helper passes
    // it. Executes the RENDERED statement with a name that tries to break out:
    // the double quote must be doubled, so the identifier stays one database
    // name and nothing after the injected quote becomes SQL.
    const { queries } = await runStep1(
      {
        connect: async () => {},
        query: (sql: string) =>
          Promise.resolve(sql.startsWith('SELECT') ? { rows: [] } : undefined),
        end: async () => {},
      },
      'app"; DROP TABLE users; --',
    )
    const created = queries.find((sql) => sql.startsWith('CREATE DATABASE'))
    expect(created).toBe('CREATE DATABASE "app""; DROP TABLE users; --"')
  })

  it('survives a failed connect() with an end() that has nothing to close', async () => {
    // Worst case: connect() itself fails and pg's end() rejects too. The
    // cleanup is guarded, so step 1 still resolves (warn + continue) instead
    // of throwing a SECOND error over the one already reported.
    const { warns, clients } = await runStep1({
      connect: () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:5432')),
      query: async () => {},
      end: () => Promise.reject(new Error('Connection terminated')),
    })
    expect(warns.some((w) => w.includes('Could not auto-create database'))).toBe(true)
    expect(clients).toHaveLength(1)
  })

  it('still closes the admin connection on the happy path', async () => {
    const { logs, clients } = await runStep1({
      connect: async () => {},
      query: (sql: string) => Promise.resolve(sql.startsWith('SELECT') ? { rows: [] } : undefined),
      end: async () => {},
    })
    expect(logs).toContain("✓ Created database 'myapp'")
    expect(clients[0]?.ends).toBe(1)
  })
})

describe('migration connection lifecycle', () => {
  /**
   * Execute the RENDERED steps 2–3 (the exact code a scaffold ships): the pg
   * client, DATABASE_URL, sslConfig, the fs helpers, directories and console
   * it closes over are injected; the benign-error helper is extracted from
   * the same render and inlined, its one TS annotation stripped, the body
   * verbatim.
   */
  async function runSteps(
    stub: {
      connect: () => Promise<void>
      query: (sql: string) => Promise<unknown>
      end: () => Promise<void>
    },
    clients: Array<{ ends: number }>,
    /** Whether `migrationsDir` exists on the stub filesystem. */
    migrationsDirExists = true,
  ): Promise<{ logs: string[]; warns: string[] }> {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const helperSource = runner.match(/function isBenignMigrationError[\s\S]*?\n}/)?.[0]
    expect(helperSource).toBeDefined()
    const start = runner.indexOf('// Step 2: Run migrations')
    const end = runner.indexOf("console.log('Migrations complete.')")
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const steps = runner.slice(start, end)
    const jsHelper = helperSource!.replace(
      'function isBenignMigrationError(err: unknown): boolean {',
      'function isBenignMigrationError(err) {',
    )
    class StubClient {
      ends = 0
      constructor() {
        clients.push(this)
      }
      connect = stub.connect
      // The applied-file record's own queries are answered here, so each stub sees only the
      // migration files it scripts.
      query = (sql: string, params?: unknown[]): Promise<unknown> =>
        /_molecule_migrations|information_schema\.tables|to_regclass/.test(sql)
          ? Promise.resolve({ rows: [] })
          : params === undefined
            ? stub.query(sql)
            : (stub.query as (s: string, p: unknown[]) => Promise<unknown>)(sql, params)
      end = async (): Promise<void> => {
        this.ends++
        await stub.end()
      }
    }
    const logs: string[] = []
    const warns: string[] = []
    const run = new Function(
      'pg',
      'DATABASE_URL',
      'sslConfig',
      'existsSync',
      'readdirSync',
      'readFileSync',
      'join',
      'migrationsDir',
      'setupDir',
      'console',
      `${jsHelper}; return (async () => {\n${steps}\n})()`,
    ) as (...args: unknown[]) => Promise<{ logs: string[]; warns: string[] }>
    await run(
      { Client: StubClient },
      'postgres://db.example.com:5432/myapp',
      false,
      (path: string) => path === '__setup__' || (migrationsDirExists && path === 'migrations'),
      (path: string) => {
        if (path !== 'migrations') return ['payments.sql'] // __setup__
        // node's own behaviour for a directory that is not there.
        if (!migrationsDirExists)
          throw Object.assign(
            new Error("ENOENT: no such file or directory, scandir 'migrations'"),
            { code: 'ENOENT' },
          )
        return ['0001_tables.sql']
      },
      (path: string, _encoding: string) =>
        path.startsWith('__setup__') ? 'SETUP DDL' : 'MIGRATION DDL',
      (dir: string, file: string) => `${dir}/${file}`,
      'migrations',
      '__setup__',
      { log: (m: string) => logs.push(m), warn: (m: string) => warns.push(m) },
    )
    return { logs, warns }
  }

  it('closes the migration connection when a non-benign migration fails — the throw must not leak the socket', async () => {
    // A non-benign failure rethrows to the boot-time caller — and used to
    // leave the step-2 client OPEN (no finally): an open socket keeps the
    // Node event loop alive, so a boot supervisor that catches the rejection
    // and retries leaked one idle connection per attempt, and `npm run
    // db:setup` could hang at exit instead of reporting the failure. The
    // same policy the step-1 admin connection already follows.
    const denied = Object.assign(new Error('syntax error at or near "FROM"'), { code: '42601' })
    const clients: Array<{ ends: number }> = []
    await expect(
      runSteps(
        {
          connect: async () => {},
          query: () => Promise.reject(denied),
          end: async () => {},
        },
        clients,
      ),
    ).rejects.toBe(denied)
    expect(clients[0]?.ends).toBe(1)
  })

  it('closes the migration connection when a __setup__ replay fails', async () => {
    // The migration files apply, then the __setup__ replay fails — the throw
    // happens after the loop, on the OTHER side of the run, and the client
    // must still be closed on the way out.
    const denied = Object.assign(new Error('permission denied for schema public'), {
      code: '42501',
    })
    const clients: Array<{ ends: number }> = []
    await expect(
      runSteps(
        {
          connect: async () => {},
          query: (sql: string) =>
            // The stub fs marks __setup__ files' content, so the failing
            // query is the replay's — after every migration file applied.
            sql.startsWith('SETUP') ? Promise.reject(denied) : Promise.resolve(undefined),
          end: async () => {},
        },
        clients,
      ),
    ).rejects.toBe(denied)
    expect(clients[0]?.ends).toBe(1)
  })

  it('closes the migration connection on the happy path and after a benign re-run', async () => {
    const clients: Array<{ ends: number }> = []
    let first = true
    const { logs, warns } = await runSteps(
      {
        connect: async () => {},
        query: () => {
          // The first migration's re-run raises a duplicate-table error —
          // benign, the run continues to the __setup__ replay.
          if (first) {
            first = false
            return Promise.reject(
              Object.assign(new Error('relation "t" already exists'), { code: '42P07' }),
            )
          }
          return Promise.resolve(undefined)
        },
        end: async () => {},
      },
      clients,
    )
    // No record and no other tables: not an adopted database, so the file is retried, and said so.
    expect(warns.some((w) => w.includes('nothing in this file was applied'))).toBe(true)
    expect(logs).toContain('✓ __setup__/payments.sql')
    expect(clients[0]?.ends).toBe(1)
  })

  it('treats a MISSING migrations directory as empty instead of failing the run', async () => {
    // mlcl emits this runner for any project that has a database package, and
    // nothing creates `migrations/` for a project scaffolded without a resource
    // (`mlcl create --type api --packages @molecule/api-database-postgresql`, or
    // `mlcl add <database> --inject` into a project that never had one). The
    // unguarded `readdirSync(migrationsDir)` then threw ENOENT — from
    // server.ts's boot-time `await runMigrations()` an API that cannot start,
    // and from `npm run db:setup` a raw stack trace instead of the empty-state
    // line the branch below it prints.
    const clients: Array<{ ends: number }> = []
    const queries: string[] = []
    const { logs } = await runSteps(
      {
        connect: async () => {},
        query: (sql: string) => {
          queries.push(sql)
          return Promise.resolve(undefined)
        },
        end: async () => {},
      },
      clients,
      false,
    )
    expect(logs).toContain('No migration files found.')
    // The empty migration list must not skip the __setup__ replay after it.
    expect(queries).toContain('SETUP DDL')
    expect(logs).toContain('✓ __setup__/payments.sql')
    expect(clients[0]?.ends).toBe(1)
  })
})

describe('ensureMigrateRunnerImports', () => {
  it('declares the bond-setup package a runner imports, at the registry pin', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeManifest({ '@molecule/api-database-postgresql': '1.0.5' })
    const added = await ensureMigrateRunnerImports(dir)
    expect(added).toEqual(['@molecule/api-bonds-default-express'])
    expect((await readManifest()).dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('backs a PGlite-only runner the same way', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-pglite']),
    )
    await writeManifest({ '@molecule/api-database-pglite': '1.0.0' })
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-bonds-default-express'])
  })

  it('promotes a devDependencies-only PGlite pin when the branch is reachable — a pruned pin is the boot crash', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // What `mlcl add --dev @molecule/api-database-pglite --inject` (or a swap
    // out of devDependencies) leaves: a runner whose branch fires at boot,
    // backed by a pin production deploys prune. The wrapper import the runner
    // also needs is declared here so the assertion isolates the promotion.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-pglite']),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@molecule/api-bonds-default-express': '1.1.0' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-database-pglite'])
    const manifest = await readManifest()
    // The pin MOVED (version kept — an explicit `mlcl add` resolved it), it
    // did not duplicate across keys.
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBeUndefined()
  })

  it('promotes the pin for the dual runner too — the gated branch still fires in browser-profile deploys', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // The kanban shape: Postgres server profile + PGlite browser profile in
    // one runner, with PGlite declared only as a devDependency.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner([
        '@molecule/api-database-postgresql',
        '@molecule/api-database-pglite',
      ]),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@molecule/api-bonds-default-express': '1.1.0',
          '@molecule/api-database-postgresql': '1.0.5',
        },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )
    await ensureMigrateRunnerImports(dir)
    const manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBeUndefined()
  })

  it('promotes a devDependencies-only PostgreSQL pin — the emitted pg machinery must survive a production prune', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // What `mlcl add --dev @molecule/api-database-postgresql --inject` (or a
    // swap out of devDependencies) leaves: the render counts the dev key as
    // declaring the database, so the runner carries the full Postgres
    // machinery (`import pg from 'pg'`, the bond's `deriveSsl`) — machinery a
    // production `--omit=dev` deploy pruned straight into a boot-time
    // ERR_MODULE_NOT_FOUND, the same crash class the PGlite promotion closes.
    // The wrapper import the runner also needs is declared here so the
    // assertion isolates the promotion.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@molecule/api-bonds-default-express': '1.1.0' },
        devDependencies: { '@molecule/api-database-postgresql': '1.0.2' },
      }),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-database-postgresql'])
    const manifest = await readManifest()
    // The pin MOVED (version kept), it did not duplicate across keys.
    expect(manifest.dependencies['@molecule/api-database-postgresql']).toBe('1.0.2')
    expect(manifest.devDependencies?.['@molecule/api-database-postgresql']).toBeUndefined()
  })

  it('backs every bond a dual render emitted from devDependencies, wrapper included', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // Both databases on the pruned key: the wrapper (no pin at all → registry
    // pin) plus BOTH bonds moved with the versions the manifest carries.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner([
        '@molecule/api-database-postgresql',
        '@molecule/api-database-pglite',
      ]),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@molecule/api-database-pglite': '1.0.3',
          '@molecule/api-database-postgresql': '1.0.2',
        },
      }),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual([
      '@molecule/api-bonds-default-express',
      '@molecule/api-database-pglite',
      '@molecule/api-database-postgresql',
    ])
    const manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
    expect(manifest.dependencies['@molecule/api-database-postgresql']).toBe('1.0.2')
    expect(manifest.devDependencies).toEqual({})
  })

  it('restores the manifest when its write fails mid-flight — a partial write must not corrupt package.json', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    // A devDependencies pin guarantees the write has something to do (the pin
    // moves into dependencies).
    const original =
      JSON.stringify(
        {
          name: 'demo-api',
          dependencies: {},
          devDependencies: { '@molecule/api-database-postgresql': '1.0.5' },
        },
        null,
        2,
      ) + '\n'
    await writeFile(join(dir, 'package.json'), original)
    manifestIntercept.armed = true
    await expect(ensureMigrateRunnerImports(dir)).rejects.toThrow(/simulated ENOSPC/)
    // The manifest holds the pre-write bytes again — not the corrupt partial
    // the failing write left behind.
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(original)
  })

  it('a swap that lands PostgreSQL in devDependencies keeps the machinery AND a production pin', async () => {
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    // What a swap out of a dev key leaves behind (applyBondSwap writes the new
    // database into the SAME key the old one occupied): the runner re-renders
    // identically — the dev key still declares the database — and the backing
    // step must move the pin, or the machinery it kept is exactly what a
    // production prune breaks.
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ devDependencies: { '@molecule/api-database-postgresql': '1.0.5' } }),
    )
    expect((await syncMigrateRunner(project, '@molecule/api-database-postgresql'))?.updated).toBe(
      false,
    )
    const swapped = JSON.parse(await readFile(join(project, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(swapped.dependencies['@molecule/api-database-postgresql']).toBe('1.0.5')
    expect(swapped.devDependencies?.['@molecule/api-database-postgresql']).toBeUndefined()
    expect(swapped.dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('adds the registry pin when a reachable branch has no pin at all', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-pglite']),
    )
    await writeManifest({ '@molecule/api-bonds-default-express': '1.1.0' })
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-database-pglite'])
    expect((await readManifest()).dependencies['@molecule/api-database-pglite']).toBe(
      getMoleculeVersion('@molecule/api-database-pglite'),
    )
  })

  it('leaves the PGlite pin alone when the branch is unreachable, or the runner covers another database', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    // Postgres-only render: the flag is a bare `false` — the branch can never
    // fire, so a dev-only PGlite pin is none of the runner's business. The
    // Postgres machinery the SAME render emits is the runner's business: it
    // imports the PostgreSQL bond, which this manifest does not back at all.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@molecule/api-bonds-default-express': '1.1.0' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-database-postgresql'])
    let manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBeUndefined()
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBe('1.0.3')
    // Added at the registry pin — the manifest carried no postgresql pin.
    expect(manifest.dependencies['@molecule/api-database-postgresql']).toBe(
      getMoleculeVersion('@molecule/api-database-postgresql'),
    )
    // A SQLite runner has no PGlite branch and no Postgres machinery — but it
    // DOES import the SQLite bond at its top level, so THAT is the pin this
    // render needs backed (the manifest carries none, so it is added at the
    // registry pin). The untouched PGlite dev pin is the point of this case.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-sqlite']),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual(['@molecule/api-database-sqlite'])
    manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-database-sqlite']).toBe(
      getMoleculeVersion('@molecule/api-database-sqlite'),
    )
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBe('1.0.3')
  })

  it('warns and backs nothing when the manifest is unreadable — and leaves it untouched', async () => {
    // The runner needs its imports backed but the manifest cannot be parsed:
    // the step warns (naming the file and the missing pins) and returns []
    // instead of throwing — and the manifest must never be written over.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    const corrupt = '{ this is not json'
    await writeFile(join(dir, 'package.json'), corrupt)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(await ensureMigrateRunnerImports(dir)).toEqual([])
      // Assert BEFORE mockRestore — restoring resets the recorded calls.
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing or unparseable'))
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('@molecule/api-bonds-default-express'),
      )
    } finally {
      warnSpy.mockRestore()
    }
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(corrupt)
  })

  it('fails loudly when the runner exists but cannot be read — a silent no-op ships undeclared imports', async () => {
    // A runner this call cannot READ is not a project without a runner: the
    // old catch treated ANY read failure as "no runner on disk" and returned
    // [], so the imports this step exists to declare stayed undeclared while
    // the caller reported success — the project then failed `tsc`/boot with
    // TS2307/ERR_MODULE_NOT_FOUND far from the cause. A directory at the
    // runner's path makes the read fail with EISDIR deterministically (a
    // mode-000 file would not, under a root test runner).
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await writeManifest({})
    await mkdir(join(dir, 'src', 'scripts', 'migrate.ts'), { recursive: true })
    await expect(ensureMigrateRunnerImports(dir)).rejects.toThrow()
    // The manifest was never touched.
    expect(await readManifest()).toEqual({ dependencies: {} })
  })

  it('is a no-op when already declared, when there is no runner, or for runners that do not import it', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    // No runner at all.
    await writeManifest({})
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    // An OUT-OF-BAND runner (D1) imports no database package at all — that is
    // the shape this step is a no-op for. (A SQLite/MySQL runner DOES import its
    // own bond at the top level and is backed; see the promotion cases.)
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-d1']),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    // Already declared → untouched (the postgres render imports the wrapper
    // AND the Postgres machinery's bond — both must sit in dependencies).
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeManifest({
      '@molecule/api-bonds-default-express': '1.1.0',
      '@molecule/api-database-postgresql': '1.0.5',
    })
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    expect((await readManifest()).dependencies['@molecule/api-bonds-default-express']).toBe('1.1.0')
  })
})

describe('syncMigrateRunner', () => {
  it('rewrites a Postgres runner for SQLite after the swap', async () => {
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    const result = await syncMigrateRunner(project, '@molecule/api-database-sqlite')
    expect(result?.updated).toBe(true)
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain("from '@molecule/api-database-sqlite'")
    expect(runner).not.toContain('@molecule/api-database-postgresql')
  })

  it('rewrites a SQLite runner for MySQL', async () => {
    const project = await projectWithRunner('@molecule/api-database-sqlite')
    expect((await syncMigrateRunner(project, '@molecule/api-database-mysql'))?.updated).toBe(true)
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain('@molecule/api-database-mysql')
  })

  it('rewrites a Postgres runner for PGlite: browser profile live, removed Postgres imports gone, wrapper declared', async () => {
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    // What applyBondSwap leaves behind on postgresql → pglite: the old bond
    // removed from dependencies, the new one added there.
    await writeManifest({ '@molecule/api-database-pglite': '1.0.0' })
    expect((await syncMigrateRunner(project, '@molecule/api-database-pglite'))?.updated).toBe(true)
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    // PGlite is the only database now — migrations run on it in every profile.
    expect(runner).toContain('const BROWSER_PROFILE = true\n')
    // No import of the just-removed PostgreSQL bond or its driver survives
    // (only the explanatory comment may still name the bond).
    expect(runner).not.toContain("from '@molecule/api-database-postgresql'")
    expect(runner).not.toContain("from 'pg'")
    expect(runner).not.toContain('deriveSsl')
    // And the typed wrapper the runner still imports is declared in the
    // manifest, so a real install resolves it.
    expect((await readManifest()).dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('declares the bond-setup package a SQLite project needs after swapping to Postgres', async () => {
    const project = await projectWithRunner('@molecule/api-database-sqlite')
    // applyBondSwap removed sqlite and added postgresql in dependencies.
    await writeManifest({ '@molecule/api-database-postgresql': '1.0.5' })
    await syncMigrateRunner(project, '@molecule/api-database-postgresql')
    expect((await readManifest()).dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('follows a swap whose old database sat in devDependencies', async () => {
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    // `mlcl add --dev @molecule/api-database-postgresql` put the old database
    // in devDependencies, so applyBondSwap writes the swapped-in PGlite there
    // too (same dep key as the old one). A production-only manifest reader
    // saw NEITHER database: the runner kept its `pg`/deriveSsl imports of the
    // bond the swap just removed (TS2307 / ERR_MODULE_NOT_FOUND on a real
    // install) with the new bond's branch dead behind a false gate.
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ devDependencies: { '@molecule/api-database-pglite': '1.0.0' } }),
    )
    expect((await syncMigrateRunner(project, '@molecule/api-database-pglite'))?.updated).toBe(true)
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain('const BROWSER_PROFILE = true\n')
    expect(runner).not.toContain("from 'pg'")
    expect(runner).not.toContain("from '@molecule/api-database-postgresql'")
    expect(runner).not.toContain('deriveSsl')
    // And because that bare-true branch fires in EVERY profile, the swapped-in
    // pin is promoted out of devDependencies — a production prune must not
    // leave boot-time runMigrations() crashing on the bond it needs.
    const swapped = JSON.parse(await readFile(join(project, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(swapped.dependencies['@molecule/api-database-pglite']).toBe('1.0.0')
    expect(swapped.devDependencies?.['@molecule/api-database-pglite']).toBeUndefined()
    expect(swapped.dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('swaps onto D1 ship the out-of-band runner — no import of the removed bond survives', async () => {
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    // applyBondSwap removed postgresql and added d1 in dependencies.
    await writeManifest({ '@molecule/api-database-d1': '1.0.0' })
    expect((await syncMigrateRunner(project, '@molecule/api-database-d1'))?.updated).toBe(true)
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    // D1 runs on Workers — no filesystem for a migrator — so the runner is a
    // guidance no-op that keeps server.ts's boot import and db:setup
    // resolving while importing no database package at all.
    expect(runner).toContain('out of band')
    expect(runner).toContain('export async function runMigrations(): Promise<void> {')
    expect(runner).not.toContain('@molecule/api-database-postgresql')
    expect(runner).not.toContain('@molecule/api-bonds-default-express')
    expect(runner).not.toContain("from 'pg'")
    expect(runner).not.toContain("from '@molecule/api-database-sqlite'")
  })

  it('leaves a runner that already matches alone', async () => {
    const project = await projectWithRunner('@molecule/api-database-mysql')
    expect((await syncMigrateRunner(project, '@molecule/api-database-mysql'))?.updated).toBe(false)
  })

  it('does nothing for a project with no runner, or a provider with no runner template', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    expect(await syncMigrateRunner(dir, '@molecule/api-database-sqlite')).toBeNull()
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    // A HYPOTHETICAL future provider — not in the registry (the coverage test
    // below pins that every registry database provider IS covered, so this
    // name cannot be mistaken for a real gap like D1 once was). Swapping onto
    // it leaves the runner alone rather than guessing a template.
    expect(await syncMigrateRunner(project, '@molecule/api-database-hypothetical')).toBeNull()
  })
})

describe('MIGRATE_RUNNER_PROVIDERS registry coverage', () => {
  it('covers every database provider in the registry', () => {
    const dbProviders = loadRegistry('api')
      .filter((p) => p.molecule?.category === 'database' && p.type === 'provider')
      .map((p) => p.name)
    // The registry is the source of truth; a provider missing here (D1 was,
    // until it stranded swapped projects on a runner importing the bond the
    // swap removed) must fail this test, not the first user to swap onto it.
    expect(dbProviders.length).toBeGreaterThan(0)
    expect(dbProviders.filter((name) => !MIGRATE_RUNNER_PROVIDERS.includes(name))).toEqual([])
  })
})
