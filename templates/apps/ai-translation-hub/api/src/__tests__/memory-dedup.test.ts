import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The translation memory ranks /suggest results by used_count (then last_used_at), but neither
// was ever set — recording the same source produced a duplicate entry with used_count 0. The
// create handler now dedups on (user, source_lang, target_lang, source_text): a repeat bumps
// used_count + last_used_at instead of duplicating, making the ranking meaningful.

const db = {
  findOne: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/memory.js'

function createHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
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
const body = { source_lang: 'EN', target_lang: 'FR', source_text: 'Hello', target_text: 'Bonjour' }
const run = (res: ReturnType<typeof makeRes>) =>
  createHandler()({ body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'm-new' } })
  db.updateById.mockResolvedValue({ data: { id: 'm1' } })
})

describe('translation-memory create dedup + usage counter', () => {
  it('creates a fresh entry with a last_used_at timestamp (201)', async () => {
    db.findOne.mockResolvedValue(null)
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
    const created = db.create.mock.calls[0][1] as { used_count: number; last_used_at: unknown }
    expect(created.used_count).toBe(0)
    expect(created.last_used_at).toBeInstanceOf(Date)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('on a repeat source bumps used_count instead of duplicating (200)', async () => {
    db.findOne.mockResolvedValue({ id: 'm1', used_count: 2 })
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.create).not.toHaveBeenCalled()
    const patch = db.updateById.mock.calls[0][2] as { used_count: number; last_used_at: unknown }
    expect(patch.used_count).toBe(3)
    expect(patch.last_used_at).toBeInstanceOf(Date)
  })
})
