import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cancelling a command sets status 'canceled' but broadcast nothing, while the device-side
// ack/complete/fail all broadcast to commands:<id>:status. So the owner's live command view
// didn't reflect a cancel until refresh. Cancel must broadcast the status change too.

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
const broadcast = vi.fn()
vi.mock('@molecule/api-realtime', () => ({ broadcast: (...a: unknown[]) => broadcast(...a) }))
vi.mock('../middleware/device-token-auth.js', () => ({
  requireDeviceToken: (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/commands.js'

function cancelHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/cancel' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/cancel not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'device_commands') return { id, device_id: 'd1', status: 'pending' }
    if (table === 'iot_devices') return { id, owner_id: 'u1' }
    return null
  })
  db.updateById.mockResolvedValue({ data: { id: 'c1', status: 'canceled' } })
  broadcast.mockResolvedValue(undefined)
})

describe('command cancel broadcasts the status change', () => {
  it('broadcasts to commands:<deviceId>:status', async () => {
    await cancelHandler()({ params: { id: 'c1' } } as unknown as Request, makeRes())
    expect(broadcast).toHaveBeenCalledWith('commands:d1:status', 'status', {
      command: { id: 'c1', status: 'canceled' },
    })
  })
})
