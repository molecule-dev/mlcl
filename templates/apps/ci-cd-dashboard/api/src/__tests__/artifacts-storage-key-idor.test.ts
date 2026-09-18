import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a client-supplied `storage_key` in the artifact create body must be
// IGNORED — the server mints its own owner-scoped object-storage key. Letting the
// client choose the key is a cross-tenant read IDOR here in particular, because
// `GET /:id/download` builds an S3 redirect URL straight from `storage_key`.

const create = vi.fn()
const findById = vi.fn()
const deleteById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => create(...args),
  findById: (...args: unknown[]) => findById(...args),
  deleteById: (...args: unknown[]) => deleteById(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
  getParamId: (req: Request) => String((req.params as { id?: string }).id ?? ''),
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
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

vi.mock('../handlers/decorators.js', () => ({
  listDecoratedArtifacts: vi.fn(),
  readDecoratedArtifact: vi.fn(),
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

describe('artifacts: client-supplied storage_key is ignored (cross-tenant IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('mints a server-side owner-scoped storage_key and ignores the client value', async () => {
    const router = (await import('../handlers/artifacts.js')).default as unknown as {
      stack: RouteLayer[]
    }
    // The build the artifact attaches to belongs to this user.
    findById.mockResolvedValue({ id: 'b1', user_id: 'u1', pipeline_id: 'p1' })
    create.mockResolvedValue({ data: { id: 'a1' } })

    const ATTACKER_KEY = 'artifacts/victim-user/secret-build/binary'
    const res = await callCreate(router, 'u1', {
      build_id: 'b1',
      name: 'app.tar.gz',
      storage_key: ATTACKER_KEY,
    })

    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const persisted = create.mock.calls[0][1] as Record<string, unknown>
    // The client value never reaches the row.
    expect(persisted.storage_key).not.toBe(ATTACKER_KEY)
    // The minted key is non-empty and scoped under the authenticated user's id.
    expect(typeof persisted.storage_key).toBe('string')
    expect(persisted.storage_key).toMatch(/^artifacts\/u1\//)
  })
})
