import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import type { IncidentRowData } from '../components/IncidentRow.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SEVERITY_ACCENT: Record<string, string> = {
  sev1: 'var(--color-severity-fatal)',
  sev2: 'var(--color-severity-error)',
  sev3: 'var(--color-severity-warn)',
  sev4: 'var(--color-severity-info)',
}

const STATUS_TINT: Record<
  IncidentRowData['status'],
  { bg: string; text: string; defaultLabel: string }
> = {
  open: {
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    defaultLabel: 'Open',
  },
  investigating: {
    bg: 'color-mix(in srgb, var(--color-severity-error) 16%, transparent)',
    text: 'var(--color-severity-error-light)',
    defaultLabel: 'Investigating',
  },
  mitigated: {
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    defaultLabel: 'Mitigated',
  },
  monitoring: {
    bg: 'color-mix(in srgb, var(--color-severity-info) 16%, transparent)',
    text: 'var(--color-severity-info-light)',
    defaultLabel: 'Monitoring',
  },
  resolved: {
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    text: 'var(--color-success-light)',
    defaultLabel: 'Resolved',
  },
}

interface TimelineEvent {
  iso: string
  actor: string
  action: string
}

const SAMPLE_TIMELINE: TimelineEvent[] = [
  {
    iso: '2026-04-30T13:31:00.000Z',
    actor: 'pagerduty',
    action: 'Auto-paged @riley (on-call payments)',
  },
  {
    iso: '2026-04-30T13:32:14.000Z',
    actor: 'Riley Kovacs',
    action: 'Acknowledged page; declared SEV1',
  },
  {
    iso: '2026-04-30T13:34:02.000Z',
    actor: 'Sasha Petrov',
    action: 'Joined incident channel #inc-checkout-5xx',
  },
  {
    iso: '2026-04-30T13:38:21.000Z',
    actor: 'Riley Kovacs',
    action: 'Identified root cause: stripe.com p99 spike',
  },
  {
    iso: '2026-04-30T13:40:00.000Z',
    actor: 'Riley Kovacs',
    action: 'Bypassed retries via feature flag stripe_retries=false',
  },
]

function fmtTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 19)
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function fmtDuration(startedAt: string, resolvedAt: string | null): string {
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now()
  const ms = end - new Date(startedAt).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${(minutes % 60).toString().padStart(2, '0')}m`
}

export function IncidentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [incident, setIncident] = useState<IncidentRowData | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [showPostmortem, setShowPostmortem] = useState(false)
  const [pmText, setPmText] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get(`/api/incidents/${id}`), http.get('/api/logs')])
      .then(([incRes, logsRes]) => {
        if (cancelled) return
        setIncident(unwrapSingle<IncidentRowData>(incRes))
        const all = unwrapList<LogLine>(logsRes)
        setLogs(
          all
            .filter(
              (l) => l.severity === 'error' || l.severity === 'fatal' || l.severity === 'warn',
            )
            .slice(0, 6),
        )
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
  }, [id, http, t])

  async function markResolved() {
    if (!id) return
    setResolving(true)
    setActionMsg(null)
    setActionErr(null)
    try {
      const res = await http.patch(`/api/incidents/${id}`, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      track({ name: 'incident.resolved', properties: { incident_id: id } })
      setIncident(unwrapSingle<IncidentRowData>(res))
      setActionMsg(t('incidentDetail.resolved', {}, { defaultValue: 'Incident marked resolved.' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setActionErr(
        msg ||
          t('incidentDetail.resolveError', {}, { defaultValue: 'Could not resolve incident.' }),
      )
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/incidents"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('incidentDetail.back', {}, { defaultValue: 'All incidents' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('incidentDetail.loading', {}, { defaultValue: 'Loading incident…' })}
        </p>
      ) : !incident ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('incidentDetail.notFound', {}, { defaultValue: 'Incident not found.' })}
        </p>
      ) : (
        <>
          {(() => {
            const accent = SEVERITY_ACCENT[incident.severity] ?? 'var(--color-severity-fatal)'
            const status = STATUS_TINT[incident.status]
            const isOpen = incident.resolved_at === null
            return (
              <header
                className={cm.cn('relative overflow-hidden rounded-[1.5rem] mt-4 p-6 md:p-8')}
                style={{
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${accent} 20%, transparent), color-mix(in srgb, var(--color-accent) 18%, transparent))`,
                  backgroundColor: 'var(--color-background-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${accent}`,
                }}
              >
                <div
                  className={cm.cn(
                    'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
                  )}
                  style={{ backgroundColor: `color-mix(in srgb, ${accent} 33%, transparent)` }}
                  aria-hidden="true"
                />
                <div className={cm.cn('relative')}>
                  <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
                    <span
                      className={cm.cn(
                        'inline-flex items-center px-2.5 py-1 rounded font-mono text-[11px] font-extrabold tracking-widest',
                      )}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
                        color: accent,
                      }}
                    >
                      {incident.severity.toUpperCase()}
                    </span>
                    <span
                      className={cm.cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      {t(
                        `incidentDetail.status.${incident.status}`,
                        {},
                        { defaultValue: status.defaultLabel },
                      )}
                    </span>
                  </div>
                  <h1
                    className={cm.cn(
                      'mt-3 font-mono text-3xl md:text-4xl font-extrabold tracking-tighter text-on-surface',
                    )}
                  >
                    {incident.title}
                  </h1>
                  <p
                    className={cm.cn('mt-1 font-mono text-sm font-semibold')}
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {incident.service}
                  </p>
                  <div className={cm.cn('mt-4 flex flex-wrap items-center gap-x-6 gap-y-2')}>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {isOpen
                          ? t('incidentDetail.openFor', {}, { defaultValue: 'Open for' })
                          : t('form.duration', {}, { defaultValue: 'Duration' })}
                      </p>
                      <p
                        className={cm.cn('font-mono text-2xl font-extrabold')}
                        style={{
                          color: isOpen
                            ? 'var(--color-severity-fatal-light)'
                            : 'var(--color-success-light)',
                        }}
                      >
                        {fmtDuration(incident.started_at, incident.resolved_at)}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('incidentDetail.impact', {}, { defaultValue: 'Impacted users' })}
                      </p>
                      <p className={cm.cn('font-mono text-2xl font-extrabold text-on-surface')}>
                        {incident.impacted_users.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('incidentDetail.owner', {}, { defaultValue: 'Owner' })}
                      </p>
                      <p className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
                        {incident.owner}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('incidentDetail.started', {}, { defaultValue: 'Started' })}
                      </p>
                      <p className={cm.cn('font-mono text-sm font-semibold text-on-surface')}>
                        {fmtRelative(incident.started_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </header>
            )
          })()}

          <div className={cm.cn('mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6')}>
            <section className={cm.cn('lg:col-span-2')}>
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('incidentDetail.timeline', {}, { defaultValue: 'Timeline' })}
              </h2>
              <ol
                className={cm.cn('rounded-xl overflow-hidden')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {SAMPLE_TIMELINE.map((ev, i) => (
                  <li
                    key={i}
                    className={cm.cn('grid grid-cols-12 gap-3 px-4 py-3 border-b last:border-0')}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span
                      className={cm.cn('col-span-2 font-mono text-[11px] text-on-surface-variant')}
                    >
                      {fmtTime(ev.iso)}
                    </span>
                    <span
                      className={cm.cn('col-span-3 font-mono text-xs font-bold')}
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {ev.actor}
                    </span>
                    <span className={cm.cn('col-span-7 text-sm text-on-surface')}>{ev.action}</span>
                  </li>
                ))}
              </ol>
            </section>

            <aside className={cm.cn('space-y-6')}>
              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('incidentDetail.linkedEvidence', {}, { defaultValue: 'Linked log evidence' })}
                </h3>
                {logs.length === 0 ? (
                  <p className={cm.cn('text-sm text-on-surface-variant')}>
                    {t(
                      'incidentDetail.noLogs',
                      {},
                      { defaultValue: 'No matching log evidence collected yet.' },
                    )}
                  </p>
                ) : (
                  <div
                    className={cm.cn('rounded-md overflow-hidden')}
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {logs.map((line) => (
                      <LogLineRow key={line.id} line={line} />
                    ))}
                  </div>
                )}
              </div>

              <div
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('nav.actions', {}, { defaultValue: 'Actions' })}
                </h3>
                <div className={cm.cn('space-y-2')}>
                  <button
                    type="button"
                    onClick={markResolved}
                    disabled={resolving || incident.status === 'resolved'}
                    data-mol-id="incident-resolve"
                    className={cm.cn(
                      'block w-full text-center px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
                  >
                    {resolving
                      ? t('incidentDetail.resolving', {}, { defaultValue: 'Resolving…' })
                      : t('incidentDetail.markResolved', {}, { defaultValue: 'Mark resolved' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPostmortem(true)}
                    data-mol-id="incident-postmortem"
                    className={cm.cn(
                      'block w-full text-center px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface-container',
                    )}
                    style={{
                      border: '1px solid var(--color-outline)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                  >
                    {t('incidentDetail.openPostmortem', {}, { defaultValue: 'Open postmortem' })}
                  </button>
                  {actionMsg ? (
                    <p
                      data-mol-id="incident-action-msg"
                      className={cm.cn('text-center text-xs font-mono')}
                      style={{ color: 'var(--color-json-string)' }}
                    >
                      {actionMsg}
                    </p>
                  ) : null}
                  {actionErr ? (
                    <p
                      data-mol-id="incident-action-err"
                      className={cm.cn('text-center text-xs font-mono text-error')}
                    >
                      {actionErr}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>

          {showPostmortem ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="postmortem-title"
              className={cm.cn('fixed inset-0 z-50 flex items-center justify-center px-4')}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-background) 65%, transparent)',
              }}
            >
              <div
                className={cm.cn('w-full max-w-2xl rounded-xl p-6 space-y-4')}
                style={{
                  backgroundColor: 'var(--color-input-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h2
                  id="postmortem-title"
                  className={cm.cn('text-lg font-semibold tracking-tight text-on-surface')}
                >
                  {t('incidentDetail.postmortem.title', {}, { defaultValue: 'Postmortem draft' })}
                </h2>
                <p className={cm.cn('text-xs text-on-surface-variant')}>
                  {t(
                    'incidentDetail.postmortem.help',
                    {},
                    {
                      defaultValue:
                        'Capture root cause, contributing factors, customer impact, and follow-up actions. Saved locally for now.',
                    },
                  )}
                </p>
                <textarea
                  data-mol-id="incident-pm-textarea"
                  value={pmText}
                  onChange={(e) => setPmText(e.target.value)}
                  className={cm.cn('w-full rounded-md font-mono text-sm p-3 min-h-[180px]')}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                />
                <div className={cm.cn('flex items-center justify-end gap-3')}>
                  <button
                    type="button"
                    onClick={() => setShowPostmortem(false)}
                    className={cm.cn(
                      'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant',
                    )}
                  >
                    {t('common.close', {}, { defaultValue: 'Close' })}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
