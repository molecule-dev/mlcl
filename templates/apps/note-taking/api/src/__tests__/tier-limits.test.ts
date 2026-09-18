import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// The tier limits were defined in tiers.ts and shown on Pricing as enforced, but enforceLimit was
// never called anywhere, so any tier could create unlimited workspaces/pages/databases/templates.
// Each create route now gates on its limit. Owner columns differ: workspaces.owner_id vs
// pages/databases/templates.created_by. Templates count only the user's own (is_system=false) — shared
// system templates are not owned. (maxBlocks is transitive via page->workspace->owner, so not enforced.)

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
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('../lib/authz.js', () => ({
  requireUser: () => 'u1',
  internalError: vi.fn(),
  validationError: vi.fn(),
  requireWorkspace: vi.fn(),
  requirePage: vi.fn(),
  requireDatabase: vi.fn(),
  requireDatabaseRow: vi.fn(),
  requireReadableTemplate: vi.fn(),
  requireWritableTemplate: vi.fn(),
}))

// Importing each router registers its enforceLimit config.
await import('../handlers/workspaces.js')
await import('../handlers/pages.js')
await import('../handlers/databases.js')
await import('../handlers/templates.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('note-taking tier limits are enforced on create', () => {
  const cases: Array<{
    limitType: string
    limitKey: string
    table: string
    where: Array<{ field: string; operator: string; value: unknown }>
  }> = [
    {
      limitType: 'maxWorkspaces',
      limitKey: 'maxWorkspaces',
      table: 'workspaces',
      where: [{ field: 'owner_id', operator: '=', value: 'u1' }],
    },
    {
      limitType: 'maxPages',
      limitKey: 'maxPages',
      table: 'pages',
      where: [{ field: 'created_by', operator: '=', value: 'u1' }],
    },
    {
      limitType: 'maxDatabases',
      limitKey: 'maxDatabases',
      table: 'note_databases',
      where: [{ field: 'created_by', operator: '=', value: 'u1' }],
    },
    {
      limitType: 'maxTemplates',
      limitKey: 'maxTemplates',
      table: 'page_templates',
      where: [
        { field: 'created_by', operator: '=', value: 'u1' },
        { field: 'is_system', operator: '=', value: false },
      ],
    },
  ]

  for (const { limitType, limitKey, table, where } of cases) {
    it(`gates ${table} create on ${limitType}`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitKey]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, where)
    })
  }
})
