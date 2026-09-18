import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for TPL-1 (IDOR): POST /:id/lines/:lineId/pick must verify
// the targeted pick_line belongs to BOTH the parent list and the caller before
// mutating it — not just that the caller owns the parent list. Before the fix
// the handler called updateById('pick_lines', lineId, ...) with an unvalidated
// URL-supplied lineId, letting a user write to another tenant's pick_line by
// nesting it under a list they own.

const findById = vi.fn()
const updateById = vi.fn()
const create = vi.fn()
const findMany = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  create: (...args: unknown[]) => create(...args),
  findMany: (...args: unknown[]) => findMany(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
  getParamId: (req: Request, name = 'id') => (req.params as Record<string, string>)[name],
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type RouteLayer = {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: { handle: (req: Request, res: Response) => Promise<void> | void }[]
  }
}

function makeRes(userId: string | null) {
  const res = {
    locals: { userId },
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

async function callPick(
  router: { stack: RouteLayer[] },
  params: Record<string, string>,
  body: unknown,
  userId: string | null,
) {
  const layer = router.stack.find(
    (l) => l.route?.path === '/:id/lines/:lineId/pick' && l.route.methods.post,
  )
  if (!layer?.route) throw new Error('pick route not found')
  const req = { params, body } as unknown as Request
  const res = makeRes(userId)
  await layer.route.stack[0].handle(req, res)
  return res
}

describe('picks: POST /:id/lines/:lineId/pick child-ownership (TPL-1 IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects with 404 when the pick_line belongs to another user (cross-tenant write)', async () => {
    const router = (await import('../handlers/picks.js')).default as unknown as {
      stack: RouteLayer[]
    }

    // Caller owns the parent list...
    findById.mockImplementation((table: string) => {
      if (table === 'pick_lists') return Promise.resolve({ id: 'list-1', user_id: 'attacker' })
      // ...but the targeted line belongs to a different user (and a different list).
      if (table === 'pick_lines')
        return Promise.resolve({
          id: 'line-victim',
          pick_list_id: 'list-victim',
          user_id: 'victim',
        })
      return Promise.resolve(null)
    })

    const res = await callPick(
      router,
      { id: 'list-1', lineId: 'line-victim' },
      { quantity_picked: 5 },
      'attacker',
    )

    expect(res.statusCode).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('rejects with 404 when the line exists under the right owner but a different list', async () => {
    const router = (await import('../handlers/picks.js')).default as unknown as {
      stack: RouteLayer[]
    }

    findById.mockImplementation((table: string) => {
      if (table === 'pick_lists') return Promise.resolve({ id: 'list-1', user_id: 'me' })
      if (table === 'pick_lines')
        return Promise.resolve({ id: 'line-x', pick_list_id: 'other-list', user_id: 'me' })
      return Promise.resolve(null)
    })

    const res = await callPick(
      router,
      { id: 'list-1', lineId: 'line-x' },
      { quantity_picked: 2 },
      'me',
    )

    expect(res.statusCode).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('allows the legitimate owner to pick a line in their own list', async () => {
    const router = (await import('../handlers/picks.js')).default as unknown as {
      stack: RouteLayer[]
    }

    findById.mockImplementation((table: string) => {
      if (table === 'pick_lists') return Promise.resolve({ id: 'list-1', user_id: 'me' })
      if (table === 'pick_lines')
        return Promise.resolve({ id: 'line-1', pick_list_id: 'list-1', user_id: 'me' })
      return Promise.resolve(null)
    })
    updateById.mockResolvedValue({ data: { id: 'line-1', quantity_picked: 7 } })

    const res = await callPick(
      router,
      { id: 'list-1', lineId: 'line-1' },
      { quantity_picked: 7 },
      'me',
    )

    expect(res.statusCode).toBe(200)
    expect(updateById).toHaveBeenCalledWith(
      'pick_lines',
      'line-1',
      expect.objectContaining({ quantity_picked: 7 }),
    )
  })
})
