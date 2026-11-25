/**
 * When `mlcl create`'s inject fails, its JSON result says why, in the injector's words.
 *
 * Under `--json` create prints nothing but the result, and the result of a failed inject carried
 * only `injectSkipped: ["."]` and the `mlcl inject` step still to run: the injector's reason (a
 * runner it could not write, 2026-11-25) reached only the line a JSON caller never sees.
 *
 * Runs the REAL oclif command against a temp directory; only the inject child is replaced.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { t } from '../../lib/i18n.js'
import Create from '../create.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

const REASON =
  'Failed to write /work/proj/src/scripts/migrate.ts: SyntaxError: Unterminated regular expression literal. (188:3)'

/** An execa error for an inject child whose injector listed one failure under its Errors label. */
function injectFailure(): Error {
  return Object.assign(new Error('Command failed with exit code 1: node bin/run.js inject'), {
    shortMessage: 'Command failed with exit code 1: node bin/run.js inject --force -p /work/proj',
    stdout: [
      'Generating integration code...',
      t('commands.inject.labels.errors'),
      `  • ${REASON}`,
    ].join('\n'),
    stderr: '',
  })
}

describe('mlcl create — a failed inject', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-inject-failure-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    execaMock.mockReset()
    execaMock.mockImplementation((async (file: string, args: readonly string[]) => {
      throw new Error(`unexpected child: ${file} ${args.join(' ')}`)
    }) as unknown as typeof execa)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  it('names the injector’s reason in the JSON result, keyed by the skipped workspace', async () => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'app',
        '--framework',
        'vue',
        '--no-interactive',
        '--json',
        '--skip-install',
      ],
      config,
    )
    const stdout: string[] = []
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation((message) => {
      stdout.push(String(message ?? ''))
    })
    vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockRejectedValue(
      injectFailure(),
    )
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }

    expect(stdout).toHaveLength(1)
    const result = JSON.parse(stdout[0]!) as {
      injectSkipped: string[]
      injectFailure?: Record<string, string>
      pendingSetup: string[]
    }
    expect(result.injectSkipped).toHaveLength(1)
    expect(result.injectFailure).toEqual({ [result.injectSkipped[0]!]: REASON })
    expect(result.pendingSetup.some((step) => step.includes('inject'))).toBe(true)
  })
})
