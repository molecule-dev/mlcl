import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The incident lifecycle is a state machine: triggered -> acknowledged ->
// resolved, with reopen returning to triggered. Guards must reject invalid
// moves (409) instead of silently overwriting status, because the timeline
// (and the MTTR stat on /overview) assumes acked_at/resolved_at are only
// ever set by the matching transition. These tests pin the guards.

const db = {
  count: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  findById: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'i1',
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, next: () => void) => next(),
  validateQuery: () => (_r: Request, _s: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

import router from '../handlers/incidents.js'

type RouteHandler = (req: Request, res: Response) => Promise<void>

function handlerFor(method: 'post' | 'put', path: string): RouteHandler {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1]!.handle as RouteHandler
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
  }) as unknown as Response & { statusCode: number }
}

const run = async (fn: RouteHandler, body: Record<string, unknown>) => {
  const res = makeRes()
  await fn({ body, headers: {}, ip: '127.0.0.1' } as unknown as Request, res)
  return res
}

const incidentRow = (status: string) => ({
  id: 'i1',
  user_id: 'u1',
  title: 'Checkout API returning 503',
  description: '',
  severity: 'critical',
  status,
  service: 'checkout-api',
  assigned_member_id: null,
  escalation_policy_id: null,
  schedule_id: null,
  escalation_level: 0,
  triggered_at: new Date(Date.now() - 20 * 60_000).toISOString(),
  acked_at: null,
  resolved_at: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue(incidentRow('triggered'))
  db.findMany.mockResolvedValue([])
  db.updateById.mockResolvedValue({ data: incidentRow('acknowledged') })
  db.create.mockResolvedValue({ data: null })
})

describe('incident state machine guards', () => {
  it('acks a TRIGGERED incident: status + acked_at set, event + notification written', async () => {
    const res = await run(handlerFor('put', '/:id/ack'), { actor: 'Riley Carter' })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'incidents',
      'i1',
      expect.objectContaining({ status: 'acknowledged', acked_at: expect.any(Date) }),
    )
    // one ack event + one ack notification
    const kinds = db.create.mock.calls.map((c) => (c[1] as Record<string, unknown>).kind)
    expect(kinds).toContain('ack')
  })

  it('rejects ack of an ACKNOWLEDGED incident with 409 (no double-ack)', async () => {
    db.findById.mockResolvedValue(incidentRow('acknowledged'))
    const res = await run(handlerFor('put', '/:id/ack'), {})
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('resolves an ACKNOWLEDGED incident and writes the resolve event', async () => {
    db.findById.mockResolvedValue(incidentRow('acknowledged'))
    db.updateById.mockResolvedValue({ data: incidentRow('resolved') })
    const res = await run(handlerFor('put', '/:id/resolve'), {})
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'incidents',
      'i1',
      expect.objectContaining({ status: 'resolved', resolved_at: expect.any(Date) }),
    )
    const kinds = db.create.mock.calls.map((c) => (c[1] as Record<string, unknown>).kind)
    expect(kinds).toContain('resolve')
  })

  it('rejects resolve of an already RESOLVED incident with 409', async () => {
    db.findById.mockResolvedValue(incidentRow('resolved'))
    const res = await run(handlerFor('put', '/:id/resolve'), {})
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('reopens a RESOLVED incident back to triggered with cleared timestamps', async () => {
    db.findById.mockResolvedValue(incidentRow('resolved'))
    db.updateById.mockResolvedValue({ data: incidentRow('triggered') })
    const res = await run(handlerFor('put', '/:id/reopen'), {})
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'incidents',
      'i1',
      expect.objectContaining({
        status: 'triggered',
        acked_at: null,
        resolved_at: null,
        escalation_level: 0,
      }),
    )
  })

  it('rejects reopen of a non-resolved incident with 409', async () => {
    const res = await run(handlerFor('put', '/:id/reopen'), {})
    expect(res.statusCode).toBe(409)
  })
})

describe('trigger pages the on-call responder in-app', () => {
  it('creates a page notification + trigger event alongside the incident', async () => {
    db.findById.mockResolvedValue(null)
    db.create.mockImplementation(async (_table: string, row: Record<string, unknown>) => {
      if (row.status === 'triggered') return { data: incidentRow('triggered') }
      return { data: { id: 'e1' } }
    })
    const res = await run(handlerFor('post', '/'), {
      title: 'DB connection pool exhausted',
      service: 'cart-api',
      severity: 'critical',
    })
    expect(res.statusCode).toBe(201)
    const createdRows = db.create.mock.calls.map((c) => c[1] as Record<string, unknown>)
    const page = createdRows.find((r) => r.kind === 'page')
    expect(page, 'trigger must write a page notification').toBeDefined()
    expect(page!.severity).toBe('critical')
    expect(page!.read).toBe(false)
    const triggerEvent = createdRows.find((r) => r.kind === 'trigger')
    expect(triggerEvent, 'trigger must write a trigger timeline event').toBeDefined()
  })
})
