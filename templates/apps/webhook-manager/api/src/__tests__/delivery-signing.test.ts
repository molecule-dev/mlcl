import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

// The delivery worker MUST sign each payload with HMAC-SHA256 in the
// X-Relay-Signature header (the UI promises "sign every payload with HMAC-SHA256"
// and tells receivers to "Verify the X-Relay-Signature header against this
// secret"). Capture what safeFetch is handed and assert the header.

const safeFetch = vi.fn(async (..._args: unknown[]) => ({
  ok: true,
  status: 200,
  text: async () => '',
}))
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: (...a: unknown[]) => safeFetch(...a) }))

const db = { findById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-queue', () => ({ send: vi.fn(), subscribe: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import { processDelivery } from '../handlers/_deliver.js'

type FetchOpts = { headers: Record<string, string>; body: string }

describe('webhook-manager delivery signing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.findMany.mockResolvedValue([])
    db.updateById.mockResolvedValue(undefined)
    safeFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })
  })

  it('signs the payload with HMAC-SHA256 in X-Relay-Signature + sets the delivery id', async () => {
    const secret = 'endpoint-secret-abc123'
    const requestBody = JSON.stringify({ event: 'thing.created', id: 42 })
    db.findById
      .mockResolvedValueOnce({
        id: 'd1',
        webhook_id: 'w1',
        status: 'queued',
        request_body: requestBody,
        event_id: 'e1',
      })
      .mockResolvedValueOnce({
        id: 'w1',
        url: 'https://example.com/hook',
        is_active: true,
        secret,
        content_type: 'application/json',
      })

    await processDelivery('d1')

    expect(safeFetch).toHaveBeenCalledTimes(1)
    const opts = (safeFetch.mock.calls[0] as unknown as [string, FetchOpts])[1]
    const expected = createHmac('sha256', secret).update(requestBody).digest('hex')
    expect(opts.headers['X-Relay-Signature']).toBe(expected)
    expect(opts.headers['X-Relay-Delivery-Id']).toBe('d1')
    expect(opts.body).toBe(requestBody)
  })

  it('omits the signature header when the endpoint has no secret', async () => {
    db.findById
      .mockResolvedValueOnce({
        id: 'd2',
        webhook_id: 'w2',
        status: 'queued',
        request_body: '{}',
        event_id: 'e2',
      })
      .mockResolvedValueOnce({
        id: 'w2',
        url: 'https://example.com/hook',
        is_active: true,
        secret: null,
        content_type: 'application/json',
      })

    await processDelivery('d2')

    const opts = (safeFetch.mock.calls[0] as unknown as [string, FetchOpts])[1]
    expect(opts.headers['X-Relay-Signature']).toBeUndefined()
    expect(opts.headers['X-Relay-Delivery-Id']).toBe('d2')
  })
})
