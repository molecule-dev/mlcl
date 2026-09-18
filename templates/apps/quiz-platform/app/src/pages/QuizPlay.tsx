import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SparqLogo } from '../components/SparqLogo.js'

interface QuestionRow {
  id: string
  prompt: string
  type: string
  choices: string[] | string | null
  // Withheld by the API for non-creators; the reveal comes from /answer instead.
  correct_answer?: string
  points: number
  time_limit_s: number
  position: number
}

interface QuizRow {
  id: string
  title: string
  time_per_question_s?: number
  scoring_mode?: 'speed' | 'flat'
}

const ANSWER_PALETTE = {
  A: { bg: 'from-rose-500 to-rose-600', tile: 'bg-rose-500/15 text-rose-100 border-rose-400/40' },
  B: { bg: 'from-blue-500 to-blue-600', tile: 'bg-blue-500/15 text-blue-100 border-blue-400/40' },
  C: {
    bg: 'from-amber-500 to-amber-600',
    tile: 'bg-amber-500/15 text-amber-100 border-amber-400/40',
  },
  D: {
    bg: 'from-emerald-500 to-emerald-600',
    tile: 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40',
  },
} as const

type AnswerKey = keyof typeof ANSWER_PALETTE
const KEYS: AnswerKey[] = ['A', 'B', 'C', 'D']

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function parseChoices(raw: QuestionRow['choices']): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // Invalid JSON stored in DB; fall back to empty choices array
      return []
    }
  }
  return []
}

