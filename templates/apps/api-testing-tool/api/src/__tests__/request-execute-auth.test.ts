import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Proves the execute path actually applies the saved auth (not just that the
// helper works): safeFetch must be called with the Authorization header derived
// from auth_type + auth_config — previously it fired unauthenticated.

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

import router from '../handlers/requests.js'

function executeHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/execute' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/execute not found')
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
  db.create.mockResolvedValue({ data: { id: 'h1' } })
})

const savedRequest = (extra: Record<string, unknown>): Record<string, unknown> => ({
  id: 'r1',
  user_id: 'u1',
  method: 'GET',
  url: 'https://api.example.com/items',
  headers: '{}',
  query_params: '{}',
  ...extra,
})

describe('POST /:id/execute applies saved auth', () => {
  it('sends the bearer token as an Authorization header', async () => {
    db.findById.mockResolvedValue(
      savedRequest({ auth_type: 'bearer', auth_config: JSON.stringify({ token: 'secret-token' }) }),
    )
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(sentHeaders().Authorization).toBe('Bearer secret-token')
  })

  it('sends basic auth as base64', async () => {
    db.findById.mockResolvedValue(
      savedRequest({
        auth_type: 'basic',
        auth_config: JSON.stringify({ username: 'u', password: 'p' }),
      }),
    )
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(sentHeaders().Authorization).toBe('Basic dTpw')
  })

  it('fires without an Authorization header when auth_type is none', async () => {
    db.findById.mockResolvedValue(savedRequest({ auth_type: 'none', auth_config: '{}' }))
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(sentHeaders().Authorization).toBeUndefined()
  })
})
