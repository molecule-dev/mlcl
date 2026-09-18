import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a property's photo storage key must never be taken from the client
// — neither directly (`photo_s3_key`) nor via the `photo_url` alias. Persisting a
// client-chosen key defeats server-minted keys: a future photo download/preview
// route streaming getFile(<that key>) would let one owner address another
// owner's object (cross-tenant read IDOR). The handler must IGNORE both body
// fields (the schema strips them; normalizeBody drops them as defense in depth).

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'prop-1' } }))
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'prop-1' } }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
const count = vi.fn(async (..._a: unknown[]) => 0)

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: vi.fn(async () => ({ data: { ok: true } })),
  findById: vi.fn(async (_t: string, id: string) => ({ id, user_id: 'owner-1' })),
  findMany: (...a: unknown[]) => findMany(...a),
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

// Real validateBody so the zod schema (no longer declaring photo_s3_key/photo_url)
// strips the malicious fields before the handler runs.
vi.unmock('@molecule/api-middleware-validation')

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const properties = (await import('../handlers/properties.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/properties', properties)
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

describe('properties POST ignores client-supplied photo storage keys', () => {
  it('never persists photo_s3_key or photo_url from the body', async () => {
    const res = await fetch(`${baseUrl}/properties`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({
        name: 'Maple Court',
        photo_s3_key: '../another-owners-photo.jpg', // malicious — must be ignored
        photo_url: '../yet-another-owners-photo.jpg', // malicious alias — must be ignored
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.photo_s3_key).not.toBe('../another-owners-photo.jpg')
    expect(written.photo_s3_key).not.toBe('../yet-another-owners-photo.jpg')
    expect(written).not.toHaveProperty('photo_url')
    // Legitimate fields + server-set identity still persisted.
    expect(written.name).toBe('Maple Court')
    expect(written.user_id).toBe('owner-1')
  })
})
