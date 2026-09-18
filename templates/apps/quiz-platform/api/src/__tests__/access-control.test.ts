import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Regression tests for the broken-access-control fixes:
//   TPL-001 — quiz questions (answer key + unpublished drafts) were readable
//             by anyone with no auth / ownership / publish gate.
//   TPL-003 — session detail (join_code, host_id, status) was returned with
//             no authentication.
// Each "before the fix" expectation fails against the original handlers and
// passes against the gated ones.
// ---------------------------------------------------------------------------

// --- Seed data the handlers read through the mocked data layer --------------
const QUIZZES: Record<string, Record<string, unknown>> = {
  'pub-quiz': { id: 'pub-quiz', creator_id: 'creator-1', status: 'published', title: 'Published' },
  'draft-quiz': { id: 'draft-quiz', creator_id: 'creator-1', status: 'draft', title: 'Draft' },
  // Owned by a DIFFERENT user — used to prove reorder can't touch a foreign quiz's
  // question rows (RVALL-1 cross-quiz IDOR).
  'victim-quiz': {
    id: 'victim-quiz',
    creator_id: 'creator-2',
    status: 'published',
    title: 'Victim',
  },
}

const QUESTIONS: Array<Record<string, unknown>> = [
  {
    id: 'q-pub',
    quiz_id: 'pub-quiz',
    prompt: 'Capital of France?',
    choices: '["Paris","Lyon"]',
    correct_answer: 'Paris',
    explanation: 'Paris is the capital.',
    points: 1000,
    position: 0,
  },
  {
    id: 'q-draft',
    quiz_id: 'draft-quiz',
    prompt: 'Secret draft question',
    choices: '["A","B"]',
    correct_answer: 'A',
    explanation: 'Hidden.',
    points: 1000,
    position: 0,
  },
  {
    id: 'q-victim',
    quiz_id: 'victim-quiz',
    prompt: "Another tenant's question",
    choices: '["X","Y"]',
    correct_answer: 'X',
    explanation: 'Hidden.',
    points: 1000,
    position: 0,
  },
]

const SESSIONS: Record<string, Record<string, unknown>> = {
  'sess-1': {
    id: 'sess-1',
    quiz_id: 'pub-quiz',
    host_id: 'host-1',
    join_code: 'SECRET-CODE',
    status: 'active',
    current_question: 0,
  },
  'sess-fin': {
    id: 'sess-fin',
    quiz_id: 'pub-quiz',
    host_id: 'host-1',
    join_code: 'DONE-CODE',
    status: 'finished',
    current_question: 0,
  },
}

const PARTICIPANTS: Array<Record<string, unknown>> = [
  { id: 'p-1', session_id: 'sess-1', user_id: 'player-1', nickname: 'Player' },
]

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'quizzes') return QUIZZES[id] ?? null
  if (table === 'questions') return QUESTIONS.find((q) => q.id === id) ?? null
  if (table === 'quiz_sessions') return SESSIONS[id] ?? null
  return null
})

const findMany = vi.fn(
  async (
    table: string,
    opts?: { where?: Array<{ field: string; value: unknown }> },
  ): Promise<Array<Record<string, unknown>>> => {
    const where = opts?.where ?? []
    const val = (field: string) => where.find((w) => w.field === field)?.value
    if (table === 'questions') {
      return QUESTIONS.filter((q) => q.quiz_id === val('quiz_id'))
    }
    if (table === 'session_participants') {
      const sid = val('session_id')
      const uid = val('user_id')
      return PARTICIPANTS.filter(
        (p) => p.session_id === sid && (uid === undefined || p.user_id === uid),
      )
    }
    return []
  },
)

const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  findMany: (...a: unknown[]) =>
    findMany(a[0] as string, a[1] as { where?: Array<{ field: string; value: unknown }> }),
  create: vi.fn(async () => ({ data: { id: 'new' } })),
  updateById: (...a: unknown[]) => updateById(a[0] as string, a[1] as string, a[2]),
  deleteById: vi.fn(async () => ({ data: { ok: true } })),
}))

// getUserId reads res.locals.session?.userId — replicate the real behaviour.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request, name?: string) => req.params[name ?? 'id'],
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(),
  sendTo: vi.fn(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const questions = (await import('../handlers/questions.js')).default
  const sessions = (await import('../handlers/sessions.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it. No header => anonymous.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/questions', questions)
  app.use('/sessions', sessions)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
})

const get = (path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { ...(user ? { 'x-test-user': user } : {}) },
  })

const put = (path: string, user: string | undefined, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    body: JSON.stringify(body),
  })

