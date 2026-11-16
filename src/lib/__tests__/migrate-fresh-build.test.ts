import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { syncMigrateRunner } from '../migrate-runner.js'

const require = createRequire(import.meta.url)
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture(extraScripts: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'fresh-migration-build-'))
  roots.push(root)
  await mkdir(join(root, 'src/scripts'), { recursive: true })
  await mkdir(join(root, 'migrations'))
  await writeFile(
    join(root, 'src/scripts/migrate.ts'),
    'export async function runMigrations() {}\n',
  )
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'warehouse-api',
      private: true,
      type: 'module',
      scripts: { build: 'tsc', 'db:setup': 'node dist/scripts/migrate.js', ...extraScripts },
      dependencies: { '@molecule/api-database-sqlite': '1.4.3' },
    }),
  )
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        rootDir: 'src',
        outDir: 'dist',
        skipLibCheck: true,
        strict: true,
        types: ['node'],
        incremental: true,
      },
      include: ['src/**/*.ts'],
    }),
  )
  await symlink(
    dirname(dirname(require.resolve('typescript/package.json'))),
    join(root, 'node_modules'),
  )
  await syncMigrateRunner(root, '@molecule/api-database-sqlite')
  return root
}
const run = (root: string, script: string, devPath: string): SpawnSyncReturns<string> =>
  spawnSync('npm', ['run', script], {
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: tmpdir(), SQLITE_PATH: devPath },
    encoding: 'utf8',
    timeout: 60_000,
  })

describe('SQLite builds validate the actual migration runner on a fresh file', () => {
  it('rejects a broken edited seed hidden by the dev ledger, then accepts its repair without touching dev data', async () => {
    const root = await fixture()
    const devPath = join(root, 'dev.db')
    await writeFile(
      join(root, 'migrations/001_schema.sql'),
      'CREATE TABLE stock(id TEXT PRIMARY KEY); CREATE TABLE lots(stockId TEXT REFERENCES stock(id));',
    )
    const seed =
      "INSERT INTO stock(id) VALUES ('stock-extra-digit'); INSERT INTO lots(stockId) VALUES ('stock-extra-digit');"
    await writeFile(join(root, 'migrations/002_seed.sql'), seed)
    const initial = run(root, 'build', devPath)
    expect(initial.status, initial.stdout + initial.stderr).toBe(0)
    const dev = run(root, 'db:setup', devPath)
    expect(dev.status, dev.stdout + dev.stderr).toBe(0)
    const before = await readFile(devPath)
    await writeFile(
      join(root, 'migrations/002_seed.sql'),
      seed.replace("lots(stockId) VALUES ('stock-extra-digit')", "lots(stockId) VALUES ('stock')"),
    )
    const skipped = run(root, 'db:setup', devPath)
    expect(skipped.status, skipped.stdout + skipped.stderr).toBe(0)
    const broken = run(root, 'build', devPath)
    expect(broken.status, broken.stdout + broken.stderr).not.toBe(0)
    expect(broken.stdout + broken.stderr).toContain('002_seed.sql: FOREIGN KEY constraint failed')
    expect(await readFile(devPath)).toEqual(before)
    await writeFile(
      join(root, 'migrations/002_seed.sql'),
      seed.replaceAll('stock-extra-digit', 'stock'),
    )
    const corrected = run(root, 'build', devPath)
    expect(corrected.status, corrected.stdout + corrected.stderr).toBe(0)
    expect(await readFile(devPath)).toEqual(before)
  }, 120_000)

  it('keeps custom verification commands and removes only its own hook when switching providers', async () => {
    const custom = await fixture({ 'db:verify': 'custom-database-check' })
    expect(JSON.parse(await readFile(join(custom, 'package.json'), 'utf8')).scripts).toMatchObject({
      build: 'tsc',
      'db:verify': 'custom-database-check',
    })
    const normal = await fixture()
    await syncMigrateRunner(normal, '@molecule/api-database-sqlite')
    expect(JSON.parse(await readFile(join(normal, 'package.json'), 'utf8')).scripts.build).toBe(
      'tsc && npm run db:verify',
    )
    await syncMigrateRunner(normal, '@molecule/api-database-d1')
    const scripts = JSON.parse(await readFile(join(normal, 'package.json'), 'utf8')).scripts
    expect(scripts.build).toBe('tsc')
    expect(scripts['db:verify']).toBeUndefined()
  })
})
