import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

const exec = promisify(execFile)
const mlcl = join(import.meta.dirname, '../../..')
const projectId = '23456789-1234-4234-8234-123456789abc'

it('deploys the canary on a Machine and registers it with the saved CLI session', async () => {
  const requests: Array<{ method?: string; url?: string; authorization?: string; body: string }> =
    []
  const server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    requests.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      body,
    })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ projectId, data: { id: 'deployment', status: 'pending' } }))
  })
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-routing-canary-'))
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    const credentials = join(dir, 'credentials.production.json')
    await writeFile(credentials, JSON.stringify({ token: 'test-signed-session' }), { mode: 0o600 })
    const env = {
      ...process.env,
      MOLECULE_API_URL: `http://127.0.0.1:${port}/api`,
      MLCL_CREDENTIALS_FILE: credentials,
      DO_NOT_TRACK: '1',
    }
    delete env.MOLECULE_TOKEN
    const run = async (
      ...args: string[]
    ): Promise<{ stdout: string; stderr: string } | { error: string }> => {
      try {
        return await exec(process.execPath, ['bin/run.js', ...args], { cwd: mlcl, env })
      } catch (error) {
        return { error: (error as Error).message }
      }
    }
    const deployment = await run('deploy', '--project', projectId, '--hosting', 'machine')
    const registration = await run('project', 'routing-canary', '--project', projectId)
    expect(requests).toEqual([
      {
        method: 'POST',
        url: `/api/projects/${projectId}/deployments`,
        authorization: 'Bearer test-signed-session',
        body: '{"hosting":"machine"}',
      },
      {
        method: 'PUT',
        url: `/api/admin/production-routing-canary/${projectId}`,
        authorization: 'Bearer test-signed-session',
        body: '',
      },
    ])
    expect(deployment).toHaveProperty('stdout', expect.stringContaining('Deployment started'))
    expect(registration).toHaveProperty('stdout', expect.stringContaining(projectId))
    expect(registration).not.toHaveProperty(
      'stdout',
      expect.stringContaining('test-signed-session'),
    )
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(dir, { recursive: true, force: true })
  }
})
