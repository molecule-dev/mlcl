/**
 * POST /appointments created the appointment UNCONDITIONALLY and only afterwards ran a
 * best-effort `UPDATE availability_slots SET is_booked = true … WHERE is_booked = false`.
 * So two patients who both loaded the same open slot both booked it — the 2nd UPDATE just
 * matched 0 rows — despite the in-code comment promising it "can't be double-booked". The
 * handler now claims the slot atomically BEFORE creating and rejects (409) when the slot for
 * that (provider, time) exists but is already taken; a booking that matches no slot is allowed.
 */
import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async () => ({ data: { id: 'appt-1' } })),
  findById: vi.fn(async () => ({ user_id: 'prov-user-1' })),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(async () => ({ data: {} })),
  query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../handlers/_lib/decorate.js', () => ({
  decorateAppointments: vi.fn(async (rows: unknown[]) => rows),
}))
vi.mock('../handlers/_seed.js', () => ({ seedForUser: vi.fn(async () => undefined) }))

import { create, query } from '@molecule/api-database'

import appointmentsRouter from '../handlers/appointments.js'

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function postHandler(): (req: Request, res: Response) => Promise<unknown> {
  const stack = (appointmentsRouter as unknown as { stack: RouteLayer[] }).stack
  for (const layer of stack) {
    if (layer.route && layer.route.path === '/' && layer.route.methods.post) {
      return layer.route.stack[layer.route.stack.length - 1].handle as (
        req: Request,
        res: Response,
      ) => Promise<unknown>
    }
  }
  throw new Error('POST / not found')
}
function mockRes() {
  const res = {
    locals: { session: { userId: 'patient-1' } },
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res
}
type QResult = { rows: unknown[]; rowCount: number }
function dispatchQuery(update: QResult, select: QResult) {
  vi.mocked(query).mockImplementation((async (text: string) => {
    if (String(text).startsWith('UPDATE')) return update
    if (String(text).startsWith('SELECT')) return select
    return { rows: [], rowCount: 0 }
  }) as never)
}
const run = () => {
  const res = mockRes()
  const req = {
    body: { provider_id: 'prov-1', scheduled_at: '2026-08-01T15:00:00Z', type: 'video' },
    params: {},
    query: {},
  } as unknown as Request
  return postHandler()(req, res as unknown as Response).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(create).mockResolvedValue({ data: { id: 'appt-1' } } as never)
})

describe('appointment booking claims the slot atomically (no double-book)', () => {
  it('books when the slot is open (flips it, then creates, 201)', async () => {
    dispatchQuery({ rows: [{ id: 'slot-1' }], rowCount: 1 }, { rows: [], rowCount: 0 })
    const res = await run()
    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledWith(
      'appointments',
      expect.objectContaining({ provider_id: 'prov-1' }),
    )
    // The claiming UPDATE ran before create, scoped to the requested provider + time.
    const update = vi.mocked(query).mock.calls.find((c) => String(c[0]).startsWith('UPDATE'))
    expect(update?.[1]).toEqual(['prov-1', '2026-08-01T15:00:00Z'])
  })

  it('rejects when the slot exists but is already booked (409, no appointment created)', async () => {
    dispatchQuery({ rows: [], rowCount: 0 }, { rows: [{ id: 'slot-1' }], rowCount: 1 })
    const res = await run()
    expect(res.statusCode).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })

  it('still allows a booking whose time matches no slot at all (201)', async () => {
    dispatchQuery({ rows: [], rowCount: 0 }, { rows: [], rowCount: 0 })
    const res = await run()
    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalled()
  })
})
