import { describe, expect, it, vi } from 'vitest'

// tiers.ts defines maxDocuments per plan and the Pricing page advertises it, but POST /documents
// never called enforceLimit — any tier could create unlimited documents. It's now enforced. This
// captures the enforceLimit config and asserts it caps the right entity with the right count.

interface LimitConfig {
  limitType: string
  getLimit: (l: { maxDocuments: number }) => number
  getCurrent: (userId: string) => Promise<number>
}
const configs: LimitConfig[] = []
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_r: unknown, _s: unknown, next: () => void) => next()
  },
}))

const dbCount = vi.fn(async (..._a: unknown[]) => 0)
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => dbCount(...a),
  create: vi.fn(),
  deleteById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('../lib/authz.js', () => ({
  internalError: vi.fn(),
  requireOwnedDocument: vi.fn(),
  requireReadableDocument: vi.fn(),
  requireRole: vi.fn(),
  requireUser: vi.fn(),
  safeBroadcast: vi.fn(),
  validationError: vi.fn(),
}))
vi.mock('./_seed.js', () => ({
  seedDemoForUser: vi.fn(),
  seedSystemTemplatesIfEmpty: vi.fn(),
}))

await import('../handlers/documents.js')

describe('document-collaboration enforces maxDocuments on create', () => {
  const cfg = configs.find((c) => c.limitType === 'maxDocuments')

  it('registers the maxDocuments enforcement', () => {
    expect(cfg).toBeDefined()
    expect(cfg?.getLimit({ maxDocuments: 5 })).toBe(5)
  })

  it('counts only active (non-trashed) documents the user owns', async () => {
    dbCount.mockClear()
    await cfg?.getCurrent('u1')
    expect(dbCount).toHaveBeenCalledWith('documents', [
      { field: 'owner_id', operator: '=', value: 'u1' },
      { field: 'trashed_at', operator: 'is_null' },
    ])
  })
})
