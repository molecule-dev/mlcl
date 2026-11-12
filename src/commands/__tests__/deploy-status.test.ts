import { join } from 'node:path'

import { Config } from '@oclif/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDeployment, listDeployments } from '../../lib/platform.js'
import DeployStatus from '../deploy/status.js'

vi.mock('../../lib/platform.js', () => ({ getDeployment: vi.fn(), listDeployments: vi.fn() }))
vi.mock('../../shared/project-flag.js', async (original) => ({
  ...(await original<object>()),
  requireAuth: vi.fn(),
}))
beforeEach(() => vi.resetAllMocks())

// The mlcl package root (src/commands/__tests__ → three levels up), whose package.json carries the oclif manifest.
const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

async function status(argv: string[]): Promise<ReturnType<typeof vi.fn>> {
  const config = await Config.load({ root: MLCL_ROOT })
  const command = new DeployStatus(argv, config)
  const log = vi.fn()
  command.log = log
  await command.run()
  return log
}

describe('deploy status used by the MCP read tool', () => {
  it('reads the latest deployment when the MCP supplies only project_id', async () => {
    vi.mocked(listDeployments).mockResolvedValue([
      { id: 'latest', status: 'ready' },
      { id: 'older', status: 'failed' },
    ])
    vi.mocked(getDeployment).mockResolvedValue({ id: 'latest', status: 'ready' })
    const outcome = await status(['--project', 'warehouse']).then(
      (log) => ({ log, error: null }),
      (error: Error) => ({ log: null, error: error.message }),
    )
    expect(outcome.error).toBeNull()
    expect(listDeployments).toHaveBeenCalledWith('warehouse')
    expect(getDeployment).toHaveBeenCalledWith('warehouse', 'latest')
    expect(outcome.log).toHaveBeenCalledWith(
      JSON.stringify({ id: 'latest', status: 'ready' }, null, 2),
    )
  })
  it('retains an explicit historical deployment without listing others', async () => {
    vi.mocked(getDeployment).mockResolvedValue({ id: 'older', status: 'failed' })
    await status(['--project', 'warehouse', '--deployment', 'older'])
    expect(listDeployments).not.toHaveBeenCalled()
    expect(getDeployment).toHaveBeenCalledWith('warehouse', 'older')
  })
  it('reports an empty project without attempting an undefined deployment', async () => {
    vi.mocked(listDeployments).mockResolvedValue([])
    await expect(status(['--project', 'warehouse'])).rejects.toThrow(
      'No deployments for this project',
    )
    expect(getDeployment).not.toHaveBeenCalled()
  })
})
