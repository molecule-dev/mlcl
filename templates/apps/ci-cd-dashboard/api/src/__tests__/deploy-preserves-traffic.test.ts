import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A successful deploy used to hardcode traffic_pct = 100, clobbering the environment's stored
// traffic split (e.g. a canary/preview env at 0-50%). The deploy must preserve the stored value
// unless the caller explicitly sets a new one.

const db = { create: vi.fn(), deleteById: vi.fn(), findById: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/environments.js'

function deployHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/deploy' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/deploy not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() }) as unknown as Response
const trafficWritten = () =>
  (db.updateById.mock.calls.find((c) => c[0] === 'environments')?.[2] as { traffic_pct?: number })
    ?.traffic_pct

const run = (envTraffic: number, body: Record<string, unknown>) => {
  db.findById.mockResolvedValue({
    id: 'e1',
    user_id: 'u1',
    traffic_pct: envTraffic,
    recent_deploys: '[]',
  })
  return deployHandler()({ params: { id: 'e1' }, body } as unknown as Request, makeRes())
}

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
})

describe('deploy preserves the stored traffic_pct', () => {
  it('keeps a canary env at 0% on a successful deploy (no reset to 100)', async () => {
    await run(0, { sha: 'abc123', status: 'success' })
    expect(trafficWritten()).toBe(0)
  })

  it('keeps a partial split (30%) on a successful deploy', async () => {
    await run(30, { sha: 'abc123', status: 'success' })
    expect(trafficWritten()).toBe(30)
  })

  it('honors an explicit traffic_pct in the deploy body', async () => {
    await run(0, { sha: 'abc123', status: 'success', traffic_pct: 25 })
    expect(trafficWritten()).toBe(25)
  })
})
