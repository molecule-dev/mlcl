import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /exports advertised maxExports + canExport (Pricing) but enforced neither
// — only maxProjects was gated. It now enforces the maxExports count AND rejects
// when the plan's canExport flag is false (free tier), mirroring the maxProjects
// gate and the export-count cap other flagships use.

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'
const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(async (..._a: unknown[]) => ({ data: { id: 'ex1' } })),
  findById: vi.fn(async (..._a: unknown[]) => ({ id: PROJECT_ID, owner_id: 'u1' })),
  findMany: vi.fn(async (..._a: unknown[]) => []),
  updateById: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const getEffectiveTier = vi.fn(async (..._a: unknown[]) => ({
  limits: { canExport: true, maxExports: 5 },
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_r: Request, _s: Response, n: () => void) => n(),
  getEffectiveTier: (...a: unknown[]) => getEffectiveTier(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: { id?: string } }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

import router from '../handlers/exports.js'

function postHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = (): Response & { statusCode: number; body: unknown } => {
  const res = { statusCode: 201, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(b: unknown) {
      res.body = b
      return res
    },
  }) as unknown as Response & { statusCode: number; body: unknown }
}
const run = (canExport: boolean): Promise<Response & { statusCode: number; body: unknown }> => {
  getEffectiveTier.mockResolvedValue({ limits: { canExport, maxExports: 5 } })
  const res = makeRes()
  return postHandler()(
    { body: { projectId: PROJECT_ID, format: 'lottie' } } as unknown as Request,
    res,
  ).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('POST /exports gates on the canExport tier flag', () => {
  it('rejects with 402 and creates nothing when canExport is false (free tier)', async () => {
    const res = await run(false)
    expect(res.statusCode).toBe(402)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('proceeds past the gate (creates the export) when canExport is true', async () => {
    await run(true)
    expect(db.create.mock.calls.some((c) => c[0] === 'animation_exports')).toBe(true)
  })
})
