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
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  manifestDeclaresPglite,
  migrateTemplateFor,
  readMigrateRunner,
  readMigrateRunnerForManifest,
  renderMigrateRunner,
  syncMigrateRunner,
} from '../migrate-runner.js'

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

describe('migrateTemplateFor', () => {
  it('picks the runner for the wired database', () => {
    expect(migrateTemplateFor(['@molecule/api-database-sqlite'])).toBe('api/migrate-sqlite.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-mysql'])).toBe('api/migrate-mysql.ts.tpl')
    expect(migrateTemplateFor(['@molecule/api-database-postgresql'])).toBe('api/migrate.ts.tpl')
  })
})

describe('renderMigrateRunner', () => {
  it('substitutes the PGlite flag both ways', () => {
    expect(renderMigrateRunner('const B = {{MIGRATE_PGLITE}} && x', true)).toBe(
      'const B = true && x',
    )
    expect(renderMigrateRunner('const B = {{MIGRATE_PGLITE}} && x', false)).toBe(
      'const B = false && x',
    )
  })

  it('is a no-op for templates without the placeholder', () => {
    expect(renderMigrateRunner('const a = 1', true)).toBe('const a = 1')
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

  it('readMigrateRunnerForManifest follows the manifest, not the caller', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { '@molecule/api-database-pglite': '1.0.0' } }),
    )
    expect(await readMigrateRunnerForManifest(dir)).toContain(
      'false && process.env.MOL_BOND_PROFILE',
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-database-pglite': '1.0.0' } }),
    )
    expect(await readMigrateRunnerForManifest(dir)).toContain(
      'true && process.env.MOL_BOND_PROFILE',
    )
  })

  it('keeps a declaring project’s branch across a Postgres re-swap', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-runner-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-database-pglite': '1.0.0' } }),
    )
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunnerForManifest(dir),
    )
    expect((await syncMigrateRunner(dir, '@molecule/api-database-postgresql'))?.updated).toBe(false)
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
