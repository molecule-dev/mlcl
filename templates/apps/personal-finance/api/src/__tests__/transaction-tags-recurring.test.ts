import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// transactions.tags and .recurring are real columns set on the Add Transaction form, but the create
// (and update) zod schema omitted them, so validateBody stripped them and every user transaction
// saved with empty tags / recurring=false. The handler must accept and persist them.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(async (..._a: unknown[]) => 0),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/transactions.js'

function createHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const txCreate = () =>
  db.create.mock.calls.find((c) => c[0] === 'transactions')?.[1] as
    Record<string, unknown> | undefined
const run = (body: Record<string, unknown>) => {
  db.create.mockResolvedValue({ data: { id: 't1' } })
  return createHandler()({ body } as unknown as Request, makeRes())
}
const base = { account_id: 'a1', amount: 50, type: 'expense', description: 'Groceries' }

beforeEach(() => vi.clearAllMocks())

describe('transaction create persists tags + recurring', () => {
  it('stores the tags and recurring flag the user set', async () => {
    await run({ ...base, tags: ['food', 'weekly'], recurring: true })
    expect(txCreate()).toMatchObject({ tags: ['food', 'weekly'], recurring: true })
  })

  it('defaults to empty tags and non-recurring when omitted', async () => {
    await run({ ...base })
    expect(txCreate()).toMatchObject({ tags: [], recurring: false })
  })
})
