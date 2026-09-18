import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// The Composer "Pinned" option promises "Stay at the top of the feed", persisting is_pinned, but the
// feed list ordered by created_at only — so a pinned post sank below any newer normal post. The list
// now orders by is_pinned desc first, then created_at desc.

const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn() }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('../lib/authz.js', () => ({
  requireUser: () => 'u1',
  validationError: (
    res: { status: (n: number) => { json: (b: unknown) => void } },
    issues: unknown,
  ) => res.status(400).json({ issues }),
  internalError: (res: { status: (n: number) => { json: (b: unknown) => void } }) =>
    res.status(500).json({}),
  findAnnouncement: vi.fn(),
  requireOwnedAnnouncement: vi.fn(),
}))

const { default: router } = await import('../handlers/announcements.js')

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
const makeRes = () =>
  ({
    status() {
      return this
    },
    json() {
      return this
    },
    locals: { session: { userId: 'u1' } },
  }) as unknown as Response

describe('announcements feed floats pinned posts to the top', () => {
  it('orders the list by is_pinned desc, then created_at desc', async () => {
    await listHandler()({ query: {} } as unknown as Request, makeRes())
    const call = db.findMany.mock.calls.find((c) => c[0] === 'announcements')
    expect(call, 'findMany("announcements") should be called').toBeDefined()
    expect((call?.[1] as { orderBy: unknown }).orderBy).toEqual([
      { field: 'is_pinned', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ])
  })
})
