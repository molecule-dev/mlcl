import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The single-point ingest broadcasts each point to telemetry:<id>, and the handler doc promises
// the same for /batch — but batch ingest created rows without broadcasting, so a device sending
// batched telemetry never appeared in the live view. Batch must broadcast every point too.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
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

import router from '../handlers/telemetry.js'

function batchHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/batch' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /batch not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({
    locals: { deviceAuth: { deviceId: 'd1' } },
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockImplementation(async (_t: string, row: Record<string, unknown>) => ({ data: row }))
  db.findById.mockResolvedValue(null) // skip device-status sync
  broadcast.mockResolvedValue(undefined)
})

describe('telemetry batch ingest broadcasts every point', () => {
  it('broadcasts one point event per ingested reading', async () => {
    const req = {
      body: {
        points: [
          { metric: 'temp', value: 20 },
          { metric: 'hum', value: 50 },
        ],
      },
    } as unknown as Request
    await batchHandler()(req, makeRes())
    const events = broadcast.mock.calls.filter((c) => c[0] === 'telemetry:d1' && c[1] === 'point')
    expect(events).toHaveLength(2)
    expect((events[0][2] as { point: { metric: string } }).point.metric).toBe('temp')
  })
})
