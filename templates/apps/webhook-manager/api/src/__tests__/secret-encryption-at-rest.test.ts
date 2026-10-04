import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Security regression tests (2026-10-04 audit): webhook signing secrets must
// (1) be encrypted at rest — the `secret` column carries AES-256-GCM
// ciphertext, never plaintext; (2) never round-trip on read paths — list/get/
// rotation responses carry only the masked form; (3) be returned raw exactly
// once, in the create response (the UI copy promises "reveal the secret once
// the endpoint is created").

// Deterministic stand-in for the AES-256-GCM bond: ciphertext-shaped, never
// equal to the plaintext.
const fakeEncrypt = vi.fn(
  async (plaintext: string) => `enc:v1:${Buffer.from(plaintext).toString('base64url')}`,
)
vi.mock('@molecule/api-encryption', () => ({
  encrypt: (...a: unknown[]) => fakeEncrypt(a[0] as string),
  decrypt: async (ciphertext: string) =>
    Buffer.from(ciphertext.replace(/^enc:v1:/, ''), 'base64url').toString('utf8'),
}))

const db = {
  create: vi.fn(async () => ({ data: { id: 'w1' } })),
  findById: vi.fn(),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(async () => ({ data: { id: 'w1' } })),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
// Isolate the handler from delivery HTTP + audit writes.
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: vi.fn() }))
vi.mock('../handlers/_audit.js', () => ({ recordAudit: vi.fn(async () => undefined) }))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const webhooks = (await import('../handlers/webhooks.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/webhooks', webhooks)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
})

const storedWebhookRow = () => {
  expect(db.create).toHaveBeenCalledTimes(1)
  return (db.create.mock.calls[0] as unknown[])[1] as Record<string, unknown>
}

describe('webhook signing secrets are encrypted at rest and never read back', () => {
  it('POST / stores ciphertext (≠ plaintext) and returns the raw secret exactly once', async () => {
    const res = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'u1' },
      body: JSON.stringify({ name: 'ops', url: 'https://example.com/hook' }),
    })
    expect(res.status).toBe(201)

    const stored = storedWebhookRow()
    expect(stored.secret).toMatch(/^enc:v1:/) // ciphertext, not plaintext
    expect(stored.secret).not.toContain('whsec') // never the raw value
    expect(stored.secret_masked).toMatch(/^whsec_••••/)

    const body = (await res.json()) as Record<string, unknown>
    expect(typeof body.secret).toBe('string')
    expect(body.secret).not.toMatch(/^enc:v1:/) // the create response carries the RAW secret, once
    expect(fakeEncrypt).toHaveBeenCalledWith(expect.any(String))
  })

  it('POST / encrypts a client-supplied secret the same way', async () => {
    const res = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'u1' },
      body: JSON.stringify({
        name: 'ops',
        url: 'https://example.com/hook',
        secret: 'my-custom-signing-secret',
      }),
    })
    expect(res.status).toBe(201)
    const stored = storedWebhookRow()
    expect(stored.secret).toMatch(/^enc:v1:/)
    expect(stored.secret).not.toBe('my-custom-signing-secret')
  })

  it('GET /:id returns the masked form — never the ciphertext, never the raw secret', async () => {
    db.findById.mockResolvedValueOnce({
      id: 'w1',
      user_id: 'u1',
      secret: 'enc:v1:YWJjZA',
      secret_masked: 'whsec_••••wxyz',
    })
    const res = await fetch(`${baseUrl}/webhooks/w1`, {
      headers: { 'x-test-user': 'u1' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.secret).toBe('whsec_••••wxyz')
    expect(String(body.secret)).not.toMatch(/^enc:/)
  })

  it('GET / (list) masks every row’s secret', async () => {
    db.findMany.mockResolvedValueOnce([
      { id: 'w1', user_id: 'u1', secret: 'enc:v1:AAA', secret_masked: 'whsec_••••aaaa' },
      { id: 'w2', user_id: 'u1', secret: 'enc:v1:BBB', secret_masked: 'whsec_••••bbbb' },
    ])
    const res = await fetch(`${baseUrl}/webhooks`, { headers: { 'x-test-user': 'u1' } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body.map((r) => r.secret)).toEqual(['whsec_••••aaaa', 'whsec_••••bbbb'])
  })

  it('PUT /:id rotation stores ciphertext and responds masked', async () => {
    db.findById.mockResolvedValueOnce({ id: 'w1', user_id: 'u1', name: 'ops' })
    // The real update returns the post-write row (masked secret fields).
    db.updateById.mockResolvedValueOnce({
      data: { id: 'w1', secret: 'enc:v1:YnJhbmRuZXc', secret_masked: 'whsec_••••cret' },
    })
    const res = await fetch(`${baseUrl}/webhooks/w1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-user': 'u1' },
      body: JSON.stringify({ secret: 'brand-new-signing-secret' }),
    })
    expect(res.status).toBe(200)
    const [, , patch] = db.updateById.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(patch.secret).toMatch(/^enc:v1:/)
    expect(patch.secret).not.toBe('brand-new-signing-secret')
    expect(patch.secret_masked).toBe('whsec_••••cret') // whsec_ + last 4 of the new secret
    const body = (await res.json()) as Record<string, unknown>
    expect(String(body.secret)).toMatch(/^whsec_••••/)
    expect(String(body.secret)).not.toMatch(/^enc:/)
  })
})
