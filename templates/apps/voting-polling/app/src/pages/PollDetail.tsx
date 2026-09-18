import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LiveResultsHero } from '../components/LiveResultsHero.js'
import { PollStatusPill } from '../components/PollStatusPill.js'
import { type QuestionType, QuestionTypeBadge } from '../components/QuestionTypeBadge.js'
import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { unwrap } from '../lib/api.js'

interface PollRow {
  id: string
  title: string
  description?: string | null
  type: QuestionType
  status: 'draft' | 'active' | 'closed'
  options: unknown
  start_date?: string | null
  end_date?: string | null
  quorum_threshold?: number | null
  created_at?: string
  updated_at?: string
}

interface ResultsTally {
  poll_id: string
  type: string
  options?: Array<{ label: string; count?: number; score?: number }>
  total_votes: number
}

function statusToPill(s: string): 'live' | 'closed' | 'draft' | 'scheduled' {
  if (s === 'active') return 'live'
  if (s === 'closed') return 'closed'
  if (s === 'draft') return 'draft'
  return 'scheduled'
}

export function PollDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [poll, setPoll] = useState<PollRow | null>(null)
  const [tally, setTally] = useState<ResultsTally | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<
    null | 'publish' | 'close' | 'delete' | 'export'
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [pollRes, resultsRes] = await Promise.allSettled([
        http.get<PollRow>(`/api/polls/${id}`),
        http.get<ResultsTally>(`/api/results/${id}`),
      ])
      if (pollRes.status === 'fulfilled') {
        setPoll(unwrap<PollRow>(pollRes.value.data) ?? null)
      } else {
        setError(t('pollDetail.loadError', {}, { defaultValue: 'Could not load this poll.' }))
      }
      if (resultsRes.status === 'fulfilled') {
        setTally(unwrap<ResultsTally>(resultsRes.value.data) ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const heroOptions = useMemo(() => {
    if (!tally?.options) return []
    return tally.options.map((o, i) => ({
      id: `o-${i}`,
      label: o.label,
      votes: typeof o.count === 'number' ? o.count : Number(o.score ?? 0),
    }))
  }, [tally])

  async function handlePublish() {
    if (!poll) return
    setActionPending('publish')
    setActionError(null)
    try {
      await http.post(`/api/polls/${poll.id}/publish`, {})
      setActionMessage(
        t(
          'pollDetail.published',
          {},
          { defaultValue: 'Poll published — voters can now cast ballots.' },
        ),
      )
      await refresh()
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message,
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleClose() {
    if (!poll) return
    setActionPending('close')
    setActionError(null)
    try {
      await http.post(`/api/polls/${poll.id}/close`, {})
      setActionMessage(
        t('pollDetail.closed', {}, { defaultValue: 'Poll closed — final tally is sealed.' }),
      )
      await refresh()
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message,
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleDelete() {
    if (!poll) return
    setActionPending('delete')
    setActionError(null)
    try {
      await http.delete(`/api/polls/${poll.id}`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message,
      )
      setActionPending(null)
    }
  }

  async function handleExport() {
    if (!poll) return
    setActionPending('export')
    setActionError(null)
    try {
      const exportUrl = `/api/results/${poll.id}/export`
      const link = document.createElement('a')
      link.href = exportUrl
      link.download = `poll-${poll.id}-results.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setActionMessage(t('pollDetail.exported', {}, { defaultValue: 'Results exported as JSON.' }))
    } finally {
      setActionPending(null)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('pollDetail.loading', {}, { defaultValue: 'Loading poll…' })}
      </div>
    )
  }

  if (!poll) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        <p>{error ?? t('pollDetail.notFound', {}, { defaultValue: 'Poll not found.' })}</p>
        <Link
          to="/dashboard"
          className={cm.cn('mt-4 inline-block font-bold text-primary hover:underline')}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
      </div>
    )
  }

  const total = tally?.total_votes ?? 0
  const statusKey = statusToPill(poll.status)
  const quorumPct = poll.quorum_threshold ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.textSize('xs'),
                'text-primary hover:underline font-semibold uppercase tracking-wide',
              )}
            >
              ← {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </Link>
            <span className={cm.cn('text-on-surface-variant text-xs')}>/</span>
            <span className={cm.cn('text-xs font-mono text-on-surface-variant')}>
              {t('pollDetail.pollId', { id: poll.id }, { defaultValue: 'poll · {{id}}' })}
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
            data-test="polldetail-title"
          >
            {poll.title}
          </h1>
          {poll.description ? (
            <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>{poll.description}</p>
          ) : null}
          <div
            className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <PollStatusPill status={statusKey} emphasis />
            <QuestionTypeBadge type={poll.type} size="md" />
            <span className={cm.cn('text-xs font-semibold text-on-surface-variant')}>
              {t(
                'pollDetail.totalBallots',
                { count: total },
                { defaultValue: '{{count}} ballots' },
              )}
            </span>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {poll.status === 'draft' ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={actionPending === 'publish'}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
              )}
              data-test="polldetail-publish"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                publish
              </span>
              {actionPending === 'publish'
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('common.publish', {}, { defaultValue: 'Publish' })}
            </button>
          ) : null}
          {poll.status === 'active' ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={actionPending === 'close'}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-xl bg-warning text-on-primary shadow-md shadow-warning/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
              )}
              data-test="polldetail-close"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                lock_clock
              </span>
              {actionPending === 'close'
                ? t('pollDetail.closing', {}, { defaultValue: 'Closing…' })
                : t('pollDetail.close', {}, { defaultValue: 'Close ballot' })}
            </button>
          ) : null}
          {poll.status === 'draft' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={actionPending === 'delete'}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-error/10 hover:text-error disabled:opacity-50 transition-colors',
              )}
              data-test="polldetail-delete"
            >
              {actionPending === 'delete'
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('pollDetail.delete', {}, { defaultValue: 'Delete draft' })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleExport}
            disabled={actionPending === 'export'}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors',
            )}
            data-test="polldetail-export"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              download
            </span>
            {t('pollDetail.export', {}, { defaultValue: 'Export results' })}
          </button>
          {poll.status === 'active' ? (
            <Link
              to={`/vote/${poll.id}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
              )}
              data-test="polldetail-open-ballot"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                how_to_vote
              </span>
              {t('pollDetail.openBallot', {}, { defaultValue: 'Open ballot' })}
            </Link>
          ) : null}
          {poll.status === 'active' ? (
            <Link
              to={`/polls/${poll.id}/live`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary inline-flex items-center gap-2 hover:opacity-90 transition-opacity',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                query_stats
              </span>
              {t('pollDetail.openLive', {}, { defaultValue: 'Live results' })}
            </Link>
          ) : null}
        </div>
      </header>

      {actionError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div
          role="status"
          data-test="polldetail-status"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-success/30 bg-success/5 text-success text-sm font-semibold',
          )}
        >
          {actionMessage}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="how_to_vote"
          tone="primary"
          label={t('pollDetail.kpi.cast', {}, { defaultValue: 'Total ballots' })}
          value={total.toLocaleString()}
        />
        <QuorumKpiCard
          icon="balance"
          tone="accent"
          label={t('pollDetail.kpi.quorum', {}, { defaultValue: 'Quorum' })}
          value={quorumPct !== null ? `${quorumPct}` : '—'}
          hint={
            quorumPct !== null
              ? t(
                  'pollDetail.kpi.quorumHint',
                  {},
                  { defaultValue: 'Threshold of ballots to certify.' },
                )
              : ''
          }
        />
        <QuorumKpiCard
          icon="schedule"
          tone="warning"
          label={t('pollDetail.kpi.opened', {}, { defaultValue: 'Opened' })}
          value={
            poll.start_date
              ? new Date(poll.start_date).toLocaleString()
              : t('pollDetail.kpi.notStarted', {}, { defaultValue: 'Not started' })
          }
        />
        <QuorumKpiCard
          icon="verified"
          tone="navy"
          label={t('pollDetail.kpi.closed', {}, { defaultValue: 'Closed' })}
          value={poll.end_date ? new Date(poll.end_date).toLocaleString() : '—'}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-12')}>
          <LiveResultsHero
            eyebrow={t('pollDetail.heroEyebrow', {}, { defaultValue: 'Tally so far' })}
            title={poll.title}
            totalVotes={total}
            state={statusKey === 'closed' ? 'closed' : 'live'}
            options={heroOptions}
            caption={
              poll.status === 'closed'
                ? t(
                    'pollDetail.closedCaption',
                    {},
                    { defaultValue: 'Result sealed and certified.' },
                  )
                : poll.status === 'draft'
                  ? t(
                      'pollDetail.draftCaption',
                      {},
                      { defaultValue: 'Publish this poll to start collecting votes.' },
                    )
                  : t(
                      'pollDetail.liveCaption',
                      {},
                      { defaultValue: 'Live ballot — counts update on every refresh.' },
                    )
            }
          />
        </div>
      </div>
    </div>
  )
}
