/**
 * Broken-access-control regression tests for the alerts handler.
 *
 * [TPL-1] POST /check must never read another tenant's readings:
 *   - a rule with meter_id=null is scoped to the caller's own meter ids
 *     (never findMany('readings', { where: [] }));
 *   - a rule whose meter_id is NOT owned by the caller is skipped;
 *   - PUT /rules/:id cannot repoint a rule at another user's meter (IDOR).
 */
import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const findById = vi.fn()
const updateById = vi.fn()
const create = vi.fn()

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId?: string }).userId ?? null,
  getParamId: (req: Request) => (req.params as { id?: string }).id ?? '',
}))

vi.mock('@molecule/api-database', () => ({
  findMany: (...args: unknown[]) => findMany(...args),
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  create: (...args: unknown[]) => create(...args),
  deleteById: vi.fn(),
  count: vi.fn(async () => 0),
}))

vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => undefined) }))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('../handlers/_seed.js', () => ({ maybeSeedDemoForUser: vi.fn(async () => undefined) }))

type Layer = {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: Array<{ handle: (req: Request, res: Response) => unknown }>
  }
}

async function getHandler(method: string, path: string) {
  const router = (await import('../handlers/alerts.js')).default as unknown as { stack: Layer[] }
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`no route ${method} ${path}`)
  const route = layer.route
  return route.stack[route.stack.length - 1].handle
}

function mockRes(userId: string | null) {
  const res: Partial<Response> & { statusCode: number; body?: unknown } = {
    locals: userId ? { userId } : {},
    statusCode: 200,
  }
  res.status = ((code: number) => {
    res.statusCode = code
    return res
  }) as Response['status']
  res.json = ((body: unknown) => {
    res.body = body
    return res
  }) as Response['json']
  res.end = (() => res) as unknown as Response['end']
  return res as Response & { statusCode: number; body?: unknown }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('alerts POST /check — cross-tenant readings (TPL-1)', () => {
  it('scopes a null-meter rule to the caller’s own meters, never an empty filter', async () => {
    // caller owns m1; rule has no meter_id ("all my meters")
    findMany.mockImplementation(async (table: string) => {
      if (table === 'alert_rules')
        return [{ id: 'r1', meter_id: null, type: 'high_usage', threshold: 1, comparison: 'above' }]
      if (table === 'meters') return [{ id: 'm1' }]
      if (table === 'readings') return [] // no readings -> rule skipped, fine
      return []
    })

    const handler = await getHandler('post', '/check')
    const res = mockRes('user-A')
    await handler({ params: {}, query: {}, body: {} } as unknown as Request, res)

    const readingsCalls = findMany.mock.calls.filter((c) => c[0] === 'readings')
    expect(readingsCalls.length).toBe(1)
    const where = (readingsCalls[0][1] as { where: Array<{ field: string; value: unknown }> }).where
    // Must be scoped to the caller's meter ids — NOT an empty (cross-tenant) filter.
    expect(where).not.toEqual([])
    expect(where).toEqual([{ field: 'meter_id', operator: 'in', value: ['m1'] }])
  })

  it('skips a null-meter rule entirely when the caller owns no meters', async () => {
    findMany.mockImplementation(async (table: string) => {
      if (table === 'alert_rules')
        return [{ id: 'r1', meter_id: null, type: 'high_usage', threshold: 1, comparison: 'above' }]
      if (table === 'meters') return []
      return []
    })

    const handler = await getHandler('post', '/check')
    const res = mockRes('user-A')
    await handler({ params: {}, query: {}, body: {} } as unknown as Request, res)

    expect(findMany.mock.calls.filter((c) => c[0] === 'readings').length).toBe(0)
    expect(res.body).toEqual({ alerts_created: 0, alerts: [] })
  })

  it('skips a rule whose meter_id is not owned by the caller', async () => {
    findMany.mockImplementation(async (table: string) => {
      if (table === 'alert_rules')
        return [
          { id: 'r1', meter_id: 'm-other', type: 'high_usage', threshold: 1, comparison: 'above' },
        ]
      if (table === 'meters') return [{ id: 'm1' }] // caller does NOT own m-other
      return []
    })

    const handler = await getHandler('post', '/check')
    const res = mockRes('user-A')
    await handler({ params: {}, query: {}, body: {} } as unknown as Request, res)

    expect(findMany.mock.calls.filter((c) => c[0] === 'readings').length).toBe(0)
  })
})

describe('alerts PUT /rules/:id — meter repoint IDOR (TPL-1 sibling)', () => {
  it('rejects repointing a rule at another user’s meter with 404', async () => {
    findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'alert_rules' && id === 'r1') return { id: 'r1', user_id: 'user-A' }
      if (table === 'meters' && id === 'm-other') return { id: 'm-other', user_id: 'user-B' }
      return null
    })

    const handler = await getHandler('put', '/rules/:id')
    const res = mockRes('user-A')
    await handler(
      { params: { id: 'r1' }, query: {}, body: { meter_id: 'm-other' } } as unknown as Request,
      res,
    )

    expect(res.statusCode).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('allows repointing a rule at a meter the caller owns', async () => {
    findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'alert_rules' && id === 'r1') return { id: 'r1', user_id: 'user-A' }
      if (table === 'meters' && id === 'm1') return { id: 'm1', user_id: 'user-A' }
      return null
    })
    updateById.mockResolvedValue({ data: { id: 'r1', meter_id: 'm1' } })

    const handler = await getHandler('put', '/rules/:id')
    const res = mockRes('user-A')
    await handler(
      { params: { id: 'r1' }, query: {}, body: { meter_id: 'm1' } } as unknown as Request,
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(updateById).toHaveBeenCalled()
  })
})
