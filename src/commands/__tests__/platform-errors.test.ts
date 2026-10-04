/**
 * The CLI's HTTP helper against a local mock of api.molecule.dev: non-JSON
 * error pages, Retry-After, account-export truncation and the slow project delete.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listProjects, PlatformApiError } from '../../lib/platform.js'
import AccountExport from '../account/export.js'
import ProjectDelete from '../project/delete.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('platform HTTP errors and commands', () => {
  let server: Server
  let handler: (
    url: string,
    method: string,
  ) => { status: number; headers?: Record<string, string>; body: string } | 'hang'

  beforeEach(async () => {
    server = createServer((req, res) => {
      const out = handler(req.url ?? '', req.method ?? 'GET')
      if (out === 'hang') return // never answers: the client's timeout fires
      res.writeHead(out.status, { 'content-type': 'text/html', ...out.headers })
      res.end(out.body)
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
  })
  afterEach(async () => {
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    vi.restoreAllMocks()
    server.closeAllConnections()
    await new Promise<void>((r) => server.close(() => r()))
  })

  it('turns a non-JSON error body into a PlatformApiError with the status', async () => {
    handler = () => ({ status: 502, body: '<html>Bad gateway</html>' })
    const error = await listProjects().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PlatformApiError)
    expect((error as PlatformApiError).status).toBe(502)
    expect((error as PlatformApiError).message).toBe('molecule.dev returned 502 (not JSON).')
  })

  it('puts Retry-After in the message and on the error', async () => {
    handler = () => ({
      status: 503,
      headers: { 'retry-after': '30', 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Service busy.', errorKey: 'service.busy' }),
    })
    const error = (await listProjects().catch((e: unknown) => e)) as PlatformApiError
    expect(error.retryAfterSeconds).toBe(30)
    expect(error.message).toBe('Service busy. Try again in 30 seconds.')
  })

  it('says "in a minute" for service.busy without the header', async () => {
    handler = () => ({
      status: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Service busy.', errorKey: 'service.busy' }),
    })
    const error = (await listProjects().catch((e: unknown) => e)) as PlatformApiError
    expect(error.message).toBe('Service busy. Try again in a minute.')
  })

  it('warns on stderr when the export is truncated, and writes --out', async () => {
    handler = (url) =>
      url === '/users/me'
        ? { status: 200, headers: { 'content-type': 'application/json' }, body: '{"id":"u1"}' }
        : {
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              meta: { truncatedSections: { payments: { truncated: true, limit: 500 } } },
            }),
          }
    const dir = mkdtempSync(join(tmpdir(), 'mlcl-export-'))
    const lines: string[] = []
    try {
      const file = join(dir, 'out.json')
      const config = await Config.load(MLCL_ROOT)
      const cmd = new AccountExport(['--out', file], config)
      vi.spyOn(cmd, 'logToStderr').mockImplementation((m?: string) => void lines.push(String(m)))
      await cmd.run()
      const written = lines.join('\n')
      expect(written).toContain('payments (first 500 rows)')
      expect(JSON.parse(readFileSync(file, 'utf8')).meta.truncatedSections.payments.limit).toBe(500)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports a delete that outlives the client timeout as still running', async () => {
    handler = () => 'hang'
    const platform = await import('../../lib/platform.js')
    expect(platform.DELETE_PROJECT_TIMEOUT_MS).toBe(5 * 60_000)
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.timeout(50))
    const out: string[] = []
    const config = await Config.load(MLCL_ROOT)
    const cmd = new ProjectDelete(['--project', 'p1', '--force'], config)
    vi.spyOn(cmd, 'log').mockImplementation((m?: string) => void out.push(String(m)))
    await cmd.run()
    expect(out.join('\n')).toContain('Deletion started and is still running on the server')
  })
})
