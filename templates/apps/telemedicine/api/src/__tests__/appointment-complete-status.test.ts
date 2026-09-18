/**
 * POST /appointments/:id/complete force-flipped ANY appointment to 'completed' — it never checked
 * the stored status, so a cancelled / already-completed / no-show visit could be completed
 * (surfacing a cancelled visit as completed in patient history). It now rejects (409) unless the
 * appointment is live (scheduled / in_progress).
 */
import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  query: (...a: unknown[]) => db.query(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? '',
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

import appointmentsRouter from '../handlers/appointments.js'

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function completeHandler(): (req: Request, res: Response) => Promise<unknown> {
  const stack = (appointmentsRouter as unknown as { stack: RouteLayer[] }).stack
  for (const layer of stack) {
    if (layer.route && layer.route.path === '/:id/complete' && layer.route.methods.post) {
      return layer.route.stack[layer.route.stack.length - 1].handle as (
        req: Request,
        res: Response,
      ) => Promise<unknown>
    }
  }
  throw new Error('POST /:id/complete not found')
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
const run = (status: string) => {
  db.findById.mockResolvedValue({ id: 'appt-1', patient_user_id: 'patient-1', status })
  db.updateById.mockResolvedValue({ data: { id: 'appt-1' } })
  const res = mockRes()
  const req = { body: {}, params: { id: 'appt-1' }, query: {} } as unknown as Request
  return completeHandler()(req, res as unknown as Response).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('appointment complete honors the stored status', () => {
  it('completes a live (scheduled) appointment', async () => {
    const res = await run('scheduled')
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'appointments',
      'appt-1',
      expect.objectContaining({ status: 'completed' }),
    )
  })

  it('completes an in-progress appointment', async () => {
    const res = await run('in_progress')
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalled()
  })

  it('409s and does not complete a cancelled appointment', async () => {
    const res = await run('cancelled')
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('409s an already-completed appointment', async () => {
    const res = await run('completed')
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })
})
