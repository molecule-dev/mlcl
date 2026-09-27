import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [M-4]: the public RSVP endpoints are consumed WITHOUT
// authentication, so an unknown code must answer a flat 404 — no oracle, no
// crash — and the wedding lookup runs on the (now 10-char, CSPRNG) code
// exactly as typed.

const findOne = vi.fn(async (..._a: unknown[]) => null as Record<string, unknown> | null)
const findMany = vi.fn(async (..._a: unknown[]) => [])
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'w-1' } }))

vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => findOne(...(a as [string, unknown])),
  findMany: (...a: unknown[]) => findMany(...a),
  updateById: (...a: unknown[]) => updateById(...a),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const rsvp = (await import('../handlers/rsvp.js')).default

  const app = express()
  app.use(express.json())
  app.use('/api/public/rsvp', rsvp)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
  findOne.mockResolvedValue(null)
})

describe('[M-4] public RSVP endpoints refuse unknown codes with a flat 404', () => {
  it('GET /api/public/rsvp/:badcode → 404', async () => {
    const res = await fetch(`${baseUrl}/api/public/rsvp/WEDD1NG202`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBeTruthy()
    // The 404 must not leak which codes exist — findOne simply found nothing.
    expect(findOne).toHaveBeenCalledTimes(1)
  })

  it('POST /:badcode/lookup → 404 without probing the guest list', async () => {
    const res = await fetch(`${baseUrl}/api/public/rsvp/NOPE5NOPE5/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Whitfield' }),
    })
    expect(res.status).toBe(404)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('a real code reaches the wedding lookup verbatim', async () => {
    findOne.mockResolvedValueOnce({
      id: 'w-1',
      partner_a_name: 'A',
      partner_b_name: 'B',
      wedding_date: '2027-06-01',
      venue: 'Somewhere',
      plus_ones_allowed: false,
    })
    const res = await fetch(`${baseUrl}/api/public/rsvp/QK3M8WRPT7`)
    expect(res.status).toBe(200)
    expect(findOne).toHaveBeenCalledWith('weddings', [
      { field: 'rsvp_code', operator: '=', value: 'QK3M8WRPT7' },
    ])
  })
})
