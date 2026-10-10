/**
 * The inject command is the one writer of `src/scripts/migrate.ts` that never
 * backed what it wrote: `mlcl add --dev <database> --inject` (and a bare
 * `mlcl inject`) rewrite the runner from the project's manifest, and the
 * command returned without declaring the runner's imports — the
 * `@molecule/api-bonds-default-express` wrapper the runner STATICALLY imports
 * (never a peer of a database bond, so no inject plan declares it), and the
 * `@molecule/api-database-pglite` pin behind a reachable browser-profile
 * branch, which a `--dev` add left in devDependencies where production
 * deploys prune it. The create (`copySqlSetupScripts`) and swap paths call
 * `ensureMigrateRunnerImports`; the inject command must too.
 *
 * Runs the REAL oclif command against a temp project.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MOLECULE_PACKAGES } from '../../lib/__tests__/create-test-project.js'
import { clearRegistryCache, getMoleculeVersion } from '../../lib/registry.js'
import Inject from '../inject.js'

/**
 * Armed to make the MANIFEST write that has to back the runner fail mid-flight
 * (the shape of a full disk on the write `ensureMigrateRunnerImports` performs):
 * the flag is set when the synthesized `src/scripts/migrate.ts` lands, so the
 * failing write is that step's, never the plan flow's earlier manifest write.
 * The failure fires ONCE — the guard's own restore write must go through — and
 * only while `armed`, so the sibling tests drive the real write path.
 */
const intercept = vi.hoisted(() => ({ armed: false, failNextManifestWrite: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFile = actual.writeFile as (...args: unknown[]) => Promise<unknown>
  return {
    ...actual,
    writeFile(path: unknown, data: unknown, ...rest: unknown[]): Promise<unknown> {
      const p = String(path)
      if (intercept.armed) {
        if (p.endsWith('migrate.ts')) intercept.failNextManifestWrite = true
        else if (intercept.failNextManifestWrite && p.endsWith('package.json')) {
          intercept.failNextManifestWrite = false
          return Promise.reject(new Error('ENOSPC: simulated full disk writing the manifest'))
        }
      }
      return realWriteFile(path, data, ...rest)
    },
  }
})

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const PGLITE_SOURCE = join(MOLECULE_PACKAGES, 'api', 'bonds', 'database', 'pglite')

let dir: string | null = null
afterEach(async () => {
  intercept.armed = false
  intercept.failNextManifestWrite = false
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function writeApiProject(withPgliteInstalled: boolean): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-migrate-'))
  await mkdir(join(dir, 'src'), { recursive: true })
  // The manifest `mlcl add --dev @molecule/api-database-pglite` leaves: the
  // injected database pinned in devDependencies only, and (case 1's starting
  // point) no `@molecule/api-bonds-default-express` behind the runner's
  // static import of `createMigratorPglite`.
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'Node16',
          moduleResolution: 'Node16',
          outDir: 'dist',
          rootDir: 'src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2,
    ),
  )
  if (withPgliteInstalled) {
    await mkdir(join(dir, 'node_modules', '@molecule'), { recursive: true })
    await symlink(PGLITE_SOURCE, join(dir, 'node_modules', '@molecule', 'api-database-pglite'))
  }
  return dir
}

/**
 * Run the command and return its outcome: null when it resolved, the thrown
 * error otherwise — `this.exit(1)` rejects with oclif's ExitError ("EEXIT: 1").
 * The two tests share the helper and pin OPPOSITE outcomes: an installed
 * package resolves; a declared-but-uninstalled one fails the command (an
 * unwired package is never a success) — but only AFTER the whole flow ran,
 * so the runner landed and the manifest was backed either way.
 */
async function runInject(projectPath: string): Promise<unknown> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-database-pglite',
      '-p',
      projectPath,
      '--no-install',
      '--no-test',
      '--no-format',
      '--no-ai',
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  try {
    await cmd.run()
    return null
  } catch (error) {
    return error
  }
}

/** {@link runInject} plus everything the command logged, for the message assertion. */
async function runInjectCapturing(projectPath: string): Promise<{
  outcome: unknown
  logged: string
}> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-database-pglite',
      '-p',
      projectPath,
      '--no-install',
      '--no-test',
      '--no-format',
      '--no-ai',
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  let outcome: unknown
  try {
    await cmd.run()
    outcome = null
  } catch (error) {
    outcome = error
  }
  const logged = vi
    .mocked(cmd.log)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n')
  return { outcome, logged }
}

