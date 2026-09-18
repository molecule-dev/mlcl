import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from '../components/StatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const VALID_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const

interface IncidentUpdate {
  id: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  message: string
  created_at: string
  author?: string
}

interface IncidentDetailData {
  id: string
  title: string
  message?: string | null
  impact: 'minor' | 'major' | 'critical' | 'maintenance'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  affected_components?: string[]
  created_at: string
  resolved_at?: string | null
  latest_update?: IncidentUpdate | null
  updates?: IncidentUpdate[]
}

const IMPACT_ACCENT: Record<IncidentDetailData['impact'], string> = {
  minor: '#f59e0b',
  major: '#f97316',
  critical: '#ef4444',
  maintenance: '#6366f1',
}

const STATUS_LABEL: Record<IncidentUpdate['status'], string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
}

const STATUS_COLOR: Record<IncidentUpdate['status'], string> = {
  investigating: '#ef4444',
  identified: '#f97316',
  monitoring: '#f59e0b',
  resolved: '#10b981',
}

// The same status color, resolved for TEXT. STATUS_COLOR above is the vivid
// accent used for the dot next to this label — fine as a graphic (3:1), but
// critical red measures 4.38:1 on the card surface and fails AA for 12px text.
// See theme.css → --color-status-*-text.
const STATUS_TEXT_COLOR: Record<keyof typeof STATUS_COLOR, string> = {
  investigating: 'var(--color-status-critical-text)',
  identified: 'var(--color-status-major-text)',
  monitoring: 'var(--color-status-minor-text)',
  resolved: 'var(--color-status-resolved-text)',
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = d.getUTCDate()
  const hh = d.getUTCHours().toString().padStart(2, '0')
  const mm = d.getUTCMinutes().toString().padStart(2, '0')
  return `${month} ${day} · ${hh}:${mm} UTC`
}

