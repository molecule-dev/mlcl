import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A new event whose fingerprint matches a RESOLVED issue is a regression: ingest must reopen it
// (status -> unresolved, is_regression -> true, resolved_at -> null) so discover.ts's "top
// regressions" board (filters is_regression && status !== 'resolved') can surface it. An
// 'ignored' issue stays muted; an already-'unresolved' one is unchanged. Previously ingest only
// bumped last_seen/event_count and never read the matched issue's status.

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  findById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'p1',
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, next: () => void) => next(),
  validateQuery: () => (_r: Request, _s: Response, next: () => void) => next(),
}))

import router from '../handlers/errors.js'

function ingestHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/ingest' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /ingest not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number }
}
const run = (res: ReturnType<typeof makeRes>) =>
  ingestHandler()(
    {
      body: { project_id: 'p1', message: 'boom', stack_trace: 'x' },
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request,
    res as unknown as Response,
  )

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'e1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

const matched = (status: string) => [{ id: 'i1', status, event_count: 3 }]

describe('ingest reopens a resolved issue as a regression', () => {
  it('reopens a RESOLVED issue: status->unresolved, is_regression->true, resolved_at->null', async () => {
    db.findMany.mockResolvedValue(matched('resolved'))
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.updateById).toHaveBeenCalledWith(
      'issues',
      'i1',
      expect.objectContaining({
        status: 'unresolved',
        is_regression: true,
        resolved_at: null,
        event_count: 4,
      }),
    )
  })

  it('leaves an IGNORED issue muted (no status / is_regression change)', async () => {
    db.findMany.mockResolvedValue(matched('ignored'))
    const res = makeRes()
    await run(res)
    const arg = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect(arg.status).toBeUndefined()
    expect(arg.is_regression).toBeUndefined()
    expect(arg.event_count).toBe(4)
  })

  it('leaves an already-UNRESOLVED issue unchanged in status', async () => {
    db.findMany.mockResolvedValue(matched('unresolved'))
    const res = makeRes()
    await run(res)
    const arg = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect(arg.status).toBeUndefined()
    expect(arg.is_regression).toBeUndefined()
  })
})
