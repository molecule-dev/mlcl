import { beforeEach, describe, expect, it, vi } from 'vitest'

// An issue scheduled for future delivery (status='scheduled' + scheduled_at) had no promoter, so
// it never reached subscribers — every public read gates on status='published'. promoteDueScheduledIssues is
// the lazy promoter now called at the top of the issue reads; it flips due scheduled issues to
// published (carrying the intended time into publish_at) and delivers them (sends fan-out).

// vi.hoisted so these mock targets exist before the hoisted vi.mock factories run.
const { db, log } = vi.hoisted(() => ({
  db: { findMany: vi.fn(), updateById: vi.fn() },
  log: { warn: vi.fn() },
}))
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: vi.fn(async () => null),
  create: vi.fn(async () => ({ data: {} })),
  count: vi.fn(async () => 0),
}))
vi.mock('@molecule/api-logger', () => ({ logger: log }))

import { promoteDueScheduledIssues } from '../handlers/_scheduled.js'

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
  db.updateById.mockResolvedValue({ data: {} })
})

describe('promoteDueScheduledIssues', () => {
  it('queries only scheduled issues whose scheduled_at is due (<= now)', async () => {
    await promoteDueScheduledIssues()
    expect(db.findMany).toHaveBeenCalledTimes(1)
    const [table, opts] = db.findMany.mock.calls[0] as [
      string,
      { where: Array<{ field: string; operator: string; value: unknown }> },
    ]
    expect(table).toBe('issues')
    const byField = Object.fromEntries(opts.where.map((w) => [w.field, w]))
    expect(byField.status).toMatchObject({ operator: '=', value: 'scheduled' })
    expect(byField.scheduled_at.operator).toBe('<=')
  })

  it('publishes each due issue, carrying scheduled_at into publish_at, and delivers', async () => {
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'issues')
        return [
          { id: 'i1', scheduled_at: '2020-01-01T00:00:00.000Z' },
          { id: 'i2', scheduled_at: '2020-02-01T00:00:00.000Z' },
        ]
      // deliverIssueToSubscribers reads the issue back via findById (mocked
      // null → no-op delivery) and subscribers via findMany.
      return []
    })
    await promoteDueScheduledIssues()
    expect(db.updateById).toHaveBeenCalledTimes(2)
    expect(db.updateById).toHaveBeenCalledWith(
      'issues',
      'i1',
      expect.objectContaining({ status: 'published', publish_at: '2020-01-01T00:00:00.000Z' }),
    )
    expect(db.updateById).toHaveBeenCalledWith(
      'issues',
      'i2',
      expect.objectContaining({ status: 'published', publish_at: '2020-02-01T00:00:00.000Z' }),
    )
  })

  it('does nothing when no issues are due', async () => {
    db.findMany.mockResolvedValue([])
    await promoteDueScheduledIssues()
    expect(db.updateById).not.toHaveBeenCalled()
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('swallows database failures (a promoter failure must not break the read)', async () => {
    db.findMany.mockRejectedValue(new Error('db down'))
    await promoteDueScheduledIssues()
    expect(log.warn).toHaveBeenCalledTimes(1)
  })
})
