import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// medications + allergies keep a denormalized is_active mirror that stats.ts
// counts by. It was derived only on create, so a PUT that changed status
// (discontinue / resolve) left is_active stale and the "active" count never
// dropped. The PUT handlers now recompute is_active whenever status is present.

const db = {
  findById: vi.fn(),
  updateById: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
  create: vi.fn(),
  deleteById: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: { id?: string } }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

const { default: medsRouter } = await import('../handlers/medications.js')
const { default: allergiesRouter } = await import('../handlers/allergies.js')

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
}
function putHandler(router: { stack: unknown }): (req: Request, res: Response) => Promise<void> {
  const layer = (router.stack as RouteLayer[]).find(
    (l) => l.route?.path === '/:id' && l.route.methods.put,
  )
  if (!layer?.route) throw new Error('PUT /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response
const updatePayload = () => db.updateById.mock.calls[0]?.[2] as Record<string, unknown> | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'r1', user_id: 'u1', status: 'active', is_active: true })
})

describe.each([
  ['medications', () => medsRouter, 'discontinued'],
  ['allergies', () => allergiesRouter, 'resolved'],
])('%s PUT keeps is_active in sync with status', (_name, getRouter, inactiveStatus) => {
  it(`sets is_active false when status → ${inactiveStatus}`, async () => {
    await putHandler(getRouter())(
      { params: { id: 'r1' }, body: { status: inactiveStatus } } as unknown as Request,
      makeRes(),
    )
    expect(updatePayload()?.is_active).toBe(false)
    expect(updatePayload()?.status).toBe(inactiveStatus)
  })

  it('sets is_active true when status → active', async () => {
    await putHandler(getRouter())(
      { params: { id: 'r1' }, body: { status: 'active' } } as unknown as Request,
      makeRes(),
    )
    expect(updatePayload()?.is_active).toBe(true)
  })

  it('does not touch is_active when status is omitted', async () => {
    await putHandler(getRouter())(
      { params: { id: 'r1' }, body: { notes: 'edited' } } as unknown as Request,
      makeRes(),
    )
    expect(updatePayload()).not.toHaveProperty('is_active')
  })
})
