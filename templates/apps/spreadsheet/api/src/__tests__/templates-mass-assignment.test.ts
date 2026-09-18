/**
 * Regression: a client must NOT be able to inject a row into the shared
 * system-template catalog by sending `is_system: true` on POST/PATCH
 * (mass-assignment). The handler must always persist `is_system: false`
 * for client-created/edited rows. System rows come only from the seed
 * migration / a server-controlled path.
 *
 * Before the fix (`is_system` in templateCreateSchema, written through):
 * the create call below received `is_system: true`. After the fix it is
 * always `false`.
 */
import type { Server } from 'node:http'

import express, { type Express } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// --- mock the molecule deps the handler imports at module load ---
const createMock = vi.fn(async () => ({
  data: { id: 'new-id', is_system: false },
  affected: 1,
}))
const updateByIdMock = vi.fn(async () => ({ data: { id: 'tpl-1' }, affected: 1 }))
const findOneMock = vi.fn(
  async () => ({ id: 'tpl-1', owner_id: 'user-1', is_system: false }) as unknown,
)

vi.mock('@molecule/api-database', () => ({
  create: createMock,
  updateById: updateByIdMock,
  findOne: findOneMock,
  findMany: vi.fn(async () => []),
  deleteById: vi.fn(async () => ({ data: null, affected: 1 })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _vars?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// requireUser reads res.locals.session.userId — provide a real-ish impl so
// the auth gate passes for our authenticated test user.
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: {
    locals?: { session?: { userId?: string } }
    status: (n: number) => { json: (b: unknown) => void }
  }) => {
    const id = res.locals?.session?.userId
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' })
      return null
    }
    return id
  },
}))

let app: Express
let server: Server
let baseUrl: string

beforeAll(async () => {
  const templatesRouter = (await import('../handlers/templates.js')).default
  app = express()
  app.use(express.json())
  // Simulate an authenticated session for user-1.
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'user-1' }
    next()
  })
  app.use('/api/templates', templatesRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(() => {
  server?.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('templates handler — is_system mass-assignment', () => {
  it('POST with is_system:true persists is_system=false', async () => {
    const res = await fetch(`${baseUrl}/api/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Evil official template', is_system: true }),
    })
    expect(res.status).toBe(201)
    expect(createMock).toHaveBeenCalledTimes(1)
    const [, row] = createMock.mock.calls[0] as unknown as [
      string,
      { is_system: boolean; owner_id: string },
    ]
    // The injected client flag must be ignored — never written as true.
    expect(row.is_system).toBe(false)
    // Legitimate ownership/data still flows through.
    expect(row.owner_id).toBe('user-1')
  })

  it('PATCH cannot set is_system (stripped by schema, never in update spread)', async () => {
    const res = await fetch(`${baseUrl}/api/templates/11111111-1111-4111-8111-111111111111`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', is_system: true }),
    })
    expect(res.status).toBe(200)
    expect(updateByIdMock).toHaveBeenCalledTimes(1)
    const [, , update] = updateByIdMock.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ]
    // is_system must not have flowed into the update spread.
    expect('is_system' in update).toBe(false)
    expect(update.name).toBe('Renamed')
  })
})