export function QuizPlay() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id: quizId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const existingSessionId = searchParams.get('sessionId')
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(20)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)
  // The questions endpoint withholds correct_answer from non-creators, so the
  // post-answer reveal is sourced from the /answer response instead.
  const [revealedCorrect, setRevealedCorrect] = useState<string | null>(null)
  const startedAtRef = useRef<number>(0)

  const total = questions.length
  const question = questions[questionIndex]
  const choices = useMemo(() => (question ? parseChoices(question.choices) : []), [question])
  const showResult = selectedAnswer !== null

  const setupSession = useCallback(async () => {
    if (!quizId) return
    setLoading(true)
    setError(null)
    try {
      const [quizRes, qRes] = await Promise.all([
        http.get(`/api/quizzes/${quizId}`),
        http.get(`/api/questions/quiz/${quizId}`),
      ])
      const loadedQuiz = unwrap<QuizRow>(quizRes)
      const loadedQuestions = unwrap<QuestionRow[]>(qRes) ?? []
      if (!loadedQuiz || loadedQuestions.length === 0) {
        setError(t('quizPlay.empty', {}, { defaultValue: 'This quiz has no questions yet.' }))
        return
      }
      setQuestions(loadedQuestions)
      setSecondsLeft(loadedQuestions[0]?.time_limit_s ?? 20)

      let sessionToUse = existingSessionId
      if (sessionToUse) {
        // Caller (e.g. HostLobby) already created + started the session.
        // Make sure we are a participant; if join 409s we are already in.
        try {
          await http.post(`/api/sessions/${sessionToUse}/join`, { nickname: 'Host' })
        } catch (_error) {
          // 409 means already joined as Host — safe to ignore
        }
      } else {
        const sessionRes = await http.post('/api/sessions', { quiz_id: quizId })
        const newSession = unwrap<{ id: string }>(sessionRes)
        if (!newSession?.id) {
          setError(t('quizPlay.sessionFailed', {}, { defaultValue: 'Could not start a session.' }))
          return
        }
        await http.post(`/api/sessions/${newSession.id}/join`, { nickname: 'You' })
        await http.post(`/api/sessions/${newSession.id}/start`, {})
        sessionToUse = newSession.id
      }
      setSessionId(sessionToUse)
      startedAtRef.current = Date.now()
    } catch (err) {
      setError(
        t('quizPlay.error', {}, { defaultValue: 'Could not load this quiz. Please try again.' }),
      )
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [http, quizId, t, existingSessionId])

  useEffect(() => {
    void setupSession()
  }, [setupSession])

  useEffect(() => {
    if (showResult || loading || !question) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer)
          handleSubmit('')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, loading, questionIndex, question])

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (showResult || !sessionId || !question) return
      setSelectedAnswer(answer)
      const timeTakenMs = Math.max(0, Date.now() - startedAtRef.current)
      try {
        const res = await http.post(`/api/sessions/${sessionId}/answer`, {
          question_id: question.id,
          answer,
          time_taken_ms: timeTakenMs,
        })
        const resp = unwrap<{
          is_correct: boolean
          points_earned: number
          correct_answer?: string | null
        }>(res)
        setRevealedCorrect(resp?.correct_answer ?? null)
        if (resp?.is_correct) {
          setScore((s) => s + Number(resp.points_earned ?? 0))
          setStreak((s) => s + 1)
          setLastAnswerCorrect(true)
        } else {
          setStreak(0)
          setLastAnswerCorrect(false)
        }
      } catch (err) {
        console.error(err)
        setStreak(0)
        setLastAnswerCorrect(false)
      }
    },
    [http, question, sessionId, showResult],
  )

  function handleNext() {
    if (!sessionId) return
    if (questionIndex + 1 >= total) {
      // Best-effort: ask server to finish the session.
      void http.post(`/api/sessions/${sessionId}/next-question`, {}).catch(() => undefined)
      navigate(`/quiz/${quizId}/results?sessionId=${sessionId}`)
      return
    }
    const next = questions[questionIndex + 1]
    setQuestionIndex((i) => i + 1)
    setSecondsLeft(next?.time_limit_s ?? 20)
    setSelectedAnswer(null)
    setLastAnswerCorrect(null)
    setRevealedCorrect(null)
    startedAtRef.current = Date.now()
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-gradient-to-br from-[--quiz-gradient-from] via-primary to-[--quiz-gradient-to] text-white',
        )}
      >
        <div className={cm.cn(cm.textCenter)} data-testid="quiz-loading">
          <div
            className={cm.cn(
              'w-12 h-12 border-4 border-amber-300 border-t-transparent rounded-full animate-spin mx-auto mb-4',
            )}
          />
          <p className={cm.cn('text-sm font-bold uppercase tracking-widest opacity-80')}>
            {t('quizPlay.loading', {}, { defaultValue: 'Loading quiz…' })}
          </p>
        </div>
      </div>
    )
  }

  if (error || !question) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-gradient-to-br from-[--quiz-gradient-from] via-primary to-[--quiz-gradient-to] text-white',
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.maxW('md'), cm.sp('p', 8))}>
          <span
            className={cm.cn('material-symbols-outlined text-amber-300 text-6xl mb-4 inline-block')}
          >
            error
          </span>
          <p className={cm.cn('text-base font-bold mb-6')}>{error}</p>
          <button
            type="button"
            onClick={() => navigate(`/quiz/${quizId}`)}
            className={cm.cn(
              'px-6 py-3 rounded-2xl bg-amber-400 text-amber-950 font-extrabold text-sm uppercase tracking-widest',
            )}
          >
            {t('quizPlay.back', {}, { defaultValue: 'Back to quiz' })}
          </button>
        </div>
      </div>
    )
  }

  const timerPct = Math.max(
    0,
    Math.min(100, (secondsLeft / Math.max(1, question.time_limit_s)) * 100),
  )
  const isLow = timerPct <= 25
  const isMid = timerPct > 25 && timerPct <= 50

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-gradient-to-br from-[--quiz-gradient-from] via-primary to-[--quiz-gradient-to] text-white overflow-hidden relative',
      )}
      data-testid="quiz-play"
    >
      <span
        className={cm.cn(
          'absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-400/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <span
        className={cm.cn(
          'absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full bg-tertiary/30 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'relative z-10',
        )}
      >
        <SparqLogo size="sm" variant="onPrimary" />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/15 backdrop-blur-md text-[10px] font-black uppercase tracking-widest',
            )}
            data-testid="streak"
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              local_fire_department
            </span>
            {t('quizPlay.streak', { count: streak }, { defaultValue: '{{count}} streak' })}
          </span>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/25 backdrop-blur-md text-amber-100 border border-amber-300/30 text-[10px] font-black uppercase tracking-widest',
            )}
            data-testid="score"
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              stars
            </span>
            {t(
              'quizPlay.score',
              { score: score.toLocaleString() },
              { defaultValue: '{{score}} pts' },
            )}
          </span>
          <button
            type="button"
            onClick={() => navigate(`/quiz/${quizId}`)}
            className={cm.cn(
              'text-xs font-semibold text-white/80 hover:text-white transition-colors',
            )}
          >
            {t('quizPlay.exit', {}, { defaultValue: 'Exit' })}
          </button>
        </div>
      </header>

      <main
        className={cm.cn(
          cm.maxW('2xl'),
          'mx-auto',
          cm.sp('px', 8),
          cm.sp('py', 6),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), cm.sp('mb', 4))}>
          {Array.from({ length: total }).map((_, i) => {
            let segCls = 'bg-surface/15'
            if (i < questionIndex) segCls = 'bg-emerald-400'
            else if (i === questionIndex) segCls = 'bg-amber-400 animate-pulse'
            return <span key={i} className={cm.cn('flex-1 h-1.5 rounded-full', segCls)} />
          })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('mb', 6),
            'text-xs uppercase tracking-widest font-black opacity-80',
          )}
        >
          <span data-testid="question-counter">
            {t(
              'quizPlay.questionCounter',
              { current: questionIndex + 1, total },
              { defaultValue: 'Question {{current}} of {{total}}' },
            )}
          </span>
          <span
            className={cm.cn(
              'font-mono text-2xl tabular-nums',
              isLow ? 'text-rose-300' : isMid ? 'text-amber-300' : 'text-emerald-300',
            )}
            data-testid="timer"
          >
            {secondsLeft.toFixed(0).padStart(2, '0')}s
          </span>
        </div>

        <div className={cm.cn('h-2 rounded-full bg-surface/10 overflow-hidden mb-10')}>
          <div
            className={cm.cn(
              'h-full transition-[width] duration-1000 ease-linear rounded-full',
              isLow
                ? 'bg-gradient-to-r from-rose-500 to-rose-300'
                : isMid
                  ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-300',
            )}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <section
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] bg-surface/10 backdrop-blur-md border border-surface/20 shadow-2xl',
            cm.sp('p', 10),
            cm.sp('mb', 8),
          )}
        >
          <span
            className={cm.cn(
              'absolute -right-12 -top-12 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <p
            className={cm.cn(
              'text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug text-center relative z-10',
            )}
            data-testid="question-prompt"
          >
            {question.prompt}
          </p>
        </section>

        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}
          data-testid="answer-grid"
        >
          {choices.map((choice, idx) => {
            const key = KEYS[idx] ?? 'A'
            const palette = ANSWER_PALETTE[key]
            const isSelected = showResult && selectedAnswer === choice
            const isWinner = showResult && revealedCorrect !== null && choice === revealedCorrect
            const isLoser = isSelected && !isWinner
            const isMuted = showResult && !isWinner && !isSelected
            return (
              <button
                key={`${question.id}-${idx}`}
                type="button"
                onClick={() => handleSubmit(choice)}
                disabled={showResult}
                data-testid={`answer-${key}`}
                data-correct={isWinner ? 'true' : 'false'}
                className={cm.cn(
                  'group relative overflow-hidden rounded-2xl border-2 px-6 py-5 text-left transition-all',
                  isWinner
                    ? 'border-emerald-400 bg-emerald-500/30 shadow-lg shadow-emerald-500/20'
                    : isLoser
                      ? 'border-rose-400 bg-rose-500/30 shadow-lg shadow-rose-500/20'
                      : isMuted
                        ? 'border-surface/10 bg-surface/5 opacity-60'
                        : palette.tile + ' hover:scale-[1.02]',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
                  <span
                    className={cm.cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-md text-white bg-gradient-to-br',
                      palette.bg,
                    )}
                  >
                    {key}
                  </span>
                  <span className={cm.cn('text-base md:text-lg font-bold flex-1')}>{choice}</span>
                  {isWinner ? (
                    <span
                      className={cm.cn('material-symbols-outlined text-emerald-300 text-3xl')}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                  ) : isLoser ? (
                    <span
                      className={cm.cn('material-symbols-outlined text-rose-300 text-3xl')}
                      aria-hidden="true"
                    >
                      cancel
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {showResult ? (
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 8))}
            data-testid="answer-result"
          >
            <p className={cm.cn('text-sm font-bold')}>
              {lastAnswerCorrect
                ? t(
                    'quizPlay.feedback.correct',
                    {},
                    { defaultValue: '🔥 Spark earned — onto the next!' },
                  )
                : t(
                    'quizPlay.feedback.incorrect',
                    { correct: revealedCorrect ?? '' },
                    { defaultValue: 'The answer was {{correct}}. Keep going.' },
                  )}
            </p>
            <button
              type="button"
              onClick={handleNext}
              data-testid="next-question"
              className={cm.cn(
                'px-7 py-3 rounded-2xl bg-amber-400 text-amber-950 font-extrabold text-sm uppercase tracking-widest shadow-lg shadow-amber-400/30 hover:bg-amber-300 transition-colors',
              )}
            >
              {questionIndex + 1 >= total
                ? t('quizPlay.seeResults', {}, { defaultValue: 'See results' })
                : t('quizPlay.next', {}, { defaultValue: 'Next question' })}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default QuizPlay
