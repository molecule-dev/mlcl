import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: client-supplied video_s3_key / image_s3_key (exercises) and
// photo_s3_key (measurements) must be IGNORED — the server mints its own
// owner-scoped object-storage keys. A client-chosen key would let a caller
// address another tenant's object via any future download/preview route
// (cross-tenant IDOR).

const create = vi.fn()
const findById = vi.fn()
const findMany = vi.fn()
const updateById = vi.fn()
const deleteMany = vi.fn()

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => create(...args),
  findById: (...args: unknown[]) => findById(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  deleteMany: (...args: unknown[]) => deleteMany(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
  uuidParamSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
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

describe('exercises: client-supplied video/image s3_key is ignored (cross-tenant IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('mints server-side owner-scoped video_s3_key/image_s3_key, ignores client values', async () => {
    const router = (await import('../handlers/exercises.js')).default as unknown as {
      stack: RouteLayer[]
    }
    create.mockResolvedValue({ data: { id: 'e1' } })

    const VIDEO = 'exercises/victim-user/private/video'
    const IMAGE = 'exercises/victim-user/private/image'
    const res = await callCreate(router, 'u1', {
      name: 'Squat',
      video_s3_key: VIDEO,
      image_s3_key: IMAGE,
    })

    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const persisted = create.mock.calls[0][1] as Record<string, unknown>
    expect(persisted.video_s3_key).not.toBe(VIDEO)
    expect(persisted.image_s3_key).not.toBe(IMAGE)
    expect(persisted.video_s3_key).toMatch(/^exercises\/u1\//)
    expect(persisted.image_s3_key).toMatch(/^exercises\/u1\//)
  })
})

describe('measurements: client-supplied photo_s3_key is ignored (cross-tenant IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('mints a server-side owner-scoped photo_s3_key and ignores the client value', async () => {
    const router = (await import('../handlers/measurements.js')).default as unknown as {
      stack: RouteLayer[]
    }
    create.mockResolvedValue({ data: { id: 'm1' } })

    const ATTACKER_KEY = 'measurements/victim-user/private.jpg'
    const res = await callCreate(router, 'u1', {
      weight_kg: 80,
      photo_s3_key: ATTACKER_KEY,
    })

    expect(res.statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const persisted = create.mock.calls[0][1] as Record<string, unknown>
    expect(persisted.photo_s3_key).not.toBe(ATTACKER_KEY)
    expect(persisted.photo_s3_key).toMatch(/^measurements\/u1\//)
  })
})
