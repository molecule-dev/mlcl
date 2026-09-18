import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ticket check-in accepts an optional qr_payload (what the scanner read). It must be verified
// against the ticket's stored payload — a forged/mismatched QR carrying a valid ticket_id must
// not check in. No qr_payload = organizer manual check-in, still allowed.

const db = { findById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'org-1',
  getParamId: (req: Request, key: string) => (req.params as Record<string, string>)[key],
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/checkin.js'

function checkinHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/ticket/:ticket_id' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /ticket/:ticket_id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, status: vi.fn(), json: vi.fn() }
  res.status = vi.fn((c: number) => {
    res.statusCode = c
    return res
  }) as never
  res.json = vi.fn(() => res) as never
  return res
}
const run = (body: Record<string, unknown>, res: ReturnType<typeof makeRes>) =>
  checkinHandler()(
    { params: { ticket_id: 't1' }, body } as unknown as Request,
    res as unknown as Response,
  )

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation(async (table: string) => {
    if (table === 'tickets')
      return { id: 't1', event_id: 'e1', qr_payload: 'authentic-qr', status: 'issued' }
    if (table === 'events') return { id: 'e1', organizer_user_id: 'org-1', status: 'published' }
    return null
  })
  db.updateById.mockResolvedValue({ data: { id: 't1', status: 'checked_in' } })
})

describe('ticket check-in verifies the scanned QR', () => {
  it('checks in when the qr_payload matches', async () => {
    const res = makeRes()
    await run({ event_id: 'e1', qr_payload: 'authentic-qr' }, res)
    expect(db.updateById).toHaveBeenCalledWith(
      'tickets',
      't1',
      expect.objectContaining({ status: 'checked_in' }),
    )
  })

  it('rejects (409) a mismatched qr_payload without checking in', async () => {
    const res = makeRes()
    await run({ event_id: 'e1', qr_payload: 'forged-qr' }, res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('allows manual check-in with no qr_payload', async () => {
    const res = makeRes()
    await run({ event_id: 'e1' }, res)
    expect(db.updateById).toHaveBeenCalledWith(
      'tickets',
      't1',
      expect.objectContaining({ status: 'checked_in' }),
    )
  })
})
