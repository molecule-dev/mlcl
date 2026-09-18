import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast, sendTo } from '@molecule/api-realtime'

const router = Router()

/**
 * 6-char uppercase alphanumeric join code. Join codes are bearer
 * credentials — presenting one joins a live quiz session, so anyone who can
 * predict a code can enter. Math.random is a predictable non-cryptographic
 * PRNG; draw from a CSPRNG instead. [L2-1]
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  // Rejection sampling keeps every symbol equally likely: skip byte values
  // above the largest multiple of the alphabet size (a plain modulo would
  // favor the earliest characters).
  const limit = 256 - (256 % chars.length)
  let result = ''
  while (result.length < 6) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && result.length < 6; i++) {
      if (buf[i]! < limit) result += chars.charAt(buf[i]! % chars.length)
    }
  }
  return result
}

const createSessionSchema = z.object({
  quiz_id: z.string().min(1),
})

const joinSessionSchema = z.object({
  nickname: z.string().min(1).max(40),
})

const answerSchema = z.object({
  question_id: z.string().min(1),
  answer: z.string(),
  time_taken_ms: z.number().int().min(0),
})

router.post('/', validateBody(createSessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const quiz = await findById<Record<string, unknown>>('quizzes', req.body.quiz_id)
    if (!quiz) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    const result = await create('quiz_sessions', {
      quiz_id: req.body.quiz_id,
      host_id: userId,
      join_code: generateJoinCode(),
      status: 'waiting',
      current_question: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Session detail exposes join_code (the credential used to join a live
    // game) + host_id. Require an authenticated session — the lobby/play UI is
    // already logged in (it calls /join, /start, /results). Fail closed.
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!session) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }

    // Only the host or a confirmed participant may read the join_code. Any
    // other authenticated caller gets the row with the credential withheld so
    // it can't be used to gate-crash a session they weren't invited to.
    let isParticipant = false
    if (session.host_id !== userId) {
      const participants = await findMany<Record<string, unknown>>('session_participants', {
        where: [
          { field: 'session_id', operator: '=', value: id },
          { field: 'user_id', operator: '=', value: userId },
        ],
      })
      isParticipant = participants.length > 0
    }
    if (session.host_id === userId || isParticipant) {
      return res.json(session)
    }
    const { join_code: _joinCode, ...safe } = session
    return res.json(safe)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Per-question recap for the calling user, plus their participant score
 * and rank within the session. Used by the post-play results screen.
 */
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!session) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }

    const [questions, answers, participants, quiz] = await Promise.all([
      findMany<Record<string, unknown>>('questions', {
        where: [{ field: 'quiz_id', operator: '=', value: session.quiz_id }],
        orderBy: [{ field: 'position', direction: 'asc' }],
      }),
      findMany<Record<string, unknown>>('session_answers', {
        where: [
          { field: 'session_id', operator: '=', value: id },
          { field: 'user_id', operator: '=', value: userId },
        ],
      }),
      findMany<Record<string, unknown>>('session_participants', {
        where: [{ field: 'session_id', operator: '=', value: id }],
        orderBy: [{ field: 'score', direction: 'desc' }],
      }),
      findById<Record<string, unknown>>('quizzes', String(session.quiz_id)),
    ])

    const me = participants.find((p) => p.user_id === userId) ?? null
    const isHost = String(session.host_id) === String(userId)
    // Only the host or a confirmed participant may see results, and the answer key
    // (correct_answer) is revealed ONLY once the game is finished, or per-question for
    // questions this caller already answered (mirrors the /answer reveal policy). This
    // closes the mid-game full-answer-key leak + the draft-quiz exfiltration via this
    // sibling route. [RVALL-1]
    if (!isHost && !me) {
      return res
        .status(403)
        .json({ error: t('sessions.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const finished = session.status === 'finished'
    const rank = me ? participants.findIndex((p) => p.user_id === userId) + 1 : null
    const recap = questions.map((q, i) => {
      const a = answers.find((row) => row.question_id === q.id)
      const revealKey = finished || Boolean(a)
      return {
        id: q.id,
        position: q.position ?? i,
        prompt: q.prompt,
        // Reveal the answer key AND the author's explanation together, under the
        // same post-answer/finished gate — the explanation is the "learn why"
        // review the results screen advertises.
        ...(revealKey
          ? { correct_answer: q.correct_answer, explanation: q.explanation ?? null }
          : {}),
        your_answer: a?.answer ?? null,
        is_correct: Boolean(a?.is_correct),
        points_earned: Number(a?.points_earned ?? 0),
        time_taken_ms: Number(a?.time_taken_ms ?? 0),
      }
    })
    const totalCorrect = recap.filter((r) => r.is_correct).length
    const totalPoints = recap.reduce((sum, r) => sum + r.points_earned, 0)

    return res.json({
      session,
      quiz,
      participantsTotal: participants.length,
      rank,
      score: Number(me?.score ?? totalPoints),
      totalCorrect,
      totalQuestions: recap.length,
      recap,
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/join', validateBody(joinSessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!session) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }

    // Idempotent join: a player double-clicking Join, reconnecting, or replaying the
    // request must not create a duplicate participant — that would show them twice in
    // the lobby + leaderboard and split their score. Checked BEFORE the status gate so
    // a player who joined while 'waiting' can reconnect after the quiz starts. Backed by
    // the UNIQUE (session_id, user_id) constraint, which also closes the concurrent race.
    const alreadyJoined = await findOne<Record<string, unknown>>('session_participants', [
      { field: 'session_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (alreadyJoined) {
      return res.status(200).json(alreadyJoined)
    }

    if (session.status !== 'waiting') {
      return res
        .status(409)
        .json({ error: t('sessions.notJoinable', {}, { defaultValue: 'Session not joinable' }) })
    }

    const result = await create('session_participants', {
      session_id: id,
      user_id: userId,
      nickname: req.body.nickname,
      score: 0,
      joined_at: new Date(),
      created_at: new Date(),
    })
    const participant = result.data ?? result
    try {
      await broadcast(`session:${id}`, 'player-joined', participant)
    } catch (err) {
      void err
    }
    return res.status(201).json(participant)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }
    if (existing.host_id !== userId) {
      return res.status(403).json({
        error: t('sessions.hostOnly', {}, { defaultValue: 'Only the host may start the session' }),
      })
    }

    const result = await updateById('quiz_sessions', id, {
      status: 'active',
      started_at: new Date(),
      updated_at: new Date(),
    })
    const session = result.data ?? result

    // Count a play when the game actually starts (an abandoned lobby never does). Guard on the
    // prior status so re-starting an already-active session can't inflate the count. play_count
    // drives the "{{count}} plays" stat shown across the app but was never incremented — so every
    // real (non-seeded) quiz sat at 0.
    if (existing.status !== 'active' && existing.quiz_id) {
      const quiz = await findById<Record<string, unknown>>('quizzes', String(existing.quiz_id))
      if (quiz) {
        await updateById('quizzes', String(existing.quiz_id), {
          play_count: Number(quiz.play_count ?? 0) + 1,
        })
      }
    }

    try {
      await broadcast(`session:${id}`, 'session-started', session)
    } catch (err) {
      void err
    }
    return res.json(session)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/next-question', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!session) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }
    if (session.host_id !== userId) {
      return res.status(403).json({
        error: t(
          'sessions.hostOnly',
          {},
          { defaultValue: 'Only the host may advance the session' },
        ),
      })
    }

    const nextIndex = (session.current_question as number) + 1
    const questions = await findMany<Record<string, unknown>>('questions', {
      where: [{ field: 'quiz_id', operator: '=', value: session.quiz_id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    if (nextIndex >= questions.length) {
      const finishedResult = await updateById('quiz_sessions', id, {
        status: 'finished',
        finished_at: new Date(),
        updated_at: new Date(),
      })
      const finished = finishedResult.data ?? finishedResult
      try {
        await broadcast(`session:${id}`, 'session-finished', finished)
      } catch (err) {
        void err
      }
      return res.json(finished)
    }
    const updateResult = await updateById('quiz_sessions', id, {
      current_question: nextIndex,
      updated_at: new Date(),
    })
    const updated = updateResult.data ?? updateResult
    try {
      await broadcast(`session:${id}`, 'next-question', {
        question: questions[nextIndex],
        index: nextIndex,
        total: questions.length,
      })
    } catch (err) {
      void err
    }
    return res.json(updated)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/answer', validateBody(answerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('quiz_sessions', id)
    if (!session) {
      return res
        .status(404)
        .json({ error: t('sessions.notFound', {}, { defaultValue: 'Session not found' }) })
    }

    // Caller must be a participant — never trust a client-supplied user_id.
    const participants = await findMany<Record<string, unknown>>('session_participants', {
      where: [
        { field: 'session_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
    })
    if (participants.length === 0) {
      return res.status(403).json({
        error: t('sessions.notParticipant', {}, { defaultValue: 'Not a session participant' }),
      })
    }

    const question = await findById<Record<string, unknown>>('questions', req.body.question_id)
    if (!question) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }

    // Server-side correctness + scoring. Speed bonus scales linearly with
    // remaining time; flat scoring uses the full point value.
    const isCorrect = String(req.body.answer) === String(question.correct_answer ?? '')
    const points = Number(question.points ?? 0)
    const timeLimitMs = Math.max(1, Number(question.time_limit_s ?? 20) * 1000)
    const timeTakenMs = Math.min(Math.max(0, Number(req.body.time_taken_ms)), timeLimitMs)
    const quiz = await findById<Record<string, unknown>>('quizzes', String(session.quiz_id))
    const scoringMode = String(quiz?.scoring_mode ?? 'speed')
    const pointsEarned = isCorrect
      ? scoringMode === 'flat'
        ? points
        : Math.round(points * (1 - timeTakenMs / timeLimitMs / 2))
      : 0

    const answerResult = await create('session_answers', {
      session_id: id,
      user_id: userId,
      question_id: req.body.question_id,
      answer: req.body.answer,
      time_taken_ms: timeTakenMs,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      answered_at: new Date(),
    })
    // Reveal the correct answer for THIS question now that the caller has
    // committed their answer — the questions endpoint withholds the key from
    // non-creators, so the play UI gets the reveal from here instead (it can
    // no longer leak the whole answer key in advance).
    const answer = {
      ...((answerResult.data ?? answerResult) as Record<string, unknown>),
      correct_answer: question.correct_answer ?? null,
      explanation: question.explanation ?? null,
    }

    if (pointsEarned > 0) {
      const participant = participants[0]
      await updateById('session_participants', String(participant.id), {
        score: Number(participant.score ?? 0) + pointsEarned,
      })
    }

    // sendTo targets a specific clientId; we use the answering user's id so
    // only they receive the personalised answer-result event.
    try {
      await sendTo(userId, 'answer-result', answer)
    } catch (err) {
      void err
    }
    return res.status(201).json(answer)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
