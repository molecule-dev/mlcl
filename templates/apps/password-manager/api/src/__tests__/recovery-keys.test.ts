import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for the honest-columns remediation: the "recovery kit" is
// an export/copy feature, so the handler stores the plain kit text under
// `recovery_kit` and writes NO fake `public_key` / `encrypted_*` fields.

const create = vi.fn(async (..._a: unknown[]) => ({
  data: { id: 'rk-1', recovery_kit: 'KIT' },
}))

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...(a as [string, Record<string, unknown>])),
  findById: vi.fn(async (..._a: unknown[]) => null),
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
  const recoveryKeys = (await import('../handlers/recovery-keys.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: (err?: unknown) => void) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/api/recovery-keys', recoveryKeys)

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

describe('recovery-keys stores the kit honestly', () => {
  it('round-trips the renamed recovery_kit column', async () => {
    const res = await fetch(`${baseUrl}/api/recovery-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ recovery_kit: 'MY-PLAIN-TEXT-KIT' }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      'vault_recovery_keys',
      expect.objectContaining({ user_id: 'user-1', recovery_kit: 'MY-PLAIN-TEXT-KIT' }),
    )
    const write = JSON.stringify(create.mock.calls[0])
    // No fake key, no lying ciphertext fields — in the request handling at all.
    expect(write).not.toContain('public_key')
    expect(write).not.toContain('encrypted_')
  })

  it('401 without a session', async () => {
    const res = await fetch(`${baseUrl}/api/recovery-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recovery_kit: 'KIT' }),
    })
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })
})
