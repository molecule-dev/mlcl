import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /library/history recorded a watch_history row unconditionally, ignoring the user's
// "Save watch history" preference (oauthData.preferences.historyOn). It now skips recording when
// the pref is explicitly false; default-on and unset still record.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/library.js'

function postHistory(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/history' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /history not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
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
  return res
}
const run = async (prefs: Record<string, unknown> | null): Promise<ReturnType<typeof makeRes>> => {
  db.findById.mockResolvedValue(prefs === null ? {} : { oauthData: { preferences: prefs } })
  db.findMany.mockResolvedValue([]) // no existing history row → the create (insert) branch
  db.create.mockResolvedValue({ data: { id: 'h1' } })
  const res = makeRes()
  await postHistory()(
    { body: { video_id: 'v1' } } as unknown as Request,
    res as unknown as Response,
  )
  return res
}
const recorded = () => db.create.mock.calls.some((c) => c[0] === 'watch_history')

beforeEach(() => vi.clearAllMocks())

describe('POST /library/history honors the historyOn preference', () => {
  it('does NOT record when historyOn is explicitly false', async () => {
    const res = await run({ historyOn: false })
    expect(recorded()).toBe(false)
    expect(res.statusCode).toBe(200)
    expect((res.body as { skipped?: boolean }).skipped).toBe(true)
  })

  it('records when historyOn is true', async () => {
    const res = await run({ historyOn: true })
    expect(recorded()).toBe(true)
    expect(res.statusCode).toBe(201)
  })

  it('records by default when the preference is unset', async () => {
    const res = await run(null)
    expect(recorded()).toBe(true)
    expect(res.statusCode).toBe(201)
  })
})
