import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// GET /stats/streak returned longest_streak: currentStreak — it never computed the max consecutive-day
// run over history, so "Best streak" and the 7-day achievement collapsed to 0 the moment today was
// skipped. longest_streak must be the longest run anywhere in history, independent of the current run.

const db = { findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findMany: (...a: unknown[]) => db.findMany(...a) }))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/stats.js'

function streakHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/streak' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /streak not found')
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
  }) as unknown as Response
}
const sessionsOn = (isoDates: string[]) =>
  isoDates.map((d) => ({ started_at: `${d}T08:00:00.000Z` }))
async function streak(
  isoDates: string[],
): Promise<{ current_streak: number; longest_streak: number }> {
  db.findMany.mockResolvedValue(sessionsOn(isoDates))
  const res = makeRes()
  await streakHandler()({} as unknown as Request, res)
  return (res as unknown as { body: { current_streak: number; longest_streak: number } }).body
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))
  vi.clearAllMocks()
})
afterEach(() => vi.useRealTimers())

describe('stats /streak longest_streak', () => {
  it('reports a past 5-day run even when today is skipped (current 0, longest 5)', async () => {
    const body = await streak([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
    ])
    expect(body.current_streak).toBe(0)
    expect(body.longest_streak).toBe(5)
  })

  it('longest exceeds the current run when a longer run is in the past', async () => {
    // today (a 1-day current run) plus a separate 5-day run earlier
    const body = await streak([
      '2026-05-20',
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
    ])
    expect(body.current_streak).toBe(1)
    expect(body.longest_streak).toBe(5)
  })

  it('is 0 with no history', async () => {
    const body = await streak([])
    expect(body.current_streak).toBe(0)
    expect(body.longest_streak).toBe(0)
  })
})
