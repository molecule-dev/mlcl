import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The "4 variations" button posts { count: 4 }, but the handler ignored count — it made ONE
// variation and charged 1× credit. It must now produce `count` variations and reserve count× cost.

// The queries reserveCredit runs inside its withTransaction().
const conn = { query: vi.fn() }
const db = {
  withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  query: (...a: unknown[]) => conn.query(...a),
  withTransaction: (fn: () => Promise<unknown>) => db.withTransaction(fn),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const generate = vi.fn(async () => ({ images: [{ url: 'https://img/x.png' }] }))
vi.mock('@molecule/api-ai-image-generation', () => ({ getProvider: () => ({ generate }) }))
vi.mock('@molecule/api-ai', () => ({ getProvider: vi.fn(), getProviderByName: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/generations.js'

function variationsHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/variations' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/variations not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 201, body: undefined as unknown, status: vi.fn(), json: vi.fn() }
  res.status = vi.fn((c: number) => {
    res.statusCode = c
    return res
  }) as never
  res.json = vi.fn((b: unknown) => {
    res.body = b
    return res
  }) as never
  return res
}
const run = (count: number, res: ReturnType<typeof makeRes>) =>
  variationsHandler()(
    { params: { id: 'gen-1' }, body: { count } } as unknown as Request,
    res as unknown as Response,
  )

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({
    id: 'gen-1',
    user_id: 'u1',
    provider: 'openai',
    size: '1024x1024',
    style: 'natural',
    prompt: 'a cat',
    model: 'reverie-xl-v3',
  })
  db.create.mockResolvedValue({ data: { id: 'var-x', status: 'succeeded' } })
  db.updateById.mockResolvedValue({ data: {} })
  generate.mockResolvedValue({ images: [{ url: 'https://img/x.png' }] })
  // reserveCredit's transaction: advisory lock, SUM(balance high), INSERT RETURNING
  conn.query
    .mockResolvedValueOnce({ rows: [], rowCount: null })
    .mockResolvedValueOnce({ rows: [{ balance: 1000 }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 'led-1' }], rowCount: 1 })
})

describe('variations honor count', () => {
  it('creates `count` variations and reserves count× the per-image cost', async () => {
    const res = makeRes()
    await run(4, res)
    // one provider round-trip + one generations row per requested variation
    expect(generate).toHaveBeenCalledTimes(4)
    expect(db.create.mock.calls.filter((c) => c[0] === 'generations')).toHaveLength(4)
    // the credit reservation debits 4 × 10 = 40
    const insert = conn.query.mock.calls.find((c) => /INSERT INTO credit_ledger/.test(String(c[0])))
    expect((insert?.[1] as unknown[])?.[1]).toBe(-40)
    // response carries the batch
    expect((res.body as { variations: unknown[] }).variations).toHaveLength(4)
  })

  it('count=1 (upscale path) makes exactly one variation', async () => {
    const res = makeRes()
    await run(1, res)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(db.create.mock.calls.filter((c) => c[0] === 'generations')).toHaveLength(1)
  })
})
