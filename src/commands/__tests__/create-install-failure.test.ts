/**
 * When `mlcl create`'s install fails, its JSON result says why, in npm's words.
 *
 * mlcl captures npm's output, and the result of a failed install carried only `pendingSetup:
 * ["npm install", …]`. Codex, given that result through the MCP server, read npm's debug logs to
 * learn that a node-gyp build of better-sqlite3 could not fetch Node's headers, then spent minutes
 * rebuilding it by hand (harness eval scaffold, 2026-11-25, 2 runs).
 *
 * Runs the REAL oclif command against a temp directory; only the npm child and the inject child
 * are replaced.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** An execa error for an install whose native build could not reach nodejs.org. */
function gypFailure(): Error {
  return Object.assign(new Error('Command failed with exit code 1: npm install'), {
    shortMessage: 'Command failed with exit code 1: npm install --no-audit --no-fund',
    stderr: [
      'npm error code 1',
      'npm error path /work/proj/node_modules/better-sqlite3',
      'npm error command failed',
      'npm error command sh -c node-gyp rebuild',
      'npm error gyp info using node-gyp@12.4.0',
      'npm error gyp ERR! stack Error: getaddrinfo EAI_AGAIN nodejs.org',
      'npm error gyp ERR! stack at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)',
      'npm error A complete log of this run can be found in: /home/u/.npm/_logs/x-debug-0.log',
    ].join('\n'),
  })
}

describe('mlcl create — a failed install', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-install-failure-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    execaMock.mockReset()
    execaMock.mockImplementation((async (file: string, args: readonly string[]) => {
      if (file === 'npm' && args[0] === 'install') throw gypFailure()
      throw new Error(`unexpected child: ${file} ${args.join(' ')}`)
    }) as unknown as typeof execa)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  it('names npm’s reason in the JSON result, beside the steps still to run', async () => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      ['proj', '--type', 'app', '--framework', 'vue', '--no-interactive', '--json'],
      config,
    )
    const stdout: string[] = []
    const warnings: string[] = []
    vi.spyOn(cmd, 'warn').mockImplementation((input) => {
      warnings.push(String(input))
      return input
    })
    vi.spyOn(cmd, 'log').mockImplementation((message) => {
      stdout.push(String(message ?? ''))
    })
    vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockResolvedValue(
      undefined,
    )
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }

    const reason = [
      'npm error code 1',
      'npm error path /work/proj/node_modules/better-sqlite3',
      'npm error command failed',
      'npm error command sh -c node-gyp rebuild',
      'npm error gyp ERR! stack Error: getaddrinfo EAI_AGAIN nodejs.org',
    ].join('\n')
    expect(stdout).toHaveLength(1)
    const result = JSON.parse(stdout[0]!) as Record<string, unknown>
    expect(result).toMatchObject({ installSkipped: false, installFailure: reason })
    expect(result.pendingSetup).toEqual(expect.arrayContaining(['npm install']))
    expect(warnings).toContain(`npm install failed: ${reason}`)
  })
})
