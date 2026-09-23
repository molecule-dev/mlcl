/**
 * `mlcl swap` to another database used to leave `src/scripts/migrate.ts` on the
 * OLD database's runner — importing a bond the swap had just removed from
 * package.json, so the swapped project failed at boot. The runner now follows
 * the database bond, through the same helper `mlcl inject` uses.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { migrateTemplateFor, readMigrateRunner, syncMigrateRunner } from '../migrate-runner.js'

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
