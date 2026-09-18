import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A public/unlisted album is readable by non-owners, but a `private` photo inside it must stay
// owner-only. GET /albums/:id once did `SELECT * FROM photos WHERE album_id = $1` with no
// visibility gate, so every photo in a public album leaked to any viewer — including ones the
// owner had marked private. The read must apply the same owner-vs-viewer gate the other read
// paths use (favorites: `visibility != 'private' OR owner_id = viewer`).

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  query: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  query: (...a: unknown[]) => db.query(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const currentUserId = vi.fn<() => string | undefined>()
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId(),
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import router from '../handlers/albums.js'

const ALBUM_ID = '11111111-1111-1111-1111-111111111111'
const OWNER_ID = 'owner-1'

function getHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res
}

const run = (res: ReturnType<typeof makeRes>) =>
  getHandler()({ params: { id: ALBUM_ID } } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  // A public album owned by OWNER_ID — reachable by non-owners.
  db.findById.mockResolvedValue({
    id: ALBUM_ID,
    owner_id: OWNER_ID,
    visibility: 'public',
    photo_count: 5,
  })
  db.query.mockResolvedValue({ rows: [] })
})

describe('GET /albums/:id gates each photo by its own visibility', () => {
  it('filters photos by (visibility != private OR owner) and binds the viewer id', async () => {
    currentUserId.mockReturnValue('viewer-2')
    await run(makeRes())
    expect(db.query).toHaveBeenCalledTimes(1)
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/visibility != 'private'/)
    expect(sql).toMatch(/owner_id = \$2/)
    expect(params).toEqual([ALBUM_ID, 'viewer-2'])
  })

  it('passes the owner id so owners still see their own private photos', async () => {
    currentUserId.mockReturnValue(OWNER_ID)
    await run(makeRes())
    const [, params] = db.query.mock.calls[0] as [string, unknown[]]
    expect(params).toEqual([ALBUM_ID, OWNER_ID])
  })

  it('binds null (never undefined) for an unauthenticated viewer', async () => {
    currentUserId.mockReturnValue(undefined)
    await run(makeRes())
    const [, params] = db.query.mock.calls[0] as [string, unknown[]]
    expect(params).toEqual([ALBUM_ID, null])
  })

  it('recomputes photo_count from the visible set, not the stored total', async () => {
    currentUserId.mockReturnValue('viewer-2')
    db.query.mockResolvedValue({
      rows: [
        { id: 'p1', album_id: ALBUM_ID, tags: [] },
        { id: 'p2', album_id: ALBUM_ID, tags: [] },
      ],
    })
    const res = makeRes()
    await run(res)
    const body = res.body as { photo_count: number; photos: unknown[] }
    expect(body.photo_count).toBe(2)
    expect(body.photos).toHaveLength(2)
  })
})
