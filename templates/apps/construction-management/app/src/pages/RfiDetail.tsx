import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { STATUS_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDateTime } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface RfiResponse {
  id: string
  author: string
  body: string
  is_final: boolean
  created_at: string
}

interface Rfi {
  id: string
  project_id: string
  project: string
  number: number
  title: string
  question: string
  originator: string
  drawings_ref: string
  due_date: string | null
  status: string
  responses: RfiResponse[]
  created_at: string
}

export function RfiDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { rfiId } = useParams<{ projectId: string; rfiId: string }>()
  const [rfi, setRfi] = useState<Rfi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [body, setBody] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!rfiId) return
    setLoading(true)
    http
      .get(`/rfis/${rfiId}`)
      .then((res) => {
        if (!cancelled) setRfi(unwrapSingle<Rfi>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('rfis.notFound', {}, { defaultValue: 'RFI not found' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, rfiId, t])

  async function refresh(): Promise<void> {
    if (!rfiId) return
    const res = await http.get(`/rfis/${rfiId}`)
    setRfi(unwrapSingle<Rfi>(res))
  }

  async function handleRespond(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!rfiId) return
    setSaving(true)
    try {
      await http.post(`/rfis/${rfiId}/responses`, { body, is_final: isFinal })
      setBody('')
      setIsFinal(false)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('rfis.respondError', {}, { defaultValue: 'Failed to respond.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleClose(): Promise<void> {
    if (!rfiId) return
    try {
      await http.post(`/rfis/${rfiId}/status`, { status: 'closed' })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('rfis.closeError', {}, { defaultValue: 'Failed to close.' }),
      )
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !rfi) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link
          to="/projects"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('sm'),
            'text-primary hover:underline inline-block',
          )}
        >
          {t('projects.backToList', {}, { defaultValue: '← Back to projects' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <Link
          to={`/projects/${rfi.project_id}/rfis`}
          className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
        >
          {t('rfis.backToList', {}, { defaultValue: '← All RFIs' })}
        </Link>
        <div
          className={cm.cn(
            cm.sp('mt', 3),
            cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('rfis.numberLabel', { number: rfi.number }, { defaultValue: 'RFI #{{number}}' })} ·{' '}
              {rfi.originator}
              {rfi.drawings_ref ? ` · ${rfi.drawings_ref}` : ''}
            </p>
            <h1 className={cm.cn(cm.sp('mt', 1), cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {rfi.title}
            </h1>
          </div>
          <StatusBadge
            value={rfi.status}
            tone={STATUS_TONE[rfi.status] ?? 'neutral'}
            translationKeyPrefix="rfis.status"
          />
        </div>
      </header>

      {/* Question of record */}
      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('rfis.questionLabel', {}, { defaultValue: 'Question' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'leading-relaxed')}>
          {rfi.question}
        </p>
        <p className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'rfis.raisedAt',
            { date: formatDateTime(rfi.created_at) },
            { defaultValue: 'Raised {{date}}' },
          )}
        </p>
      </section>

      {/* Threaded answers */}
      {rfi.responses.length > 0 && (
        <section className={'space-y-3'}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {t('rfis.responsesLabel', {}, { defaultValue: 'Answers & clarifications' })}
          </h2>
          {rfi.responses.map((resp) => (
            <article
              key={resp.id}
              data-mol-id={`rfi-response-${resp.id}`}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 5),
                resp.is_final ? 'border-l-4 border-primary' : '',
              )}
            >
              <div
                className={cm.flex({
                  align: 'center',
                  justify: 'between',
                  gap: 'sm',
                  wrap: 'wrap',
                })}
              >
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{resp.author}</p>
                {resp.is_final ? (
                  <span
                    data-mol-id="rfi-final-marker"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-primary uppercase tracking-wider',
                    )}
                  >
                    {t('rfis.finalAnswer', {}, { defaultValue: 'Final answer' })}
                  </span>
                ) : null}
              </div>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                  'leading-relaxed',
                )}
              >
                {resp.body}
              </p>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
                {formatDateTime(resp.created_at)}
              </p>
            </article>
          ))}
        </section>
      )}

      {/* Respond */}
      {rfi.status !== 'closed' && (
        <form onSubmit={handleRespond} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
          <label className={'block space-y-1'}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('rfis.respondLabel', {}, { defaultValue: 'Add an answer or clarification' })}
            </span>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-mol-id="rfis-response-body"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface',
              )}
            />
          </label>
          <label className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="checkbox"
              checked={isFinal}
              onChange={(e) => setIsFinal(e.target.checked)}
              data-mol-id="rfis-response-final"
            />
            <span className={cm.textSize('sm')}>
              {t(
                'rfis.markFinal',
                {},
                { defaultValue: 'Mark as the final answer (sets the RFI to answered)' },
              )}
            </span>
          </label>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <button
              type="submit"
              disabled={saving}
              data-mol-id="rfis-response-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md brand-gradient text-on-primary disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('rfis.respond', {}, { defaultValue: 'Respond' })}
            </button>
            {rfi.status === 'answered' && (
              <button
                type="button"
                data-mol-id="rfis-close-button"
                onClick={handleClose}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-md border border-outline-variant hover:bg-surface-container',
                )}
              >
                {t('rfis.closeRfi', {}, { defaultValue: 'Close RFI' })}
              </button>
            )}
          </div>
        </form>
      )}

      {rfi.status === 'closed' && (
        <p
          className={cm.cn(cm.card(), cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'rfis.closedNote',
            {},
            { defaultValue: 'This RFI is closed — the final answer is the decision of record.' },
          )}
        </p>
      )}
    </div>
  )
}

export default RfiDetail
