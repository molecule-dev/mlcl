import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill, type StatusVariant } from '../components/StatusPill.js'

interface QuestionTypeOption {
  type: string
  icon: string
  label: string
  description: string
}

const QUESTION_TYPES: QuestionTypeOption[] = [
  {
    type: 'short_text',
    icon: 'short_text',
    label: 'Short text',
    description: 'Single-line free text input.',
  },
  {
    type: 'long_text',
    icon: 'subject',
    label: 'Long text',
    description: 'Multi-line response with character counter.',
  },
  {
    type: 'multi_choice',
    icon: 'radio_button_checked',
    label: 'Multiple choice',
    description: 'Pick one option from a list of choices.',
  },
  {
    type: 'nps',
    icon: 'sentiment_satisfied',
    label: 'NPS scale',
    description: 'Classic 0-10 likelihood-to-recommend scale.',
  },
  {
    type: 'rating',
    icon: 'star',
    label: 'Star rating',
    description: '1-5 stars with optional half-star precision.',
  },
]

interface BuilderQuestion {
  id: string
  type: string
  text: string
  description?: string | null
  required: boolean
  options?: unknown
  position?: number
}

interface SurveyApi {
  id: string
  title: string
  description: string
  status: string
  slug: string | null
  questions?: BuilderQuestion[]
}

function statusToVariant(status?: string): StatusVariant {
  switch (status) {
    case 'published':
      return 'active'
    case 'closed':
    case 'archived':
      return 'closed'
    default:
      return 'draft'
  }
}

function defaultLabelForType(type: string): string {
  const found = QUESTION_TYPES.find((q) => q.type === type)
  if (found) return found.label
  return type
}

