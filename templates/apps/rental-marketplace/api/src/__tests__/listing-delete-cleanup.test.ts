import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Deleting a listing must also clean up its photo storage. Each image is a `/api/uploads/<id>`
// proxy URL backed by an `uploads` row holding the real S3 `file_id`; deleting the listing row
// alone orphans BOTH the uploads rows and the S3 blobs. Cleanup is best-effort (non-fatal) and
// skips external/non-proxied URLs.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-geolocation', () => ({ geocode: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  index: vi.fn(),
  search: vi.fn(),
}))
const deleteFile = vi.fn()
vi.mock('@molecule/api-uploads', () => ({ getProvider: () => ({ deleteFile }) }))
vi.mock('../handlers/_decorate.js', () => ({
  decorateListing: (x: unknown) => x,
  decorateListings: (x: unknown) => x,
  parseJsonArray: (raw: unknown) =>
    Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? JSON.parse(raw) : [],
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn().mockResolvedValue(undefined) }))

import router from '../handlers/listings.js'

function deleteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.delete)
  if (!layer?.route) throw new Error('DELETE /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    locals: { session: { userId: 'host-1' } },
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    send() {
      return this
    },
  }
  return res
}
// listing L1 owned by host-1; `images` is a JSON string of proxy URLs.
function seed(images: string[], uploads: Record<string, { file_id: string }>) {
  db.findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'listings') return { id: 'L1', host_id: 'host-1', images: JSON.stringify(images) }
    if (table === 'uploads') return uploads[id] ?? null
    return null
  })
}
const run = (res: ReturnType<typeof makeRes>) =>
  deleteHandler()({ params: { id: 'L1' } } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.deleteById.mockResolvedValue({ data: {} })
  deleteFile.mockResolvedValue(undefined)
})

describe('listing delete cleans up photo storage', () => {
  it('deletes the blob and uploads row for each proxied image', async () => {
    seed(['/api/uploads/u1', '/api/uploads/u2'], { u1: { file_id: 'k1' }, u2: { file_id: 'k2' } })
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(204)
    expect(deleteFile.mock.calls.map((c) => c[0]).sort()).toEqual(['k1', 'k2'])
    expect(db.deleteById).toHaveBeenCalledWith('uploads', 'u1')
    expect(db.deleteById).toHaveBeenCalledWith('uploads', 'u2')
    expect(db.deleteById).toHaveBeenCalledWith('listings', 'L1')
  })

  it('skips external (non-proxied) image URLs', async () => {
    seed(['https://cdn.example.com/a.jpg'], {})
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(204)
    expect(deleteFile).not.toHaveBeenCalled()
    // no uploads row lookups for a non-proxied URL
    expect(db.findById).not.toHaveBeenCalledWith('uploads', expect.anything())
  })

  it('still 204s when blob cleanup throws (row already deleted)', async () => {
    deleteFile.mockRejectedValue(new Error('s3 down'))
    seed(['/api/uploads/u1'], { u1: { file_id: 'k1' } })
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('listings', 'L1')
  })
})
