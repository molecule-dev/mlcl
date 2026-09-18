/**
 * The Settings page promises "Streaks are kept whenever you hit the goal", but
 * the complete-lesson streak previously incremented on the first lesson of any
 * new day, ignoring user_profiles.daily_goal_xp. These cover the goal-based
 * streak: credited once per day the moment today's XP reaches the goal,
 * consecutive if the goal was met yesterday, reset to 1 after a missed day.
 */
import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

const db = {
  findOne: vi.fn(),
  updateMany: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
  create: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
}
vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateMany: (...a: unknown[]) => db.updateMany(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateParams: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

const { default: router } = await import('../handlers/progress.js')

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function completeHandler(): (req: Request, res: Response) => Promise<void> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  for (const l of stack) {
    if (l.route?.path === '/user/:userId/complete-lesson' && l.route.methods.post) {
      return l.route.stack[l.route.stack.length - 1].handle as (
        req: Request,
        res: Response,
      ) => Promise<void>
    }
  }
  throw new Error('complete-lesson handler not found')
}
function makeRes() {
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
  }) as unknown as Response & { statusCode: number; body: unknown }
}

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const yesterdayStr = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10)
const daysAgoStr = (n: number) =>
  new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10)

async function run(profile: Record<string, unknown> | null, xp: number) {
  db.findOne.mockResolvedValueOnce(profile)
  db.updateMany.mockClear()
  db.create.mockClear()
  await completeHandler()(
    { params: { userId: 'u1' }, body: { lesson_id: 'l1', xp_earned: xp } } as unknown as Request,
    makeRes(),
  )
}
const lastUpdate = () => db.updateMany.mock.calls[0][2] as Record<string, unknown>

const base = {
  total_xp: 200,
  lessons_completed: 10,
  current_streak: 5,
  longest_streak: 5,
  daily_goal_xp: 50,
  daily_xp: 0,
}

describe('language-learning streak honors daily_goal_xp', () => {
  it('does NOT increment the streak on a new day when today XP is below the goal', async () => {
    await run(
      { ...base, last_activity: yesterdayStr, last_goal_date: yesterdayStr, daily_xp: 0 },
      20,
    )
    const u = lastUpdate()
    expect(u.current_streak).toBe(5) // 20 < 50 goal — unchanged (was: +1)
    expect(u.daily_xp).toBe(20)
  })

  it('increments when a single lesson meets the goal (consecutive day)', async () => {
    await run(
      { ...base, last_activity: yesterdayStr, last_goal_date: yesterdayStr, daily_xp: 0 },
      60,
    )
    const u = lastUpdate()
    expect(u.current_streak).toBe(6)
    expect(u.last_goal_date).toBe(todayStr)
  })

  it('credits the streak once when a later lesson crosses the goal mid-day', async () => {
    // 40 XP already today (below 50); this +20 crosses to 60.
    await run({ ...base, last_activity: todayStr, last_goal_date: yesterdayStr, daily_xp: 40 }, 20)
    const u = lastUpdate()
    expect(u.current_streak).toBe(6)
    expect(u.daily_xp).toBe(60)
  })

  it('does not double-credit once the goal was already met today', async () => {
    await run(
      {
        ...base,
        last_activity: todayStr,
        last_goal_date: todayStr,
        daily_xp: 60,
        current_streak: 6,
      },
      20,
    )
    const u = lastUpdate()
    expect(u.current_streak).toBe(6)
    expect(u.daily_xp).toBe(80)
  })

  it('resets the streak to 1 when the goal is met after a missed day', async () => {
    await run(
      { ...base, last_activity: daysAgoStr(3), last_goal_date: daysAgoStr(3), daily_xp: 0 },
      70,
    )
    expect(lastUpdate().current_streak).toBe(1)
  })

  it('new profile: no streak credited when the first lesson is below the goal', async () => {
    await run(null, 20)
    const c = db.create.mock.calls[0][1] as Record<string, unknown>
    expect(c.current_streak).toBe(0)
    expect(c.daily_xp).toBe(20)
  })

  it('new profile: streak credited when the first lesson meets the goal', async () => {
    await run(null, 55)
    const c = db.create.mock.calls[0][1] as Record<string, unknown>
    expect(c.current_streak).toBe(1)
    expect(c.last_goal_date).toBe(todayStr)
  })
})
