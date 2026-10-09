/**
 * A requested package that cannot be resolved (declared in package.json but
 * never installed, a stale name, a mistyped `-m`) used to report a FULL
 * success: its plan has no files, no dependencies and no bond setup, so
 * execution was a no-op that exited 0 — while the synthesis ran from the
 * surviving plans alone and, when NOTHING resolved, regenerated server.ts,
 * router.ts and bonds/index.ts as empty shells OVER a working project. Now the
 * unresolved plan is dropped, its failure is warned, the survivors still
 * inject (and the manifest-derived migration runner still lands for a
 * declared-but-uninstalled database), and the exit status says the request
 * failed — an agent or CI job reading it must not take the run for a success.
 *
 * Runs the REAL oclif command against temp projects; the resolvable half of the
 * partial case resolves the pglite bond through a node_modules symlink the way
 * a real project does.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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
const UNRESOLVABLE = '@molecule/api-not-a-real-package'

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/**
 * Run the command and report BOTH its captured output and its outcome —
 * `this.exit(1)` rejects with oclif's ExitError ("EEXIT: 1"), which is the
 * exit status under test, and the output is needed to prove WHERE the failure
 * came from (a resolution failure, not a failed plan write).
 */
async function runInject(): Promise<{
  logged: string
  warned: string
  error: unknown
}> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    ['-p', dir as string, '--no-install', '--no-test', '--no-format', '--no-ai'],
    config,
  )
  const warn = vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  let error: unknown = null
  try {
    await cmd.run()
  } catch (e) {
    error = e
  }
  return {
    logged: log.mock.calls.map((args) => args.map(String).join(' ')).join('\n'),
    warned: warn.mock.calls.map((args) => args.map(String).join(' ')).join('\n'),
    error,
  }
}

describe('mlcl inject with an unresolvable requested package', () => {
  it('fails the command instead of reporting success, and never overwrites existing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-unresolved-'))
    // An existing, working project: the entry point predates the inject.
    await mkdir(join(dir, 'src'), { recursive: true })
    const sentinel = 'export const SENTINEL = "untouched"\n'
    await writeFile(join(dir, 'src', 'server.ts'), sentinel)
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: { [UNRESOLVABLE]: '1.0.0' },
      }),
    )

    const { error } = await runInject()
    // Before the fix this resolved (exit 0) and the empty-plan synthesis
    // overwrote src/server.ts with a shell importing nothing.
    expect(String(error)).toMatch(/EEXIT: 1/)
    expect(await readFile(join(dir, 'src', 'server.ts'), 'utf-8')).toBe(sentinel)
  })

  it('still injects the resolvable packages of a partially resolvable request — and still fails', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-partial-'))
    await mkdir(join(dir, 'node_modules', '@molecule'), { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          '@molecule/api-database-pglite': '1.0.3',
          [UNRESOLVABLE]: '1.0.0',
        },
      }),
    )
    await symlink(PGLITE_PACKAGE_DIR, join(dir, 'node_modules', '@molecule', 'api-database-pglite'))

    const { logged, warned, error } = await runInject()

    // The exit status says the request failed…
    expect(String(error)).toMatch(/EEXIT: 1/)
    // …and it did so WITHOUT any plan failing — the injection-failed message
    // is the plan-failure path, so the exit here is driven by the unresolved
    // package alone. Without merging the resolution failures into the command
    // errors this run resolved cleanly (exit 0), taking a partial injection
    // for a success.
    expect(logged).not.toContain('Injection failed')
    // The unresolved half is named, not swallowed.
    expect(warned).toContain(UNRESOLVABLE)
    expect(warned).toContain('Could not resolve')
    // The resolvable half actually injected.
    expect(await readFile(join(dir, 'src', 'bonds', 'database-pglite.ts'), 'utf-8')).toContain(
      'api-database-pglite',
    )
  })
})
