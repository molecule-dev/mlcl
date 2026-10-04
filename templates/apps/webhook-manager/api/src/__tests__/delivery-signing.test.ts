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
// The stored secret is AES-256-GCM ciphertext (webhooks.ts encrypts at rest);
// the worker decrypts at signing time. Fake scheme: `enc:v1:<base64url>`.
// Non-ciphertext values (legacy plaintext rows) REJECT, mirroring the real
// AES-GCM auth failure — that is what drives the worker's legacy fallback.
const decrypt = vi.fn(async (ciphertext: string) => {
  if (!ciphertext.startsWith('enc:v1:')) {
    throw new Error('not ciphertext')
  }
  return Buffer.from(ciphertext.slice('enc:v1:'.length), 'base64url').toString('utf8')
})
vi.mock('@molecule/api-encryption', () => ({
  decrypt: (...a: unknown[]) => decrypt(a[0] as string),
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

  it('decrypts an encrypted-at-rest secret before signing (same signature as the plaintext)', async () => {
    const secret = 'endpoint-secret-abc123'
    const ciphertext = `enc:v1:${Buffer.from(secret).toString('base64url')}`
    const requestBody = JSON.stringify({ event: 'thing.created', id: 7 })
    db.findById
      .mockResolvedValueOnce({
        id: 'd3',
        webhook_id: 'w3',
        status: 'queued',
        request_body: requestBody,
        event_id: 'e3',
      })
      .mockResolvedValueOnce({
        id: 'w3',
        url: 'https://example.com/hook',
        is_active: true,
        secret: ciphertext, // what the create/rotate handlers store now
        content_type: 'application/json',
      })

    await processDelivery('d3')

    const opts = (safeFetch.mock.calls[0] as unknown as [string, FetchOpts])[1]
    // The receiver verifies against the PLAINTEXT secret, so the signature must
    // be the HMAC of the decrypted value — never of the ciphertext.
    const expected = createHmac('sha256', secret).update(requestBody).digest('hex')
    expect(opts.headers['X-Relay-Signature']).toBe(expected)
    expect(opts.headers['X-Relay-Signature']).not.toBe(
      createHmac('sha256', ciphertext).update(requestBody).digest('hex'),
    )
  })

  it('falls back to signing with a legacy plaintext secret when decrypt fails', async () => {
    const secret = 'legacy-plaintext-secret'
    const requestBody = '{}'
    db.findById
      .mockResolvedValueOnce({
        id: 'd4',
        webhook_id: 'w4',
        status: 'queued',
        request_body: requestBody,
        event_id: 'e4',
      })
      .mockResolvedValueOnce({
        id: 'w4',
        url: 'https://example.com/hook',
        is_active: true,
        secret, // pre-encryption row — not ciphertext
        content_type: 'application/json',
      })
    decrypt.mockRejectedValueOnce(new Error('Encryption provider not configured'))

    await processDelivery('d4')

    const opts = (safeFetch.mock.calls[0] as unknown as [string, FetchOpts])[1]
    const expected = createHmac('sha256', secret).update(requestBody).digest('hex')
    expect(opts.headers['X-Relay-Signature']).toBe(expected)
  })
})
