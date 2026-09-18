import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxImages was defined in tiers.ts and shown on Pricing as enforced, but enforceLimit was never
// called, so any tier could create unlimited images. Both create paths (POST /images and
// POST /images/:id/duplicate) now gate on maxImages, counting the images table by user_id.

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
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
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
  getParamId: () => 'id1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/images.js')

describe('photo-editor enforces maxImages on image create', () => {
  it('gates images create on maxImages (count images by user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxImages')
    expect(c, 'maxImages enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxImages: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('images', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