describe('RVALL-1 — reorder binds question ids to the authorized quiz', () => {
  it('reorder only renumbers the path quiz’s own questions, never a foreign quiz’s', async () => {
    // creator-1 owns pub-quiz; q-victim belongs to creator-2’s victim-quiz.
    const res = await put('/questions/quiz/pub-quiz/reorder', 'creator-1', {
      question_ids: ['q-victim', 'q-pub'],
    })
    expect(res.status).toBe(200)
    // q-pub (this quiz) is renumbered; q-victim (foreign) is NEVER updated.
    const updatedIds = updateById.mock.calls.map((c) => c[1])
    expect(updatedIds).toContain('q-pub')
    expect(updatedIds).not.toContain('q-victim')
  })

  it('reorder is 404 for a non-owner and updates nothing', async () => {
    const res = await put('/questions/quiz/victim-quiz/reorder', 'creator-1', {
      question_ids: ['q-victim'],
    })
    expect(res.status).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })
})

describe('TPL-001 — questions answer key + draft gate', () => {
  it('GET /questions/quiz/:quizId on a published quiz strips the answer key for a non-creator', async () => {
    const res = await get('/questions/quiz/pub-quiz', 'player-1')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveProperty('prompt')
    expect(rows[0]).not.toHaveProperty('correct_answer')
    expect(rows[0]).not.toHaveProperty('explanation')
  })

  it('GET /questions/quiz/:quizId returns the full rows (incl. answer key) to the creator', async () => {
    const res = await get('/questions/quiz/pub-quiz', 'creator-1')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Array<Record<string, unknown>>
    expect(rows[0].correct_answer).toBe('Paris')
    expect(rows[0].explanation).toBe('Paris is the capital.')
  })

  it('GET /questions/quiz/:quizId on an unpublished draft is 404 for anonymous + non-creators', async () => {
    expect((await get('/questions/quiz/draft-quiz')).status).toBe(404)
    expect((await get('/questions/quiz/draft-quiz', 'player-1')).status).toBe(404)
  })

  it('GET /questions/quiz/:quizId on a draft is visible to its creator', async () => {
    const res = await get('/questions/quiz/draft-quiz', 'creator-1')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Array<Record<string, unknown>>
    expect(rows[0].correct_answer).toBe('A')
  })

  it('GET /questions/:id strips the answer key for a non-creator on a published quiz', async () => {
    const res = await get('/questions/q-pub', 'player-1')
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row).not.toHaveProperty('correct_answer')
    expect(row).not.toHaveProperty('explanation')
  })

  it('GET /questions/:id on a draft question is 404 for anonymous + non-creators', async () => {
    expect((await get('/questions/q-draft')).status).toBe(404)
    expect((await get('/questions/q-draft', 'player-1')).status).toBe(404)
  })

  it('GET /questions/:id returns the full row to the creator', async () => {
    const res = await get('/questions/q-pub', 'creator-1')
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row.correct_answer).toBe('Paris')
  })
})

describe('TPL-003 — session detail auth + join_code scoping', () => {
  it('GET /sessions/:id is 401 for an anonymous caller', async () => {
    const res = await get('/sessions/sess-1')
    expect(res.status).toBe(401)
  })

  it('GET /sessions/:id withholds join_code from an authenticated non-host / non-participant', async () => {
    const res = await get('/sessions/sess-1', 'stranger-1')
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row).not.toHaveProperty('join_code')
    // Non-credential fields stay available so a lobby preview still works.
    expect(row.status).toBe('active')
  })

  it('GET /sessions/:id returns the join_code to the host', async () => {
    const res = await get('/sessions/sess-1', 'host-1')
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row.join_code).toBe('SECRET-CODE')
  })

  it('GET /sessions/:id returns the join_code to a confirmed participant', async () => {
    const res = await get('/sessions/sess-1', 'player-1')
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row.join_code).toBe('SECRET-CODE')
  })
})

describe('RVALL-1 — results route gates access + withholds the answer key mid-game', () => {
  it('is 403 for a non-host, non-participant caller', async () => {
    // player-2 is neither host-1 nor a participant of sess-1.
    expect((await get('/sessions/sess-1/results', 'player-2')).status).toBe(403)
  })

  it('does NOT reveal correct_answer to a participant while the game is live + unanswered', async () => {
    const res = await get('/sessions/sess-1/results', 'player-1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { recap: Array<Record<string, unknown>> }
    expect(body.recap.length).toBeGreaterThan(0)
    for (const r of body.recap) {
      expect(r).not.toHaveProperty('correct_answer')
      // The explanation is gated with the answer key — no early "why" leak either.
      expect(r).not.toHaveProperty('explanation')
    }
  })

  it('reveals correct_answer once the session is finished (post-game recap)', async () => {
    const res = await get('/sessions/sess-fin/results', 'host-1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { recap: Array<Record<string, unknown>> }
    expect(body.recap.length).toBeGreaterThan(0)
    expect(body.recap[0]).toHaveProperty('correct_answer')
    // The author's explanation is revealed alongside the key — the advertised
    // post-play "learn why" review, previously stored but never surfaced.
    expect(body.recap[0].explanation).toBe('Paris is the capital.')
  })
})
