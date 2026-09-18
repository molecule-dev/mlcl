import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxDrafts / maxFolders / maxLabels are defined in tiers.ts and advertised on Pricing (CATALOG
// claims them gated), but POST /drafts, POST /folders, and POST /labels never called enforceLimit,
// so any tier could create unlimited. Each create route now gates on its limit. Drafts live in the
// shared `emails` table, so maxDrafts counts only rows with folder='drafts'.

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
  deleteMany: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

// Importing each router registers its enforceLimit config.
await import('../handlers/drafts.js')
await import('../handlers/folders.js')
await import('../handlers/labels.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('email-client tier limits are enforced on create', () => {
  it('gates draft create on maxDrafts (count emails in the drafts folder)', async () => {
    const c = cfg('maxDrafts')
    expect(c).toBeDefined()
    expect(c?.getLimit({ maxDrafts: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('emails', [
      { field: 'user_id', operator: '=', value: 'u1' },
      { field: 'folder', operator: '=', value: 'drafts' },
    ])
  })

  const simple: Array<{ limitType: string; table: string }> = [
    { limitType: 'maxFolders', table: 'email_folders' },
    { limitType: 'maxLabels', table: 'email_labels' },
  ]
  for (const { limitType, table } of simple) {
    it(`gates ${table} create on ${limitType} (count ${table} by user_id)`, async () => {
      const c = cfg(limitType)
      expect(c).toBeDefined()
      expect(c?.getLimit({ [limitType]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'user_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
