/**
 * `mlcl deploy --follow` and `mlcl deploy list` against a local HTTP mock that answers in the
 * shapes the platform really sends: the row wrapped in `{ data }`, the states
 * pending | building | deploying | ready | failed | cancelled, and the public address under `url`.
 *
 * The command used to wait for `live`, which the platform never sends, so it printed "ready…"
 * for ten minutes and then "Timed out", and it read `liveUrl`, which does not exist.
 */
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'

import { Command, Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Deploy from '../deploy/index.js'
import DeployList from '../deploy/list.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('deploy', () => {
  let server: Server
  let polled = 0
  let finalState: Record<string, unknown> = {}
  const lines: string[] = []

  beforeEach(async () => {
    polled = 0
    lines.length = 0
    process.exitCode = undefined
    vi.spyOn(Command.prototype, 'log').mockImplementation((message?: string) => {
      lines.push(String(message ?? ''))
    })
    server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      if (req.method === 'POST') {
        return res.end(JSON.stringify({ data: { id: 'd1', status: 'pending', url: null } }))
      }
      if (req.url?.endsWith('/deployments')) {
        return res.end(
          JSON.stringify({
            data: [{ id: 'd1', status: 'ready', url: 'https://app.molecule.app' }],
          }),
        )
      }
      polled++
      return res.end(JSON.stringify({ data: { id: 'd1', ...finalState } }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    process.exitCode = undefined
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('--follow reports success when the platform says ready, with the url it sends', async () => {
    finalState = { status: 'ready', url: 'https://app.molecule.app' }
    const config = await Config.load(MLCL_ROOT)
    await new Deploy(['-p', 'p_1', '--follow'], config).run()
    expect(polled).toBe(1)
    const output = lines.join('\n')
    expect(output).toContain('Live')
    expect(output).toContain('https://app.molecule.app')
    expect(output).not.toContain('Timed out')
  }, 20_000)

  it('--follow reports a failed deployment and sets a failing exit code', async () => {
    finalState = { status: 'failed', url: null, buildLog: 'boom' }
    const config = await Config.load(MLCL_ROOT)
    await new Deploy(['-p', 'p_1', '--follow'], config).run()
    expect(lines.join('\n')).toContain('Deployment failed.')
    expect(process.exitCode).toBe(1)
  }, 20_000)

  it('list shows the url column', async () => {
    const config = await Config.load(MLCL_ROOT)
    await new DeployList(['-p', 'p_1'], config).run()
    expect(lines.join('\n')).toContain('https://app.molecule.app')
  })
})
