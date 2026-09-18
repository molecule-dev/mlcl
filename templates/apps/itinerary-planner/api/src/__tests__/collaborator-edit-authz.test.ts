import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A trip collaborator with role 'editor' must be able to edit the trip's contents. Authorization
// used to check trip ownership only (userOwnsTrip), so an accepted editor got 404 on every
// add/update/delete. userCanEditTrip now grants the owner OR an accepted 'editor' collaborator.

const { userHolder } = vi.hoisted(() => ({ userHolder: { id: 'u1' } }))
const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => userHolder.id,
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import { userCanEditTrip } from '../handlers/_authz.js'
import activitiesRouter from '../handlers/activities.js'

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'a1' } })
})

describe('userCanEditTrip', () => {
  it('allows the trip owner', async () => {
    db.findById.mockResolvedValue({ id: 't1', user_id: 'owner' })
    expect(await userCanEditTrip('t1', 'owner')).toBe(true)
    expect(db.findMany).not.toHaveBeenCalled() // owner shortcut, no collaborator lookup
  })

  it('allows an accepted editor collaborator', async () => {
    db.findById.mockResolvedValue({ id: 't1', user_id: 'owner' })
    db.findMany.mockResolvedValue([{ id: 'c1', role: 'editor' }])
    expect(await userCanEditTrip('t1', 'editor-1')).toBe(true)
    // the collaborator lookup is scoped to role 'editor'
    expect(db.findMany).toHaveBeenCalledWith(
      'trip_collaborators',
      expect.objectContaining({
        where: expect.arrayContaining([{ field: 'role', operator: '=', value: 'editor' }]),
      }),
    )
  })

  it('denies a non-editor (viewer / non-member): the editor-scoped lookup returns nothing', async () => {
    db.findById.mockResolvedValue({ id: 't1', user_id: 'owner' })
    db.findMany.mockResolvedValue([])
    expect(await userCanEditTrip('t1', 'viewer-1')).toBe(false)
  })

  it('denies when the trip does not exist', async () => {
    db.findById.mockResolvedValue(null)
    expect(await userCanEditTrip('t1', 'anyone')).toBe(false)
  })
})

function createActivity(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    activitiesRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() }) as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }

describe('activities create honors editor collaborators', () => {
  it('lets an editor collaborator add an activity', async () => {
    userHolder.id = 'editor-1'
    db.findById.mockResolvedValue({ id: 't1', user_id: 'owner' })
    db.findMany.mockResolvedValue([{ id: 'c1', role: 'editor' }])
    const res = makeRes()
    await createActivity()({ body: { trip_id: 't1', title: 'Museum' } } as unknown as Request, res)
    expect(db.create).toHaveBeenCalledWith('activities', expect.objectContaining({ trip_id: 't1' }))
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('rejects a non-collaborator with 404 and no create', async () => {
    userHolder.id = 'stranger'
    db.findById.mockResolvedValue({ id: 't1', user_id: 'owner' })
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await createActivity()({ body: { trip_id: 't1', title: 'Museum' } } as unknown as Request, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(db.create).not.toHaveBeenCalled()
  })
})
