import { beforeEach, describe, expect, it, vi } from 'vitest'

// Staff mutations must write a real audit_events row (the Settings feed reads
// this table). The row carries the actor, table/record, action and the full
// before/after snapshot. Auditing is best-effort — a create() failure must
// not throw out of recordAudit.

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(() => 'actor-1'),
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
  uuidParamSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('./_seed.js', () => ({ ensureSeeded: vi.fn(async () => undefined) }))

import { recordAudit } from '../handlers/staff.js'

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: {} })
})

describe('shift-scheduling roster audit trail', () => {
  it('writes an audit_events row with actor, action and before/after', async () => {
    const before = { id: 'staff-1', role: 'Barista' }
    const after = { id: 'staff-1', role: 'Shift Lead' }
    await recordAudit('actor-1', 'staff-1', 'updated', before, after)

    const call = (db.create.mock.calls as unknown[][]).find((c) => c[0] === 'audit_events')
    expect(call).toBeDefined()
    expect(call?.[1]).toMatchObject({
      user_id: 'actor-1',
      actor_id: 'actor-1',
      table_name: 'staff',
      record_id: 'staff-1',
      action: 'updated',
      before,
      after,
    })
  })

  it('is best-effort — a create failure does not throw', async () => {
    db.create.mockRejectedValue(new Error('db down'))
    await expect(
      recordAudit('actor-1', 'staff-1', 'deleted', { id: 'staff-1' }, null),
    ).resolves.toBeUndefined()
  })
})
