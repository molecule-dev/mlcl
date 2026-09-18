import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// forum_categories.slug has a UNIQUE index. With naive slug generation, two category names
// that slugify identically ("Web Dev" and "web-dev") would make the second create fail with a
// raw 500 on the constraint. The create handler now generates a UNIQUE slug, appending -2/-3/…

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/categories.js'

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
    locals: { session: { userId: 'admin-1', role: 'admin' } },
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
const run = (res: ReturnType<typeof makeRes>) =>
  createHandler()({ body: { name: 'Web Dev' } } as unknown as Request, res as unknown as Response)
const createdSlug = () => (db.create.mock.calls[0]?.[1] as { slug?: string })?.slug

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ role: 'admin' }) // requireOwner users lookup
  db.create.mockResolvedValue({ data: { id: 'c1' } })
})

describe('forum category slug uniqueness', () => {
  it('uses the base slug when free', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(createdSlug()).toBe('web-dev')
  })

  it('appends a suffix when the base slug is taken (avoids the UNIQUE-index 500)', async () => {
    db.findMany.mockResolvedValueOnce([{ id: 'other' }]).mockResolvedValueOnce([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(createdSlug()).toBe('web-dev-2')
  })
})
