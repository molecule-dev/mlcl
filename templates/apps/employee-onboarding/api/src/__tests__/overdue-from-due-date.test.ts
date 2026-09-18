import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// GET /onboardings/me counted only tasks whose status was literally 'overdue' — a sentinel nothing
// ever writes — so the Overdue stat was always 0 despite past-due tasks. It must derive overdue from
// the stored due_date: a task whose due date has passed and isn't complete is overdue.

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../seedDefaultOnboarding.js', () => ({
  seedDefaultOnboardingIfMissing: vi.fn().mockResolvedValue({ id: 'ob1' }),
}))

import router from '../handlers/onboardings.js'

function meHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/me' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /me not found')
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
})

describe('overdue is derived from due_date', () => {
  it('counts past-due, not-complete tasks as overdue (ignoring complete + future + no-due)', async () => {
    db.findMany.mockImplementation((table: string) =>
      Promise.resolve(
        table === 'onboarding_tasks'
          ? [
              { status: 'pending', due_date: '2020-01-01' }, // overdue
              { status: 'in_progress', due_date: '2020-06-01' }, // overdue
              { status: 'complete', due_date: '2019-01-01' }, // complete → not overdue
              { status: 'pending', due_date: '2099-01-01' }, // future → not overdue
              { status: 'pending', due_date: null }, // no due date → not overdue
            ]
          : [],
      ),
    )
    const res = makeRes()
    await meHandler()({ params: {} } as unknown as Request, res)
    const body = (res as unknown as { body: { counts: { overdueTasks: number } } }).body
    expect(body.counts.overdueTasks).toBe(2)
  })

  it('still honors an explicit overdue status', async () => {
    db.findMany.mockImplementation((table: string) =>
      Promise.resolve(
        table === 'onboarding_tasks'
          ? [
              { status: 'overdue', due_date: null },
              { status: 'pending', due_date: null },
            ]
          : [],
      ),
    )
    const res = makeRes()
    await meHandler()({ params: {} } as unknown as Request, res)
    const body = (res as unknown as { body: { counts: { overdueTasks: number } } }).body
    expect(body.counts.overdueTasks).toBe(1)
  })
})
