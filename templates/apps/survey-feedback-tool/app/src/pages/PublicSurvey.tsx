import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Question {
  id: string
  type: string
  text: string
  description?: string | null
  required: boolean
  options?: unknown
  position?: number
}

interface PublicSurveyApi {
  id: string
  title: string
  description: string
  status: string
  slug: string | null
  questions?: Question[]
}

type AnswerValue = number | string | string[]
type AnswerMap = Record<string, AnswerValue>

function parseOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.filter((opt): opt is string => typeof opt === 'string')
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      if (Array.isArray(parsed)) {
        return parsed.filter((opt): opt is string => typeof opt === 'string')
      }
    } catch (_error) {
      // JSON.parse failed — fall back to empty options array
      return []
    }
  }
  return []
}

export function PublicSurvey() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { slug = '' } = useParams<{ slug?: string }>()
  const navigate = useNavigate()

  const [survey, setSurvey] = useState<PublicSurveyApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError(t('publicSurvey.missingSlug', {}, { defaultValue: 'No survey link provided.' }))
      return
    }
    let cancelled = false
    http
      .get<PublicSurveyApi>(`/api/surveys/by-slug/${slug}`)
      .then((response) => {
        if (cancelled) return
        const body = response?.data
        if (!body || !body.id) {
          setError(
            t(
              'publicSurvey.notFound',
              {},
              { defaultValue: 'Survey not found or no longer available.' },
            ),
          )
          return
        }
        if (body.status !== 'published') {
          setError(
            t(
              'publicSurvey.closed',
              {},
              { defaultValue: 'This survey is not currently accepting responses.' },
            ),
          )
          return
        }
        setSurvey(body)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t(
            'publicSurvey.notFound',
            {},
            { defaultValue: 'Survey not found or no longer available.' },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, slug, t])

  const questions = useMemo(() => {
    return [...(survey?.questions ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [survey])

  const total = questions.length
  const question = total > 0 ? questions[stepIndex] : null
  const progress = total === 0 ? 0 : Math.round(((stepIndex + 1) / total) * 100)
  const answered = question ? answers[question.id] !== undefined : true
  const canAdvance = !question || !question.required || answered

  function setAnswer(value: AnswerValue) {
    if (!question) return
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  async function submit() {
    if (!survey || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const npsQuestion = questions.find((q) => q.type === 'nps')
    const npsAnswer = npsQuestion ? answers[npsQuestion.id] : undefined
    const score = typeof npsAnswer === 'number' ? npsAnswer : null
    try {
      await http.post('/api/responses', {
        survey_id: survey.id,
        answers,
        status: 'completed',
        ...(score !== null ? { score } : {}),
      })
      // Domain event: the public-survey conversion point.
      void track({
        name: 'response.submitted',
        properties: {
          survey_id: String(survey.id),
          question_count: total,
          score,
        },
      })
      navigate(`/s/${slug}/thank-you`)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('publicSurvey.submitError', {}, { defaultValue: 'Could not submit your response.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (!canAdvance) return
    setSubmitError(null)
    if (stepIndex < total - 1) {
      setStepIndex((prev) => prev + 1)
      return
    }
    submit()
  }

  function previous() {
    if (stepIndex > 0) setStepIndex((prev) => prev - 1)
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-gradient-to-br from-[var(--color-bg-tertiary)] via-[var(--color-bg)] to-[var(--color-bg-tertiary)] dark:from-[var(--color-bg)] dark:via-[var(--color-bg-secondary)] dark:to-[var(--color-bg)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.w('full'),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-secondary text-white',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              graphic_eq
            </span>
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'tracking-tight')}>{APP_NAME}</span>
        </div>
        {total > 0 && (
          <span
            data-testid="public-survey-progress"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'publicSurvey.progress',
              { current: stepIndex + 1, total },
              { defaultValue: 'Question {{current}} of {{total}}' },
            )}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.w('full'), cm.sp('px', 6))}>
          <div
            className={cm.cn(
              cm.h(2),
              cm.w('full'),
              'rounded-full bg-surface-secondary overflow-hidden',
            )}
            aria-hidden="true"
          >
            <div
              className={cm.cn(
                cm.h('full'),
                'bg-gradient-to-r from-primary to-secondary transition-all duration-300',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 12),
          cm.maxW('2xl'),
          cm.mxAuto,
          cm.w('full'),
        )}
      >
        {loading ? (
          <div
            data-testid="public-survey-loading"
            className={cm.cn(cm.sp('p', 8), 'text-center text-on-surface-variant')}
          >
            {t('publicSurvey.loading', {}, { defaultValue: 'Loading survey…' })}
          </div>
        ) : error ? (
          <article
            data-testid="public-survey-error"
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('p', 8),
              'rounded-[1.5rem] bg-surface shadow-lg border border-[color:var(--color-border)] text-center',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 36 }}
              aria-hidden="true"
            >
              info
            </span>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface')}>{error}</p>
          </article>
        ) : !survey || total === 0 ? (
          <article
            data-testid="public-survey-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('p', 8),
              'rounded-[1.5rem] bg-surface shadow-lg border border-[color:var(--color-border)] text-center',
            )}
          >
            <h1
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {survey?.title ??
                t('publicSurvey.noQuestionsTitle', {}, { defaultValue: 'Survey is empty' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'publicSurvey.noQuestions',
                {},
                { defaultValue: 'This survey has no questions yet. Check back soon.' },
              )}
            </p>
          </article>
        ) : (
          <article
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 6 }),
              cm.sp('p', 8),
              'rounded-[1.5rem] bg-surface shadow-lg border border-[color:var(--color-border)]',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-primary',
                )}
              >
                {t(
                  'publicSurvey.questionLabel',
                  { num: stepIndex + 1 },
                  { defaultValue: 'Question {{num}}' },
                )}
                {question?.required && (
                  <span className={cm.cn(cm.sp('ml', 2), 'text-danger')}>
                    {t('publicSurvey.required', {}, { defaultValue: 'Required' })}
                  </span>
                )}
              </span>
              <h1
                data-testid="public-survey-question"
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface leading-snug',
                )}
              >
                {question?.text}
              </h1>
              {question?.description && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {question.description}
                </p>
              )}
            </div>

            {question?.type === 'nps' && (
              <div className={cm.cn(cm.flex({ gap: 1 }), 'flex-wrap')} role="radiogroup">
                {Array.from({ length: 11 }).map((_, score) => {
                  const value = answers[question.id]
                  const selected = value === score
                  return (
                    <button
                      key={score}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`nps-${score}`}
                      onClick={() => setAnswer(score)}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.flex1,
                        cm.fontWeight('bold'),
                        cm.textSize('lg'),
                        'h-12 min-w-[40px] rounded-md tabular-nums transition-colors',
                        selected
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-surface-secondary text-on-surface hover:border-primary border border-[color:var(--color-border)]',
                      )}
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
            )}

            {(question?.type === 'multi_choice' || question?.type === 'single_choice') && (
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))} role="radiogroup">
                {parseOptions(question.options).map((opt) => {
                  const selected = answers[question.id] === opt
                  return (
                    <li key={opt}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAnswer(opt)}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 3 }),
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.w('full'),
                          cm.fontWeight('semibold'),
                          'rounded-md border text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10 text-on-surface'
                            : 'border-[color:var(--color-border)] text-on-surface hover:border-primary/40',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(5),
                            cm.h(5),
                            cm.roundedFull,
                            'border-2',
                            selected
                              ? 'border-primary'
                              : 'border-[color:var(--color-border-secondary)]',
                          )}
                        >
                          {selected && (
                            <span
                              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}
                            />
                          )}
                        </span>
                        <span>{opt}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {question?.type === 'rating' && (
              <div className={cm.cn(cm.flex({ gap: 1 }), 'flex-wrap')} role="radiogroup">
                {[1, 2, 3, 4, 5].map((value) => {
                  const raw = answers[question.id]
                  const current = typeof raw === 'number' ? raw : 0
                  const selected = current === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(
                        'publicSurvey.stars',
                        { count: value },
                        { defaultValue: '{{count}} star(s)' },
                      )}
                      data-testid={`rating-${value}`}
                      onClick={() => setAnswer(value)}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.flex1,
                        'h-12 min-w-[48px] rounded-md border transition-colors',
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-[color:var(--color-border)] bg-surface-secondary hover:border-primary/40',
                      )}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 26,
                          color: current >= value ? 'var(--color-primary)' : undefined,
                          opacity: current >= value ? 1 : 0.35,
                        }}
                        aria-hidden="true"
                      >
                        star
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {question?.type === 'long_text' && (
              <textarea
                value={
                  typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''
                }
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                data-testid="long-text-answer"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('base'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
                )}
                placeholder={t(
                  'publicSurvey.longTextPlaceholder',
                  {},
                  { defaultValue: 'Tell us in your own words…' },
                )}
              />
            )}

            {question?.type === 'number' && (
              <input
                type="number"
                value={
                  typeof answers[question.id] === 'number'
                    ? String(answers[question.id])
                    : typeof answers[question.id] === 'string'
                      ? (answers[question.id] as string)
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    setAnswer('')
                  } else {
                    const n = Number(v)
                    setAnswer(Number.isFinite(n) ? n : v)
                  }
                }}
                data-testid="number-answer"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('base'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
                )}
                placeholder={t(
                  'publicSurvey.numberPlaceholder',
                  {},
                  { defaultValue: 'Enter a number…' },
                )}
              />
            )}

            {question?.type === 'short_text' && (
              <input
                type="text"
                value={
                  typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''
                }
                onChange={(e) => setAnswer(e.target.value)}
                data-testid="short-text-answer"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('base'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
                )}
                placeholder={t(
                  'publicSurvey.shortTextPlaceholder',
                  {},
                  { defaultValue: 'Type your answer…' },
                )}
              />
            )}

            {submitError && (
              <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
                {submitError}
              </p>
            )}

            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
              <button
                type="button"
                onClick={previous}
                disabled={stepIndex === 0}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-md text-on-surface-variant hover:text-primary disabled:opacity-50 disabled:hover:text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  arrow_back
                </span>
                {t('common.back', {}, { defaultValue: 'Back' })}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance || submitting}
                data-testid={stepIndex === total - 1 ? 'submit-response' : 'next-question'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60',
                )}
              >
                {submitting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : stepIndex === total - 1
                    ? t('common.submit', {}, { defaultValue: 'Submit' })
                    : t('publicSurvey.next', {}, { defaultValue: 'Next' })}
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </button>
            </div>
          </article>
        )}

        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 6),
            'text-center text-on-surface-variant',
          )}
        >
          {t(
            'publicSurvey.poweredBy',
            { app: APP_NAME },
            {
              defaultValue: 'Powered by {{app}} — your responses stay anonymous unless you opt in.',
            },
          )}
          {' · '}
          <Link to="/" className={cm.cn('text-primary hover:underline')}>
            {t('publicSurvey.learnMore', {}, { defaultValue: 'Learn more' })}
          </Link>
        </p>
      </main>
    </div>
  )
}

export default PublicSurvey
