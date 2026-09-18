import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'
import { StatCard } from '../components/StatCard.js'

interface QuestionRow {
  id: string
  position: number
  question: string
  options: string[] | string
  correct_index: number
  explanation?: string
}

interface QuizPayload {
  id: string
  title: string
  questions: QuestionRow[]
}

interface AttemptRow {
  id: string
  score: number
  correct_count: number
  total_count: number
  answers: number[] | string
  created_at: string
}

const parseList = <T,>(raw: T[] | string | null | undefined): T[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T[]
    } catch (_error) {
      /* ignore — raw string is not JSON, return [] */
    }
  }
  return []
}

export function QuizResults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [quiz, setQuiz] = useState<QuizPayload | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get<QuizPayload>(`/api/quizzes/${id}`),
      http.get<AttemptRow[]>(`/api/quizzes/${id}/attempts`),
    ])
      .then(([quizRes, attemptsRes]) => {
        if (cancelled) return
        setQuiz(quizRes.data ?? null)
        setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('quizResults.error', {}, { defaultValue: 'Could not load quiz results.' }),
        )
        setAttempts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const latest = (attempts ?? [])[0]
  const allAnswers = parseList<number>(latest?.answers)
  const total = quiz?.questions.length ?? 0
  const correct = latest?.correct_count ?? 0
  const score = latest?.score ?? 0
  const incorrectCount = (latest?.total_count ?? total) - correct
  // We don't track skipped separately in DB — treat answers === -1 as skipped.
  const skipped = allAnswers.filter((a) => a === -1).length
  const incorrect = Math.max(0, incorrectCount - skipped)

  return (
    <div
      data-mol-id="page-quiz-results"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('quizResults.eyebrow', {}, { defaultValue: 'Results' })}
        title={t('quizResults.title', {}, { defaultValue: 'Quiz complete' })}
        subtitle={quiz?.title}
        actions={
          id ? (
            <Link
              to={`/quiz/${id}`}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-primary hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('quizResults.retry', {}, { defaultValue: 'Retry quiz' })}
            </Link>
          ) : null
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {quiz === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('quizResults.loading', {}, { defaultValue: 'Loading results…' })}
          </p>
        ) : !latest ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-3xl border border-dashed border-outline-variant/30',
            )}
          >
            <span
              className={
                'material-symbols-outlined text-5xl mb-3 opacity-50 text-on-surface-variant'
              }
              aria-hidden="true"
            >
              history
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'mb-1 text-on-surface',
              )}
            >
              {t('quizResults.empty.title', {}, { defaultValue: 'No attempts yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
              {t(
                'quizResults.empty.body',
                {},
                { defaultValue: 'Take this quiz to see your score breakdown here.' },
              )}
            </p>
          </div>
        ) : (
          <>
            <section
              className={cm.cn(
                cm.sp('p', 10),
                'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white',
              )}
            >
              <div
                className={
                  'relative z-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[200px_1fr]'
                }
              >
                <div
                  data-mol-id="results-score"
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                    'h-40 w-40 rounded-full bg-surface/15 backdrop-blur-md',
                  )}
                >
                  <span className="text-5xl font-extrabold tracking-tighter tabular-nums">
                    {score}
                    <span className={'text-2xl text-primary-fixed'}>%</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'mt-1 uppercase tracking-widest text-primary-fixed',
                    )}
                  >
                    {t('quizResults.score', {}, { defaultValue: 'Score' })}
                  </span>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary-fixed/80 mb-2',
                    )}
                  >
                    {t('form.summary', {}, { defaultValue: 'Summary' })}
                  </p>
                  <h2 className={'text-3xl font-extrabold tracking-tight mb-2'}>
                    {t(
                      'quizResults.tagline',
                      { score },
                      { defaultValue: '{{score}}% on this attempt' },
                    )}
                  </h2>
                  <p className="serif-text italic text-primary-fixed/90">
                    {t(
                      'quizResults.encouragement',
                      {},
                      {
                        defaultValue: 'Review the explanations below for the questions you missed.',
                      },
                    )}
                  </p>
                </div>
              </div>
              <div
                className={
                  'pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl'
                }
                aria-hidden="true"
              />
            </section>

            <section className={'grid grid-cols-3 gap-4'}>
              <StatCard
                tone="success"
                icon="check_circle"
                label={t('quizResults.kpi.correct', {}, { defaultValue: 'Correct' })}
                value={correct}
              />
              <StatCard
                tone="primary"
                icon="cancel"
                label={t('quizResults.kpi.incorrect', {}, { defaultValue: 'Incorrect' })}
                value={incorrect}
              />
              <StatCard
                tone="info"
                icon="remove_circle"
                label={t('quizResults.kpi.skipped', {}, { defaultValue: 'Skipped' })}
                value={skipped}
              />
            </section>

            <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('quizResults.review', {}, { defaultValue: 'Per-question review' })}
              </h3>
              <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {(quiz?.questions ?? []).map((q, i) => {
                  const userAnswer = allAnswers[i] ?? -1
                  const options = (() => {
                    if (Array.isArray(q.options)) return q.options.map(String)
                    if (typeof q.options === 'string') {
                      try {
                        const parsed = JSON.parse(q.options)
                        if (Array.isArray(parsed)) return parsed.map(String)
                      } catch (_error) {
                        /* ignore — options may be a plain string, fall back to [] */
                      }
                    }
                    return []
                  })()
                  const status: 'correct' | 'incorrect' | 'skipped' =
                    userAnswer === -1
                      ? 'skipped'
                      : userAnswer === q.correct_index
                        ? 'correct'
                        : 'incorrect'
                  const tone =
                    status === 'correct'
                      ? {
                          bg: 'bg-success-light/50',
                          fg: 'text-success',
                          icon: 'check_circle',
                          label: 'Correct',
                        }
                      : status === 'incorrect'
                        ? {
                            bg: 'bg-error-container',
                            fg: 'text-on-error-container',
                            icon: 'cancel',
                            label: 'Incorrect',
                          }
                        : {
                            bg: 'bg-surface-container-high',
                            fg: 'text-on-surface-variant',
                            icon: 'remove_circle',
                            label: 'Skipped',
                          }
                  return (
                    <li
                      key={q.id}
                      className={cm.cn(
                        cm.sp('p', 5),
                        'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
                        <span
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.flex({ align: 'center', justify: 'center' }),
                            'rounded-full font-bold tabular-nums text-sm bg-surface-container-high text-on-surface-variant',
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }))}>
                          <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            {q.question}
                          </p>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              'serif-text text-on-surface-variant',
                            )}
                          >
                            <span className={cm.fontWeight('bold')}>
                              {t('quizResults.your', {}, { defaultValue: 'Your answer:' })}
                            </span>{' '}
                            {userAnswer === -1 ? '—' : (options[userAnswer] ?? '?')} ·{' '}
                            <span className={cm.fontWeight('bold')}>
                              {t('quizResults.actual', {}, { defaultValue: 'Correct:' })}
                            </span>{' '}
                            {options[q.correct_index] ?? '?'}
                          </p>
                          {q.explanation ? (
                            <p
                              className={cm.cn(
                                cm.textSize('sm'),
                                'mt-2 serif-text italic text-on-surface-variant/80',
                              )}
                            >
                              {q.explanation}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full uppercase tracking-wider',
                            tone.bg,
                            tone.fg,
                          )}
                        >
                          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                            {tone.icon}
                          </span>
                          {t(`quizResults.status.${status}`, {}, { defaultValue: tone.label })}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          </>
        )}
      </PageBody>
    </div>
  )
}
