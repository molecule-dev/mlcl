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

/** When set, the NEXT read of a `migrate.ts` path fails with EACCES. */
const unreadable = vi.hoisted(() => ({ armed: false }))

/**
 * When set, the NEXT write of a `package.json` truncates and THEN throws — the
 * shape of the manifest write that has to back a refreshed runner.
 */
const manifestWrite = vi.hoisted(() => ({ armed: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  type WriteFileArgs = Parameters<(typeof actual)['writeFile']>
  type ReadFileArgs = Parameters<(typeof actual)['readFile']>
  return {
    ...actual,
    readFile: async (
      path: ReadFileArgs[0],
      options?: ReadFileArgs[1],
    ): Promise<ReturnType<typeof actual.readFile>> => {
      if (unreadable.armed && typeof path === 'string' && path.endsWith('migrate.ts')) {
        // An unreadable PRE-EXISTING runner (mode 000, another owner) — a read
        // failure that says nothing about whether the file is there.
        unreadable.armed = false
        throw Object.assign(new Error(`EACCES: permission denied, open '${path}'`), {
          code: 'EACCES',
        })
      }
      return actual.readFile(path, options)
    },
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
      if (manifestWrite.armed && typeof path === 'string' && path.endsWith('package.json')) {
        // Same shape for the manifest that has to back a refreshed runner.
        manifestWrite.armed = false
        await actual.writeFile(path, '{"truncated":')
        throw new Error('write failed mid-flight (simulated ENOSPC)')
      }
      return actual.writeFile(path, data, options)
    },
  }
})

let dir: string | null = null
afterEach(async () => {
  intercept.armed = false
  unreadable.armed = false
  manifestWrite.armed = false
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

  it('never deletes a pre-existing runner it could not read', async () => {
    const path = await projectWithRunner('// my working runner\n')
    // The runner is there but unreadable (mode 000, another owner) — a read
    // failure that is NOT "the runner did not exist yet". Recording it as
    // absent makes the failure path rm() a file that predates this call: the
    // project's boot import, deleted by a write that never even read it.
    unreadable.armed = true
    intercept.armed = true

    await expect(writeMigrateRunnerGuarded(path, '// rendered\n')).rejects.toThrow(/EACCES/)
    expect(await readFile(path, 'utf-8')).toBe('// my working runner\n')
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
    // Presence is not the contract. The pin must be EXACT: a `^`/`~` range here
    // violates the repository's exact-version rule and a `latest`/garbage value
    // breaks a production install — both sailed past the previous
    // `toBeTruthy()`, which a key holding any non-empty string satisfies.
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('leaves a project with no runner alone', async () => {
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    await refreshMigrateRunnerForManifest(project)
    await expect(readFile(join(project, 'src', 'scripts', 'migrate.ts'), 'utf-8')).rejects.toThrow(
      /ENOENT/,
    )
  })

  it('restores the copied runner when the manifest that must back it cannot be written', async () => {
    // The refresh is TWO writes that must agree: the re-rendered runner imports
    // `@molecule/api-bonds-default-express` (and, on a PGlite app, the PGlite
    // bond), and the step right after the runner write is what declares them.
    // When that manifest write fails, the runner that was just refreshed is the
    // one artifact left behind — a boot import whose packages the manifest does
    // not declare (TS2307 / ERR_MODULE_NOT_FOUND on a real install), which is
    // strictly worse than the stale copy it replaced.
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    const apiDir = join(project, 'api')
    await mkdir(join(apiDir, 'src', 'scripts'), { recursive: true })
    const path = join(apiDir, 'src', 'scripts', 'migrate.ts')
    const stale = '// stale frozen runner\n'
    await realWriteFile(path, stale)
    await realWriteFile(
      join(apiDir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-database-postgresql': '1.0.5' } }),
    )

    manifestWrite.armed = true
    await expect(refreshMigrateRunnerForManifest(apiDir)).rejects.toThrow(/simulated ENOSPC/)

    // The runner is put back, so the failed refresh leaves the project exactly
    // as it was; the manifest step restored its own bytes (the mock fires once).
    expect(await readFile(path, 'utf-8')).toBe(stale)
    expect(JSON.parse(await readFile(join(apiDir, 'package.json'), 'utf-8'))).toMatchObject({
      dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
    })

    // …and the positive twin: with the manifest writable the same call lands
    // both halves — the current render, and the package it imports declared.
    await refreshMigrateRunnerForManifest(apiDir)
    const manifest = JSON.parse(await readFile(join(apiDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-bonds-default-express']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(await readFile(path, 'utf-8')).toContain('createMigratorPglite')
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

  it('refuses to replace the runner when the manifest it must be backed by cannot be read', async () => {
    // The refresh is two writes that must AGREE: the re-rendered runner, and the
    // manifest declaration of every import that runner carries. The backing step
    // only WARNS when the manifest is unreadable (ensureMigrateRunnerImports'
    // documented policy — it cannot declare imports for a manifest it cannot
    // read), so a refresh that ran anyway left the runner REPLACED by a render
    // derived from nothing (the conservative Postgres shape — see
    // readMigrateRunnerForManifest's fallback) and unbacked: a boot import whose
    // packages the manifest cannot be made to declare (TS2307, then
    // ERR_MODULE_NOT_FOUND on a real install), permanently, in place of the
    // intact checked-in copy the template shipped. The refresh must refuse
    // BEFORE the runner is touched.
    const project = (dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-guard-')))
    const apiDir = join(project, 'api')
    await mkdir(join(apiDir, 'src', 'scripts'), { recursive: true })
    const path = join(apiDir, 'src', 'scripts', 'migrate.ts')
    const checkedIn = '// checked-in runner this template ships\n'
    await realWriteFile(path, checkedIn)
    // A corrupt manifest must not be silently treated as "no manifest": the
    // refresh has nothing to render FROM and nothing to declare the imports in.
    await realWriteFile(join(apiDir, 'package.json'), '{ this is not json')
    await expect(refreshMigrateRunnerForManifest(apiDir)).rejects.toThrow(/missing or unparseable/)
    expect(await readFile(path, 'utf-8')).toBe(checkedIn)

    // The missing-manifest half: same refusal, same untouched runner.
    await rm(join(apiDir, 'package.json'))
    await expect(refreshMigrateRunnerForManifest(apiDir)).rejects.toThrow(/missing or unparseable/)
    expect(await readFile(path, 'utf-8')).toBe(checkedIn)
  })
})
