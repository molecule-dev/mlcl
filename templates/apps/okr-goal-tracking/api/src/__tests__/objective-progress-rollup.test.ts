import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Objective progress + KR health must reflect check-ins. The check-in wrote through only the KR's
// current_value/progress: it dropped the submitted `status` (so an at-risk pick reverted) and never
// rolled the change up to objectives.progress (so the objective ring stayed frozen at 0).

const db = { findOne: vi.fn(), findMany: vi.fn(), updateById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => db.findOne(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: Response) =>
    (res.locals?.session as { userId?: string } | undefined)?.userId ?? null,
  validationError: (res: Response, issues: unknown) => res.status(400).json({ issues }),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { recomputeObjectiveProgress } from '../handlers/_progress.js'
import checkInsRouter from '../handlers/check-ins.js'

const KR_UUID = '11111111-1111-4111-8111-111111111111'
function postHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    checkInsRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    locals: { session: { userId: 'u1' } },
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
  return res as unknown as Response
}
const kr = (over: Record<string, unknown> = {}) => ({
  id: 'kr-1',
  owner_id: 'u1',
  objective_id: 'obj-1',
  metric_type: 'number',
  start_value: 0,
  target_value: 100,
  current_value: 0,
  ...over,
})
const krUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'key_results')?.[2] as
    Record<string, unknown> | undefined
const objUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'objectives') as
    [string, string, Record<string, unknown>] | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
  db.create.mockResolvedValue({ data: { id: 'ci-1' } })
})

describe('recomputeObjectiveProgress', () => {
  it('averages the key results and persists to the objective', async () => {
    db.findMany.mockResolvedValue([{ progress: 40 }, { progress: 60 }, { progress: 20 }])
    await recomputeObjectiveProgress('obj-1')
    const call = db.updateById.mock.calls.find((c) => c[0] === 'objectives')
    expect(call?.[1]).toBe('obj-1')
    expect((call?.[2] as { progress: number }).progress).toBe(40)
  })

  it('rolls up to 0 when the objective has no key results', async () => {
    db.findMany.mockResolvedValue([])
    await recomputeObjectiveProgress('obj-1')
    expect((db.updateById.mock.calls[0]?.[2] as { progress: number }).progress).toBe(0)
  })
})

describe('check-in write-through', () => {
  it('propagates the submitted status and rolls up objective progress', async () => {
    db.findOne.mockResolvedValue(kr())
    db.findMany.mockResolvedValue([{ progress: 50 }]) // post-update KR set
    const req = {
      body: { key_result_id: KR_UUID, value: 50, status: 'at_risk' },
    } as unknown as Request
    await postHandler()(req, makeRes())
    expect(krUpdate()).toMatchObject({ progress: 50, status: 'at_risk' })
    expect(objUpdate()?.[1]).toBe('obj-1')
    expect(objUpdate()?.[2].progress).toBe(50)
  })

  it('marks the KR completed at 100% even if a lower status was submitted', async () => {
    db.findOne.mockResolvedValue(kr())
    db.findMany.mockResolvedValue([{ progress: 100 }])
    const req = {
      body: { key_result_id: KR_UUID, value: 100, status: 'at_risk' },
    } as unknown as Request
    await postHandler()(req, makeRes())
    expect(krUpdate()).toMatchObject({ progress: 100, status: 'completed' })
  })

  it('leaves KR status untouched when the check-in omits it and progress < 100', async () => {
    db.findOne.mockResolvedValue(kr())
    db.findMany.mockResolvedValue([{ progress: 30 }])
    const req = { body: { key_result_id: KR_UUID, value: 30 } } as unknown as Request
    await postHandler()(req, makeRes())
    expect(krUpdate()).not.toHaveProperty('status')
  })
})
