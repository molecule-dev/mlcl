import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a document's S3 object key must never be taken from the client.
// Persisting a client-chosen `s3_key` defeats server-minted keys — a future
// document download/preview route streaming getFile(<that key>) would let one
// user address another user's object (cross-tenant read IDOR). The handler must
// IGNORE a body `s3_key` (the schema strips it; the create call never writes a
// client value).

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'doc-1' } }))
const count = vi.fn(async (..._a: unknown[]) => 0)

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  updateById: vi.fn(async () => ({ data: { id: 'doc-1' } })),
  deleteById: vi.fn(async () => ({ data: { ok: true } })),
  findById: vi.fn(async (_t: string, id: string) => ({ id, user_id: 'user-1' })),
  findMany: vi.fn(async () => [] as unknown[]),
  count: (...a: unknown[]) => count(...a),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

// No chunking work for a doc with no body_md, but stub the lib so import resolves.
vi.mock('../lib/chunking.js', () => ({
  chunkText: vi.fn(() => []),
  indexDocumentChunks: vi.fn(async () => {}),
  deleteChunksForDocument: vi.fn(async () => {}),
}))

// Real validateBody so the zod schema (no longer declaring s3_key) strips the
// malicious field before the handler runs.
vi.unmock('@molecule/api-middleware-validation')

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const documents = (await import('../handlers/documents.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/documents', documents)
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

describe('documents POST ignores a client-supplied s3_key', () => {
  it('never persists a client storage key (stored null, not the client value)', async () => {
    const res = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({
        title: 'Quarterly report',
        s3_key: '../another-users-document', // malicious — must be ignored
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.s3_key).not.toBe('../another-users-document')
    expect(written.s3_key).toBeNull()
    // Legitimate fields + server-set identity still persisted.
    expect(written.title).toBe('Quarterly report')
    expect(written.user_id).toBe('user-1')
  })
})
