import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The user profile "Solutions" tile reads solutions_count from GET /users/by-username/:username.
// It was hardcoded 0 while the sibling stats (post_count/thread_count/followers_count) were counted
// live — so it could never reflect a user's accepted-answer posts (posts.is_solution = true).

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => null }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/aliases.js'

type WhereCond = { field: string }
function profileHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/users/by-username/:username' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /users/by-username/:username not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findOne.mockResolvedValue({ id: 'user-1', username: 'alice', name: 'Alice' })
  db.findMany.mockResolvedValue([]) // no recent topics → categoryMap short-circuits
  // Accepted-answer posts count returns 7; every other count returns 3.
  db.count.mockImplementation((table: string, where: WhereCond[]) =>
    Promise.resolve(
      table === 'posts' && Array.isArray(where) && where.some((w) => w.field === 'is_solution')
        ? 7
        : 3,
    ),
  )
})

describe('profile solutions_count', () => {
  it("counts the user's accepted-answer posts instead of returning 0", async () => {
    const res = makeRes()
    await profileHandler()({ params: { username: 'alice' } } as unknown as Request, res)
    const body = (res as unknown as { body: { data: { solutions_count: number } } }).body
    expect(body.data.solutions_count).toBe(7)
    // and it actually queried posts by is_solution
    expect(db.count).toHaveBeenCalledWith(
      'posts',
      expect.arrayContaining([{ field: 'is_solution', operator: '=', value: true }]),
    )
  })
})
