import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface QuizQuestion {
  question: string
  options: string[]
  answer: number
}

interface TrainingModuleApi {
  id: string
  title: string
  description?: string | null
  content?: string | null
  duration_minutes?: number | null
  quiz?: QuizQuestion[] | string | null
}

interface TrainingProgressApi {
  id: string
  module_id: string
  started_at?: string | null
  completed_at?: string | null
  quiz_score?: number | null
}

function parseQuiz(quiz: TrainingModuleApi['quiz']): QuizQuestion[] {
  if (!quiz) return []
  if (typeof quiz === 'string') {
    try {
      const parsed = JSON.parse(quiz)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed — not valid JSON, fall back to empty quiz
      return []
    }
  }
  return Array.isArray(quiz) ? quiz : []
}

export function TrainingModule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [module, setModule] = useState<TrainingModuleApi | null>(null)
  const [progress, setProgress] = useState<TrainingProgressApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [quizMode, setQuizMode] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const reload = useCallback(async () => {
    if (!http || !id) return
    setLoading(true)
    try {
      const [moduleR, progressR] = await Promise.all([
        http.get<TrainingModuleApi>(`/api/training-modules/${id}`).then((r) => r.data),
        http
          .get<TrainingProgressApi[]>('/api/training-progress', { params: { module_id: id } })
          .then((r) => (r.data ?? [])[0] ?? null)
          .catch(() => null),
      ])
      setModule(moduleR)
      setProgress(progressR)
    } catch (_error) {
      // Fetch failed — clear module so the UI renders an empty/error state
      setModule(null)
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  const quiz = useMemo(() => parseQuiz(module?.quiz), [module?.quiz])

  const startModule = useCallback(async () => {
    if (!http || !id || busy) return
    setBusy(true)
    try {
      if (!progress) {
        await http.post('/api/training-progress', {
          module_id: id,
          started_at: new Date().toISOString(),
        })
      } else if (!progress.started_at) {
        await http.put(`/api/training-progress/${progress.id}`, {
          started_at: new Date().toISOString(),
        })
      }
      void track({ name: 'onboarding.training_started', properties: { module_id: id } })
      await reload()
    } catch (_error) {
      // Update failed — re-sync from the server so the UI reflects reality
      await reload()
    } finally {
      setBusy(false)
    }
  }, [http, id, busy, progress, reload])

  const markComplete = useCallback(
    async (score: number | null) => {
      if (!http || !id || busy) return
      setBusy(true)
      try {
        if (!progress) {
          await http.post('/api/training-progress', {
            module_id: id,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            quiz_score: score,
          })
        } else {
          await http.put(`/api/training-progress/${progress.id}`, {
            completed_at: new Date().toISOString(),
            quiz_score: score,
          })
        }
        void track({
          name: 'onboarding.training_completed',
          properties: { module_id: id, quiz_score: score },
        })
        await reload()
      } catch (_error) {
        // Update failed — re-sync from the server so the UI reflects reality
        await reload()
      } finally {
        setBusy(false)
      }
    },
    [http, id, busy, progress, reload],
  )

  const submitQuiz = useCallback(async () => {
    if (quiz.length === 0) return
    const correct = quiz.reduce((acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0), 0)
    const score = Math.round((correct / quiz.length) * 100)
    setSubmitted(true)
    if (score >= 80) {
      await markComplete(score)
    }
  }, [quiz, answers, markComplete])

  if (loading) {
    return (
      <div data-mol-id="page-training-module" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <p className={cm.textMuted}>
          {t('trainingModule.loading', {}, { defaultValue: 'Loading module…' })}
        </p>
      </div>
    )
  }

  if (!module) {
    return (
      <div data-mol-id="page-training-module" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
          <Link to="/training">
            {t('trainingModule.breadcrumb', {}, { defaultValue: 'Training' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <p className={cm.emptyStateTitle}>
            {t('trainingModule.notFound', {}, { defaultValue: 'Module not found' })}
          </p>
        </div>
      </div>
    )
  }

  const completed = !!progress?.completed_at
  const started = !!progress?.started_at
  const pct = completed ? 100 : started ? 50 : 0
  const moduleColor = '#dc2626'

  return (
    <div data-mol-id="page-training-module" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
        <Link to="/training">
          {t('trainingModule.breadcrumb', {}, { defaultValue: 'Training' })}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span data-mol-id="training-title">{module.title}</span>
      </nav>

      <section
        className={cm.cn(cm.sp('p', 8))}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '2rem',
          background:
            'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)',
          color: 'var(--mol-color-surface)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: '-80px',
            top: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(220, 38, 38, 0.30)',
            filter: 'blur(70px)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '999px',
            }}
          >
            {completed
              ? t('common.complete', {}, { defaultValue: 'Complete' })
              : started
                ? t('status.inProgress', {}, { defaultValue: 'In progress' })
                : t('trainingModule.statusNotStarted', {}, { defaultValue: 'Not started' })}
            {module.duration_minutes ? ` · ${module.duration_minutes} min` : ''}
          </span>
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05, marginTop: '16px' }}
          >
            {module.title}
          </h1>
          {module.description && (
            <p style={{ marginTop: '12px', maxWidth: '620px', color: 'rgba(255,255,255,0.92)' }}>
              {module.description}
            </p>
          )}

          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 6), 'flex-wrap')}
          >
            <div
              style={{
                flex: '0 0 240px',
                height: '8px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.22)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--mol-color-surface)',
                  transition: 'width 500ms ease-out',
                }}
              />
            </div>
            <span data-mol-id="training-progress-pct" className="font-bold tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '32px',
        }}
      >
        <section>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-xl tracking-tight')}>
            {t('trainingModule.contentHeading', {}, { defaultValue: 'Module' })}
          </h2>
          <article
            className={cm.sp('p', 6)}
            style={{
              background: 'var(--color-surface, var(--mol-color-surface))',
              border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
              borderRadius: '12px',
              borderLeft: `3px solid ${moduleColor}`,
            }}
          >
            <p className={cm.cn('leading-relaxed')} style={{ whiteSpace: 'pre-wrap' }}>
              {module.content ??
                t(
                  'trainingModule.noContent',
                  {},
                  { defaultValue: 'No content yet for this module.' },
                )}
            </p>
            {!completed && !started && (
              <button
                type="button"
                data-mol-id="training-start-button"
                disabled={busy}
                onClick={() => void startModule()}
                className="font-bold uppercase tracking-[0.14em] transition-colors"
                style={{
                  marginTop: '20px',
                  padding: '12px 18px',
                  borderRadius: '999px',
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                  color: 'var(--mol-color-surface)',
                  border: 'none',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {t('trainingModule.start', {}, { defaultValue: 'Start module' })}
              </button>
            )}
            {started && !completed && quiz.length === 0 && (
              <button
                type="button"
                data-mol-id="training-mark-complete-button"
                disabled={busy}
                onClick={() => void markComplete(null)}
                className="font-bold uppercase tracking-[0.14em] transition-colors"
                style={{
                  marginTop: '20px',
                  padding: '12px 18px',
                  borderRadius: '999px',
                  background:
                    'linear-gradient(135deg, var(--mol-color-success) 0%, var(--mol-color-primary) 100%)',
                  color: 'var(--mol-color-surface)',
                  border: 'none',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {t('trainingModule.markComplete', {}, { defaultValue: 'Mark complete' })}
              </button>
            )}
          </article>
        </section>

        <aside
          className={cm.sp('p', 6)}
          style={{
            background: 'var(--color-surface, var(--mol-color-surface))',
            borderRadius: '20px',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            {t('trainingModule.quizHeading', {}, { defaultValue: 'End-of-module quiz' })}
          </p>
          {quiz.length === 0 ? (
            <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm')}>
              {t('trainingModule.quizNone', {}, { defaultValue: 'No quiz on this module.' })}
            </p>
          ) : (
            <>
              <h3
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-lg tracking-tight')}
              >
                {t(
                  'trainingModule.quizTitle',
                  { count: quiz.length },
                  { defaultValue: `${quiz.length} questions` },
                )}
              </h3>
              <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm leading-relaxed')}>
                {t(
                  'trainingModule.quizBody',
                  {},
                  {
                    defaultValue: 'Score 80% or more to mark this module complete.',
                  },
                )}
              </p>
              {!quizMode ? (
                <button
                  type="button"
                  data-mol-id="training-quiz-start-button"
                  disabled={!started || completed}
                  onClick={() => setQuizMode(true)}
                  className="font-bold transition-all"
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '12px',
                    width: '100%',
                    background:
                      !started || completed
                        ? 'transparent'
                        : 'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                    color:
                      !started || completed
                        ? 'var(--color-foreground-secondary, var(--mol-color-text-secondary))'
                        : 'var(--mol-color-surface)',
                    border:
                      !started || completed
                        ? '1px solid var(--color-border, var(--mol-color-border-secondary))'
                        : 'none',
                    cursor: !started || completed ? 'not-allowed' : 'pointer',
                    opacity: !started || completed ? 0.7 : 1,
                  }}
                >
                  {completed
                    ? t(
                        'trainingModule.quizDone',
                        { score: progress?.quiz_score ?? 0 },
                        {
                          defaultValue:
                            progress?.quiz_score != null
                              ? `Passed (${progress.quiz_score}%)`
                              : 'Complete',
                        },
                      )
                    : !started
                      ? t(
                          'trainingModule.quizLocked',
                          {},
                          { defaultValue: 'Start the module first' },
                        )
                      : t('trainingModule.quizStart', {}, { defaultValue: 'Start quiz' })}
                </button>
              ) : (
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mt', 4))}>
                  {quiz.map((q, idx) => (
                    <div key={idx} data-mol-id={`quiz-question-${idx}`}>
                      <p className={cm.fontWeight('semibold')}>
                        {idx + 1}. {q.question}
                      </p>
                      <div
                        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 2))}
                      >
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'sm' }),
                              'text-sm cursor-pointer',
                            )}
                          >
                            <input
                              type="radio"
                              name={`q${idx}`}
                              checked={answers[idx] === oIdx}
                              onChange={() => setAnswers((prev) => ({ ...prev, [idx]: oIdx }))}
                              disabled={submitted}
                            />
                            <span
                              style={{
                                color: submitted
                                  ? oIdx === q.answer
                                    ? 'var(--mol-color-success)'
                                    : answers[idx] === oIdx
                                      ? 'var(--mol-color-error)'
                                      : undefined
                                  : undefined,
                                fontWeight: submitted && oIdx === q.answer ? 600 : undefined,
                              }}
                            >
                              {opt}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!submitted ? (
                    <button
                      type="button"
                      data-mol-id="training-quiz-submit-button"
                      disabled={Object.keys(answers).length !== quiz.length || busy}
                      onClick={() => void submitQuiz()}
                      className="font-bold"
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background:
                          'linear-gradient(135deg, var(--mol-color-success) 0%, var(--mol-color-primary) 100%)',
                        color: 'var(--mol-color-surface)',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: Object.keys(answers).length !== quiz.length || busy ? 0.5 : 1,
                      }}
                    >
                      {t('trainingModule.quizSubmit', {}, { defaultValue: 'Submit answers' })}
                    </button>
                  ) : (
                    (() => {
                      const correct = quiz.reduce(
                        (acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0),
                        0,
                      )
                      const score = Math.round((correct / quiz.length) * 100)
                      const passed = score >= 80
                      return (
                        <>
                          <p
                            className={cm.cn(cm.fontWeight('bold'), 'text-sm')}
                            data-mol-id="training-quiz-result"
                          >
                            {passed
                              ? t(
                                  'trainingModule.quizPassed',
                                  { score },
                                  { defaultValue: `Passed with ${score}% — module complete.` },
                                )
                              : t(
                                  'trainingModule.quizFailed',
                                  { score },
                                  { defaultValue: `${score}% — review and try again.` },
                                )}
                          </p>
                          {!passed && (
                            <button
                              type="button"
                              data-mol-id="training-quiz-retry-button"
                              onClick={() => {
                                setAnswers({})
                                setSubmitted(false)
                              }}
                              className="font-bold"
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'transparent',
                                color: 'var(--mol-color-primary)',
                                border: '1px solid var(--mol-color-primary)',
                                cursor: 'pointer',
                              }}
                            >
                              {t('trainingModule.quizRetry', {}, { defaultValue: 'Try again' })}
                            </button>
                          )}
                        </>
                      )
                    })()
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
