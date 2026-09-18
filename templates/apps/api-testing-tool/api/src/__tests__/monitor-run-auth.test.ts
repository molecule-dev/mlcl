import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The monitor re-run (POST /monitors/:id/run) re-fires the bound request through
// safeFetch and, like the interactive execute path, must apply the request's
// saved auth — previously it fired unauthenticated.

const safeFetch = vi.fn()
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: (...a: unknown[]) => safeFetch(...a) }))

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/monitors.js'

function runHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/run' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/run not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = (): Response =>
  ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const sentHeaders = (): Record<string, string> =>
  (safeFetch.mock.calls[0]?.[1] as { headers?: Record<string, string> })?.headers ?? {}

beforeEach(() => {
  vi.clearAllMocks()
  safeFetch.mockResolvedValue({
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    text: async () => '{"ok":true}',
  })
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'h1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('POST /monitors/:id/run applies the bound request auth', () => {
  it("sends the bound request's bearer token as an Authorization header", async () => {
    db.findById.mockImplementation((table: string) => {
      if (table === 'monitors') return Promise.resolve({ id: 'm1', user_id: 'u1', test_id: 't1' })
      if (table === 'tests') return Promise.resolve({ id: 't1', user_id: 'u1', request_id: 'r1' })
      if (table === 'requests')
        return Promise.resolve({
          id: 'r1',
          user_id: 'u1',
          method: 'GET',
          url: 'https://api.example.com/x',
          headers: '{}',
          query_params: '{}',
          auth_type: 'bearer',
          auth_config: JSON.stringify({ token: 'mon-token' }),
        })
      return Promise.resolve(null)
    })
    await runHandler()({ params: { id: 'm1' } } as unknown as Request, makeRes())
    expect(safeFetch).toHaveBeenCalledTimes(1)
    expect(sentHeaders().Authorization).toBe('Bearer mon-token')
  })
})
