/**
 * MOLECULE_TOKEN alone signs a command in — no stored login on the machine.
 * This is how CI uses a personal API token. `deploy` and `project list` used to
 * check only the credentials file, so they refused with "Not logged in" on
 * every CI runner even with the token set.
 */
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Command, Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Whoami from '../auth/whoami.js'
import Deploy from '../deploy/index.js'
import ProjectList from '../project/list.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('MOLECULE_TOKEN without a stored login', () => {
  let server: Server
  const auth: Array<string | undefined> = []

  beforeEach(async () => {
    auth.length = 0
    vi.spyOn(Command.prototype, 'log').mockImplementation(() => {})
    server = createServer((req, res) => {
      auth.push(req.headers.authorization)
      res.writeHead(200, { 'content-type': 'application/json' })
      if (req.url === '/projects') return res.end(JSON.stringify([{ id: 'p_1', name: 'blog' }]))
      if (req.url === '/users/me') return res.end(JSON.stringify({ id: 'u_1', email: 'a@b.c' }))
      return res.end(JSON.stringify({ data: { id: 'd1', status: 'pending', url: null } }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_ci'
    process.env.MLCL_CREDENTIALS_FILE = join(tmpdir(), 'mlcl-no-stored-login.json')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    delete process.env.MLCL_CREDENTIALS_FILE
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it.each([
    ['deploy', Deploy, ['-p', 'p_1']],
    ['project list', ProjectList, []],
    ['whoami', Whoami, []],
  ] as const)('%s sends the token', async (_label, command, argv) => {
    const config = await Config.load(MLCL_ROOT)
    await new command([...argv], config).run()
    expect(auth[0]).toBe('Bearer tok_ci')
  })

  it('refuses with the token hint when neither a login nor MOLECULE_TOKEN exists', async () => {
    delete process.env.MOLECULE_TOKEN
    const config = await Config.load(MLCL_ROOT)
    await expect(new Deploy(['-p', 'p_1'], config).run()).rejects.toThrow('mlcl token create')
    expect(auth).toHaveLength(0)
  })
})
