/**
 * `@types/pg` goes into an API only when its migration runner imports `pg`.
 *
 * Every API scaffold used to get `@types/pg` and `@types/jsonwebtoken` from the shared API toolchain:
 * an SQLite project installed Postgres types (and their `pg-types` tree) it never reads, and no
 * generated file imports `jsonwebtoken` at all. The Postgres runner is the one file that imports the
 * `pg` driver, which ships no types, so a strict `tsc` needs `@types/pg` there (TS7016) and nowhere
 * else.
 *
 * The real runner templates are rendered through `readMigrateRunner`, and the real
 * `ensureMigrateRunnerImports` declares what each one imports.
 *
 * @module
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ensureMigrateRunnerImports, readMigrateRunner } from '../migrate-runner.js'
import { loadToolchain } from '../registry.js'

let dir: string | null = null

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/** A project holding `runner` at src/scripts/migrate.ts and `manifest` as its package.json. */
async function projectWith(runner: string, manifest: unknown): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-pg-types-'))
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await writeFile(join(dir, 'src', 'scripts', 'migrate.ts'), runner)
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return dir
}

/** The project's devDependencies. */
async function devDependenciesOf(project: string): Promise<Record<string, string>> {
  const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf-8')) as {
    devDependencies?: Record<string, string>
  }
  return manifest.devDependencies ?? {}
}

describe('Postgres types follow the runner that imports pg', () => {
  it('the API toolchain every scaffold spreads carries neither @types/pg nor @types/jsonwebtoken (OLD MUSTFAIL)', () => {
    const { api, postgres } = loadToolchain()
    expect(api).not.toHaveProperty(['@types/pg'])
    expect(api).not.toHaveProperty(['@types/jsonwebtoken'])
    expect(postgres['@types/pg'], 'the pin moved to toolchain.postgres').toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('declares @types/pg for the Postgres runner (OLD MUSTFAIL)', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    // Non-vacuous: this runner really imports the driver.
    expect(runner).toContain("from 'pg'")
    const project = await projectWith(runner, {
      dependencies: { '@molecule/api-database-postgresql': '1.0.0', pg: '8.23.1' },
      devDependencies: { typescript: '6.0.3' },
    })

    await ensureMigrateRunnerImports(project)

    const devDependencies = await devDependenciesOf(project)
    expect(devDependencies['@types/pg']).toBe(loadToolchain().postgres['@types/pg'])
    expect(Object.keys(devDependencies), 'kept sorted').toEqual(['@types/pg', 'typescript'])
  })

  it('keeps a @types/pg pin the project already has', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const project = await projectWith(runner, {
      dependencies: { '@molecule/api-database-postgresql': '1.0.0', pg: '8.23.1' },
      devDependencies: { '@types/pg': '8.11.0' },
    })

    await ensureMigrateRunnerImports(project)

    expect((await devDependenciesOf(project))['@types/pg']).toBe('8.11.0')
  })

  it('counterexample: an SQLite runner gets no Postgres types', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-sqlite'])
    expect(runner).not.toContain("from 'pg'")
    const project = await projectWith(runner, {
      dependencies: { '@molecule/api-database-sqlite': '1.0.0' },
      devDependencies: { typescript: '6.0.3' },
    })

    await ensureMigrateRunnerImports(project)

    expect(await devDependenciesOf(project)).not.toHaveProperty(['@types/pg'])
  })
})
