/**
 * `mlcl create` refuses a database bond that cannot apply the setup SQL the
 * selected packages ship — BEFORE injection generates the app.
 *
 * A DuckDB project with a resource package whose `src/__setup__/*.sql` uses a
 * foreign-key referential action or a partial index cannot migrate at boot
 * (`server.ts` awaits `runMigrations()`), so the honest outcome is a clear
 * refusal, not a scaffolded project whose API never starts. The refusal must
 * also leave no generated wiring behind.
 *
 * Runs the REAL oclif command against a temp directory.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache } from '../../lib/registry.js'
import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const DUCKDB = '@molecule/api-database-duckdb'
const POSTGRES = '@molecule/api-database-postgresql'
const COMMENT = '@molecule/api-resource-comment'
const ADDRESS = '@molecule/api-resource-address'

// The provider declarations come from the CHECKED-IN registry, not a fixture:
// `sqlCapabilities` is generated from each bond's own `src/capabilities.ts` by
// `sync-registry --scan-exports`, and the registry delta lands with this patch
// (`delta/registry-sql-capabilities.json`). The preflight fails closed without
// it, so a missing declaration fails the refusal assertions below instead of
// being papered over by a hand-copied map.

describe('mlcl create — setup-SQL compatibility preflight', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-ddl-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  async function create(packages: string): Promise<{ outcome: unknown; output: string }> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      ['proj', '--type', 'api', '--packages', packages, '--skip-install', '--no-interactive'],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    // `this.error()` reports through oclif's own error() (it throws a CLIError
    // carrying the message); clack draws on stdout. Collect both.
    const reported = vi.spyOn(cmd, 'error')
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const collected = (): string =>
      [
        ...reported.mock.calls.map((call) => String(call[0])),
        ...write.mock.calls.map((call) => String(call[0])),
      ].join('\n')
    try {
      await cmd.run()
      return { outcome: null, output: collected() }
    } catch (error) {
      return { outcome: error, output: collected() }
    } finally {
      reported.mockRestore()
      write.mockRestore()
    }
  }

  it('refuses the DuckDB + resource-comment combination before writing anything', async () => {
    const { outcome, output } = await create(`${DUCKDB},${COMMENT}`)

    expect(outcome).toBeDefined()
    expect(output).toContain(DUCKDB)
    expect(output).toMatch(/cannot run this project's database setup/)
    expect(output).toContain(`${COMMENT}:src/__setup__/comments.sql`)
    expect(output).toContain('ON DELETE CASCADE')
    // Nothing was scaffolded: the refusal happens BEFORE Step 8 creates the
    // project directory, so `mlcl create` never leaves a half-built tree that a
    // retry then refuses as "already holds a project".
    expect(existsSync(join(dir, 'proj'))).toBe(false)
  })

  it('writes the registry’s bundled setup SQL when no copy is installed or checked out', async () => {
    // The standalone-CLI path: `--skip-install`, no molecule checkout, nothing
    // installed yet. The registry carries the exact published SQL, so the
    // scaffold ships a real `__setup__/` (before this, the preflight deferred
    // and the copier left the directory empty).
    vi.stubEnv('MOLECULE_PACKAGES_DIR', join(tmpdir(), 'mlcl-no-molecule-checkout', 'packages'))
    clearRegistryCache()
    try {
      const { outcome, output } = await create(`${POSTGRES},${ADDRESS}`)
      expect(output).not.toContain('cannot run this project')
      expect(outcome).toBeNull()
      const sql = await readFile(join(dir, 'proj', '__setup__', 'addresses.sql'), 'utf-8')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "addresses"')
      // The runner that replays it is part of the same success.
      expect(existsSync(join(dir, 'proj', 'src', 'scripts', 'migrate.ts'))).toBe(true)
    } finally {
      vi.unstubAllEnvs()
      clearRegistryCache()
    }
  })

  it('refuses from bundled SQL when no package copy exists anywhere', async () => {
    vi.stubEnv('MOLECULE_PACKAGES_DIR', join(tmpdir(), 'mlcl-no-molecule-checkout', 'packages'))
    clearRegistryCache()
    try {
      const { outcome, output } = await create(`${DUCKDB},${COMMENT}`)
      expect(outcome).toBeDefined()
      expect(output).toContain('ON DELETE CASCADE')
      expect(existsSync(join(dir, 'proj'))).toBe(false)
    } finally {
      vi.unstubAllEnvs()
      clearRegistryCache()
    }
  })
})
