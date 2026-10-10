/**
 * A pre-existing file the injector CANNOT READ must survive a failed inject.
 *
 * `snapshotForRollback` used to record ANY read failure as `null` — its
 * "created by this injection" marker — so the rollback rm()ed a file that
 * PREDATES the inject: a failed inject over an unreadable file (EACCES)
 * deleted it instead of leaving the project unchanged, the exact
 * "never worse" violation the rollback policy exists to prevent. Verified
 * against the shipped code: a mode-000 target was gone (ENOENT) after a
 * failed inject.
 *
 * The fs failures are injected through a `node:fs/promises` mock rather than
 * file permissions so the test is deterministic under any uid (root ignores
 * mode bits; a permission-based fixture would ship green there). The mock
 * blocks readFile AND writeFile for the marked path — the write then fails,
 * the rollback runs, and the assertion is that the file's original content
 * is still on disk afterwards.
 *
 * @module
 */

import type * as fsPromises from 'node:fs/promises'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

/** The path both readFile and writeFile fail with EACCES for; null disables. */
const blocked = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>()
  const denied = (p: string): boolean => blocked.path !== null && p === blocked.path
  return {
    ...actual,
    readFile: vi.fn((...args: Parameters<typeof actual.readFile>) => {
      if (denied(args[0] as string)) {
        throw Object.assign(new Error(`EACCES: permission denied, open '${args[0]}'`), {
          code: 'EACCES',
        })
      }
      return actual.readFile(...args)
    }),
    writeFile: vi.fn((...args: Parameters<typeof actual.writeFile>) => {
      if (denied(args[0] as string)) {
        throw Object.assign(new Error(`EACCES: permission denied, open '${args[0]}'`), {
          code: 'EACCES',
        })
      }
      return actual.writeFile(...args)
    }),
  }
})

import {
  executeInjection,
  type FileOperation,
  type InjectionPlan,
  writeSynthesizedFiles,
} from '../injector.js'

let dir: string | null = null
afterEach(async () => {
  blocked.path = null
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

describe('rollback with an unreadable pre-existing target', () => {
  it('executeInjection leaves the unreadable file untouched instead of deleting it', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-eacces-'))
    await mkdir(join(dir, 'src'), { recursive: true })
    const targetPath = join(dir, 'src', 'secrets.ts')
    await writeFile(targetPath, 'EXPORTED_KEY=topsecret\n')
    blocked.path = targetPath

    const result = await executeInjection(
      plan([
        {
          action: 'create',
          targetPath,
          content: '// injected over the unreadable file\n',
          description: 'overwrite an unreadable target',
        },
      ]),
      dir,
      { autoInstall: false },
    )

    // The op failed and is reported…
    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    // …and the file the inject could not read is EXACTLY as it was — not
    // deleted by a rollback that mistook it for a file the inject created.
    blocked.path = null
    expect(await readFile(targetPath, 'utf-8')).toBe('EXPORTED_KEY=topsecret\n')
  })

  it('executeInjection does not blind-overwrite an unreadable file on the modify path', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-eacces-'))
    await mkdir(join(dir, 'src'), { recursive: true })
    const targetPath = join(dir, 'src', 'notes.md')
    await writeFile(targetPath, 'original notes\n')
    blocked.path = targetPath

    const result = await executeInjection(
      plan([
        {
          action: 'modify',
          targetPath,
          content: 'appended\n',
          description: 'append to an unreadable target',
        },
      ]),
      dir,
      { autoInstall: false },
    )

    expect(result.success).toBe(false)
    blocked.path = null
    expect(await readFile(targetPath, 'utf-8')).toBe('original notes\n')
  })

  it('writeSynthesizedFiles leaves the unreadable file untouched and reports the failure', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-eacces-'))
    await mkdir(join(dir, 'src'), { recursive: true })
    const serverPath = join(dir, 'src', 'server.ts')
    await writeFile(serverPath, '// my working server\n')
    const unreadablePath = join(dir, 'src', 'migrate.ts')
    await writeFile(unreadablePath, '// my working runner\n')
    blocked.path = unreadablePath

    const files: FileOperation[] = [
      {
        action: 'create',
        targetPath: serverPath,
        content: '// injected server\n',
        description: 'overwrite server',
      },
      {
        action: 'create',
        targetPath: unreadablePath,
        content: '// injected runner\n',
        description: 'overwrite an unreadable target',
      },
    ]

    const result = await writeSynthesizedFiles(files)

    expect(result.error).toContain('Failed to write')
    blocked.path = null
    // The loop's own rollback restores everything it wrote before the failure…
    expect(await readFile(serverPath, 'utf-8')).toBe('// my working server\n')
    // …and the unreadable file is restored too, not deleted as "created".
    expect(await readFile(unreadablePath, 'utf-8')).toBe('// my working runner\n')
  })
})
