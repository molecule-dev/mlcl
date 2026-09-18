import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Pinned threads must float to the top of every listing. The thread-list query sorted only by the
// mode field (created_at / vote_score / last_reply_at), so a moderator's pin (is_pinned) had no
// effect on position. is_pinned DESC must be the primary sort key.

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
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
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))

import router from '../handlers/threads.js'

function listHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const threadsOrderBy = () =>
  (db.findMany.mock.calls.find((c) => c[0] === 'threads')?.[1] as { orderBy?: unknown[] })?.orderBy

const run = (sort?: string) =>
  listHandler()({ query: { page: 1, limit: 20, sort } } as unknown as Request, makeRes())

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([]) // no threads → decorate returns []
  db.count.mockResolvedValue(0)
})

describe('thread list floats pinned threads to the top', () => {
  it('sorts by is_pinned first, then the mode field (default → created_at)', async () => {
    await run()
    expect(threadsOrderBy()?.[0]).toEqual({ field: 'is_pinned', direction: 'desc' })
    expect(threadsOrderBy()?.[1]).toEqual({ field: 'created_at', direction: 'desc' })
  })

  it('keeps is_pinned primary even for the top sort mode', async () => {
    await run('top')
    expect(threadsOrderBy()?.[0]).toEqual({ field: 'is_pinned', direction: 'desc' })
    expect(threadsOrderBy()?.[1]).toEqual({ field: 'vote_score', direction: 'desc' })
  })
})
