import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: the S3 object key for an attachment must be minted SERVER-SIDE,
// never taken from the client. Persisting a client-chosen `s3_key` defeats the
// server-minted UUID key — a future download/preview route that streams
// getFile(<that key>) would let a user address another tenant's object
// (cross-tenant read IDOR). The handler must IGNORE a body `s3_key` and write a
// freshly minted UUID instead.

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'att-1' } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

// Authorization layer is mocked so the malicious body reaches the create() call:
// the calling user is authenticated and owns a writable article.
vi.mock('../lib/authz.js', () => ({
  requireUser: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  requireWritableArticle: vi.fn(async () => ({ id: 'article-1', space_id: 'space-1' })),
  requireReadableArticle: vi.fn(async () => ({ id: 'article-1', space_id: 'space-1' })),
  requireReadableAttachment: vi.fn(async () => null),
  internalError: (res: Response, error: unknown) => {
    res.status(500).json({ error: String(error) })
  },
  validationError: (res: Response, issues: unknown) => {
    res.status(400).json({ error: 'validation', issues })
  },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const attachments = (await import('../handlers/attachments.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/attachments', attachments)
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('attachments POST mints the storage key server-side', () => {
  it('ignores a client-supplied s3_key and writes a fresh server-minted UUID', async () => {
    const res = await fetch(`${baseUrl}/attachments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({
        article_id: '11111111-1111-4111-8111-111111111111',
        s3_key: '../other-tenants-secret-object', // malicious — must be ignored
        filename: 'report.pdf',
        size_bytes: 1024,
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.s3_key).not.toBe('../other-tenants-secret-object')
    expect(String(written.s3_key)).toMatch(UUID_RE)
    // Legitimate metadata still persisted; identity from session.
    expect(written.filename).toBe('report.pdf')
    expect(written.uploaded_by_user_id).toBe('user-1')
  })
})
