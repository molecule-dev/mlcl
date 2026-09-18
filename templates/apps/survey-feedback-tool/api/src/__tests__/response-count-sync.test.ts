import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// surveys.response_count is incremented when a response is submitted. Deleting a response must
// keep it in sync — recount the survey's remaining responses — otherwise the stored count
// drifts upward as responses are removed.

const db = {
  count: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-resource-user', () => ({
  authorization: {
    verifyMiddleware: () => (_req: Request, _res: Response, next: () => void) => next(),
  },
}))
vi.mock('../lib/asyncHandler.js', () => ({ asyncHandler: (fn: unknown) => fn }))
const requireSurveyChildOwnership = vi.fn()
vi.mock('../lib/authz.js', () => ({
  requireSurveyChildOwnership: (...a: unknown[]) => requireSurveyChildOwnership(...a),
  requireSurveyOwnership: vi.fn(),
}))

import router from '../handlers/responses.js'

function deleteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.delete)
  if (!layer?.route) throw new Error('DELETE /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    locals: { session: { userId: 'user-1' } },
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    end() {
      return this
    },
  }
  return res
}
const surveyUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'surveys')?.[2] as
    { response_count?: number } | undefined

beforeEach(() => {
  vi.clearAllMocks()
  requireSurveyChildOwnership.mockResolvedValue({ ok: true, row: { survey_id: 's1' } })
  db.deleteById.mockResolvedValue({ data: {} })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('response delete recomputes surveys.response_count', () => {
  it('recounts the remaining responses after delete', async () => {
    db.count.mockResolvedValue(3)
    const res = makeRes()
    await deleteHandler()(
      { params: { id: 'r1' } } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('survey_responses', 'r1')
    expect(surveyUpdate()?.response_count).toBe(3)
  })
})
