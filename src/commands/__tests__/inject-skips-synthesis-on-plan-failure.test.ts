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
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
})
