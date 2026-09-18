import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill, type StatusVariant } from '../components/StatusPill.js'

interface ResponseApi {
  id: string
  survey_id: string
  respondent_id: string | null
  respondent_email: string | null
  status: string
  score: string | number | null
  submitted_at: string
  answers: Record<string, unknown>
}

interface QuestionApi {
  id: string
  survey_id: string
  type: string
  text: string
  position?: number
}

interface SurveyApi {
  id: string
  title: string
  questions?: QuestionApi[]
}

function npsToVariant(score?: number | null): StatusVariant | null {
  if (score === undefined || score === null) return null
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

function answerLabel(answer: unknown): string {
  if (answer === null || answer === undefined) return '—'
  if (Array.isArray(answer)) return answer.map((x) => String(x)).join(', ')
  if (typeof answer === 'object') {
    try {
      return JSON.stringify(answer)
    } catch (_error) {
      // JSON.stringify failed (e.g. circular reference) — fall back to generic label
      return '[object]'
    }
  }
  return String(answer)
}

export function ResponseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id, responseId } = useParams<{ id: string; responseId: string }>()
  const surveyId = id ?? ''
  const respId = responseId ?? ''

  const [response, setResponse] = useState<ResponseApi | null>(null)
  const [survey, setSurvey] = useState<SurveyApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!respId || !surveyId) {
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.allSettled([
      http.get<ResponseApi>(`/api/responses/${respId}`),
      http.get<SurveyApi>(`/api/surveys/${surveyId}`),
    ])
      .then(([respResult, surveyResult]) => {
        if (cancelled) return
        if (respResult.status === 'fulfilled' && respResult.value?.data) {
          setResponse(respResult.value.data)
        } else if (respResult.status === 'rejected') {
          setError(
            respResult.reason instanceof Error
              ? respResult.reason.message
              : 'Could not load response.',
          )
        }
        if (surveyResult.status === 'fulfilled' && surveyResult.value?.data) {
          setSurvey(surveyResult.value.data)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, surveyId, respId])

  const score = typeof response?.score === 'string' ? Number(response.score) : response?.score
  const npsBucket = npsToVariant(typeof score === 'number' && Number.isFinite(score) ? score : null)
  const questions = (survey?.questions ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('responseDetail.loading', {}, { defaultValue: 'Loading response…' })}
      </div>
    )
  }

  if (!response) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {error ?? t('responseDetail.notFound', {}, { defaultValue: 'Response not found.' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, cm.w('full'))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <Link
          to={`/surveys/${surveyId}/responses`}
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
          {t('responseDetail.back', {}, { defaultValue: 'All responses' })}
        </Link>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            {npsBucket && <StatusPill variant={npsBucket} />}
            <span
              data-testid="response-id-label"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'responseDetail.id',
                { id: respId.slice(0, 8) },
                { defaultValue: 'Response {{id}}' },
              )}
            </span>
          </div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {response.respondent_email ??
              t('responseDetail.anonymous', {}, { defaultValue: 'Anonymous respondent' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'responseDetail.submittedAt',
              { ts: new Date(response.submitted_at).toLocaleString() },
              { defaultValue: 'Submitted {{ts}}' },
            )}
          </p>
        </div>
      </header>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('responseDetail.answersTitle', {}, { defaultValue: 'Answers' })}
        </h2>
        {questions.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'responseDetail.noAnswers',
              {},
              { defaultValue: 'No questions found for this survey.' },
            )}
          </p>
        ) : (
          <ul
            data-testid="response-answer-list"
            className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}
          >
            {questions.map((question, index) => {
              const value = response.answers?.[question.id]
              return (
                <li
                  key={question.id}
                  data-testid={`response-answer-${question.id}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 3 }),
                    cm.sp('p', 6),
                    'rounded-xl bg-surface border border-[color:var(--color-border)]',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-primary',
                    )}
                  >
                    <span>
                      {t(
                        'responseDetail.questionLabel',
                        { num: index + 1 },
                        { defaultValue: 'Q{{num}}' },
                      )}
                    </span>
                    <span className="text-on-surface-variant">
                      {t(
                        `responseDetail.type.${question.type}`,
                        {},
                        { defaultValue: question.type.replace('_', ' ') },
                      )}
                    </span>
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
                  <p
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      cm.textSize('base'),
                      'rounded-md bg-primary/5 text-on-surface whitespace-pre-wrap',
                    )}
                  >
                    {answerLabel(value)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ResponseDetail
