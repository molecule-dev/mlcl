import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a client-supplied `s3_key` in the document create body must be
// IGNORED — the server mints its own owner-scoped object-storage key. A
// client-chosen key would let a caller address another tenant's object via any
// future download/preview route (cross-tenant IDOR).

const create = vi.fn()
const findById = vi.fn()
const findMany = vi.fn()
const updateById = vi.fn()
const deleteById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => create(...args),
  findById: (...args: unknown[]) => findById(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  deleteById: (...args: unknown[]) => deleteById(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
  getParamId: (req: Request, _name?: string) => String((req.params as { id?: string }).id ?? ''),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

vi.mock('../handlers/_seed.js', () => ({
  seedDemoForUser: vi.fn(),
}))

type RouteLayer = {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: { handle: (req: Request, res: Response) => Promise<void> | void }[]
  }
}

function makeRes(userId: string | null) {
  const res = {
    locals: { userId },
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

async function callCreate(router: { stack: RouteLayer[] }, userId: string, body: unknown) {
  const layer = router.stack.find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / route not found')
  const req = { params: {}, body, query: {} } as unknown as Request
  const res = makeRes(userId)
  await layer.route.stack[layer.route.stack.length - 1].handle(req, res)
  return res
}

describe('documents: client-supplied s3_key is ignored (cross-tenant IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('mints a server-side owner-scoped s3_key and ignores the client value', async () => {
    const router = (await import('../handlers/documents.js')).default as unknown as {
      stack: RouteLayer[]
    }
    create.mockResolvedValue({ data: { id: 'd1' } })

    const ATTACKER_KEY = 'documents/victim-user/lab-results.pdf'
    const res = await callCreate(router, 'u1', {
      title: 'My lab report',
      category: 'lab_report',
      s3_key: ATTACKER_KEY,
    })

    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const persisted = create.mock.calls[0][1] as Record<string, unknown>
    expect(persisted.s3_key).not.toBe(ATTACKER_KEY)
    expect(typeof persisted.s3_key).toBe('string')
    expect(persisted.s3_key).toMatch(/^documents\/u1\//)
  })
})
