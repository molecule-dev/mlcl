/**
 * `mlcl account delete` against a local HTTP mock standing in for
 * api.molecule.dev: the password prompt, the request body, and the plain
 * messages for the platform's three refusals.
 */
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prompt = vi.hoisted(() => ({ answer: 'pw' as string | symbol }))
vi.mock('@clack/prompts', () => ({
  password: vi.fn(async () => prompt.answer),
  isCancel: (v: unknown) => typeof v === 'symbol',
}))

import AccountDelete, { accountDeleteErrorMessage } from '../account/delete.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('account delete', () => {
  let server: Server
  const requests: Array<{ method: string; path: string; body?: Record<string, unknown> }> = []
  let reply: { status: number; json?: unknown } = { status: 204 }

  beforeEach(async () => {
    requests.length = 0
    reply = { status: 204 }
    prompt.answer = 'pw'
    server = createServer((req, res) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        const path = req.url ?? ''
        if (path === '/users/me') {
          res.writeHead(200, { 'content-type': 'application/json' })
          return res.end(JSON.stringify({ props: { id: 'u_1' } }))
        }
        requests.push({
          method: req.method ?? 'GET',
          path,
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined,
        })
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(reply.json === undefined ? '' : JSON.stringify(reply.json))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
  })

  afterEach(async () => {
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  async function run(): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    await new AccountDelete(['-p', 'p_1', '--force'], config).run()
  }

  it('sends the entered password as { password }, the shape the server reads', async () => {
    await run()
    expect(requests).toEqual([{ method: 'DELETE', path: '/users/u_1', body: { password: 'pw' } }])
  })

  it('sends no body when the password is left blank', async () => {
    prompt.answer = ''
    await run()
    expect(requests[0]?.body).toBeUndefined()
  })

  it('deletes nothing when the prompt is cancelled', async () => {
    prompt.answer = Symbol('cancel')
    await run()
    expect(requests).toEqual([])
  })

  it.each([
    ['user.error.passwordMismatch', 'That password is not right.'],
    ['user.error.passwordRequired', 'Enter your password to delete your account.'],
    [
      'service.busy',
      'We could not cancel your subscription, so nothing was deleted. Try again in a minute.',
    ],
  ])('maps %s to a plain message', async (errorKey, message) => {
    reply = { status: errorKey === 'service.busy' ? 503 : 403, json: { error: 'x', errorKey } }
    await expect(run()).rejects.toThrow(message)
  })

  it('leaves unknown errors alone', () => {
    expect(accountDeleteErrorMessage(new Error('boom'))).toBeUndefined()
  })
})
