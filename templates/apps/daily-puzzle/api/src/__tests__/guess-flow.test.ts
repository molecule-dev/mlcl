import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/puzzles/:date/guess is the whole game loop: validation ladder
// (400 malformed → 409 finished → 422 not-a-word), feedback persistence,
// result creation on the final guess, and the ranked-only user_stats fold
// (practice/archive finishes must NEVER touch streaks).

const db = {
  findOne: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => db.findOne(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  query: (...a: unknown[]) => db.query(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import puzzlesRouter from '../handlers/puzzles.js'

const TODAY = new Date().toISOString().slice(0, 10)
const PAST = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
const FUTURE = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
/** Words the mocked dictionary knows. The day's answer is always 'crane'. */
const KNOWN_WORDS = new Set(['crane', 'stone', 'ocean'])

function guessHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    puzzlesRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:date/guess' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:date/guess not found')
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

function guess(word: string, date = TODAY) {
  const res = makeRes()
  return guessHandler()(
    { params: { date }, body: { word } } as unknown as Request,
    res as unknown as Response,
  ).then(() => res)
}

/** Wire the default happy-path DB: today's puzzle exists, no prior play. */
function primeDb({
  priorGuesses = [],
  result = null,
  stats = null,
  date = TODAY,
}: {
  priorGuesses?: Array<{ guess_number: number; word: string; feedback: string[] }>
  result?: { solved: boolean; attempts: number } | null
  stats?: { played: number; wins: number; current_streak: number; max_streak: number } | null
  date?: string
} = {}) {
  db.findOne.mockImplementation((table: string) => {
    if (table === 'puzzles') return Promise.resolve({ id: 'pz-1', date, word: 'crane' })
    if (table === 'results') return Promise.resolve(result)
    if (table === 'user_stats')
      return Promise.resolve(
        stats ? { user_id: 'user-1', ...stats, distribution: { '4': 1 } } : null,
      )
    return Promise.resolve(null)
  })
  db.findMany.mockImplementation((table: string) =>
    table === 'guesses'
      ? Promise.resolve(priorGuesses.map((g) => ({ ...g, puzzle_id: 'pz-1', user_id: 'user-1' })))
      : Promise.resolve([]),
  )
  db.count.mockImplementation((_table: string, where: Array<{ field: string; value: string }>) =>
    Promise.resolve(KNOWN_WORDS.has(where[0]?.value) ? 1 : 0),
  )
  db.create.mockResolvedValue({ data: { id: 'new-row' }, affected: 1 })
  db.updateById.mockResolvedValue({ data: { user_id: 'user-1' }, affected: 1 })
}

const resultsCreate = () => db.create.mock.calls.find((c) => c[0] === 'results')
/** The stats record as written — arg 2 of updateById, arg 1 of create. */
const statsRecord = () => {
  const upd = db.updateById.mock.calls.find((c) => c[0] === 'user_stats')
  if (upd) return upd[2]
  const crt = db.create.mock.calls.find((c) => c[0] === 'user_stats')
  return crt?.[1]
}
const statsWrite = () =>
  (db.updateById.mock.calls.find((c) => c[0] === 'user_stats') ??
    db.create.mock.calls.find((c) => c[0] === 'user_stats')) as unknown[] | undefined

beforeEach(() => {
  vi.clearAllMocks()
  primeDb()
})

describe('guess validation ladder', () => {
  it('rejects a malformed guess with 400', async () => {
    const res = await guess('cran')
    expect(res.statusCode).toBe(400)
  })

  it('rejects a future date with 400 — tomorrow is not playable', async () => {
    const res = await guess('crane', FUTURE)
    expect(res.statusCode).toBe(400)
  })

  it('rejects a guess that is not in the word list with 422', async () => {
    const res = await guess('zzzzz')
    expect(res.statusCode).toBe(422)
    expect((res.body as { error: string }).error).toBe('Not in the word list')
  })

  it('rejects further guesses on a finished game with 409', async () => {
    primeDb({ result: { solved: true, attempts: 3 } })
    const res = await guess('stone')
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })
})

describe('mid-game guesses', () => {
  it('stores the guess with computed feedback and stays playing — answer hidden', async () => {
    const res = await guess('stone')
    expect(res.statusCode).toBe(201)
    const body = res.body as { feedback: string[]; status: string; answer?: string }
    expect(body.feedback).toEqual(['absent', 'absent', 'absent', 'correct', 'correct'])
    expect(body.status).toBe('playing')
    expect(body.answer).toBeUndefined()
    expect(db.create).toHaveBeenCalledWith(
      'guesses',
      expect.objectContaining({ guess_number: 1, word: 'stone' }),
    )
    expect(resultsCreate()).toBeUndefined()
  })

  it('numbers guesses after the stored ones', async () => {
    primeDb({ priorGuesses: [{ guess_number: 1, word: 'ocean', feedback: [] }] })
    const res = await guess('stone')
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith('guesses', expect.objectContaining({ guess_number: 2 }))
  })
})

describe('finishing a ranked daily game', () => {
  it('a winning guess reveals the answer and folds stats', async () => {
    primeDb({
      priorGuesses: [
        { guess_number: 1, word: 'ocean', feedback: [] },
        { guess_number: 2, word: 'stone', feedback: [] },
      ],
      stats: { played: 1, wins: 1, current_streak: 1, max_streak: 1 },
    })
    const res = await guess('crane')
    expect(res.statusCode).toBe(201)
    const body = res.body as { status: string; answer: string; stats: { current_streak: number } }
    expect(body.status).toBe('won')
    expect(body.answer).toBe('crane')
    expect(resultsCreate()?.[1]).toMatchObject({ solved: true, attempts: 3, practice: false })
    // 1+1 played, streak 1+1, and the '3' bin appended to the existing '4'.
    expect(statsRecord()).toMatchObject({ played: 2, wins: 2, current_streak: 2 })
  })

  it('a sixth wrong guess records a loss with the answer revealed', async () => {
    primeDb({
      priorGuesses: [1, 2, 3, 4, 5].map((n) => ({ guess_number: n, word: 'ocean', feedback: [] })),
      stats: { played: 0, wins: 0, current_streak: 0, max_streak: 0 },
    })
    const res = await guess('stone')
    expect(res.statusCode).toBe(201)
    const body = res.body as { status: string; answer: string }
    expect(body.status).toBe('lost')
    expect(body.answer).toBe('crane')
    expect(resultsCreate()?.[1]).toMatchObject({ solved: false, attempts: 6, practice: false })
  })

  it('creates user_stats on a first-ever finish (no prior row)', async () => {
    primeDb({ stats: null })
    const res = await guess('crane')
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'user_stats',
      expect.objectContaining({ user_id: 'user-1', played: 1, wins: 1 }),
    )
  })
})

describe('practice (archive) games never touch stats', () => {
  it('finishing a past-date game records practice=true and skips user_stats entirely', async () => {
    primeDb({ date: PAST })
    const res = await guess('crane', PAST)
    expect(res.statusCode).toBe(201)
    expect(resultsCreate()?.[1]).toMatchObject({ solved: true, practice: true })
    expect(statsWrite()).toBeUndefined()
  })
})
