import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The live reservations board is fed by broadcasts. Create + status-change already broadcast, but
// editing details (PUT /:id) and cancelling (DELETE /:id) did not — so the board showed stale
// details and ghost reservations. Both must broadcast to the 'reservations' channel too.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
const broadcast = vi.fn()
vi.mock('@molecule/api-realtime', () => ({ broadcast: (...a: unknown[]) => broadcast(...a) }))

import router from '../handlers/reservations.js'

function routeHandler(method: 'put' | 'delete'): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} /:id not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ json: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn() }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'r1', user_id: 'u1', table_id: null })
  db.updateById.mockResolvedValue({ data: { id: 'r1' } })
  db.deleteById.mockResolvedValue({ data: {} })
})

describe('reservation edit/delete broadcasts to the live board', () => {
  it('broadcasts reservation_updated on edit', async () => {
    await routeHandler('put')(
      { params: { id: 'r1' }, body: { party_size: 4 } } as unknown as Request,
      makeRes(),
    )
    expect(broadcast).toHaveBeenCalledWith('reservations', 'reservation_updated', { id: 'r1' })
  })

  it('broadcasts reservation_deleted on cancel', async () => {
    await routeHandler('delete')({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(broadcast).toHaveBeenCalledWith('reservations', 'reservation_deleted', { id: 'r1' })
  })
})
