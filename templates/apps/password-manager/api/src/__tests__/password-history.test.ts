import { createHash } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for the dormant-endpoint remediation: password history must
// store a server-computed sha256 digest + last-4 preview — never the
// submitted value itself, and never a caller-supplied "ciphertext" blob
// verbatim (the old `encrypted_password` column did exactly that).

const PLAINTEXT = 'correct-horse-battery-STAPLE-9'

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'ph-1' } }))
const findById = vi.fn(async (..._a: unknown[]) => ({
  id: 'item-1',
  owner_id: 'user-1',
}))

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...(a as [string, Record<string, unknown>])),
  findById: (...a: unknown[]) => findById(...(a as [string, string])),
  findMany: vi.fn(async (..._a: unknown[]) => []),
  deleteById: vi.fn(async (..._a: unknown[]) => ({ affected: 1 })),
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
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const history = (await import('../handlers/password-history.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: (err?: unknown) => void) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/api/password-history', history)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
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

describe('password-history stores a digest + preview, not the value', () => {
  it('stores sha256(password) + last-4 preview; no plaintext, no caller blob', async () => {
    const res = await fetch(`${baseUrl}/api/password-history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ item_id: 'item-1', password: PLAINTEXT }),
    })
    expect(res.status).toBe(201)

    expect(create).toHaveBeenCalledWith(
      'password_history',
      expect.objectContaining({
        item_id: 'item-1',
        user_id: 'user-1',
        password_hash: createHash('sha256').update(PLAINTEXT, 'utf8').digest('hex'),
        password_preview: PLAINTEXT.slice(-4),
      }),
    )

    // The stored row contains no plaintext and no caller-controlled blob:
    // the ONLY occurrence of the submitted value in the write is its hash
    // and its 4-char tail.
    const write = create.mock.calls[0]![1] as Record<string, unknown>
    const serialized = JSON.stringify(write)
    expect(serialized).not.toContain(PLAINTEXT)
    expect(serialized).not.toContain(PLAINTEXT.slice(0, -4))
    expect(write.password_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(write).not.toHaveProperty('encrypted_password')
  })

  it('still refuses history for an item the caller does not own', async () => {
    findById.mockResolvedValueOnce({ id: 'item-1', owner_id: 'someone-else' })
    const res = await fetch(`${baseUrl}/api/password-history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ item_id: 'item-1', password: PLAINTEXT }),
    })
    expect(res.status).toBe(404)
    expect(create).not.toHaveBeenCalled()
  })
})
