/**
 * `mlcl inject -m <pkg>` used to crash with a raw ENOENT/SyntaxError when the
 * target's package.json was missing or unparseable (a mistyped `-p` path): the
 * command read the manifest bare in step 2, after the "no molecules" early
 * return could no longer catch it. Every other manifest reader in the same
 * command (`detectAppProject`, `findPendingMolecules`) treats that condition
 * as handled — and proceeding past the read would plan and write synthesized
 * files into a directory that declares nothing. The command now fails with
 * the reason, before any write.
 *
 * @module
 */

import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Inject from '../inject.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function runInject(projectPath: string): Promise<Inject> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-database-postgresql',
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
  await cmd.run()
  return cmd
}

async function runInjectWithoutMolecule(projectPath: string): Promise<Inject> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    ['-p', projectPath, '--no-install', '--no-test', '--no-format', '--no-ai'],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
  return cmd
}

describe('mlcl inject refuses a target without a readable manifest', () => {
  it('fails with the reason when package.json is missing — and writes nothing', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-nomanifest-'))

    await expect(runInject(dir)).rejects.toThrow(/package\.json is missing or unparseable/)

    // The failure precedes every write — the directory is untouched.
    expect(await readdir(dir)).toEqual([])
  })

  it('fails with the reason when package.json is unparseable', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-nomanifest-'))
    await writeFile(join(dir, 'package.json'), '{ this is not json')

    await expect(runInject(dir)).rejects.toThrow(/package\.json is missing or unparseable/)
  })

  it('fails with the reason on the DEFAULT path too, where the manifest IS the molecule list', async () => {
    // With no `-m`, the pending molecules are read FROM the manifest — so a
    // manifest that cannot be parsed came back as "No molecules to inject" plus
    // a hint to run `mlcl add`, which reads the same file and fails: a wrong
    // answer carrying a SUCCESS exit status, and the real problem never named.
    // The `-m` tests above cannot see this: the read they exercise happens
    // after the "no molecules" early return.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-nomanifest-'))
    await writeFile(join(dir, 'package.json'), '{ this is not json')

    await expect(runInjectWithoutMolecule(dir)).rejects.toThrow(
      /missing or unparseable|Cannot read/,
    )
  })

  it('keeps the friendly "nothing to inject" answer for a directory with no manifest at all', async () => {
    // The other half of the rule: a directory that declares NOTHING is not a
    // broken project — `mlcl inject` in an empty (or non-project) directory
    // must still answer with the friendly "no molecules to inject" hint and a
    // success status, not an error.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-nomanifest-'))

    await expect(runInjectWithoutMolecule(dir)).resolves.toBeDefined()
  })
})
