import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a client-supplied `audio_s3_key` in the meeting create body must be
// IGNORED — the server mints its own owner-scoped object-storage key. A
// client-chosen key would let a caller address another tenant's object via any
// future download/preview route (cross-tenant IDOR).

const create = vi.fn()
const count = vi.fn(async () => 0)
const findById = vi.fn()
const findMany = vi.fn()
const updateById = vi.fn()
const deleteById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => create(...args),
  count: () => count(),
  findById: (...args: unknown[]) => findById(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  deleteById: (...args: unknown[]) => deleteById(...args),
}))

vi.mock('@molecule/api-ai', () => ({
  getAllProviders: () => [],
  getProvider: vi.fn(),
  getProviderByName: vi.fn(),
}))

vi.mock('@molecule/api-ai-speech', () => ({
  requireProvider: vi.fn(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
  getParamId: (req: Request) => String((req.params as { id?: string }).id ?? ''),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
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
  // The bare POST '/' route (NOT '/transcribe').
  const layer = router.stack.find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / route not found')
  const req = { params: {}, body, query: {} } as unknown as Request
  const res = makeRes(userId)
  await layer.route.stack[layer.route.stack.length - 1].handle(req, res)
  return res
}

describe('meetings: client-supplied audio_s3_key is ignored (cross-tenant IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    count.mockResolvedValue(0)
  })

  it('mints a server-side owner-scoped audio_s3_key and ignores the client value', async () => {
    const router = (await import('../handlers/meetings.js')).default as unknown as {
      stack: RouteLayer[]
    }
    create.mockResolvedValue({ data: { id: 'mtg1' } })

    const ATTACKER_KEY = 'meetings/victim-user/secret-call.webm'
    const res = await callCreate(router, 'u1', {
      title: 'Standup',
      source: 'recorded',
      audio_s3_key: ATTACKER_KEY,
    })

    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const persisted = create.mock.calls[0][1] as Record<string, unknown>
    expect(persisted.audio_s3_key).not.toBe(ATTACKER_KEY)
    expect(typeof persisted.audio_s3_key).toBe('string')
    expect(persisted.audio_s3_key).toMatch(/^meetings\/u1\//)
  })
})
