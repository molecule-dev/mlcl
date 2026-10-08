/**
 * `mlcl swap` to another database used to leave `src/scripts/migrate.ts` on the
 * OLD database's runner — importing a bond the swap had just removed from
 * package.json, so the swapped project failed at boot. The runner now follows
 * the database bond, through the same helper `mlcl inject` uses.
 *
 * The PGlite flag tests pin the 2026-10-08 browser-profile defect: the runner
 * reached `@molecule/api-database-pglite` through a variable-specifier dynamic
 * import that no gate could see, in apps that declared the package only as a
 * devDependency — which production deploys prune. The flag must be true ONLY
 * for a `dependencies` pin, and the emitted runner must have no raw lazy
 * import left to misdeclare.
 *
 * The manifest tests pin the same-day follow-ups: the runner's typed wrapper
 * import (`createMigratorPglite` from `@molecule/api-bonds-default-express`)
 * must be DECLARED by whatever manifest receives the runner (custom creates
 * and swaps, not just the flagship templates), and a swap onto PGlite must
 * re-render the runner PGlite-only instead of keeping imports of the
 * PostgreSQL bond the swap removed.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  ensureMigrateRunnerImports,
  manifestDeclaresPglite,
  migrateTemplateFor,
  readMigrateRunner,
  readMigrateRunnerForManifest,
  renderMigrateRunner,
  syncMigrateRunner,
} from '../migrate-runner.js'
import { getMoleculeVersion } from '../registry.js'

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

async function readManifest(): Promise<{ dependencies: Record<string, string> }> {
  return JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
}

describe('migrateTemplateFor', () => {
  it('picks the runner for the wired database', () => {
    expect(migrateTemplateFor(['@molecule/api-database-sqlite'])).toBe('api/migrate-sqlite.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-mysql'])).toBe('api/migrate-mysql.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-postgresql'])).toBe('api/migrate.ts.tpl')
    // PGlite shares the Postgres runner — its browser branch is the PGlite half.
    expect(migrateTemplateFor(['@molecule/api-database-pglite'])).toBe('api/migrate.ts.tpl')
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

describe('manifestDeclaresPglite', () => {
  it('counts only production dependencies — a devDependency pin is NOT enough', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    const manifest = join(dir, 'package.json')
    await writeFile(
      manifest,
      JSON.stringify({
        dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.0' },
      }),
    )
    expect(await manifestDeclaresPglite(manifest)).toBe(false)
    await writeFile(
      manifest,
      JSON.stringify({
        dependencies: {
          '@molecule/api-database-postgresql': '1.0.5',
          '@molecule/api-database-pglite': '1.0.0',
        },
      }),
    )
    expect(await manifestDeclaresPglite(manifest)).toBe(true)
  })

  it('treats a missing manifest as declaring nothing', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    expect(await manifestDeclaresPglite(join(dir, 'package.json'))).toBe(false)
  })
})

describe('readMigrateRunner PGlite gating', () => {
  it('emits an unreachable browser branch unless the PGlite bond is selected', async () => {
    const without = await readMigrateRunner(['@molecule/api-database-postgresql'])
    expect(without).toContain('false && process.env.MOL_BOND_PROFILE')
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
    // A devDependencies-only pin still counts as not declared.
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { '@molecule/api-database-pglite': '1.0.0' } }),
    )
    expect(await readMigrateRunnerForManifest(dir)).toContain(
      'false && process.env.MOL_BOND_PROFILE',
    )
    // Both declared → the dual-profile runner (Postgres machinery + reachable
    // browser branch), the shape the flagship templates ship.
    await writeManifest({
      '@molecule/api-database-pglite': '1.0.0',
      '@molecule/api-database-postgresql': '1.0.5',
    })
    const both = await readMigrateRunnerForManifest(dir)
    expect(both).toContain('true && process.env.MOL_BOND_PROFILE')
    expect(both).toContain("import pg from 'pg'")
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

  it('leaves a runner that already matches alone', async () => {
    const project = await projectWithRunner('@molecule/api-database-mysql')
    expect((await syncMigrateRunner(project, '@molecule/api-database-mysql'))?.updated).toBe(false)
  })

  it('does nothing for a project with no runner, or a provider with no runner template', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    expect(await syncMigrateRunner(dir, '@molecule/api-database-sqlite')).toBeNull()
    const project = await projectWithRunner('@molecule/api-database-postgresql')
    expect(await syncMigrateRunner(project, '@molecule/api-database-remote')).toBeNull()
  })
})
