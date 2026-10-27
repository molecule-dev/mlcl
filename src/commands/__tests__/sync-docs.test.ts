import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkDocs } from '../../lib/docs-check.js'
import { generateDocs } from '../../lib/docs-sync.js'
import SyncDocs from '../sync-docs.js'

vi.mock('../../lib/docs-check.js', () => ({
  checkDocs: vi.fn(async () => ({ checked: ['alpha', 'beta'], different: [] })),
}))
vi.mock('../../lib/docs-sync.js', () => ({ generateDocs: vi.fn(async () => []) }))
vi.mock('../../lib/registry.js', () => ({
  getRawRegistry: () => ({ packages: { alpha: { path: '.' }, beta: { path: '.' } } }),
}))
const root = resolve(import.meta.dirname, '../../..')
const previousJobs = process.env.MLCL_DOCS_JOBS

beforeEach(() => {
  delete process.env.MLCL_DOCS_JOBS
  vi.clearAllMocks()
})
afterEach(() => {
  if (previousJobs === undefined) delete process.env.MLCL_DOCS_JOBS
  else process.env.MLCL_DOCS_JOBS = previousJobs
})
const run = (args: string[]): Promise<unknown> => SyncDocs.run(args, { root })

describe('sync-docs process selection', () => {
  it('keeps default jobs1 on the original generator', async () => {
    await run(['--check'])
    expect(generateDocs).toHaveBeenCalledOnce()
    expect(checkDocs).not.toHaveBeenCalled()
  })

  it.each(['flag', 'environment'])(
    'selects jobs2 from the actual Oclif %s input',
    async (input) => {
      if (input === 'environment') process.env.MLCL_DOCS_JOBS = '2'
      await run(input === 'flag' ? ['--check', '--jobs=2'] : ['--check'])
      expect(checkDocs).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        undefined,
        expect.objectContaining({ jobs: 2 }),
      )
      expect(generateDocs).not.toHaveBeenCalled()
    },
  )

  it('lets explicit jobs1 override environment jobs2 and preserves single-package behavior', async () => {
    process.env.MLCL_DOCS_JOBS = '2'
    await run(['--check', '--jobs=1'])
    await run(['--check', '--package=alpha'])
    expect(generateDocs).toHaveBeenCalledTimes(2)
    expect(checkDocs).not.toHaveBeenCalled()
  })

  it.each(['0', '3', 'invalid'])('refuses unsupported job count %s', async (jobs) => {
    await expect(run(['--check', `--jobs=${jobs}`])).rejects.toThrow()
    expect(generateDocs).not.toHaveBeenCalled()
    expect(checkDocs).not.toHaveBeenCalled()
  })

  it('refuses jobs2 in write mode before generation', async () => {
    await expect(run(['--generate', '--jobs=2'])).rejects.toThrow('requires --check')
    expect(generateDocs).not.toHaveBeenCalled()
  })

  it('retains unknown-package refusal', async () => {
    await expect(run(['--check', '--jobs=2', '--package=missing'])).rejects.toThrow(
      'not in the registry',
    )
    expect(checkDocs).not.toHaveBeenCalled()
  })

  it('propagates worker failure through the real command', async () => {
    vi.mocked(checkDocs).mockRejectedValueOnce(new Error('worker failed'))
    await expect(run(['--check', '--jobs=2'])).rejects.toThrow('worker failed')
  })
})
