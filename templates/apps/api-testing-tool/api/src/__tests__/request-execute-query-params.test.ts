import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Proves the execute path actually applies the saved query_params to the outgoing URL (not just
// that the helper works): safeFetch must be called with the merged URL.

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
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  safeFetch.mockResolvedValue({
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    text: async () => '{"ok":true}',
  })
  db.create.mockResolvedValue({ data: { id: 'h1' } })
})

describe('POST /:id/execute applies saved query_params', () => {
  it('fires the request at the URL with query_params merged in', async () => {
    db.findById.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      method: 'GET',
      url: 'https://api.example.com/items',
      headers: '{}',
      query_params: JSON.stringify({ page: '2', limit: '10' }),
    })
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(safeFetch).toHaveBeenCalledTimes(1)
    const calledUrl = new URL(safeFetch.mock.calls[0][0] as string)
    expect(calledUrl.searchParams.get('page')).toBe('2')
    expect(calledUrl.searchParams.get('limit')).toBe('10')
  })

  it('leaves the URL untouched when there are no query_params', async () => {
    db.findById.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      method: 'GET',
      url: 'https://api.example.com/items',
      headers: '{}',
      query_params: '{}',
    })
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(safeFetch.mock.calls[0][0]).toBe('https://api.example.com/items')
  })
})
