import { beforeEach, describe, expect, it, vi } from 'vitest'

// A post scheduled for future publication (status='scheduled' + scheduled_at) had no promoter, so
// it never went live — every public read gates on status='published'. promoteDueScheduledPosts is
// the lazy promoter now called at the top of the post reads; it flips due scheduled posts to
// published, carrying the intended time into published_at.

// vi.hoisted so these mock targets exist before the hoisted vi.mock factories run.
const { db, log } = vi.hoisted(() => ({
  db: { findMany: vi.fn(), updateById: vi.fn() },
  log: { warn: vi.fn() },
}))
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-logger', () => ({ logger: log }))

import { promoteDueScheduledPosts } from '../handlers/_scheduled.js'

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
  db.updateById.mockResolvedValue({ data: {} })
})

describe('promoteDueScheduledPosts', () => {
  it('queries only scheduled posts whose scheduled_at is due (<= now)', async () => {
    await promoteDueScheduledPosts()
    expect(db.findMany).toHaveBeenCalledTimes(1)
    const [table, opts] = db.findMany.mock.calls[0] as [
      string,
      { where: Array<{ field: string; operator: string; value: unknown }> },
    ]
    expect(table).toBe('posts')
    const byField = Object.fromEntries(opts.where.map((w) => [w.field, w]))
    expect(byField.status).toMatchObject({ operator: '=', value: 'scheduled' })
    expect(byField.scheduled_at.operator).toBe('<=')
  })

  it('publishes each due post, carrying scheduled_at into published_at', async () => {
    db.findMany.mockResolvedValue([
      { id: 'p1', scheduled_at: '2020-01-01T00:00:00.000Z' },
      { id: 'p2', scheduled_at: '2020-02-01T00:00:00.000Z' },
    ])
    await promoteDueScheduledPosts()
    expect(db.updateById).toHaveBeenCalledTimes(2)
    expect(db.updateById).toHaveBeenCalledWith(
      'posts',
      'p1',
      expect.objectContaining({ status: 'published', published_at: '2020-01-01T00:00:00.000Z' }),
    )
    expect(db.updateById).toHaveBeenCalledWith(
      'posts',
      'p2',
      expect.objectContaining({ status: 'published', published_at: '2020-02-01T00:00:00.000Z' }),
    )
  })

  it('does nothing when no posts are due', async () => {
    await promoteDueScheduledPosts()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('is best-effort: a store failure is logged, never thrown into the read', async () => {
    db.findMany.mockRejectedValue(new Error('db down'))
    await expect(promoteDueScheduledPosts()).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})