async function readManifest(): Promise<{
  dependencies: Record<string, string>
  devDependencies?: Record<string, string>
}> {
  return JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
}

describe('mlcl inject backs the migration runner it writes', () => {
  it('declares the wrapper package the runner statically imports', async () => {
    const project = await writeApiProject(true)
    expect(await runInject(project)).toBeNull()

    // The runner was rewritten as the DUAL render: the manifest's Postgres
    // bond UNION the injected PGlite. `createMigratorPglite` and a bare
    // `const BROWSER_PROFILE = true` are true of the PGlite-ONLY render too —
    // the historically shipped bug (the manifest's Postgres machinery
    // stripped, the project's real database silently unmigrated) passed every
    // assertion this shape allows — so the Postgres half is pinned explicitly.
    const runner = await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain('createMigratorPglite')
    expect(runner).toContain(
      "const BROWSER_PROFILE = true && process.env.MOL_BOND_PROFILE === 'browser'",
    )
    expect(runner).toContain('import pg from')
    expect(runner).toContain('CREATE DATABASE')
    // …and the manifest now backs its imports: the wrapper is never a peer of
    // a database bond, so without this the project failed tsc (TS2307) and
    // `db:setup` (ERR_MODULE_NOT_FOUND) on a real install.
    const manifest = await readManifest()
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBe(
      getMoleculeVersion('@molecule/api-bonds-default-express'),
    )
  })

  it('promotes a devDependencies-only PGlite pin off the pruned key', async () => {
    // The package is declared but NOT resolvable — on a user machine (no
    // molecule monorepo: registry `path`s dangle, node_modules empty after
    // `add --dev --no-install` or a failed install) planInjection returns an
    // EMPTY plan, so nothing else in the flow touches the manifest while the
    // runner still lands with its branch reachable — the exact state a
    // production `--omit=dev` deploy crashed on at boot-time
    // runMigrations(). MOLECULE_PACKAGES_DIR simulates that machine: in this
    // workspace the registry-path fallback would otherwise resolve the
    // declared package straight from the monorepo source.
    const prevPackagesDir = process.env.MOLECULE_PACKAGES_DIR
    process.env.MOLECULE_PACKAGES_DIR = join(tmpdir(), 'mlcl-no-molecule-packages')
    clearRegistryCache()
    try {
      const project = await writeApiProject(false)
      // The unresolved package fails the command — after the flow completed.
      expect(String(await runInject(project))).toMatch(/EEXIT: 1/)

      const manifest = await readManifest()
      // The pin MOVED (keeping the version the manifest carried)…
      expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
      expect(manifest.devDependencies?.['@molecule/api-database-pglite']).toBeUndefined()
      // …and the wrapper is declared behind the runner's static import.
      expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBe(
        getMoleculeVersion('@molecule/api-bonds-default-express'),
      )
    } finally {
      if (prevPackagesDir === undefined) delete process.env.MOLECULE_PACKAGES_DIR
      else process.env.MOLECULE_PACKAGES_DIR = prevPackagesDir
      clearRegistryCache()
    }
  })

  it('fails the command when the manifest cannot back the runner it just wrote', async () => {
    // The runner is on disk and server.ts imports it at boot, so a manifest write
    // that fails mid-flight cannot be undone here — and that write is what
    // declares the packages the runner imports. Warning and carrying on reported
    // SUCCESS (exit 0) over exactly the project this step exists to prevent:
    // tsc fails TS2307 on the undeclared wrapper and `db:setup` dies
    // ERR_MODULE_NOT_FOUND on a real install. It is a failed injection.
    const project = await writeApiProject(true)
    intercept.armed = true
    const { outcome, logged } = await runInjectCapturing(project)
    intercept.armed = false

    expect(String(outcome)).toMatch(/EEXIT: 1/)
    // The failure is named, with the file and the consequence — a bare exit code
    // would leave the user with a broken project and no cause.
    expect(logged).toContain('Could not declare src/scripts/migrate.ts')
    expect(logged).toMatch(/simulated full disk/)
    // The runner it landed is still there (it cannot be taken back), and the
    // manifest write was restored to its pre-write bytes by the guard.
    expect(await readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')).toContain(
      'createMigratorPglite',
    )
    expect(
      (await readManifest()).dependencies['@molecule/api-bonds-default-express'],
    ).toBeUndefined()
  })
})
