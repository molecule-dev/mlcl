import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Files enforce maxFiles, but folder creation skipped enforceLimit — so free-tier users could
// create unlimited folders despite maxFolders. POST /folders must register the maxFolders limit
// (scoped to the owner's folder count), matching the files handler.

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
  deleteMany: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
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
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

// importing the router registers the enforceLimit configs
await import('../handlers/folders.js')

const folderLimit = () => configs.find((c) => c.limitType === 'maxFolders')

beforeEach(() => vi.clearAllMocks())

describe('folder creation enforces maxFolders', () => {
  it('registers a maxFolders limit reading limits.maxFolders', () => {
    const cfg = folderLimit()
    expect(cfg).toBeDefined()
    expect(cfg!.getLimit({ maxFolders: 5 })).toBe(5)
  })

  it('counts the caller-owned folders for the current usage', async () => {
    db.count.mockResolvedValue(3)
    const n = await folderLimit()!.getCurrent('u1')
    expect(n).toBe(3)
    expect(db.count).toHaveBeenCalledWith('folders', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })
})
