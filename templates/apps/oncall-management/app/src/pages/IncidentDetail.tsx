import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { type IncidentStatus, StatusPill } from '../components/StatusPill.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface TimelineEvent {
  id: string
  kind: 'trigger' | 'ack' | 'resolve' | 'note' | 'escalate' | 'assign'
  actor: string
  text: string
  at: string
}

interface TeamMember {
  id: string
  name: string
  email: string
}

interface IncidentDetailData {
  id: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  service: string
  assigned_member_id: string | null
  assignee: string | null
  escalation_policy_id: string | null
  escalation_policy_name: string | null
  schedule_id: string | null
  schedule_name: string | null
  escalation_level: number
  triggered_at: string
  acked_at: string | null
  resolved_at: string | null
  events: TimelineEvent[]
  postmortem_id: string | null
}

const EVENT_ICON: Record<TimelineEvent['kind'], string> = {
  trigger: 'notifications_active',
  ack: 'how_to_reg',
  resolve: 'check_circle',
  note: 'sticky_note_2',
  escalate: 'moving',
  assign: 'assignment_ind',
}

const EVENT_COLOR: Record<TimelineEvent['kind'], string> = {
  trigger: 'var(--color-severity-critical)',
  ack: 'var(--color-severity-warning)',
  resolve: 'var(--color-severity-resolved)',
  note: 'var(--color-text-secondary)',
  escalate: 'var(--color-severity-error)',
  assign: 'var(--color-severity-info)',
}

