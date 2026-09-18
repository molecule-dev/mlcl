import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The per-project `billable` flag was stored but every entry-create path hardcoded is_billable ?? true,
// so unchecking "Time on this project is billable" did nothing — the time still billed and counted
// as billable. An entry on a non-billable project must be non-billable; a billable project honors
// the requested flag.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? 'e1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

import router from '../handlers/entries.js'

function handler(
  path: string,
  method: 'post' | 'put',
): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res as unknown as Response
}
const createdBillable = () =>
  (db.create.mock.calls.find((c) => c[0] === 'time_entries')?.[1] as { is_billable?: boolean })
    ?.is_billable
const updatedBillable = () =>
  (db.updateById.mock.calls.find((c) => c[0] === 'time_entries')?.[2] as { is_billable?: boolean })
    ?.is_billable

const project = (billable: boolean) => ({ id: 'p1', billable })

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([]) // no running timer
  db.create.mockResolvedValue({ data: { id: 'e1' } })
  db.updateById.mockResolvedValue({ data: { id: 'e1' } })
})

describe('entry billability follows the project billable flag', () => {
  it('POST /start on a non-billable project forces is_billable=false (even if requested true)', async () => {
    db.findById.mockResolvedValue(project(false))
    await handler('/start', 'post')(
      { body: { project_id: 'p1', is_billable: true } } as unknown as Request,
      makeRes(),
    )
    expect(createdBillable()).toBe(false)
  })

  it('POST /start on a billable project honors the default (true)', async () => {
    db.findById.mockResolvedValue(project(true))
    await handler('/start', 'post')({ body: { project_id: 'p1' } } as unknown as Request, makeRes())
    expect(createdBillable()).toBe(true)
  })

  it('POST / (manual) on a non-billable project forces is_billable=false', async () => {
    db.findById.mockResolvedValue(project(false))
    await handler('/', 'post')(
      {
        body: {
          project_id: 'p1',
          started_at: '2026-07-01T09:00:00.000Z',
          ended_at: '2026-07-01T10:00:00.000Z',
          is_billable: true,
        },
      } as unknown as Request,
      makeRes(),
    )
    expect(createdBillable()).toBe(false)
  })

  it('with no project, honors the requested flag', async () => {
    await handler('/start', 'post')(
      { body: { is_billable: true } } as unknown as Request,
      makeRes(),
    )
    expect(db.findById).not.toHaveBeenCalled()
    expect(createdBillable()).toBe(true)
  })

  it('PUT /:id reassigning to a non-billable project forces is_billable=false', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'projects'
        ? project(false)
        : { id: 'e1', owner_id: 'u1', project_id: null, is_billable: true },
    )
    await handler('/:id', 'put')(
      { params: { id: 'e1' }, body: { project_id: 'p1' } } as unknown as Request,
      makeRes(),
    )
    expect(updatedBillable()).toBe(false)
  })
})
