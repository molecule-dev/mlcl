import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The subscription tier limits (maxProjects / maxExports / canExport) were defined + the entitlements
// provider wired at boot, but no handler enforced them — so a free user could create unlimited
// projects/exports and export despite canExport=false. The create routes now gate on them.

type LimitConfig = {
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string) => Promise<number>
}
const { configs } = vi.hoisted(() => ({ configs: [] as LimitConfig[] }))
const getEffectiveTier = vi.fn()
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_req: Request, _res: Response, next: () => void) => next()
  },
  getEffectiveTier: (...a: unknown[]) => getEffectiveTier(...a),
}))
const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
const authz = vi.hoisted(() => ({ requireProjectOwner: vi.fn(), requireExportOwner: vi.fn() }))
vi.mock('../lib/authz.js', () => authz)

// Importing both routers registers their enforceLimit configs.
await import('../handlers/projects.js')
const { default: exportsRouter } = await import('../handlers/exports.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)
function exportHandler(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const layer = (
    exportsRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response
}

beforeEach(() => {
  db.count.mockClear()
  db.create.mockClear()
})

describe('video-editor tier limits are enforced', () => {
  it('gates project create on maxProjects (count video_projects by owner)', async () => {
    expect(cfg('maxProjects')?.getLimit({ maxProjects: 5 })).toBe(5)
    await cfg('maxProjects')?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('video_projects', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })

  it('gates export create on maxExports (count video_exports by owner)', async () => {
    expect(cfg('maxExports')?.getLimit({ maxExports: 5 })).toBe(5)
    await cfg('maxExports')?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('video_exports', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })

  it('402s an export when the plan has canExport=false (nothing created)', async () => {
    getEffectiveTier.mockResolvedValue({ limits: { canExport: false } })
    const res = makeRes() as Response & { statusCode: number }
    await exportHandler()({ body: { project_id: 'p1' } } as Request, res, vi.fn() as NextFunction)
    expect(res.statusCode).toBe(402)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows an export when canExport=true', async () => {
    getEffectiveTier.mockResolvedValue({ limits: { canExport: true } })
    authz.requireProjectOwner.mockResolvedValue({ ok: true, status: 200, row: {} })
    db.create.mockResolvedValue({ data: { id: 'e1' } })
    db.findMany.mockResolvedValue([{ source_url: 'x' }])
    db.updateById.mockResolvedValue({ data: { id: 'e1', status: 'done' } })
    const res = makeRes() as Response & { statusCode: number }
    await exportHandler()({ body: { project_id: 'p1' } } as Request, res, vi.fn() as NextFunction)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'video_exports',
      expect.objectContaining({ owner_id: 'u1' }),
    )
  })
})
