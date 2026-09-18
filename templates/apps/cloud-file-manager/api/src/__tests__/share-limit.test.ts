import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Files/folders enforce maxFiles/maxFolders, but share creation skipped enforceLimit — so free-tier
// users could create unlimited share links despite the advertised maxShares. POST /shares must
// register the maxShares limit (scoped to the caller's share count), matching files/folders.

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
  findOne: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-uploads', () => ({
  getProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
}))

// importing the router registers the enforceLimit configs
await import('../handlers/shares.js')

const shareLimit = () => configs.find((c) => c.limitType === 'maxShares')

beforeEach(() => vi.clearAllMocks())

describe('share creation enforces maxShares', () => {
  it('registers a maxShares limit reading limits.maxShares', () => {
    const cfg = shareLimit()
    expect(cfg).toBeDefined()
    expect(cfg!.getLimit({ maxShares: 5 })).toBe(5)
  })

  it('counts the caller-owned shares (file_shares by created_by) for the current usage', async () => {
    db.count.mockResolvedValue(4)
    const n = await shareLimit()!.getCurrent('u1')
    expect(n).toBe(4)
    expect(db.count).toHaveBeenCalledWith('file_shares', [
      { field: 'created_by', operator: '=', value: 'u1' },
    ])
  })
})
