import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// shows.episode_count counts PUBLISHED episodes (incremented on publish). Deleting a published
// episode must decrement it — otherwise the count drifts upward. Deleting a DRAFT episode must
// NOT decrement (it was never counted).

const db = {
  findById: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'author-1',
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-ai-speech', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-ai-summarization', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-search', () => ({ index: vi.fn() }))
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: vi.fn() }))

import router from '../handlers/episodes.js'

function deleteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.delete)
  if (!layer?.route) throw new Error('DELETE /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    end() {
      return this
    },
  }
  return res
}
const run = (status: string, res: ReturnType<typeof makeRes>) => {
  db.findById.mockImplementation(async (table: string) =>
    table === 'shows'
      ? { id: 's1', author_id: 'author-1', episode_count: 5 }
      : { id: 'e1', status, show_id: 's1' },
  )
  return deleteHandler()({ params: { id: 'e1' } } as unknown as Request, res as unknown as Response)
}
const showUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'shows')?.[2] as
    { episode_count?: number } | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.deleteById.mockResolvedValue({ data: {} })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('episode delete keeps shows.episode_count in sync', () => {
  it('decrements episode_count when a PUBLISHED episode is deleted', async () => {
    const res = makeRes()
    await run('published', res)
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('episodes', 'e1')
    expect(showUpdate()?.episode_count).toBe(4)
  })

  it('does NOT decrement when a DRAFT episode is deleted (never counted)', async () => {
    const res = makeRes()
    await run('draft', res)
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledWith('episodes', 'e1')
    expect(db.updateById.mock.calls.some((c) => c[0] === 'shows')).toBe(false)
  })
})
