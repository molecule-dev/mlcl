import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /library/history used a plain create, inserting a duplicate row per re-watch AND resetting
// position_sec to 0 on every page-load ping — so the saved resume position was never preserved. It
// now upserts the (user, video) row and only overwrites position_sec when the caller supplies one.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
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

import router from '../handlers/library.js'

function postHistory(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/history' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /history not found')
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
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res
}
const run = async (existing: Array<{ id: string }>, body: Record<string, unknown>) => {
  db.findById.mockResolvedValue({})
  db.findMany.mockResolvedValue(existing)
  db.create.mockResolvedValue({ data: { id: 'h-new' } })
  db.updateById.mockResolvedValue({ data: { id: 'h1' } })
  const res = makeRes()
  await postHistory()({ body } as unknown as Request, res as unknown as Response)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('POST /library/history upserts and preserves the resume position', () => {
  it('creates a new row when none exists', async () => {
    const res = await run([], { video_id: 'v1', position_sec: 42 })
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('updates the existing row (not a duplicate insert) and writes position when supplied', async () => {
    const res = await run([{ id: 'h1' }], { video_id: 'v1', position_sec: 90 })
    expect(res.statusCode).toBe(200)
    expect(db.create).not.toHaveBeenCalled()
    expect(db.updateById).toHaveBeenCalledWith(
      'watch_history',
      'h1',
      expect.objectContaining({ position_sec: 90 }),
    )
  })

  it('does NOT overwrite position_sec on the position-less page-load ping', async () => {
    await run([{ id: 'h1' }], { video_id: 'v1' })
    expect(db.updateById).toHaveBeenCalledTimes(1)
    const update = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect('position_sec' in update).toBe(false)
    expect('watched_at' in update).toBe(true)
  })
})
