/**
 * The custom `mlcl create` path used to ship a migration runner whose static
 * imports nothing declared: the api skeleton carried a placeholder
 * `src/scripts/migrate.ts` (importing `pg`, the PostgreSQL bond and the PGlite
 * migrator wrapper) before any package selection existed, and the final
 * manifest never declared the wrapper package
 * `@molecule/api-bonds-default-express` — so `typecheck`/`build`/`db:setup`
 * broke on a real install while the workspace's hoisted node_modules hid it.
 *
 * Pins the two scaffold-side halves of the fix: the skeleton writes NO runner
 * (the injector writes the real one from the real selection), and
 * `copySqlSetupScripts` — the post-inject step every custom build runs —
 * declares the runner's imports in the manifest.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readMigrateRunner } from '../migrate-runner.js'
import { getMoleculeVersion } from '../registry.js'
import { copySqlSetupScripts, createApiProject } from '../scaffold.js'

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('custom-create migration-runner wiring', () => {
  it('copySqlSetupScripts declares the bond-setup package the injected runner imports', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-migrate-'))
    // What `mlcl inject` leaves behind for a database selection: the runner,
    // and a manifest that does NOT declare the wrapper it imports.
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-postgresql']),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
      }),
    )

    await copySqlSetupScripts(dir, [], [])

    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('copySqlSetupScripts promotes a reachable PGlite branch out of devDependencies', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-migrate-'))
    // A PGlite selection the user installed with --dev: the injected runner's
    // branch fires at boot in every profile, but production deploys prune
    // devDependencies — the pin must move before the project ships.
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await writeFile(
      join(dir, 'src', 'scripts', 'migrate.ts'),
      await readMigrateRunner(['@molecule/api-database-pglite']),
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        dependencies: { '@molecule/api-bonds-default-express': '1.1.0' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )

    await copySqlSetupScripts(dir, [], [])

    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
    expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBeUndefined()
  })

  it('copySqlSetupScripts leaves a database-less project alone', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-migrate-'))
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo-api', dependencies: {} }),
    )
    await copySqlSetupScripts(dir, [], [])
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBeUndefined()
  })

  it('the api skeleton writes no placeholder runner — only the injector, from the real selection', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-migrate-'))
    await createApiProject(dir, 'demo-api')
    // A placeholder would import database packages a not-yet-selected project
    // cannot declare; the injector emits the runner when a database package
    // actually lands.
    expect(existsSync(join(dir, 'src', 'scripts', 'migrate.ts'))).toBe(false)
    // The script stays for projects that DO get a runner.
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts['db:setup']).toBe('tsx src/scripts/migrate.ts')
  })
})
