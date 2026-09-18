import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BackendExercise {
  id: string
  type: string
  prompt: string
  choices: string | string[]
  correct_answer: string
  explanation: string
  xp_value: number | string
  position?: number | string
}

interface ParsedExercise {
  id: string
  type: string
  prompt: string
  options: string[]
  correctAnswer: string
  explanation: string
  xp: number
}

interface SubmitResponse {
  is_correct?: boolean
  xp_earned?: number
  correct_answer?: string
  explanation?: string
}

function parseChoices(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // JSON.parse failed; fall back to empty array as a safe default.
      return []
    }
  }
  return []
}

function adapt(row: BackendExercise): ParsedExercise {
  return {
    id: String(row.id),
    type: String(row.type ?? 'fill_blank'),
    prompt: String(row.prompt ?? ''),
    options: parseChoices(row.choices),
    correctAnswer: String(row.correct_answer ?? ''),
    explanation: String(row.explanation ?? ''),
    xp: Number(row.xp_value ?? 10),
  }
}

export function LessonDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string }>()

  const [exercises, setExercises] = useState<ParsedExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [activeIdx, setActiveIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [feedbackExplanation, setFeedbackExplanation] = useState<string>('')
  const [feedbackCorrect, setFeedbackCorrect] = useState<string>('')
  const [xpEarned, setXpEarned] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    http
      .get<BackendExercise[] | { data: BackendExercise[] }>(
        `/api/lessons/${encodeURIComponent(id)}/exercises`,
      )
      .then((res: unknown) => {
        if (cancelled) return
        const body =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data: BackendExercise[] | { data: BackendExercise[] } }).data
            : (res as BackendExercise[])
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: unknown })?.data)
            ? (body as { data: BackendExercise[] }).data
            : []
        const adapted = list.map(adapt).filter((e) => e.options.length > 0)
        setExercises(adapted)
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            t('lessonDetail.loadError', {}, { defaultValue: 'Could not load exercises.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const exercise = exercises[activeIdx]
  const progress = useMemo(
    () => (exercises.length === 0 ? 0 : Math.round(((activeIdx + 1) / exercises.length) * 100)),
    [activeIdx, exercises.length],
  )

  const handleCheck = async () => {
    if (!chosen || !exercise) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post<SubmitResponse>(
        `/api/exercises/${encodeURIComponent(exercise.id)}/submit`,
        {
          answer: chosen,
          time_taken_ms: 0,
        },
      )
      const body: SubmitResponse =
        (res && typeof res === 'object' && 'data' in res
          ? (res as { data: SubmitResponse }).data
          : (res as SubmitResponse)) ?? {}
      const isCorrect = Boolean(body.is_correct)
      const earnedXp = Number(body.xp_earned ?? 0)
      setFeedback(isCorrect ? 'correct' : 'wrong')
      setFeedbackExplanation(String(body.explanation ?? exercise.explanation))
      setFeedbackCorrect(String(body.correct_answer ?? exercise.correctAnswer))
      if (isCorrect) {
        setXpEarned((x) => x + earnedXp)
      } else {
        setHearts((h) => Math.max(0, h - 1))
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('lessonDetail.submitError', {}, { defaultValue: 'Could not submit answer.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (activeIdx + 1 < exercises.length) {
      setActiveIdx((i) => i + 1)
      setChosen(null)
      setFeedback(null)
      setFeedbackExplanation('')
      setFeedbackCorrect('')
      return
    }
    if (!user?.id || !id || completed) {
      navigate('/dashboard')
      return
    }
    setCompleted(true)
    try {
      await http.post(`/api/progress/user/${encodeURIComponent(user.id)}/complete-lesson`, {
        lesson_id: id,
        xp_earned: xpEarned,
      })
    } catch (_error) {
      // Progress POST is best-effort; navigate so the user is never stuck.
    }
    navigate('/dashboard')
  }

  const optionState = (opt: string): 'idle' | 'selected' | 'correct' | 'wrong' => {
    if (feedback === 'correct' && opt === exercise?.correctAnswer) return 'correct'
    if (feedback === 'wrong' && opt === chosen) return 'wrong'
    if (feedback === 'wrong' && opt === exercise?.correctAnswer) return 'correct'
    if (chosen === opt) return 'selected'
    return 'idle'
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('lessonDetail.loading', {}, { defaultValue: 'Loading lesson…' })}
      </div>
    )
  }

  if (loadError || exercises.length === 0) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, cm.stack(4))}>
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {loadError ??
            t('lessonDetail.empty', {}, { defaultValue: 'No exercises in this lesson.' })}
        </p>
        <Link to="/lessons" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('lessonDetail.backToLessons', {}, { defaultValue: '← Back to lessons' })}
        </Link>
      </div>
    )
  }

  if (!exercise) return null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, cm.stack(6))}>
      {/* Top bar — progress + hearts. */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <Link
          to="/lessons"
          aria-label={t('lessonDetail.exit', {}, { defaultValue: 'Exit lesson' })}
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            close
          </span>
        </Link>
        <div
          className={cm.cn(cm.flex1, 'h-3 rounded-full bg-surface-container-high overflow-hidden')}
        >
          <div
            className={cm.cn(
              'h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all',
            )}
            style={{ width: `${progress}%` }}
            data-testid="lesson-progress"
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            'text-error',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <span className={cm.cn('tabular-nums')} data-testid="lesson-hearts">
            {hearts}
          </span>
        </div>
      </div>

      <p
        className={cm.cn(
          cm.textSize('xs'),
          'font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('lessonDetail.lessonId', { id: id ?? '' }, { defaultValue: 'Lesson · {{id}}' })}
      </p>

      {/* Exercise card. */}
      <article
        className={cm.cn(
          cm.sp('p', 10),
          'rounded-3xl bg-surface-container-lowest shadow-lg border border-outline-variant/20',
        )}
      >
        <p className={cm.cn('font-black uppercase tracking-widest text-[10px] text-primary mb-3')}>
          {exercise.type === 'translation'
            ? t('lessonDetail.translation', {}, { defaultValue: 'Translate the phrase' })
            : exercise.type === 'pronunciation'
              ? t(
                  'lessonDetail.pronunciation',
                  {},
                  { defaultValue: 'Pick the right pronunciation' },
                )
              : t('lessonDetail.fillBlank', {}, { defaultValue: 'Fill in the blank' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'leading-snug',
          )}
        >
          {exercise.prompt}
        </h2>

        <div
          className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 sm:grid-cols-2')}
          data-testid="exercise-options"
        >
          {exercise.options.map((opt) => {
            const state = optionState(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={feedback !== null}
                onClick={() => setChosen(opt)}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'rounded-2xl border-2 transition-all text-left',
                  state === 'idle'
                    ? 'border-outline-variant/40 hover:border-primary hover:bg-primary-container/20'
                    : '',
                  state === 'selected' ? 'border-primary bg-primary-container/30 text-primary' : '',
                  state === 'correct' ? 'border-success bg-success-container/40 text-success' : '',
                  state === 'wrong' ? 'border-error bg-error-container/40 text-error' : '',
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </article>

      {/* Feedback strip. */}
      {feedback && (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
            'rounded-2xl',
            feedback === 'correct'
              ? 'bg-success-container/60 text-on-success-container'
              : 'bg-error-container/60 text-on-error-container',
          )}
          data-testid="lesson-feedback"
          data-feedback={feedback}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn('material-symbols-outlined text-3xl')}
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {feedback === 'correct' ? 'check_circle' : 'cancel'}
            </span>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'))}>
                {feedback === 'correct'
                  ? t('lessonDetail.correct', {}, { defaultValue: 'Brillante!' })
                  : t(
                      'lessonDetail.incorrect',
                      { answer: feedbackCorrect },
                      { defaultValue: 'Not quite — “{{answer}}”' },
                    )}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {feedbackExplanation ||
                  (feedback === 'correct'
                    ? t(
                        'lessonDetail.correctHint',
                        { xp: exercise.xp },
                        { defaultValue: '+{{xp}} XP. Keep going.' },
                      )
                    : t(
                        'lessonDetail.incorrectHint',
                        {},
                        { defaultValue: 'You’ll see this one again in tomorrow’s review.' },
                      ))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNext}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-on-surface text-surface uppercase tracking-widest hover:opacity-90 transition-opacity',
            )}
          >
            {activeIdx + 1 < exercises.length
              ? t('common.continue', {}, { defaultValue: 'Continue' })
              : t('lessonDetail.finish', {}, { defaultValue: 'Finish lesson' })}
          </button>
        </div>
      )}

      {submitError && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {submitError}
        </p>
      )}

      {/* Footer — earned XP + check button. */}
      {!feedback && (
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
            data-testid="lesson-xp"
          >
            {t('lessonDetail.xpEarned', { xp: xpEarned }, { defaultValue: 'XP earned · {{xp}}' })}
          </p>
          <button
            type="button"
            onClick={handleCheck}
            disabled={!chosen || submitting}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.roundedFull,
              'uppercase tracking-widest transition-all',
              chosen && !submitting
                ? 'bg-gradient-to-r from-primary to-primary-dark text-on-primary hover:shadow-lg hover:shadow-primary/30'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed',
            )}
          >
            {submitting
              ? t('lessonDetail.checking', {}, { defaultValue: 'Checking…' })
              : t('lessonDetail.check', {}, { defaultValue: 'Check' })}
          </button>
        </div>
      )}
    </div>
  )
}

export default LessonDetail
