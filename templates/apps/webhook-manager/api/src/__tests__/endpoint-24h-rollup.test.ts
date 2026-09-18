import { beforeEach, describe, expect, it, vi } from 'vitest'

// The delivery worker maintained per-delivery rows but never the parent webhook's rolling 24h
// health stats (last_delivered_at / deliveries_24h / failures_24h / success_rate_24h / p95), so the
// Endpoints + Dashboard cards were frozen at their create-time defaults. A terminal delivery must
// recompute them from the 24h delivery history.

const db = { findById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-queue', () => ({ send: vi.fn(), subscribe: vi.fn() }))
vi.mock('../lib/safe-fetch.js', () => ({
  safeFetch: vi.fn().mockResolvedValue({ status: 200, ok: true, text: async () => '{}' }),
}))

import { processDelivery } from '../handlers/_deliver.js'

const webhookUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'webhooks')?.[2] as
    Record<string, unknown> | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'webhook_deliveries'
        ? {
            id: 'd1',
            webhook_id: 'w1',
            status: 'queued',
            retry_count: 0,
            request_body: '{}',
            event_id: 'e1',
          }
        : table === 'webhooks'
          ? {
              id: 'w1',
              is_active: true,
              url: 'https://example.com/hook',
              secret: 's',
              content_type: 'application/json',
              retry_count: 3,
            }
          : null,
    ),
  )
  // 3 deliveries in the 24h window: 2 success + 1 failed.
  db.findMany.mockResolvedValue([
    { status: 'success', duration_ms: 100, event_id: 'e1' },
    { status: 'failed', duration_ms: 200, event_id: 'e1' },
    { status: 'success', duration_ms: 150, event_id: 'e1' },
  ])
  db.updateById.mockResolvedValue({ data: {} })
})

describe('webhook 24h rollup on delivery', () => {
  it('recomputes deliveries/failures/success-rate/p95 and stamps last_delivered_at', async () => {
    await processDelivery('d1')
    const upd = webhookUpdate()
    expect(upd).toBeDefined()
    expect(upd?.deliveries_24h).toBe(3)
    expect(upd?.failures_24h).toBe(1)
    expect(upd?.success_rate_24h as number).toBeCloseTo(2 / 3) // stored as a fraction
    expect(upd?.p95_latency_ms).toBe(200)
    expect(upd?.last_delivered_at).toBeInstanceOf(Date)
    // scoped to this endpoint's deliveries within the window
    expect(db.findMany).toHaveBeenCalledWith(
      'webhook_deliveries',
      expect.objectContaining({
        where: expect.arrayContaining([{ field: 'webhook_id', operator: '=', value: 'w1' }]),
      }),
    )
  })
})
