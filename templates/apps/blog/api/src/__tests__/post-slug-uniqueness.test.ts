import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Two posts with the same title must not collide on one slug: GET /by-slug/:slug (limit 1)
// can only reach one of them, so the other would be unreachable by its own URL. The create
// handler generates a UNIQUE slug, appending -2/-3/… when the base slug is taken.

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'author-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-image', () => ({ convert: vi.fn(), resize: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))

import router from '../handlers/posts.js'

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
const run = (res: ReturnType<typeof makeRes>) =>
  createHandler()(
    { body: { title: 'Hello World', content: 'Hi' } } as unknown as Request,
    res as unknown as Response,
  )
const createdSlug = () => (db.create.mock.calls[0]?.[1] as { slug?: string })?.slug

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'new', status: 'draft' } })
})

describe('post slug uniqueness', () => {
  it('uses the base slug when it is free', async () => {
    db.findMany.mockResolvedValue([]) // no existing post owns the slug
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(createdSlug()).toBe('hello-world')
  })

  it('appends a numeric suffix when the base slug is taken', async () => {
    // 'hello-world' is taken; 'hello-world-2' is free.
    db.findMany.mockResolvedValueOnce([{ id: 'other' }]).mockResolvedValueOnce([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(createdSlug()).toBe('hello-world-2')
  })

  it('walks past multiple collisions (-2 taken → -3)', async () => {
    db.findMany
      .mockResolvedValueOnce([{ id: 'a' }]) // hello-world taken
      .mockResolvedValueOnce([{ id: 'b' }]) // hello-world-2 taken
      .mockResolvedValueOnce([]) // hello-world-3 free
    const res = makeRes()
    await run(res)
    expect(createdSlug()).toBe('hello-world-3')
  })
})
