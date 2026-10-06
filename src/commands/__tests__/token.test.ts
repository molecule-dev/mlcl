/**
 * `mlcl token create | list | revoke` against a local HTTP mock that answers in
 * the shapes the platform sends: rows wrapped in `{ data }`, refusals as
 * `{ error, errorKey }`. Output is captured per stream (stdout vs stderr),
 * because the split between them is the contract: stdout carries the
 * token alone, so `$(mlcl token create ci)` captures exactly it.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { format } from 'node:util'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TokenCreate from '../token/create.js'
import TokenList from '../token/list.js'
import TokenRevoke from '../token/revoke.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1XzEifQ.c2ln'

interface Recorded {
  method: string
  path: string
  auth?: string
  body?: unknown
}

type Reply = { status: number; body: unknown }
type Handler = (req: Recorded) => Reply | undefined

describe('mlcl token', () => {
  let server: Server
  let config: Config
  const requests: Recorded[] = []
  let handler: Handler = () => undefined
  let stdout = ''
  let stderr = ''
  let restoreStreams: () => void = () => {}

  /**
   * oclif writes stdout through `console.log` and stderr through `console.error`
   * (`ux.stdout` / `ux.stderr`). vitest reroutes `console` before it reaches
   * `process.stdout.write`, so the two console channels are where the streams
   * are told apart.
   */
  function captureStreams(): void {
    const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      stdout += `${format(...args)}\n`
    })
    const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      stderr += `${format(...args)}\n`
    })
    restoreStreams = () => {
      log.mockRestore()
      error.mockRestore()
    }
  }

  async function run(
    command: typeof TokenCreate | typeof TokenList | typeof TokenRevoke,
    argv: string[],
  ): Promise<unknown> {
    captureStreams()
    try {
      return await command.run(argv, config)
    } finally {
      restoreStreams()
    }
  }

  beforeEach(async () => {
    requests.length = 0
    stdout = ''
    stderr = ''
    process.exitCode = undefined
    handler = () => undefined
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        const recorded: Recorded = {
          method: req.method ?? 'GET',
          path: req.url ?? '',
          auth: req.headers.authorization,
          body: raw ? JSON.parse(raw) : undefined,
        }
        requests.push(recorded)
        const reply = handler(recorded) ?? { status: 404, body: { error: 'no route' } }
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_session'
    // No stored login on this machine leaks into the test: MOLECULE_TOKEN alone signs it in.
    process.env.MLCL_CREDENTIALS_FILE = join(tmpdir(), 'mlcl-token-test-no-credentials.json')
    config = await Config.load(MLCL_ROOT)
  })

  afterEach(async () => {
    restoreStreams()
    process.exitCode = undefined
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    delete process.env.MLCL_CREDENTIALS_FILE
    delete (globalThis as { __mlclTelemetryContext?: unknown }).__mlclTelemetryContext
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const created = {
    id: 'tok_a1',
    name: 'ci',
    createdAt: '2026-10-06T12:00:00.000Z',
    expiresAt: '2027-01-04T12:00:00.000Z',
    lastUsedAt: null,
    token: TOKEN,
  }

  const listed = [
    {
      id: 'tok_a1',
      name: 'ci',
      createdAt: '2026-10-06T12:00:00.000Z',
      expiresAt: '2099-01-04T12:00:00.000Z',
      lastUsedAt: null,
    },
    {
      id: 'tok_b2',
      name: 'backup',
      createdAt: '2026-09-01T08:00:00.000Z',
      expiresAt: '2099-11-30T08:00:00.000Z',
      lastUsedAt: '2026-10-05T23:10:00.000Z',
    },
  ]

  describe('create', () => {
    beforeEach(() => {
      handler = (req) =>
        req.method === 'POST' && req.path === '/account/api-tokens'
          ? { status: 201, body: { data: created } }
          : undefined
    })

    it('prints the token alone on stdout and the guidance on stderr', async () => {
      await run(TokenCreate, ['ci'])
      expect(stdout).toBe(`${TOKEN}\n`)
      expect(stderr).toContain('Created token "ci"')
      expect(stderr).toContain('2027-01-04')
      expect(stderr).toContain('only time the token is shown')
      expect(stderr).toContain('export MOLECULE_TOKEN=')
      expect(stderr).toContain('mlcl token revoke ci')
      expect(stderr).not.toContain(TOKEN)
      expect(requests).toHaveLength(1)
      expect(requests[0]).toMatchObject({
        method: 'POST',
        path: '/account/api-tokens',
        auth: 'Bearer tok_session',
        body: { name: 'ci', expiresInDays: 90 },
      })
    })

    it('sends the expiry it was given and a trimmed name', async () => {
      await run(TokenCreate, ['  nightly  ', '--expires-in-days', '30'])
      expect(requests[0].body).toEqual({ name: 'nightly', expiresInDays: 30 })
    })

    it('--json prints the whole created object on stdout and nothing on stderr', async () => {
      const result = await run(TokenCreate, ['ci', '--json'])
      expect(JSON.parse(stdout)).toEqual(created)
      expect(result).toEqual(created)
      expect(stderr).toBe('')
    })

    it('never hands the token name to telemetry', async () => {
      await run(TokenCreate, ['secret-project-name'])
      const context = (globalThis as { __mlclTelemetryContext?: Record<string, string> })
        .__mlclTelemetryContext
      expect(JSON.stringify(context ?? {})).not.toContain('secret-project-name')
    })

    it.each([
      [['', '--expires-in-days', '30'], 'A token name must be 1 to 60 characters.'],
      [['   '], 'A token name must be 1 to 60 characters.'],
      [['x'.repeat(61)], 'A token name must be 1 to 60 characters.'],
      [['ci', '--expires-in-days', '0'], '--expires-in-days must be a whole number from 1 to 365.'],
      [
        ['ci', '--expires-in-days', '366'],
        '--expires-in-days must be a whole number from 1 to 365.',
      ],
      [
        ['ci', '--expires-in-days', 'abc'],
        '--expires-in-days must be a whole number from 1 to 365.',
      ],
      [
        ['ci', '--expires-in-days', '1.5'],
        '--expires-in-days must be a whole number from 1 to 365.',
      ],
    ])('refuses %j before sending any request', async (argv, message) => {
      await expect(run(TokenCreate, argv)).rejects.toThrow(message)
      expect(requests).toHaveLength(0)
      expect(process.exitCode).toBe(1)
    })

    it('accepts the boundary values 1 and 365 days and a 60-character name', async () => {
      await run(TokenCreate, ['x'.repeat(60), '--expires-in-days', '1'])
      await run(TokenCreate, ['ci', '--expires-in-days', '365'])
      expect(requests.map((r) => (r.body as { expiresInDays: number }).expiresInDays)).toEqual([
        1, 365,
      ])
    })

    it.each([
      [400, 'apiToken.error.invalidName', 'A token name must be 1 to 60 characters.'],
      [400, 'apiToken.error.invalidExpiry', 'whole number from 1 to 365'],
      [409, 'apiToken.error.nameTaken', 'You already have a token named "ci"'],
      [403, 'apiToken.error.sessionRequired', 'Run `mlcl login` to sign in'],
      [403, 'apiToken.error.emailNotConfirmed', 'Confirm your email address first'],
      [429, 'apiToken.error.limit', 'You have 25 active tokens'],
      [429, 'apiToken.error.dailyLimit', 'You can create 10 tokens a day'],
    ])('maps a %i %s to a plain message and a failing exit', async (status, errorKey, message) => {
      handler = () => ({ status, body: { error: 'server sentence', errorKey } })
      await expect(run(TokenCreate, ['ci'])).rejects.toThrow(message)
      expect(process.exitCode).toBe(1)
      expect(stdout).toBe('')
    })

    it('sets a failing exit code with --json too', async () => {
      handler = () => ({
        status: 429,
        body: { error: 'limit', errorKey: 'apiToken.error.dailyLimit' },
      })
      await run(TokenCreate, ['ci', '--json'])
      expect(process.exitCode).toBe(1)
      expect(JSON.parse(stdout).error.message).toContain('10 tokens a day')
    })

    it('fails when the platform returns no token value', async () => {
      handler = () => ({ status: 201, body: { data: { ...created, token: undefined } } })
      await expect(run(TokenCreate, ['ci'])).rejects.toThrow('did not return the token')
      expect(process.exitCode).toBe(1)
    })

    it('refuses without any login', async () => {
      delete process.env.MOLECULE_TOKEN
      await expect(run(TokenCreate, ['ci'])).rejects.toThrow('mlcl token create')
      expect(requests).toHaveLength(0)
    })
  })

  describe('list', () => {
    it('shows each token with its dates and never a token value', async () => {
      handler = () => ({
        status: 200,
        body: { data: listed.map((row) => ({ ...row, token: TOKEN })) },
      })
      await run(TokenList, [])
      expect(stdout).toContain('2 API tokens')
      expect(stdout).toContain('tok_a1')
      expect(stdout).toContain('backup')
      expect(stdout).toContain('2026-09-01')
      expect(stdout).toContain('2099-11-30')
      expect(stdout).toContain('2026-10-05')
      expect(stdout).toMatch(/tok_a1.*never/)
      expect(stdout).not.toContain(TOKEN)
      expect(requests[0]).toMatchObject({ method: 'GET', path: '/account/api-tokens' })
    })

    it('--json drops a token field even when the server sent one', async () => {
      handler = () => ({
        status: 200,
        body: { data: listed.map((row) => ({ ...row, token: TOKEN })) },
      })
      const result = await run(TokenList, ['--json'])
      expect(stdout).not.toContain(TOKEN)
      expect(JSON.parse(stdout)).toEqual(listed)
      expect(result).toEqual(listed)
    })

    it('marks an expired token', async () => {
      handler = () => ({
        status: 200,
        body: { data: [{ ...listed[0], expiresAt: '2020-01-01T00:00:00.000Z' }] },
      })
      await run(TokenList, [])
      expect(stdout).toContain('1 API token')
      expect(stdout).toContain('2020-01-01 (expired)')
    })

    it('says how to create one when there are none', async () => {
      handler = () => ({ status: 200, body: { data: [] } })
      await run(TokenList, [])
      expect(stdout).toContain('mlcl token create <name>')
    })

    it('tells an API-token session to sign in', async () => {
      handler = () => ({
        status: 403,
        body: { error: 'x', errorKey: 'apiToken.error.sessionRequired' },
      })
      await expect(run(TokenList, [])).rejects.toThrow('Run `mlcl login`')
      expect(process.exitCode).toBe(1)
    })
  })

  describe('revoke', () => {
    function withTokens(rows: unknown[]): void {
      handler = (req) => {
        if (req.method === 'GET') return { status: 200, body: { data: rows } }
        if (req.method === 'DELETE') return { status: 200, body: { data: { revoked: true } } }
        return undefined
      }
    }

    it('revokes by a unique name and says what it revoked', async () => {
      withTokens(listed)
      const result = await run(TokenRevoke, ['backup'])
      expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual([
        'GET /account/api-tokens',
        'DELETE /account/api-tokens/tok_b2',
      ])
      expect(stdout).toContain('Revoked token "backup" (tok_b2)')
      expect(result).toEqual({ id: 'tok_b2', name: 'backup', revoked: true })
    })

    it('revokes by id', async () => {
      withTokens(listed)
      await run(TokenRevoke, ['tok_a1'])
      expect(requests[1]).toMatchObject({
        method: 'DELETE',
        path: '/account/api-tokens/tok_a1',
      })
    })

    it('--json prints what it revoked', async () => {
      withTokens(listed)
      await run(TokenRevoke, ['ci', '--json'])
      expect(JSON.parse(stdout)).toEqual({ id: 'tok_a1', name: 'ci', revoked: true })
    })

    it('refuses an ambiguous name, listing the ids, and deletes nothing', async () => {
      withTokens([listed[0], { ...listed[1], name: 'ci' }])
      await expect(run(TokenRevoke, ['ci'])).rejects.toThrow(
        'More than one token is named "ci". Revoke it by id instead: tok_a1, tok_b2',
      )
      expect(requests.some((r) => r.method === 'DELETE')).toBe(false)
      expect(process.exitCode).toBe(1)
    })

    it('refuses a reference that matches nothing, and deletes nothing', async () => {
      withTokens(listed)
      await expect(run(TokenRevoke, ['nope'])).rejects.toThrow('No token has the id or name "nope"')
      expect(requests.some((r) => r.method === 'DELETE')).toBe(false)
      expect(process.exitCode).toBe(1)
    })

    it('maps a 404 from the delete to a plain message', async () => {
      handler = (req) =>
        req.method === 'GET'
          ? { status: 200, body: { data: listed } }
          : { status: 404, body: { error: 'x', errorKey: 'apiToken.error.notFound' } }
      await expect(run(TokenRevoke, ['ci'])).rejects.toThrow('That token no longer exists')
      expect(process.exitCode).toBe(1)
    })
  })
})
