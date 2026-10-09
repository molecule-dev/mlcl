/**
 * The inject command used to write the synthesized holistic files
 * (server.ts, router.ts, bonds/index.ts, …) even when a PLAN had failed.
 * bonds/index.ts is synthesized from ALL plans, so it exported
 * `./<bond>.js` for the failed plan too — but a failed plan rolls back its
 * own writes, so that bond file did not exist: a project left importing a
 * module that is not there (TS2307 on the first build), strictly worse than
 * before the inject. The synthesis must be skipped when a plan failed; the
 * errors already fail the command with exit 1.
 *
 * Runs the REAL oclif command against a temp project that resolves the pglite
 * bond through a node_modules symlink (how a real project resolves it) and
 * whose `src/bonds/database-pglite.ts` is a DIRECTORY — the bond plan's
 * conflict is forced with --force, the write hits EISDIR, and the plan rolls
 * back with nothing on disk. The `src/bonds/` directory itself stays
 * writable, so the old code happily wrote the dangling bonds/index.ts.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache } from '../../lib/registry.js'
import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
// Resolved the same way findMoleculePackage walks node_modules — point the
// temp project's link at the molecule monorepo checkout this workspace has.
const PGLITE_PACKAGE_DIR = join(
  MLCL_ROOT,
  '..',
  'molecule',
  'packages',
  'api',
  'bonds',
  'database',
  'pglite',
)

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('mlcl inject skips the synthesized files when a plan failed', () => {
  it('does not write a bonds/index.ts exporting the rolled-back plan’s bond file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-synthesis-skip-'))
    await mkdir(join(dir, 'node_modules', '@molecule'), { recursive: true })
    // The bond file's target exists as a DIRECTORY: the plan records a
    // conflict, --force pushes past it, and the write fails with EISDIR —
    // executeInjection rolls the plan back, so no bond file exists.
    await mkdir(join(dir, 'src', 'bonds', 'database-pglite.ts'), { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )
    await symlink(PGLITE_PACKAGE_DIR, join(dir, 'node_modules', '@molecule', 'api-database-pglite'))

    const config = await Config.load(MLCL_ROOT)
    const cmd = new Inject(
      [
        '-m',
        '@molecule/api-database-pglite',
        '-p',
        dir,
        '--force',
        '--no-test',
        '--no-format',
        '--no-ai',
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)

    // The failed plan surfaces as command errors — the exit status must say so.
    await expect(cmd.run()).rejects.toThrow()
    const logged = log.mock.calls.map((args) => args.map(String).join(' ')).join('\n')
    expect(logged).toContain('Injection failed')

    // The rolled-back bond must not come back to life through the synthesized
    // bonds/index.ts: no synthesized file was written at all.
    expect(existsSync(join(dir, 'src', 'bonds', 'index.ts'))).toBe(false)
    expect(existsSync(join(dir, 'src', 'server.ts'))).toBe(false)
    expect(existsSync(join(dir, 'src', 'App', 'router.ts'))).toBe(false)
    // The plan's target is exactly the directory the test created.
    expect(existsSync(join(dir, 'src', 'bonds', 'database-pglite.ts'))).toBe(true)
  })

  it('never regenerates an existing holistic file for a request that could not be resolved', async () => {
    // The other half of "which synthesized files may land": router.ts is
    // synthesized from the resource PLANS and bonds/index.ts from the PLANS'
    // bond setups, so with the request unresolved those plans are empty and
    // writing the files back overwrote a working project's routes and bond
    // wiring with empty shells (server.ts likewise). Only the manifest-derived
    // migration runner may be written in that state.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-synthesis-skip-'))
    await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
    await mkdir(join(dir, 'src', 'App'), { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
        devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
      }),
    )
    // Sentinels: the project's own holistic files, and enough structure for the
    // post-injection validator to accept them (so a resolved run is a success).
    const server = [
      '// SENTINEL server — the project entry point an inject must not clobber.',
      "import express from 'express'",
      "import { setupBonds } from './bonds/index.js'",
      "import router from './App/router.js'",
      'const app = express()',
      'app.use(router)',
      "export const healthPath = '/health'",
      'void setupBonds',
      'export default app',
      '',
    ].join('\n')
    const router = [
      '// SENTINEL router — the app’s real routes.',
      "import { Router } from 'express'",
      'const router = Router()',
      "router.get('/sentinel', (_req, res) => res.json({ ok: true }))",
      'export default router',
      '',
    ].join('\n')
    const bonds = [
      '// SENTINEL bonds — the app’s real bond wiring.',
      'export async function setupBonds(): Promise<void> {',
      '  // real wiring',
      '}',
      '',
    ].join('\n')
    await writeFile(join(dir, 'src', 'server.ts'), server)
    await writeFile(join(dir, 'src', 'App', 'router.ts'), router)
    await writeFile(join(dir, 'src', 'bonds', 'index.ts'), bonds)

    // Nothing resolvable: the registry-path fallback is redirected at an empty
    // directory and node_modules carries no link, so the requested pglite bond
    // yields an empty plan (a declared-but-uninstalled database on a user
    // machine). MOLECULE_PACKAGES_DIR is restored afterwards.
    const prevPackagesDir = process.env.MOLECULE_PACKAGES_DIR
    process.env.MOLECULE_PACKAGES_DIR = join(tmpdir(), 'mlcl-no-molecule-packages')
    clearRegistryCache()
    try {
      const config = await Config.load(MLCL_ROOT)
      const cmd = new Inject(
        [
          '-m',
          '@molecule/api-database-pglite',
          '-p',
          dir,
          '--no-install',
          '--no-test',
          '--no-format',
          '--no-ai',
        ],
        config,
      )
      const warn = vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
      vi.spyOn(cmd, 'log').mockImplementation(() => undefined)

      // The request failed to resolve, so the command must SAY so on exit —
      // an agent or CI job reading a 0 takes the run for a success. Everything
      // below still ran: the command completes its (narrowed) work first.
      await expect(cmd.run()).rejects.toThrow(/EEXIT: 1/)

      // The unresolved request is REPORTED — never counted as injected.
      expect(warn.mock.calls.map((args) => String(args[0])).join('\n')).toContain(
        '@molecule/api-database-pglite',
      )
      // …and every holistic file the project already had is byte-for-byte intact.
      expect(await readFile(join(dir, 'src', 'server.ts'), 'utf-8')).toBe(server)
      expect(await readFile(join(dir, 'src', 'App', 'router.ts'), 'utf-8')).toBe(router)
      expect(await readFile(join(dir, 'src', 'bonds', 'index.ts'), 'utf-8')).toBe(bonds)
      // The manifest-derived runner still lands and is backed — the half a
      // declared-but-uninstalled database needs to boot.
      const runner = await readFile(join(dir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
      expect(runner).toContain('createMigratorPglite')
      expect(runner).toContain("from '@molecule/api-bonds-default-express'")
      const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
        dependencies: Record<string, string>
      }
      expect(manifest.dependencies['@molecule/api-database-pglite']).toBe('1.0.3')
    } finally {
      if (prevPackagesDir === undefined) delete process.env.MOLECULE_PACKAGES_DIR
      else process.env.MOLECULE_PACKAGES_DIR = prevPackagesDir
      clearRegistryCache()
    }
  })
})
