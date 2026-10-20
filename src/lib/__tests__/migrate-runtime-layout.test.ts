import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import { readMigrateRunner } from '../migrate-runner.js'

const exec = promisify(execFile)
const temporary: string[] = []
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

/** Execute the complete emitted runner; only the database transport is a fixture. */
async function runFixture(
  source: string,
  layout: string,
  options: { escapedPath?: boolean; empty?: boolean; withoutManifest?: boolean } = {},
): Promise<string[]> {
  const root = await mkdtemp(join(tmpdir(), 'mlcl-migration-layout-'))
  temporary.push(root)
  const api = join(root, options.escapedPath ? 'api space #% ü' : 'api')
  const runner = join(api, layout, layout.startsWith('src/') ? 'migrate.ts' : 'migrate.js')
  await mkdir(dirname(runner), { recursive: true })
  if (!options.withoutManifest) {
    await writeFile(join(api, 'package.json'), JSON.stringify({ type: 'module' }))
  }
  await writeFile(join(api, '.env'), 'DATABASE_URL=postgres://fixture:fixture@localhost/fixture\n')
  const trace = join(root, 'queries.jsonl')
  const transport = `
    import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
    import { join } from 'node:path';
    function record(sql) { appendFileSync(process.env.FIXTURE_TRACE, JSON.stringify(sql) + '\\n'); }
    export function createMigrator(dir) { return async () => {
      if (!existsSync(dir)) return;
      for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort())
        record(readFileSync(join(dir, file), 'utf8'));
    }; }
    export function createMigratorPglite(...dirs) {
      return async () => { for (const dir of dirs) await createMigrator(dir)(); };
    }
    export function deriveSsl() { return false; }
    export default { Client: class {
      async connect() {}
      async end() {}
      async query(sql) { record(sql); return { rows: [] }; }
    } };
  `
  for (const pkg of [
    'pg',
    '@molecule/api-bonds-default-express',
    '@molecule/api-database-postgresql',
    '@molecule/api-database-sqlite',
    '@molecule/api-database-mysql',
  ]) {
    const dir = join(api, 'node_modules', pkg)
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ type: 'module', exports: './index.js' }),
    )
    await writeFile(join(dir, 'index.js'), transport)
  }
  if (!options.empty) {
    for (const [dir, sql] of [
      ['migrations', 'fixture migration'],
      ['__setup__', 'fixture setup'],
    ]) {
      await mkdir(join(api, dir))
      await writeFile(join(api, dir, '001.sql'), sql)
    }
  }
  await writeFile(
    runner,
    runner.endsWith('.ts')
      ? source
      : ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        }).outputText,
  )
  const env: NodeJS.ProcessEnv = { ...process.env, FIXTURE_TRACE: trace }
  // Exercise .env lookup without relying on the launcher working directory.
  delete env.DATABASE_URL
  delete env.MOL_BOND_PROFILE
  await exec(process.execPath, [runner], { cwd: root, env, timeout: 10_000 })
  try {
    return (await readFile(trace, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string)
      .filter((sql) => sql.startsWith('fixture '))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

describe('migration runner runtime layouts', () => {
  for (const provider of ['postgresql', 'pglite', 'sqlite', 'mysql']) {
    for (const layout of ['src/scripts', 'dist/scripts', 'dist/src/scripts']) {
      it(`${provider}: reads API migrations and setup from ${layout}`, async () => {
        const source = await readMigrateRunner([`@molecule/api-database-${provider}`])
        expect(await runFixture(source, layout)).toEqual(['fixture migration', 'fixture setup'])
      })
    }
    it(`${provider}: decodes URL-escaped API paths`, async () => {
      const source = await readMigrateRunner([`@molecule/api-database-${provider}`])
      expect(await runFixture(source, 'dist/src/scripts', { escapedPath: true })).toEqual([
        'fixture migration',
        'fixture setup',
      ])
    })
    it(`${provider}: permits a package with no migrations or setup`, async () => {
      const source = await readMigrateRunner([`@molecule/api-database-${provider}`])
      expect(await runFixture(source, 'dist/src/scripts', { empty: true })).toEqual([])
    })
    it(`${provider}: refuses an unlocatable API package instead of silently skipping SQL`, async () => {
      const source = await readMigrateRunner([`@molecule/api-database-${provider}`])
      await expect(
        runFixture(source, 'src/scripts', { withoutManifest: true }),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('Cannot locate the API package.json for migrations'),
      })
    })
  }

  it('the checked-in blog delegate reads migrations from dist/src', async () => {
    const source = await readFile(
      join(import.meta.dirname, '../../../templates/apps/blog/api/src/scripts/migrate.ts'),
      'utf8',
    )
    // This legacy delegate applies app migrations only; preserve that contract.
    expect(await runFixture(source, 'dist/src/scripts')).toEqual(['fixture migration'])
  })
})
