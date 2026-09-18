import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Denormalized-count integrity: creating a comment increments videos.comment_count, so
// deleting one must decrement it — otherwise the displayed comment count drifts upward as
// comments are removed. Math.max(0, …) prevents the count from ever going negative.

const db = { findById: vi.fn(), updateById: vi.fn(), deleteById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/comments.js'

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
    ended: false,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res
}
const run = (video: Record<string, unknown>, res: ReturnType<typeof makeRes>) => {
  db.findById.mockImplementation(async (table: string) =>
    table === 'comments' ? { userId: 'user-1', resourceType: 'video', resourceId: 'v1' } : video,
  )
  return deleteHandler()({ params: { id: 'c1' } } as unknown as Request, res as unknown as Response)
}
const videoUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'videos')?.[2] as
    { comment_count?: number } | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.deleteById.mockResolvedValue({ data: {} })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('comment delete keeps videos.comment_count in sync', () => {
  it('decrements the video comment_count on delete', async () => {
    const res = makeRes()
    await run({ id: 'v1', comment_count: 5 }, res)
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('comments', 'c1')
    expect(videoUpdate()?.comment_count).toBe(4)
  })

  it('never drives the count below zero', async () => {
    const res = makeRes()
    await run({ id: 'v1', comment_count: 0 }, res)
    expect(videoUpdate()?.comment_count).toBe(0)
  })
})