export function IncidentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [incident, setIncident] = useState<IncidentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribersCount, setSubscribersCount] = useState<number | null>(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [draftStatus, setDraftStatus] = useState<(typeof VALID_STATUSES)[number]>('investigating')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const draftKey = id ? `vigil:incident-draft:${id}` : null

  const reload = async () => {
    if (!id) return
    const res = await http.get(`/api/incidents/${id}`)
    const single = unwrapSingle<IncidentDetailData>(res)
    if (single) {
      setIncident(single)
      if (single.status && draftStatus === 'investigating') setDraftStatus(single.status)
    } else {
      const listRes = await http.get('/api/incidents')
      const list = unwrapList<IncidentDetailData>(listRes)
      const found = list.find((i) => i.id === id) ?? null
      setIncident(found)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    if (draftKey) {
      try {
        const stored = window.localStorage.getItem(draftKey)
        if (stored) setDraftMessage(stored)
      } catch (_error) {
        // localStorage unavailable in this environment — draft restore is best-effort
      }
    }

    Promise.all([http.get(`/api/incidents/${id}`), http.get('/api/subscribers').catch(() => null)])
      .then(([incRes, subsRes]) => {
        if (cancelled) return
        const single = unwrapSingle<IncidentDetailData>(incRes)
        if (single) {
          setIncident(single)
          if (single.status) setDraftStatus(single.status)
        } else {
          return http.get('/api/incidents').then((listRes) => {
            const list = unwrapList<IncidentDetailData>(listRes)
            const found = list.find((i) => i.id === id) ?? null
            if (!cancelled) setIncident(found)
          })
        }
        if (subsRes && !cancelled) {
          const list = unwrapList<unknown>(subsRes)
          setSubscribersCount(Array.isArray(list) ? list.length : 0)
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('incidentDetail.loadError', {}, { defaultValue: 'Failed to load incident.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id, t])

  const updates = useMemo<IncidentUpdate[]>(() => {
    if (!incident || !incident.updates) return []
    return incident.updates
  }, [incident])

  const saveDraft = () => {
    if (!draftKey) return
    try {
      window.localStorage.setItem(draftKey, draftMessage)
    } catch (_error) {
      // localStorage unavailable — draft save is best-effort
    }
  }

  const postUpdate = async () => {
    if (!incident || !draftMessage.trim()) return
    setPosting(true)
    setPostError(null)
    try {
      await http.post(`/api/incidents/${incident.id}/updates`, {
        status: draftStatus,
        message: draftMessage.trim(),
      })
      if (draftKey) {
        try {
          window.localStorage.removeItem(draftKey)
        } catch (_error) {
          // localStorage unavailable — draft cleanup is best-effort
        }
      }
      setDraftMessage('')
      await reload()
    } catch (err) {
      setPostError(
        err instanceof Error
          ? err.message
          : t('incidentDetail.postError', {}, { defaultValue: 'Could not post update' }),
      )
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('incidentDetail.loading', {}, { defaultValue: 'Loading incident…' })}
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-error')}>
        {error ?? t('incidentDetail.notFound', {}, { defaultValue: 'Incident not found.' })}
      </div>
    )
  }

  const accent = IMPACT_ACCENT[incident.impact]
  const ms = incident.resolved_at
    ? new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()
    : Date.now() - new Date(incident.created_at).getTime()
  const minutes = Math.max(1, Math.round(ms / 60_000))
  const duration =
    minutes < 60
      ? `${minutes}m`
      : `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, '0')}m`

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-incident-detail">
      <nav className={cm.cn('mb-6')}>
        <Link
          to="/incidents"
          className={cm.cn(
            'inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('incidentDetail.backToList', {}, { defaultValue: 'All incidents' })}
        </Link>
      </nav>

      <header
        className={cm.cn('relative overflow-hidden rounded-2xl p-8 mb-8')}
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid var(--color-border-card)',
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: `${accent}33` }}
          aria-hidden="true"
        />

        <div className={cm.cn('relative')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('incidentDetail.id', { id: incident.id }, { defaultValue: 'INC-{{id}}' })}
            </span>
            <span
              className={cm.cn('font-mono text-[10px] font-extrabold uppercase tracking-widest')}
              style={{ color: accent }}
            >
              {t(
                `incidentDetail.impact.${incident.impact}`,
                {},
                {
                  defaultValue:
                    incident.impact === 'minor'
                      ? 'Degraded'
                      : incident.impact === 'major'
                        ? 'Partial outage'
                        : incident.impact === 'critical'
                          ? 'Major outage'
                          : 'Maintenance',
                },
              )}
            </span>
          </div>

          <h1 className={cm.cn('mt-2 text-3xl md:text-4xl font-extrabold tracking-tight')}>
            {incident.title}
          </h1>

          {incident.message ? (
            <p
              className={cm.cn('mt-3 max-w-3xl text-base text-on-surface-variant leading-relaxed')}
            >
              {incident.message}
            </p>
          ) : null}

          <dl className={cm.cn('mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3')}>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('incidentDetail.statusLabel', {}, { defaultValue: 'Status' })}
              </dt>
              <dd className={cm.cn('mt-1')}>
                <StatusPill
                  status={
                    incident.status === 'resolved'
                      ? 'operational'
                      : incident.impact === 'maintenance'
                        ? 'under_maintenance'
                        : 'major_outage'
                  }
                  emphasis
                  label={t(
                    `incidentDetail.status.${incident.status}`,
                    {},
                    { defaultValue: STATUS_LABEL[incident.status] },
                  )}
                />
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('incidentDetail.startedAt', {}, { defaultValue: 'Started' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                {fmtTimestamp(incident.created_at)}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {incident.status === 'resolved'
                  ? t('status.resolved', {}, { defaultValue: 'Resolved' })
                  : t('incidentDetail.elapsed', {}, { defaultValue: 'Elapsed' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>
                {incident.status === 'resolved' && incident.resolved_at
                  ? fmtTimestamp(incident.resolved_at)
                  : duration}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('incidentDetail.duration', {}, { defaultValue: 'Total duration' })}
              </dt>
              <dd className={cm.cn('mt-1 font-mono text-sm font-extrabold')}>{duration}</dd>
            </div>
          </dl>

          {incident.affected_components && incident.affected_components.length > 0 ? (
            <div className={cm.cn('mt-5')}>
              <p
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
                )}
              >
                {t('incidentDetail.affected', {}, { defaultValue: 'Affected components' })}
              </p>
              <div className={cm.cn('flex flex-wrap gap-2')}>
                {incident.affected_components.map((c) => (
                  <span
                    key={c}
                    className={cm.cn(
                      'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs',
                    )}
                    style={{
                      backgroundColor: 'var(--color-border-card)',
                      color: 'var(--color-on-surface-high)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[12px]')}
                      aria-hidden="true"
                    >
                      lan
                    </span>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className={cm.cn('grid gap-8 grid-cols-1 lg:grid-cols-[1.6fr_1fr]')}>
        <div>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight mb-4')}>
            {t('incidentDetail.timelineHeading', {}, { defaultValue: 'Timeline' })}
          </h2>

          {updates.length === 0 ? (
            <p
              className={cm.cn('text-sm font-mono text-on-surface-variant')}
              data-testid="incident-timeline-empty"
            >
              {t('incidentDetail.timelineEmpty', {}, { defaultValue: 'No updates posted yet.' })}
            </p>
          ) : (
            <ol
              data-testid="incident-timeline"
              className={cm.cn('relative pl-6')}
              style={{
                borderLeft: '2px dotted var(--color-border-card)',
                marginLeft: 6,
              }}
            >
              {updates
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((u) => (
                  <li
                    key={u.id}
                    data-testid={`incident-update-${u.id}`}
                    className={cm.cn('relative mb-7 last:mb-0')}
                  >
                    <span
                      className={cm.cn('absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full')}
                      style={{
                        backgroundColor: STATUS_COLOR[u.status],
                        boxShadow: `0 0 0 4px ${STATUS_COLOR[u.status]}33`,
                      }}
                      aria-hidden="true"
                    />
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-extrabold uppercase tracking-widest',
                        )}
                        style={{ color: STATUS_TEXT_COLOR[u.status] }}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                      <span className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                        {fmtTimestamp(u.created_at)}
                      </span>
                    </div>
                    <p className={cm.cn('mt-1.5 text-sm text-on-surface leading-relaxed')}>
                      {u.message}
                    </p>
                  </li>
                ))}
            </ol>
          )}

          {/* Post-update editor */}
          {incident.status !== 'resolved' ? (
            <div
              className={cm.cn('mt-8 rounded-xl p-5')}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid var(--color-border-card)',
              }}
            >
              <p
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('incidentDetail.postUpdate', {}, { defaultValue: 'Post update' })}
              </p>

              <div className={cm.cn('mt-2 grid gap-2 grid-cols-2 md:grid-cols-4')}>
                {VALID_STATUSES.map((s) => {
                  const active = draftStatus === s
                  return (
                    <button
                      key={s}
                      type="button"
                      data-testid={`post-status-${s}`}
                      onClick={() => setDraftStatus(s)}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: active ? `${STATUS_COLOR[s]}22` : 'rgba(15, 23, 42, 0.6)',
                        color: active ? STATUS_COLOR[s] : 'var(--color-chip-text)',
                        border: `1px solid ${active ? `${STATUS_COLOR[s]}66` : 'var(--color-border-card)'}`,
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                })}
              </div>

              <textarea
                rows={3}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                data-testid="post-update-message"
                placeholder={t(
                  'incidentDetail.postPlaceholder',
                  {},
                  { defaultValue: 'Customer-visible update — what changed, what we are doing.' },
                )}
                className={cm.cn('mt-2 w-full rounded-md p-3 font-mono text-sm')}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--color-border-card)',
                  color: 'var(--mol-color-text)',
                }}
              />
              {postError ? (
                <p
                  data-testid="post-update-error"
                  role="alert"
                  className={cm.cn('mt-2 font-mono text-[11px]')}
                  style={{ color: 'var(--color-error-text-vivid-on-dark)' }}
                >
                  {postError}
                </p>
              ) : null}
              <div className={cm.cn('mt-3 flex items-center justify-end gap-2')}>
                <button
                  type="button"
                  data-testid="save-draft-btn"
                  className={cm.cn(
                    'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    color: 'var(--color-chip-text)',
                    border: '1px solid var(--color-border-card)',
                  }}
                  onClick={saveDraft}
                >
                  {t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
                </button>
                <button
                  type="button"
                  data-testid="post-update-btn"
                  disabled={posting || !draftMessage.trim()}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
                  )}
                  style={{
                    backgroundColor: 'var(--color-status-operational)',
                    color: 'var(--color-on-status-operational)',
                  }}
                  onClick={postUpdate}
                >
                  {posting
                    ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                    : t('incidentDetail.postCta', {}, { defaultValue: 'Post update' })}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--color-border-card)',
            }}
          >
            <h3 className={cm.cn('text-sm font-extrabold tracking-tight mb-4')}>
              {t('incidentDetail.metadataHeading', {}, { defaultValue: 'Incident metadata' })}
            </h3>
            <dl className={cm.stack(3)}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('incidentDetail.severity', {}, { defaultValue: 'Severity' })}
                </dt>
                <dd className={cm.cn('font-mono text-sm')} style={{ color: accent }}>
                  {incident.impact}
                </dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
                </dt>
                <dd className={cm.cn('font-mono text-sm')} data-testid="incident-subscribers-count">
                  {subscribersCount === null ? '—' : subscribersCount.toLocaleString()}
                </dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('incidentDetail.updates', {}, { defaultValue: 'Updates posted' })}
                </dt>
                <dd className={cm.cn('font-mono text-sm')} data-testid="incident-updates-count">
                  {updates.length}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </div>
  )
}
