import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxPipelines was defined in tiers.ts + advertised in Pricing/CATALOG as enforced, but enforceLimit
// was never called (only in the server test mock), so any tier could create unlimited pipelines.
// POST /pipelines now gates on maxPipelines, counting the pipelines table by user_id. (maxBuilds +
// maxArtifacts are intentionally NOT enforced: builds accumulate per trigger and artifacts per build,
// so a total-count cap would break CI after a few runs — only pipelines is a bounded per-user entity.)

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
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  query: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'id1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/pipelines.js')

describe('ci-cd-dashboard enforces maxPipelines on pipeline create', () => {
  it('gates pipelines create on maxPipelines (count pipelines by user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxPipelines')
    expect(c, 'maxPipelines enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxPipelines: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('pipelines', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