function fmtAbsolute(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IncidentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [incident, setIncident] = useState<IncidentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [showAssign, setShowAssign] = useState(false)

  const reloadIncident = useCallback(async () => {
    if (!id) return
    const res = await http.get(`/api/incidents/${id}`)
    const single = unwrapSingle<IncidentDetailData>(res)
    if (single) setIncident(single)
  }, [http, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/incidents/${id}`)
      .then((res) => {
        if (cancelled) return
        const single = unwrapSingle<IncidentDetailData>(res)
        if (single) setIncident(single)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  useEffect(() => {
    let cancelled = false
    http
      .get<{ members?: TeamMember[] } | TeamMember[]>('/api/team')
      .then((res) => {
        if (cancelled) return
        const data = res.data
        const members = Array.isArray(data) ? data : (data?.members ?? [])
        setTeam(
          members
            .filter(
              (m) =>
                String((m as { member_status?: string }).member_status ?? 'active') === 'active',
            )
            .map((m) => ({
              id: String(m.id ?? ''),
              name: String(m.name ?? m.email ?? 'Responder'),
              email: String(m.email ?? ''),
            })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const runAction = useCallback(
    async (action: string, fn: () => Promise<unknown>) => {
      setActionPending(action)
      setActionError(null)
      try {
        await fn()
        await reloadIncident()
      } catch (error) {
        logError('incidentDetail.action', error)
        setActionError(
          t('incidentDetail.actionError', {}, { defaultValue: "Couldn't save — please retry." }),
        )
      } finally {
        setActionPending(null)
      }
    },
    [reloadIncident, t],
  )

  const ackMinutes = useMemo(() => {
    if (!incident?.acked_at) return null
    const ms = new Date(incident.acked_at).getTime() - new Date(incident.triggered_at).getTime()
    return Math.max(0, Math.round(ms / 60_000))
  }, [incident])

  /**
   * Start (or reopen) the postmortem for this incident and drop the user
   * straight into the editor — the same outcome as creating one from the
   * /postmortems list page.
   */
  const startPostmortem = useCallback(async () => {
    if (!id) return
    setActionPending('postmortem')
    setActionError(null)
    try {
      const res = await http.post('/api/postmortems', { incident_id: id })
      const created = res.data as { id?: string } | undefined
      if (created?.id) {
        navigate(`/postmortems/${created.id}`)
        return
      }
      await reloadIncident()
    } catch (error) {
      logError('incidentDetail.startPostmortem', error)
      setActionError(
        t('incidentDetail.actionError', {}, { defaultValue: "Couldn't save — please retry." }),
      )
    } finally {
      setActionPending(null)
    }
  }, [http, id, navigate, reloadIncident, t])

  if (!incident) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <Link
          to="/incidents"
          className={cm.cn(
            'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
          )}
          style={{ color: BRAND_COLOR }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('incidentDetail.back', {}, { defaultValue: 'Back to incidents' })}
        </Link>
        <div
          className={cm.cn('font-mono text-sm')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {loading
            ? t('incidentDetail.loading', {}, { defaultValue: 'Loading incident…' })
            : t('incidentDetail.notFound', {}, { defaultValue: 'Incident not found.' })}
        </div>
      </div>
    )
  }

  const isTriggered = incident.status === 'triggered'
  const isResolved = incident.status === 'resolved'
  const notes = incident.events.filter((e) => e.kind === 'note')
  const severityAccent =
    incident.severity === 'critical'
      ? 'var(--color-severity-critical)'
      : incident.severity === 'warning'
        ? 'var(--color-severity-warning)'
        : 'var(--color-severity-info)'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/incidents"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('incidentDetail.back', {}, { defaultValue: 'Back to incidents' })}
      </Link>

      {isTriggered && incident.severity === 'critical' ? (
        <div
          className={cm.cn('rounded-xl mb-6 p-4 flex items-center gap-3 flex-wrap')}
          style={{
            backgroundColor: 'var(--color-severity-critical-light)',
            border: '1px solid var(--color-severity-critical)',
          }}
          role="alert"
          data-mol-id="incident-pager-banner"
        >
          <span
            className={cm.cn('material-symbols-outlined text-2xl animate-pulse')}
            style={{ color: 'var(--color-severity-critical)' }}
            aria-hidden="true"
          >
            notifications_active
          </span>
          <p
            className={cm.cn(
              'flex-1 min-w-[14rem] font-mono text-xs font-bold uppercase tracking-widest',
            )}
            style={{ color: 'var(--color-severity-critical)' }}
          >
            {t(
              'incidentDetail.pagerBanner',
              {},
              { defaultValue: 'Critical page unacknowledged — the pager is still ringing' },
            )}
          </p>
          <button
            type="button"
            disabled={actionPending !== null}
            onClick={() => runAction('ack', () => http.put(`/api/incidents/${id}/ack`, {}))}
            data-mol-id="incident-ack-banner"
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
            )}
            style={{
              backgroundColor: 'var(--color-severity-critical)',
              borderColor: 'var(--color-severity-critical)',
              color: 'var(--color-on-error)',
            }}
          >
            {actionPending === 'ack'
              ? t('common.acking', {}, { defaultValue: 'Acking…' })
              : t('incidentDetail.ackNow', {}, { defaultValue: 'Ack now' })}
          </button>
        </div>
      ) : null}

      <header
        className={cm.cn('relative overflow-hidden rounded-2xl mb-6 p-6')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-severity-critical-light), var(--color-surface))',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderLeft: `4px solid ${severityAccent}`,
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
          <SeverityPill severity={incident.severity} emphasis />
          <StatusPill status={incident.status} emphasis />
          {incident.escalation_level > 0 ? (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-warning-light)',
                color: 'var(--color-severity-warning)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                moving
              </span>
              {t(
                'incidentDetail.layer',
                { level: incident.escalation_level },
                { defaultValue: 'Layer {{level}}' },
              )}
            </span>
          ) : null}
        </div>
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {incident.title}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-3xl')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {incident.description}
        </p>
        <div
          className={cm.cn('mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>
            <span className={cm.cn('opacity-60')}>service </span>
            {incident.service}
          </span>
          {incident.schedule_name ? (
            <span>
              <span className={cm.cn('opacity-60')}>schedule </span>
              <Link
                to={`/schedules/${incident.schedule_id}`}
                data-mol-id="incident-schedule-link"
                className={cm.cn('hover:opacity-80 underline')}
                style={{ color: BRAND_COLOR }}
              >
                {incident.schedule_name}
              </Link>
            </span>
          ) : null}
          {incident.escalation_policy_name ? (
            <span>
              <span className={cm.cn('opacity-60')}>policy </span>
              <Link
                to="/escalation-policies"
                data-mol-id="incident-policy-link"
                className={cm.cn('hover:opacity-80 underline')}
                style={{ color: BRAND_COLOR }}
              >
                {incident.escalation_policy_name}
              </Link>
            </span>
          ) : null}
          <span>
            <span className={cm.cn('opacity-60')}>triggered </span>
            {fmtAbsolute(incident.triggered_at)}
          </span>
          {ackMinutes !== null ? (
            <span>
              <span className={cm.cn('opacity-60')}>ack in </span>
              {ackMinutes}m
            </span>
          ) : null}
        </div>

        <div className={cm.cn('mt-5 flex flex-wrap items-center gap-2')}>
          {!isResolved ? (
            <>
              {isTriggered ? (
                <button
                  type="button"
                  disabled={actionPending !== null}
                  onClick={() => runAction('ack', () => http.put(`/api/incidents/${id}/ack`, {}))}
                  data-mol-id="incident-ack"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-warning)',
                    borderColor: 'var(--color-severity-warning)',
                    color: 'var(--color-text-inverse)',
                  }}
                >
                  {actionPending === 'ack'
                    ? t('common.acking', {}, { defaultValue: 'Acking…' })
                    : t('incidentDetail.acknowledge', {}, { defaultValue: 'Acknowledge' })}
                </button>
              ) : null}
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() =>
                  runAction('resolve', () => http.put(`/api/incidents/${id}/resolve`, {}))
                }
                data-mol-id="incident-resolve"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'var(--color-severity-resolved)',
                  borderColor: 'var(--color-severity-resolved)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                {actionPending === 'resolve'
                  ? t('common.resolving', {}, { defaultValue: 'Resolving…' })
                  : t('incidentDetail.resolve', {}, { defaultValue: 'Resolve' })}
              </button>
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() =>
                  runAction('escalate', () => http.put(`/api/incidents/${id}/escalate`, {}))
                }
                data-mol-id="incident-escalate"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--color-border-secondary)',
                  color: 'var(--color-text)',
                }}
              >
                {actionPending === 'escalate'
                  ? t('common.escalating', {}, { defaultValue: 'Escalating…' })
                  : t('incidentDetail.escalate', {}, { defaultValue: 'Escalate' })}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() =>
                  runAction('reopen', () => http.put(`/api/incidents/${id}/reopen`, {}))
                }
                data-mol-id="incident-reopen"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--color-severity-critical)',
                  color: 'var(--color-severity-critical)',
                }}
              >
                {t('incidentDetail.reopen', {}, { defaultValue: 'Reopen' })}
              </button>
              {incident.postmortem_id ? (
                <Link
                  to={`/postmortems/${incident.postmortem_id}`}
                  data-mol-id="incident-view-postmortem"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border',
                  )}
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: 'var(--color-border-secondary)',
                    color: 'var(--color-text)',
                  }}
                >
                  {t('incidentDetail.viewPostmortem', {}, { defaultValue: 'View postmortem' })}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={actionPending !== null}
                  onClick={() => void startPostmortem()}
                  data-mol-id="incident-start-postmortem"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                  )}
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: 'var(--color-border-secondary)',
                    color: 'var(--color-text)',
                  }}
                >
                  {t('incidentDetail.startPostmortem', {}, { defaultValue: 'Start postmortem' })}
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => setShowAssign((v) => !v)}
            data-mol-id="incident-assign-toggle"
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border',
            )}
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text)',
            }}
          >
            {incident.assignee ?? t('incidentDetail.assign', {}, { defaultValue: 'Assign' })}
          </button>
        </div>

        {showAssign ? (
          <div className={cm.cn('mt-3 flex flex-wrap gap-2')} data-mol-id="incident-assign-picker">
            {team.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  runAction('assign', () =>
                    http.put(`/api/incidents/${id}/assign`, { member_id: m.id }),
                  ).then(() => setShowAssign(false))
                }
                data-mol-id={`incident-assign-to-${m.id}`}
                className={cm.cn(
                  'px-3 py-1.5 rounded-full font-mono text-xs border hover:opacity-80',
                )}
                style={{
                  backgroundColor: 'var(--color-surface-overlay)',
                  borderColor:
                    incident.assigned_member_id === m.id
                      ? BRAND_COLOR
                      : 'var(--color-border-secondary)',
                  color: 'var(--color-text)',
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        ) : null}

        {actionError ? (
          <p
            className={cm.cn('mt-3 font-mono text-xs')}
            style={{ color: 'var(--color-severity-warning)' }}
          >
            {actionError}
          </p>
        ) : null}
      </header>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        {/* Timeline */}
        <section className={cm.cn('lg:col-span-7')}>
          <h2
            className={cm.cn('text-xl font-bold tracking-tight mb-4')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('incidentDetail.timeline', {}, { defaultValue: 'Timeline' })}
          </h2>
          <ol className={cm.cn('relative space-y-0')}>
            {incident.events.map((e, idx) => (
              <li key={e.id} className={cm.cn('relative flex gap-4 pb-6')}>
                {idx < incident.events.length - 1 ? (
                  <span
                    className={cm.cn('absolute left-[15px] top-8 bottom-0 w-px')}
                    style={{ backgroundColor: 'var(--color-border-secondary)' }}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-base z-10 shrink-0 h-8 w-8 flex items-center justify-center rounded-full',
                  )}
                  style={{
                    color: EVENT_COLOR[e.kind],
                    backgroundColor: 'var(--color-surface)',
                    border: `1px solid ${EVENT_COLOR[e.kind]}`,
                  }}
                  aria-hidden="true"
                >
                  {EVENT_ICON[e.kind]}
                </span>
                <div className={cm.cn('min-w-0')}>
                  <p
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: EVENT_COLOR[e.kind] }}
                  >
                    {e.kind} · {e.actor}
                  </p>
                  <p className={cm.cn('mt-0.5 text-sm')} style={{ color: 'var(--color-text)' }}>
                    {e.text}
                  </p>
                  <p
                    className={cm.cn('mt-0.5 font-mono text-[11px]')}
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {fmtAbsolute(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Add note */}
          <div
            className={cm.cn('rounded-xl p-4')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <label
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest block mb-2',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
              htmlFor="incident-note-input"
            >
              {t('incidentDetail.addNote', {}, { defaultValue: 'Add a responder note' })}
            </label>
            <div className={cm.cn('flex gap-2')}>
              <input
                id="incident-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={cm.cn('flex-1 px-3 py-2 rounded-md text-sm outline-none')}
                style={{
                  backgroundColor: 'var(--color-input-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                placeholder={t(
                  'incidentDetail.notePlaceholder',
                  {},
                  { defaultValue: 'What did you find?' },
                )}
                data-mol-id="incident-note-input"
              />
              <button
                type="button"
                disabled={!note.trim() || actionPending !== null}
                onClick={() =>
                  runAction('note', async () => {
                    await http.post(`/api/incidents/${id}/notes`, { text: note.trim() })
                    setNote('')
                  })
                }
                data-mol-id="incident-note-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: BRAND_COLOR,
                  color: BRAND_COLOR,
                }}
              >
                {t('common.post', {}, { defaultValue: 'Post' })}
              </button>
            </div>
          </div>
        </section>

        {/* Side facts */}
        <section className={cm.cn('lg:col-span-5 space-y-4')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('incidentDetail.responder', {}, { defaultValue: 'Assigned responder' })}
            </p>
            {incident.assignee ? (
              <div className={cm.cn('flex items-center gap-3')}>
                <span
                  className={cm.cn(
                    'h-10 w-10 flex items-center justify-center rounded-full font-bold',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-info-light)',
                    color: 'var(--color-severity-info)',
                    border: '2px solid var(--color-border)',
                  }}
                  aria-hidden="true"
                >
                  {incident.assignee[0]?.toUpperCase()}
                </span>
                <p className={cm.cn('font-bold')} style={{ color: 'var(--color-text)' }}>
                  {incident.assignee}
                </p>
              </div>
            ) : (
              <p
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--color-severity-warning)' }}
              >
                {t('incidentDetail.unassigned', {}, { defaultValue: 'Unassigned — still paging' })}
              </p>
            )}
          </div>

          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('incidentDetail.notesHeading', {}, { defaultValue: 'Responder notes' })}
            </p>
            {notes.length === 0 ? (
              <p
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('incidentDetail.noNotes', {}, { defaultValue: 'No notes yet.' })}
              </p>
            ) : (
              <ul className={cm.cn('space-y-3')}>
                {notes.map((n) => (
                  <li key={n.id}>
                    <p className={cm.cn('text-sm')} style={{ color: 'var(--color-text)' }}>
                      {n.text}
                    </p>
                    <p
                      className={cm.cn('mt-0.5 font-mono text-[11px]')}
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {n.actor} · {fmtAbsolute(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
