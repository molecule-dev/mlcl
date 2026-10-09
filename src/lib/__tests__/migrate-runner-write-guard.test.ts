/**
 * The two runner writers used to write bare: `syncMigrateRunner` (`mlcl
 * swap`) and the template scaffold's refresh wrote `src/scripts/migrate.ts`
 * with an unguarded `writeFile`. A write that fails mid-flight (a full disk)
 * truncates the file — and server.ts imports the runner at boot, so the
 * project does not just fail the step, it never boots again. Both writes now
 * restore the pre-write bytes (or remove a file the failed write created);
 * the same policy `ensureMigrateRunnerImports` applies to the manifest and
 * executeInjection's rollback applies to everything else.
 *
 * The failure itself is simulated by intercepting `writeFile` for the runner
 * path: it truncates the file to garbage and THEN throws — the shape of a
 * short write on ENOSPC, which no stub of the inputs can produce.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile as realWriteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  readMigrateRunnerForManifest,
  refreshMigrateRunnerForManifest,
  syncMigrateRunner,
  writeMigrateRunnerGuarded,
} from '../migrate-runner.js'

const intercept = vi.hoisted(() => ({ armed: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  type WriteFileArgs = Parameters<(typeof actual)['writeFile']>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (intercept.armed && typeof path === 'string' && path.endsWith('migrate.ts')) {
        // Partial write first, then the failure — the corrupt-runner shape.
        // The intercept fires ONCE: the guard's own restore write must go
        // through (a transient ENOSPC does not repeat).
        intercept.armed = false
        await actual.writeFile(path, '// truncated')
        throw new Error('write failed mid-flight (simulated ENOSPC)')
      }
      return actual.writeFile(path, data, options)
    },
  }
})

let dir: string | null = null
afterEach(async () => {
  intercept.armed = false
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function projectWithRunner(source: string): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-'))
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  const path = join(dir, 'src', 'scripts', 'migrate.ts')
  await realWriteFile(path, source)
  return path
}

describe('writeMigrateRunnerGuarded', () => {
  it('restores the previous bytes when the write fails mid-flight', async () => {
    const path = await projectWithRunner('// my working runner\n')
    intercept.armed = true
    await expect(writeMigrateRunnerGuarded(path, '// rendered\n')).rejects.toThrow(
      /simulated ENOSPC/,
    )
    expect(await readFile(path, 'utf-8')).toBe('// my working runner\n')
  })

  it('removes the partial file when no runner existed before the failed write', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    const path = join(dir, 'src', 'scripts', 'migrate.ts')
    intercept.armed = true
    await expect(writeMigrateRunnerGuarded(path, '// rendered\n')).rejects.toThrow(
      /simulated ENOSPC/,
    )
    // The truncating open created the file before the write failed; the guard
    // must not leave the partial runner behind.
    await expect(readFile(path, 'utf-8')).rejects.toThrow(/ENOENT/)
  })

  it('writes the new content when the write succeeds', async () => {
    const path = await projectWithRunner('// old\n')
    await writeMigrateRunnerGuarded(path, '// new\n')
    expect(await readFile(path, 'utf-8')).toBe('// new\n')
  })
})

describe('syncMigrateRunner write guard', () => {
  it('leaves the old runner intact when its rewrite fails mid-flight', async () => {
    // A Postgres project whose runner predates a swap to SQLite: the rewrite
    // differs, so syncMigrateRunner writes it — and the write fails mid-flight.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-'))
    await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
    await realWriteFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@molecule/api-bonds-default-express': '1.1.0',
          '@molecule/api-database-postgresql': '1.0.5',
        },
      }),
    )
    const path = join(dir, 'src', 'scripts', 'migrate.ts')
    await realWriteFile(path, await readMigrateRunnerForManifest(dir))
    const before = await readFile(path, 'utf-8')
    intercept.armed = true
    await expect(syncMigrateRunner(dir, '@molecule/api-database-sqlite')).rejects.toThrow(
      /simulated ENOSPC/,
    )
    // The swap's failed write is the project's boot import — the pre-swap
    // bytes must survive it, not the truncated partial.
    expect(await readFile(path, 'utf-8')).toBe(before)
  })
})

describe('refreshMigrateRunnerForManifest', () => {
  it('re-renders a stale frozen copy from its manifest and backs its imports', async () => {
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    const apiDir = join(project, 'api')
    await mkdir(join(apiDir, 'src', 'scripts'), { recursive: true })
    // A stale checked-in copy (the pre-__setup__ shape) plus a manifest that
    // declares PostgreSQL but not the wrapper the current render imports.
    const stale = '// stale frozen runner\n'
    await realWriteFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), stale)
    await realWriteFile(
      join(apiDir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-database-postgresql': '1.0.5' } }),
    )

    await refreshMigrateRunnerForManifest(apiDir)

    // The copy is the current render of its own manifest…
    expect(await readFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), 'utf-8')).toBe(
      await readMigrateRunnerForManifest(apiDir),
    )
    // …and the manifest backs the wrapper that render imports.
    const manifest = JSON.parse(await readFile(join(apiDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toBeTruthy()
  })

  it('leaves a project with no runner alone', async () => {
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    await refreshMigrateRunnerForManifest(project)
    await expect(readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')).rejects.toThrow(
      /ENOENT/,
    )
  })

  it('restores the checked-in bytes when the refresh write fails mid-flight', async () => {
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    const apiDir = join(project, 'api')
    await mkdir(join(apiDir, 'src', 'scripts'), { recursive: true })
    await realWriteFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), '// checked-in copy\n')
    await realWriteFile(
      join(apiDir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-database-postgresql': '1.0.5' } }),
    )

    intercept.armed = true
    await expect(refreshMigrateRunnerForManifest(apiDir)).rejects.toThrow(/simulated ENOSPC/)
    // The scaffold logs "refresh skipped" on this failure — the copy it then
    // ships must be the intact checked-in one, not the truncated partial.
    expect(await readFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), 'utf-8')).toBe(
      '// checked-in copy\n',
    )
  })
})
