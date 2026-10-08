/**
 * `executeInjection`'s rollback used to `rm -f` every file it had written —
 * including files that PREDATED the injection and were only OVERWRITTEN (the
 * synthesized `server.ts` / `router.ts` / `bonds/index.ts` /
 * `src/scripts/migrate.ts` creates carry no conflict guard), so any later
 * failure in the apply loop (a copy whose source is gone, an unparseable
 * manifest, a failed migrations write) deleted the project's working files
 * and left it strictly worse than before the inject. Rollback must restore
 * the pre-injection content instead: a failed inject may leave the project
 * unchanged, never worse.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { executeInjection, type InjectionPlan } from '../injector.js'

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

function plan(files: InjectionPlan['files']): InjectionPlan {
  return {
    molecule: '@molecule/test',
    moleculePackage: {
      name: '@molecule/test',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'utility',
      routes: [],
      tables: [],
      exports: [],
      path: '/fake',
    },
    files,
    dependencies: [],
    routeWiring: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

describe('executeInjection rollback', () => {
  it('restores overwritten pre-existing files and removes only what the inject created', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo-api' }))
    // The project's working files, as a previous scaffold left them.
    const serverPath = join(dir, 'src', 'server.ts')
    const migratePath = join(dir, 'src', 'scripts', 'migrate.ts')
    const bondsPath = join(dir, 'src', 'bonds', 'index.ts')
    await writeFile(serverPath, '// my working server\n')
    await writeFile(migratePath, '// my working runner\n')

    const result = await executeInjection(
      plan([
        // Synthesized creates overwrite pre-existing targets with no conflict
        // guard — exactly how server.ts and migrate.ts get rewritten on a
        // re-inject.
        {
          action: 'create',
          targetPath: serverPath,
          content: '// injected server\n',
          description: 'overwrite server',
        },
        {
          action: 'create',
          targetPath: migratePath,
          content: '// injected runner\n',
          description: 'overwrite runner',
        },
        {
          action: 'create',
          targetPath: bondsPath,
          content: '// injected bonds\n',
          description: 'new file',
        },
        // A later op that cannot succeed (its source does not exist) fails
        // the apply loop and triggers the rollback under test.
        {
          action: 'copy',
          targetPath: join(dir, 'src', 'gone.ts'),
          sourcePath: join(dir, 'no', 'such', 'source.ts'),
          description: 'fails the apply loop',
        },
      ]),
      dir,
      { autoInstall: false },
    )

    expect(result.success).toBe(false)
    // Pre-existing files are restored to their pre-injection content…
    expect(await readFile(serverPath, 'utf-8')).toBe('// my working server\n')
    expect(await readFile(migratePath, 'utf-8')).toBe('// my working runner\n')
    // …and the file the inject itself created is removed again.
    await expect(readFile(bondsPath, 'utf-8')).rejects.toThrow(/ENOENT/)
  })

  it('restores a pre-existing migration a failed inject overwrote (corrupt manifest)', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-'))
    await mkdir(join(dir, 'migrations'), { recursive: true })
    // A corrupt manifest: migrations are written before updatePackageJson, so
    // its JSON.parse throws AFTER the migration overwrite — the review's
    // exact failure ordering.
    await writeFile(join(dir, 'package.json'), '{ this is not json')
    const migrationPath = join(dir, 'migrations', '0001_init.sql')
    await writeFile(migrationPath, '-- my applied migration\n')

    const result = await executeInjection(
      {
        ...plan([]),
        migrations: [{ name: '0001_init.sql', content: '-- injected\n', tableName: 'init' }],
        dependencies: [{ name: 'left-pad', version: '1.3.0', type: 'dependency' }],
      },
      dir,
      { autoInstall: false },
    )

    expect(result.success).toBe(false)
    expect(await readFile(migrationPath, 'utf-8')).toBe('-- my applied migration\n')
  })
})