export function Builder() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const surveyId = id ?? ''

  const [survey, setSurvey] = useState<SurveyApi | null>(null)
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!surveyId) return
    let cancelled = false
    setLoading(true)
    http
      .get<SurveyApi>(`/api/surveys/${surveyId}`)
      .then((response) => {
        if (cancelled) return
        const body = response?.data
        if (!body) return
        setSurvey(body)
        const sortedQs = [...(body.questions ?? [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        )
        setQuestions(sortedQs)
        if (sortedQs.length > 0 && !activeQuestionId) {
          setActiveQuestionId(sortedQs[0].id)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load survey.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, surveyId]) // activeQuestionId intentionally omitted — only initialize selection on load

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId) ?? null,
    [questions, activeQuestionId],
  )

  async function addQuestion(type: string) {
    if (!surveyId) return
    setError(null)
    try {
      const response = await http.post<BuilderQuestion>('/api/questions', {
        survey_id: surveyId,
        type,
        text: type === 'nps' ? 'How likely are you to recommend us?' : 'New question',
        required: false,
        ...(type === 'multi_choice' ? { options: ['Option 1', 'Option 2'] } : {}),
      })
      const created = response?.data
      if (created?.id) {
        setQuestions((qs) => [...qs, created])
        setActiveQuestionId(created.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add question.')
    }
  }

  async function deleteQuestion(qid: string) {
    setError(null)
    try {
      await http.delete(`/api/questions/${qid}`)
      const next = questions.filter((q) => q.id !== qid)
      setQuestions(next)
      if (activeQuestionId === qid) {
        setActiveQuestionId(next[0]?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete question.')
    }
  }

  async function patchQuestion(qid: string, patch: Partial<BuilderQuestion>) {
    setSaving(true)
    setError(null)
    try {
      const response = await http.patch<BuilderQuestion>(`/api/questions/${qid}`, patch)
      const updated = response?.data
      if (updated?.id) {
        setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...updated } : q)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update question.')
    } finally {
      setSaving(false)
    }
  }

  async function patchSurvey(patch: Partial<SurveyApi>) {
    if (!surveyId) return
    setSaving(true)
    setError(null)
    try {
      const response = await http.patch<SurveyApi>(`/api/surveys/${surveyId}`, patch)
      const updated = response?.data
      if (updated) setSurvey((s) => (s ? { ...s, ...updated } : updated))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save survey.')
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    if (!surveyId) return
    setPublishing(true)
    setError(null)
    try {
      const response = await http.post<SurveyApi>(`/api/surveys/${surveyId}/publish`)
      const updated = response?.data
      if (updated) {
        setSurvey((s) => (s ? { ...s, ...updated } : updated))
        navigate(`/surveys/${surveyId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish survey.')
    } finally {
      setPublishing(false)
    }
  }

  if (!surveyId) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('builder.missingId', {}, { defaultValue: 'Survey id is missing.' })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('builder.loading', {}, { defaultValue: 'Loading builder…' })}
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 6 }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.w('full'),
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <Link
          to={`/surveys/${surveyId}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'text-primary hover:underline uppercase tracking-widest',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
            arrow_back
          </span>
          {t('builder.back', {}, { defaultValue: 'Survey overview' })}
        </Link>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('builder.heading', {}, { defaultValue: 'Build your survey' })}
          </h1>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            {saving && (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
              </span>
            )}
            {survey?.status === 'draft' && (
              <button
                type="button"
                onClick={publish}
                disabled={publishing || questions.length === 0}
                data-testid="publish-survey"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  rocket_launch
                </span>
                {publishing
                  ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                  : t('common.publish', {}, { defaultValue: 'Publish' })}
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </header>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 5),
          'rounded-xl bg-surface border border-[color:var(--color-border)]',
        )}
      >
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('builder.surveyTitle', {}, { defaultValue: 'Survey title' })}
          </span>
          <input
            type="text"
            value={survey?.title ?? ''}
            onChange={(e) => setSurvey((s) => (s ? { ...s, title: e.target.value } : s))}
            onBlur={(e) => {
              if (survey && e.target.value !== survey.title) {
                patchSurvey({ title: e.target.value })
              }
            }}
            data-testid="survey-title-input"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('lg'),
              'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
            )}
          />
        </label>
      </section>

      <div
        className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-[260px_minmax(0,1fr)_320px]')}
      >
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3 }),
            cm.sp('p', 5),
            'rounded-xl bg-surface border border-[color:var(--color-border)]',
          )}
          aria-label={t('builder.paletteAria', {}, { defaultValue: 'Question palette' })}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('builder.paletteTitle', {}, { defaultValue: 'Add question' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {QUESTION_TYPES.map((option) => (
              <li key={option.type}>
                <button
                  type="button"
                  data-testid={`add-question-${option.type}`}
                  onClick={() => addQuestion(option.type)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 3 }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.w('full'),
                    'rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/5 transition-colors text-left',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      'rounded-md bg-primary/10 text-primary',
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                      aria-hidden="true"
                    >
                      {option.icon}
                    </span>
                  </span>
                  <span className={cm.cn(cm.flex({ direction: 'col' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {t(`builder.type.${option.type}.label`, {}, { defaultValue: option.label })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        `builder.type.${option.type}.description`,
                        {},
                        { defaultValue: option.description },
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 4 }),
            cm.sp('p', 6),
            'rounded-xl bg-surface border border-[color:var(--color-border)]',
          )}
          aria-label={t('builder.canvasAria', {}, { defaultValue: 'Survey canvas' })}
        >
          <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
            <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
              {t('builder.canvasTitle', {}, { defaultValue: 'Survey questions' })}
            </h2>
            <StatusPill variant={statusToVariant(survey?.status)} />
          </header>
          {questions.length === 0 ? (
            <div
              data-testid="builder-empty"
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 2 }),
                cm.sp('p', 8),
                'rounded-md border border-dashed border-[color:var(--color-border)] text-center',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 36 }}
                aria-hidden="true"
              >
                quiz
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'builder.empty',
                  {},
                  { defaultValue: 'No questions yet — pick a type from the palette to add one.' },
                )}
              </p>
            </div>
          ) : (
            <ul
              data-testid="builder-question-list"
              className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}
            >
              {questions.map((question, index) => {
                const active = question.id === activeQuestionId
                return (
                  <li key={question.id}>
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 2 }),
                        cm.sp('p', 5),
                        cm.w('full'),
                        'rounded-xl border bg-surface text-left transition-colors',
                        active
                          ? 'border-primary shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                          : 'border-[color:var(--color-border)] hover:border-primary/40',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveQuestionId(question.id)}
                        aria-pressed={active}
                        className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'text-left')}
                      >
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 2 }),
                            cm.fontWeight('bold'),
                            cm.textSize('xs'),
                            'uppercase tracking-widest text-primary',
                          )}
                        >
                          <span>
                            {t(
                              'builder.questionNumber',
                              { num: index + 1 },
                              { defaultValue: 'Q{{num}}' },
                            )}
                          </span>
                          <span className="text-on-surface-variant">
                            {t(
                              `builder.type.${question.type}.label`,
                              {},
                              { defaultValue: defaultLabelForType(question.type) },
                            )}
                          </span>
                          {question.required && (
                            <span className={cm.cn('text-danger')}>
                              {t('builder.required', {}, { defaultValue: 'Required' })}
                            </span>
                          )}
                        </div>
                        <p
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {question.text}
                        </p>
                      </button>
                      <div className={cm.cn(cm.flex({ gap: 2, justify: 'end' }))}>
                        <button
                          type="button"
                          data-testid={`delete-question-${question.id}`}
                          onClick={() => deleteQuestion(question.id)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('semibold'),
                            cm.textSize('xs'),
                            'rounded-md text-[color:var(--color-on-error)] hover:bg-error-light transition-colors',
                          )}
                        >
                          {t('common.delete', {}, { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3 }),
            cm.sp('p', 5),
            'rounded-xl bg-surface border border-[color:var(--color-border)]',
          )}
          aria-label={t('builder.propsAria', {}, { defaultValue: 'Question properties' })}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('builder.propsTitle', {}, { defaultValue: 'Properties' })}
          </h2>
          {!activeQuestion ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'builder.noQuestionSelected',
                {},
                { defaultValue: 'Pick a question to edit its properties.' },
              )}
            </p>
          ) : (
            <>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('builder.props.label', {}, { defaultValue: 'Question text' })}
                </span>
                <textarea
                  key={activeQuestion.id}
                  value={activeQuestion.text}
                  onChange={(e) =>
                    setQuestions((qs) =>
                      qs.map((q) =>
                        q.id === activeQuestion.id ? { ...q, text: e.target.value } : q,
                      ),
                    )
                  }
                  onBlur={(e) => {
                    if (e.target.value !== activeQuestion.text) {
                      patchQuestion(activeQuestion.id, { text: e.target.value })
                    } else {
                      patchQuestion(activeQuestion.id, { text: e.target.value })
                    }
                  }}
                  data-testid="question-text-input"
                  rows={3}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <input
                  type="checkbox"
                  checked={activeQuestion.required}
                  onChange={(e) => {
                    setQuestions((qs) =>
                      qs.map((q) =>
                        q.id === activeQuestion.id ? { ...q, required: e.target.checked } : q,
                      ),
                    )
                    patchQuestion(activeQuestion.id, { required: e.target.checked })
                  }}
                  data-testid="question-required-checkbox"
                  className="accent-primary"
                />
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  {t('builder.props.required', {}, { defaultValue: 'Required answer' })}
                </span>
              </label>
              {activeQuestion.type === 'multi_choice' && (
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('builder.props.options', {}, { defaultValue: 'Options (one per line)' })}
                  </span>
                  <textarea
                    rows={4}
                    defaultValue={
                      Array.isArray(activeQuestion.options)
                        ? (activeQuestion.options as string[]).join('\n')
                        : ''
                    }
                    onBlur={(e) => {
                      const lines = e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                      patchQuestion(activeQuestion.id, { options: lines })
                    }}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
                    )}
                  />
                </label>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Builder
