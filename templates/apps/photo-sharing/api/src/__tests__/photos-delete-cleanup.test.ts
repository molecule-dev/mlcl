import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Deleting a photo must delete its backing S3 blob(s) too — otherwise every removed photo
// orphans up to 25 MB of storage forever. The stored URLs are `/api/photo-files/<key>` proxy
// refs, so the key is extracted from the URL; keys reused across sizes are deduped; external
// URLs are left untouched; and a storage failure must not fail the (already-committed) delete.

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
vi.mock('@molecule/api-uploads', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))

import { getProvider as getUploads } from '@molecule/api-uploads'

import router from '../handlers/photos.js'

const ID = '11111111-1111-1111-1111-111111111111'
const deleteFile = vi.fn()

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
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    end() {
      return this
    },
  }
  return res
}
const run = (photo: Record<string, unknown>, res: ReturnType<typeof makeRes>) => {
  db.findById.mockResolvedValue(photo)
  return deleteHandler()({ params: { id: ID } } as unknown as Request, res as unknown as Response)
}
const base = { id: ID, owner_id: 'user-1', album_id: null }

beforeEach(() => {
  vi.clearAllMocks()
  db.query.mockResolvedValue({ rows: [] })
  db.deleteById.mockResolvedValue({ data: {} })
  deleteFile.mockResolvedValue(undefined)
  vi.mocked(getUploads).mockReturnValue({ deleteFile } as unknown as ReturnType<typeof getUploads>)
})

describe('photo delete removes the backing blob(s)', () => {
  it('deletes each distinct storage key', async () => {
    const res = makeRes()
    await run(
      {
        ...base,
        original_url: '/api/photo-files/key-a',
        large_url: '/api/photo-files/key-b',
        thumbnail_url: '/api/photo-files/key-c',
      },
      res,
    )
    expect(res.statusCode).toBe(204)
    const keys = deleteFile.mock.calls.map((c) => c[0]).sort()
    expect(keys).toEqual(['key-a', 'key-b', 'key-c'])
  })

  it('dedupes a key reused across sizes (one delete)', async () => {
    const res = makeRes()
    await run(
      {
        ...base,
        original_url: '/api/photo-files/key-a',
        large_url: '/api/photo-files/key-a',
        thumbnail_url: '/api/photo-files/key-a',
      },
      res,
    )
    expect(deleteFile).toHaveBeenCalledTimes(1)
    expect(deleteFile).toHaveBeenCalledWith('key-a')
  })

  it('leaves an external (non-proxied) URL untouched', async () => {
    const res = makeRes()
    await run(
      {
        ...base,
        original_url: 'https://cdn.example.com/photo.jpg',
        large_url: 'https://cdn.example.com/photo.jpg',
        thumbnail_url: 'https://cdn.example.com/photo.jpg',
      },
      res,
    )
    expect(res.statusCode).toBe(204)
    expect(deleteFile).not.toHaveBeenCalled()
  })

  it('still 204s (and deletes the row) when blob cleanup throws', async () => {
    deleteFile.mockRejectedValue(new Error('s3 down'))
    const res = makeRes()
    await run(
      {
        ...base,
        original_url: '/api/photo-files/key-a',
        large_url: '/api/photo-files/key-a',
        thumbnail_url: '/api/photo-files/key-a',
      },
      res,
    )
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('photos', ID)
  })
})
