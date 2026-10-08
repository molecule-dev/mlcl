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
 * behind it.
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
 * The failure-semantics tests pin the runner's per-file catch: only
 * already-applied duplicate_* pg codes may continue; every other failed
 * migration must fail `db:setup` instead of exiting 0 over a broken schema.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

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

let dir: string | null = null
afterEach(async () => {
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
})

describe('renderMigrateRunner', () => {
  it('substitutes the PGlite flag both ways', () => {
    expect(renderMigrateRunner('const B = {{MIGRATE_PGLITE}} && x', { pgliteDeclared: true })).toBe(
      'const B = true && x',
    )
    expect(
      renderMigrateRunner('const B = {{MIGRATE_PGLITE}} && x', { pgliteDeclared: false }),
    ).toBe('const B = false && x')
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
    expect(withPglite).toContain('true && process.env.MOL_BOND_PROFILE')
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
    // Every {{…}} token — flag, gate, section markers — must be substituted or
    // stripped; and the explanatory comment must not have the flag token
    // rewritten inside it (it reads "The MIGRATE_PGLITE scaffold flag", not
    // "…). false is substituted by mlcl …").
    expect(runner).not.toContain('{{')
    expect(runner).toContain('The MIGRATE_PGLITE scaffold flag')
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
    expect(mixed).toContain('true && process.env.MOL_BOND_PROFILE')
    // Both in dependencies → the dual-profile runner (Postgres machinery +
    // reachable browser branch), the shape the flagship templates ship.
    await writeManifest({
      '@molecule/api-database-pglite': '1.0.0',
      '@molecule/api-database-postgresql': '1.0.5',
    })
    const both = await readMigrateRunnerForManifest(dir)
    expect(both).toContain('true && process.env.MOL_BOND_PROFILE')
    expect(both).toContain("import pg from 'pg'")
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
    expect(addPglite).toContain('true && process.env.MOL_BOND_PROFILE')
    // The reverse — injecting PostgreSQL into a PGlite-only (browser-profile)
    // project — must keep the browser branch reachable: a dead gate made boot
    // resolve DATABASE_URL on a database the app does not use and exit(1).
    await writeManifest({ '@molecule/api-database-pglite': '1.0.0' })
    const addPostgres = await readMigrateRunner(['@molecule/api-database-postgresql'], dir)
    expect(addPostgres).toContain('true && process.env.MOL_BOND_PROFILE')
    expect(addPostgres).toContain("import pg from 'pg'")
    // No manifest to read (a fresh selection) → the list is the whole truth,
    // exactly as before: PGlite alone still renders the PGlite-only runner.
    await rm(join(dir, 'package.json'), { force: true })
    const fresh = await readMigrateRunner(['@molecule/api-database-pglite'], dir)
    expect(fresh).toContain('const BROWSER_PROFILE = true\n')
    expect(fresh).not.toContain("import pg from 'pg'")
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

  it('isBenignMigrationError whitelists only the duplicate_* pg codes', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const source = runner.match(/function isBenignMigrationError[\s\S]*?\n}/)?.[0]
    expect(source).toBeDefined()
    // Execute the RENDERED helper — the exact code a scaffold ships, not a
    // copy. new Function parses plain JS, so drop only the signature type
    // annotations; the body runs verbatim.
    expect(source).toContain('function isBenignMigrationError(err: unknown): boolean {')
    const jsSource = source!.replace(
      'function isBenignMigrationError(err: unknown): boolean {',
      'function isBenignMigrationError(err) {',
    )
    const isBenign = new Function(`${jsSource}; return isBenignMigrationError`)() as (
      err: unknown,
    ) => boolean
    // Re-running an already-applied object: duplicate table / object /
    // schema — the benign re-run class, logged and skipped.
    for (const code of ['42P07', '42710', '42P06']) {
      expect(isBenign(Object.assign(new Error('already exists'), { code }))).toBe(true)
    }
    // Everything else must fail the run: a SQL syntax error, a permission
    // denial — and a non-pg error with no code at all (or a bare string).
    expect(
      isBenign(Object.assign(new Error('syntax error at or near "FROM"'), { code: '42601' })),
    ).toBe(false)
    expect(
      isBenign(Object.assign(new Error('password authentication failed'), { code: '28P01' })),
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
    // fire, so a dev-only PGlite pin is none of the runner's business.
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
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    let manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBeUndefined()
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBe('1.0.3')
    // A SQLite runner has no PGlite branch either.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-sqlite']),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    manifest = await readManifest()
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBe('1.0.3')
  })

  it('is a no-op when already declared, when there is no runner, or for runners that do not import it', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    // No runner at all.
    await writeManifest({})
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    // A SQLite runner does not import the bond-setup package.
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-sqlite']),
    )
    expect(await ensureMigrateRunnerImports(dir)).toEqual([])
    // Already declared → untouched.
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeManifest({ '@molecule/api-bonds-default-express': '1.1.0' })
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
