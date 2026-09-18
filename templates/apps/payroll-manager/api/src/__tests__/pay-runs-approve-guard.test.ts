import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a PROCESSED pay run must not be re-approvable. POST /:id/process pays
// employees (creates pay_stubs) and requires status 'approved'. If /approve could flip a
// 'processed' run back to 'approved', a second /process would run — duplicate pay stubs
// and a DOUBLE PAYMENT. These lock the approve guard + its paired process guard.

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-audit', () => ({ log: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'x' }) }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
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
vi.mock('../handlers/_seed.js', () => ({ computeStub: vi.fn(), seedDemoForUser: vi.fn() }))

import router from '../handlers/pay-runs.js'

function handlerFor(path: string): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found`)
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
const req = { params: { id: 'pr-1' } } as unknown as Request

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
})

describe('payroll approve — no re-approving a processed pay run (double-pay guard)', () => {
  it('409s an attempt to approve a PROCESSED pay run and writes nothing', async () => {
    db.findById.mockResolvedValue({ id: 'pr-1', user_id: 'user-1', status: 'processed' })
    const res = makeRes()
    await handlerFor('/:id/approve')(req, res as unknown as Response)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('approves a draft pay run', async () => {
    db.findById.mockResolvedValue({ id: 'pr-1', user_id: 'user-1', status: 'draft' })
    const res = makeRes()
    await handlerFor('/:id/approve')(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'pay_runs',
      'pr-1',
      expect.objectContaining({ status: 'approved' }),
    )
  })

  it('is idempotent for an already-approved run (no re-write)', async () => {
    db.findById.mockResolvedValue({ id: 'pr-1', user_id: 'user-1', status: 'approved' })
    const res = makeRes()
    await handlerFor('/:id/approve')(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('paired guard: /process refuses a run that is not approved (no pay_stubs)', async () => {
    db.findById.mockResolvedValue({ id: 'pr-1', user_id: 'user-1', status: 'processed' })
    const res = makeRes()
    await handlerFor('/:id/process')(req, res as unknown as Response)
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })
})
