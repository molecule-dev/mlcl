import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a vet-record's attachment storage key must never be taken from the
// client. Persisting a client-chosen `attachment_s3_key` defeats server-minted
// keys — a future download/preview route streaming getFile(<that key>) would let
// one owner address another owner's object (cross-tenant read IDOR). The handler
// must IGNORE a body `attachment_s3_key` (the schema strips it; the create call
// never writes a client value).

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'rec-1' } }))
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'rec-1' } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
// findById('pets', petId) → pet owned by the caller (ownsPet passes).
const findById = vi.fn(async (table: string, id: string) =>
  table === 'pets' ? { id, owner_user_id: 'owner-1' } : { id, pet_id: 'pet-1' },
)

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

// Use the REAL validateBody so we prove the zod schema (which no longer declares
// attachment_s3_key) strips the malicious field before it reaches the handler.
vi.unmock('@molecule/api-middleware-validation')

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const vetRecords = (await import('../handlers/vet-records.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/vet-records', vetRecords)
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

describe('vet-records POST ignores a client-supplied attachment_s3_key', () => {
  it('never persists a client storage key (stored null, not the client value)', async () => {
    const res = await fetch(`${baseUrl}/vet-records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({
        pet_id: 'pet-1',
        title: 'Annual checkup',
        attachment_s3_key: '../another-owners-record.pdf', // malicious — must be ignored
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.attachment_s3_key).not.toBe('../another-owners-record.pdf')
    expect(written.attachment_s3_key).toBeNull()
    // Legitimate fields still persisted.
    expect(written.title).toBe('Annual checkup')
    expect(written.pet_id).toBe('pet-1')
  })
})
