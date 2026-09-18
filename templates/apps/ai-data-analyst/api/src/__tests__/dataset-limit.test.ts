import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// analysis.ts enforces maxAnalysis, but dataset creation (POST / and POST /from_upload) skipped
// enforceLimit — so free-tier users could store unlimited datasets despite maxDatasets (free=5).
// Both create paths must register the maxDatasets limit, scoped to the caller's dataset count.

type LimitConfig = {
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string) => Promise<number>
}
const { configs } = vi.hoisted(() => ({ configs: [] as LimitConfig[] }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_req: Request, _res: Response, next: () => void) => next()
  },
}))

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

await import('../handlers/datasets.js')

const datasetLimit = () => configs.find((c) => c.limitType === 'maxDatasets')

beforeEach(() => vi.clearAllMocks())

describe('dataset creation enforces maxDatasets', () => {
  it('registers a maxDatasets limit reading limits.maxDatasets', () => {
    const cfg = datasetLimit()
    expect(cfg).toBeDefined()
    expect(cfg!.getLimit({ maxDatasets: 5 })).toBe(5)
  })

  it('counts the caller-owned datasets for current usage', async () => {
    db.count.mockResolvedValue(4)
    const n = await datasetLimit()!.getCurrent('u1')
    expect(n).toBe(4)
    expect(db.count).toHaveBeenCalledWith('datasets', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
