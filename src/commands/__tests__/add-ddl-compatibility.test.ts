/**
 * `mlcl add <pkg> --inject` refuses a package the app's database cannot run
 * BEFORE it writes the pin.
 *
 * `add --inject` used to write `package.json` (and install) first and only then
 * hand off to `mlcl inject`, which refused — leaving a dependency behind that
 * broke every later inject, with no app-side change to explain it. The verdict
 * is available before the write, so this runs the REAL command and asserts the
 * manifest is byte-identical after a refusal.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getMoleculeVersion } from '../../lib/registry.js'
import Add from '../add.js'

// `add` resolves a version from npm for packages the registry does not carry.
// Keep this hermetic: a network call in a unit test is not, and each case below
// asserts whether npm was consulted at all.
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '1.2.2\n' })),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const DUCKDB = '@molecule/api-database-duckdb'
const POSTGRESQL = '@molecule/api-database-postgresql'
// `comments.sql` carries `ON DELETE CASCADE`, which DuckDB cannot reproduce.
const COMMENT = '@molecule/api-resource-comment'

describe('mlcl add --inject — setup-SQL compatibility preflight', () => {
  let dir: string
  let prevCwd: string
  let manifestBefore: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-ddl-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    manifestBefore =
      JSON.stringify(
        {
          name: 'demo-api',
          version: '1.0.0',
          type: 'module',
          molecule: { projectType: 'api' },
          dependencies: {},
        },
        null,
        2,
      ) + '\n'
    await writeFile(join(dir, 'package.json'), manifestBefore)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Run the real command with `--inject`, capturing its exit and whether the
   * `inject` handoff was reached.
   *
   * @param database - The database the project is bonded to.
   * @param spec - The package argument (defaults to the bare {@link COMMENT}).
   * @returns The thrown error (null on success) and the handoff spy.
   */
  async function addWithInject(
    database: string,
    spec: string = COMMENT,
  ): Promise<{
    outcome: unknown
    output: string
    handoff: ReturnType<typeof vi.fn>
  }> {
    const manifest = JSON.parse(manifestBefore) as { dependencies: Record<string, string> }
    manifest.dependencies[database] = database === DUCKDB ? '1.1.0' : '1.3.2'
    await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
    manifestBefore = await readFile(join(dir, 'package.json'), 'utf-8')
    await mkdir(join(dir, '__setup__'), { recursive: true })

    const config = await Config.load(MLCL_ROOT)
    const handoff = vi.fn(async () => undefined)
    vi.spyOn(config, 'runCommand').mockImplementation(handoff as never)
    const cmd = new Add([spec, '--inject', '--no-install'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
      return {
        outcome: null,
        output: write.mock.calls.map((call) => String(call[0])).join(''),
        handoff,
      }
    } catch (error) {
      return {
        outcome: error,
        output: write.mock.calls.map((call) => String(call[0])).join(''),
        handoff,
      }
    } finally {
      write.mockRestore()
    }
  }

  it('refuses before writing the pin when the database cannot apply the package SQL', async () => {
    const { outcome, output, handoff } = await addWithInject(DUCKDB)

    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
    expect(output).toContain(DUCKDB)
    expect(output).toContain(`${COMMENT}:src/__setup__/comments.sql`)
    expect(output).toContain('ON DELETE CASCADE')
    // The manifest is untouched — the whole point of the repair.
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(manifestBefore)
    expect(handoff).not.toHaveBeenCalled()
  })

  it('writes the pin and hands off when the database applies the SQL', async () => {
    const { outcome, handoff } = await addWithInject(POSTGRESQL)

    expect(outcome).toBeNull()
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies[COMMENT]).toBe('1.2.2')
    expect(handoff).toHaveBeenCalledTimes(1)
  })

  it('pins the REGISTRY version when npm latest is newer (stale CLI)', async () => {
    // The regression F2 named: `add` used to pin `npm view <pkg> version` while
    // the preflight judged the registry-bundled bytes of a DIFFERENT release.
    // A standalone CLI is routinely older than the newest molecule publish, so
    // the pin and the judged schema diverged. The registry pin is now the
    // default for a registered package and npm is not consulted at all.
    const { execa } = await import('execa')
    const mocked = vi.mocked(execa)
    mocked.mockClear()
    mocked.mockResolvedValue({ stdout: '9.9.9\n' } as never)
    try {
      const { outcome, handoff } = await addWithInject(POSTGRESQL)
      expect(outcome).toBeNull()
      const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
        dependencies: Record<string, string>
      }
      expect(manifest.dependencies[COMMENT]).toBe(getMoleculeVersion(COMMENT))
      expect(manifest.dependencies[COMMENT]).not.toBe('9.9.9')
      expect(mocked).not.toHaveBeenCalled()
      expect(handoff).toHaveBeenCalledTimes(1)
    } finally {
      mocked.mockResolvedValue({ stdout: '1.2.2\n' } as never)
    }
  })

  it('refuses an explicitly requested version whose bytes this CLI does not have', async () => {
    // An explicit `pkg@x.y.z` binds the preflight to THAT exact version. The
    // registry bundles (and the source tree has) another one, so nothing can be
    // judged or copied for it — refuse BEFORE the pin is written.
    const { outcome, output, handoff } = await addWithInject(POSTGRESQL, `${COMMENT}@1.0.0`)
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
    expect(output).toContain('@1.0.0 is not available')
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(manifestBefore)
    expect(handoff).not.toHaveBeenCalled()
  })

  it('refuses a ranged explicit version instead of writing a floating pin', async () => {
    const { outcome, output, handoff } = await addWithInject(POSTGRESQL, `${COMMENT}@^1.2.0`)
    expect((outcome as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
    expect(output).toContain('does not name one exact version')
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(manifestBefore)
    expect(handoff).not.toHaveBeenCalled()
  })

  it('forwards --no-install to the inject handoff (F11)', async () => {
    // `inject`'s own install flag defaults to true, so without forwarding the
    // flag a command that promised not to install started an `npm install`.
    const { outcome, handoff } = await addWithInject(POSTGRESQL)
    expect(outcome).toBeNull()
    expect(handoff).toHaveBeenCalledTimes(1)
    const [command, argv] = handoff.mock.calls[0] as [string, string[]]
    expect(command).toBe('inject')
    expect(argv).toContain('--no-install')
  })

  it('refuses before writing on a host where the package is not installed anywhere', async () => {
    // A standalone CLI: no installed copy, no molecule checkout. The vendor
    // package publishes its setup SQL and the registry bundles those exact
    // bytes, so the verdict is available WITHOUT the install — the old
    // `allowUnresolved` deferred it, wrote the pin, and only then failed.
    vi.stubEnv('MOLECULE_PACKAGES_DIR', join(tmpdir(), 'mlcl-no-molecule-checkout', 'packages'))
    clearRegistryCache()
    try {
      const { outcome, output, handoff } = await addWithInject(DUCKDB)

      expect((outcome as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
      expect(output).toContain('ON DELETE CASCADE')
      expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(manifestBefore)
      expect(handoff).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
      clearRegistryCache()
    }
  })
})
