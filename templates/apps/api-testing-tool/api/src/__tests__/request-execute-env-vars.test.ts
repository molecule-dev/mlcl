import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Proves the execute path substitutes the active environment's {{VAR}} into the outgoing URL, header
// values, and body (not just that the helper works): safeFetch must be called with resolved values.

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
// decrypt is identity here — the stored `variables` blob is passed through as plaintext JSON.
vi.mock('@molecule/api-encryption', () => ({ decrypt: async (v: string) => v }))
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

const withActiveEnv = (): void => {
  db.findMany.mockResolvedValue([
    {
      is_active: true,
      variables: JSON.stringify([
        { key: 'HOST', value: 'api.example.com', enabled: true },
        { key: 'TOKEN', value: 'secret123' },
      ]),
    },
  ])
}

beforeEach(() => {
  vi.clearAllMocks()
  safeFetch.mockResolvedValue({
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    text: async () => '{"ok":true}',
  })
  db.create.mockResolvedValue({ data: { id: 'h1' } })
})

describe('POST /:id/execute substitutes active-environment variables', () => {
  it('resolves {{VAR}} in the URL and header values before firing', async () => {
    withActiveEnv()
    db.findById.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      method: 'GET',
      url: 'https://{{HOST}}/items',
      headers: JSON.stringify({ Authorization: 'Bearer {{TOKEN}}' }),
      query_params: '{}',
    })
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(safeFetch).toHaveBeenCalledTimes(1)
    expect(safeFetch.mock.calls[0][0]).toBe('https://api.example.com/items')
    const opts = safeFetch.mock.calls[0][1] as { headers: Record<string, string> }
    expect(opts.headers.Authorization).toBe('Bearer secret123')
  })

  it('resolves {{VAR}} in the request body', async () => {
    withActiveEnv()
    db.findById.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      method: 'POST',
      url: 'https://api.example.com/x',
      headers: '{}',
      query_params: '{}',
      body_content: '{"token":"{{TOKEN}}"}',
    })
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    const opts = safeFetch.mock.calls[0][1] as { body?: string }
    expect(opts.body).toBe('{"token":"secret123"}')
  })

  it('leaves {{VAR}} literal when there is no active environment', async () => {
    db.findMany.mockResolvedValue([])
    db.findById.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      method: 'GET',
      url: 'https://{{HOST}}/items',
      headers: '{}',
      query_params: '{}',
    })
    await executeHandler()({ params: { id: 'r1' } } as unknown as Request, makeRes())
    expect(safeFetch.mock.calls[0][0]).toBe('https://{{HOST}}/items')
  })
})
