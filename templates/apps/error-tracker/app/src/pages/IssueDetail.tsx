import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { type StackFrame, StackTraceBlock } from '../components/StackTraceBlock.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface TeamMember {
  id: string
  name: string
  email: string
}

interface IssueEvent {
  id: string
  environment: string
  release: string
  timestamp: string
  user: { id: string; email: string }
  user_agent: string
}

interface IssueDetailData {
  id: string
  title: string
  culprit: string
  level: Severity
  status: 'unresolved' | 'resolved' | 'ignored' | 'new'
  event_count: number
  user_count: number
  first_seen: string
  last_seen: string
  fingerprint: string
  environment: string
  release: string
  assignee: string | null
  is_regression: boolean
  frequency: number[]
  exception_type: string
  exception_value: string
  recent_events: IssueEvent[]
  frames: StackFrame[]
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function IssueDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [issue, setIssue] = useState<IssueDetailData | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<'resolve' | 'ignore' | 'unresolve' | null>(
    null,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [showAssign, setShowAssign] = useState(false)

  const reloadIssue = useCallback(async () => {
    if (!id) return
    const res = await http.get(`/api/issues/${id}`)
    const single = unwrapSingle<IssueDetailData>(res)
    if (single) {
      setIssue(single)
      setSelectedEventId((prev) => prev || single.recent_events[0]?.id || '')
    }
  }, [http, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/issues/${id}`)
      .then((res) => {
        if (cancelled) return
        const single = unwrapSingle<IssueDetailData>(res)
        if (single) {
          setIssue(single)
          setSelectedEventId(single.recent_events[0]?.id ?? '')
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('issueDetail.loadError', {}, { defaultValue: 'Showing sample issue.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  useEffect(() => {
    let cancelled = false
    http
      .get<{ members?: TeamMember[] } | TeamMember[]>('/api/team')
      .then((res) => {
        if (cancelled) return
        const data = res.data
        const members = Array.isArray(data) ? data : (data?.members ?? [])
        setTeam(
          members.map((m) => ({
            id: String(m.id ?? ''),
            name: String(m.name ?? m.email ?? 'Member'),
            email: String(m.email ?? ''),
          })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const triageStatus = useCallback(
    async (status: 'resolved' | 'ignored' | 'unresolved') => {
      if (!id) return
      const action =
        status === 'resolved' ? 'resolve' : status === 'ignored' ? 'ignore' : 'unresolve'
      setActionPending(action)
      setActionError(null)
      try {
        await http.put(`/api/issues/${id}/status`, { status })
        await reloadIssue()
      } catch (error) {
        logError('issueDetail.triageStatus', error)
        setActionError(
          t('issueDetail.actionError', {}, { defaultValue: "Couldn't save — please retry." }),
        )
      } finally {
        setActionPending(null)
      }
    },
    [http, id, reloadIssue, t],
  )

  const assignTo = useCallback(
    async (member: TeamMember | null) => {
      if (!id) return
      setActionError(null)
      try {
        await http.put(`/api/issues/${id}/assign`, {
          assignee: member?.name ?? null,
          user_id: member?.id ?? null,
        })
        await reloadIssue()
        setShowAssign(false)
      } catch (error) {
        logError('issueDetail.assignTo', error)
        setActionError(
          t('issueDetail.actionError', {}, { defaultValue: "Couldn't save — please retry." }),
        )
      }
    },
    [http, id, reloadIssue, t],
  )

  const selectedEvent = useMemo(
    () => issue?.recent_events.find((e) => e.id === selectedEventId) ?? issue?.recent_events[0],
    [issue, selectedEventId],
  )
  const fingerprint = issue?.fingerprint.slice(0, 12) ?? ''

  if (!issue) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <Link
          to="/issues"
          className={cm.cn(
            'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
          )}
          style={{ color: BRAND_COLOR }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('issueDetail.back', {}, { defaultValue: 'Back to issues' })}
        </Link>
        <div
          className={cm.cn('font-mono text-sm')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {loading
            ? t('issueDetail.loading', {}, { defaultValue: 'Loading issue…' })
            : t('issueDetail.notFound', {}, { defaultValue: 'Issue not found.' })}
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/issues"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('issueDetail.back', {}, { defaultValue: 'Back to issues' })}
      </Link>

      <header
        className={cm.cn('relative overflow-hidden rounded-2xl mb-6 p-6')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-severity-critical-light), var(--color-severity-info-light))',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderLeft: '4px solid var(--color-severity-critical)',
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
          <SeverityPill severity={issue.level} emphasis />
          {issue.is_regression ? (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-new-light)',
                color: 'var(--color-severity-new)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                trending_up
              </span>
              {t('issueDetail.regression', {}, { defaultValue: 'Regression' })}
            </span>
          ) : null}
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-medium',
            )}
            style={{
              backgroundColor: 'var(--color-surface-overlay)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
              cloud
            </span>
            {issue.environment}
          </span>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-medium',
            )}
            style={{
              backgroundColor: 'var(--color-surface-overlay)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
              rocket_launch
            </span>
            {issue.release}
          </span>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: BRAND_COLOR,
              border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
          >
            #{fingerprint}
          </span>
        </div>
        <h1
          className={cm.cn('font-mono text-2xl md:text-3xl font-bold leading-snug')}
          style={{ color: 'var(--color-text)' }}
        >
          {issue.title}
        </h1>
        <p
          className={cm.cn('mt-1 font-mono text-sm')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {issue.culprit}
        </p>

        <div className={cm.cn('mt-6 grid grid-cols-2 md:grid-cols-4 gap-6')}>
          <div>
            <p
              className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-severity-muted)' }}
            >
              {t('issueDetail.events', {}, { defaultValue: 'Events' })}
            </p>
            <p
              className={cm.cn('mt-1 font-mono text-2xl font-extrabold tabular-nums')}
              style={{ color: 'var(--color-text)' }}
            >
              {issue.event_count.toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-severity-muted)' }}
            >
              {t('issueDetail.users', {}, { defaultValue: 'Users' })}
            </p>
            <p
              className={cm.cn('mt-1 font-mono text-2xl font-extrabold tabular-nums')}
              style={{ color: 'var(--color-text)' }}
            >
              {issue.user_count.toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-severity-muted)' }}
            >
              {t('issueDetail.firstSeen', {}, { defaultValue: 'First seen' })}
            </p>
            <p className={cm.cn('mt-1 font-mono text-sm')} style={{ color: 'var(--color-text)' }}>
              {fmtRelative(issue.first_seen)}
            </p>
          </div>
          <div>
            <p
              className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-severity-muted)' }}
            >
              {t('issueDetail.lastSeen', {}, { defaultValue: 'Last seen' })}
            </p>
            <p className={cm.cn('mt-1 font-mono text-sm')} style={{ color: 'var(--color-text)' }}>
              {fmtRelative(issue.last_seen)}
            </p>
          </div>
        </div>

        <div className={cm.cn('mt-5')}>
          <FrequencySparkline
            values={issue.frequency}
            width={620}
            height={48}
            color="var(--color-severity-critical)"
            spikeColor="var(--color-severity-critical)"
            mode="bar"
            className={cm.cn('w-full h-auto')}
            ariaLabel={t('issueDetail.frequencyAria', {}, { defaultValue: 'Issue frequency' })}
          />
        </div>

        <div className={cm.cn('mt-4 flex items-center gap-2 flex-wrap')}>
          {issue.status === 'resolved' ? (
            <button
              onClick={() => void triageStatus('unresolved')}
              type="button"
              disabled={actionPending !== null}
              data-action="unresolve"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-surface/5 disabled:opacity-60',
              )}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {actionPending === 'unresolve'
                ? '…'
                : t('issueDetail.action.unresolve', {}, { defaultValue: 'Reopen' })}
            </button>
          ) : (
            <button
              onClick={() => void triageStatus('resolved')}
              type="button"
              disabled={actionPending !== null}
              data-action="resolve"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60',
              )}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
            >
              {actionPending === 'resolve'
                ? '…'
                : t('issueDetail.action.resolve', {}, { defaultValue: 'Resolve' })}
            </button>
          )}
          <button
            onClick={() => void triageStatus(issue.status === 'ignored' ? 'unresolved' : 'ignored')}
            type="button"
            disabled={actionPending !== null}
            data-action="ignore"
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-surface/5 disabled:opacity-60',
            )}
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {actionPending === 'ignore'
              ? '…'
              : issue.status === 'ignored'
                ? t('issueDetail.action.unignore', {}, { defaultValue: 'Unignore' })
                : t('issueDetail.action.ignore', {}, { defaultValue: 'Ignore' })}
          </button>
          <div className={cm.cn('relative')}>
            <button
              onClick={() => setShowAssign((v) => !v)}
              type="button"
              data-action="assign"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-surface/5',
              )}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {t('issueDetail.action.assign', {}, { defaultValue: 'Assign' })}
            </button>
            {showAssign ? (
              <div
                role="menu"
                className={cm.cn('absolute z-20 mt-2 right-0 w-64 rounded-lg shadow-xl py-1')}
                style={{
                  backgroundColor: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => void assignTo(null)}
                  className={cm.cn(
                    'block w-full text-left px-3 py-2 text-xs font-mono hover:bg-surface/5',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('issueDetail.action.unassign', {}, { defaultValue: 'Unassign' })}
                </button>
                {team.length === 0 ? (
                  <p
                    className={cm.cn('px-3 py-2 text-xs font-mono')}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('issueDetail.noTeam', {}, { defaultValue: 'No team members.' })}
                  </p>
                ) : (
                  team.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => void assignTo(m)}
                      className={cm.cn(
                        'block w-full text-left px-3 py-2 text-xs font-mono hover:bg-surface/5',
                      )}
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span className={cm.cn('font-bold')}>{m.name}</span>
                      <span
                        className={cm.cn('ml-2')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {m.email}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <span
            data-status={issue.status}
            className={cm.cn(
              'ml-2 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest',
            )}
            style={{
              backgroundColor:
                issue.status === 'resolved'
                  ? 'var(--color-severity-resolved-light)'
                  : issue.status === 'ignored'
                    ? 'color-mix(in srgb, var(--color-severity-muted) 18%, transparent)'
                    : 'var(--color-severity-critical-light)',
              color:
                issue.status === 'resolved'
                  ? 'var(--color-severity-resolved)'
                  : issue.status === 'ignored'
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-severity-critical)',
            }}
          >
            {issue.status}
          </span>
          <span
            className={cm.cn('ml-auto text-xs')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {issue.assignee
              ? t(
                  'issueDetail.assignedTo',
                  { name: issue.assignee },
                  { defaultValue: 'Assigned to {{name}}' },
                )
              : t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
          </span>
        </div>
        {actionError ? (
          <p
            role="alert"
            className={cm.cn('mt-2 font-mono text-xs')}
            style={{ color: 'var(--color-severity-critical)' }}
          >
            {actionError}
          </p>
        ) : null}
      </header>

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 4), 'text-sm')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        <aside className={cm.cn('lg:col-span-4')}>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('issueDetail.recentEvents', {}, { defaultValue: '// recent events' })}
          </p>
          <ul className={cm.cn('space-y-2')}>
            {issue.recent_events.map((evt) => {
              const active = evt.id === selectedEventId
              return (
                <li key={evt.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(evt.id)}
                    className={cm.cn('w-full text-left rounded-xl p-3 transition-colors')}
                    style={{
                      backgroundColor: active
                        ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                        : 'var(--color-surface-container-low)',
                      border: `1px solid ${active ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div className={cm.cn('flex items-center justify-between gap-2')}>
                      <span
                        className={cm.cn('font-mono text-[11px] font-bold')}
                        style={{ color: active ? BRAND_COLOR : 'var(--color-text)' }}
                      >
                        {fmtRelative(evt.timestamp)}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[10px] font-medium px-2 py-0.5 rounded')}
                        style={{
                          backgroundColor: 'var(--color-surface-overlay)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {evt.environment}
                      </span>
                    </div>
                    <p
                      className={cm.cn('mt-1 font-mono text-xs truncate')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {evt.user.email}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <main className={cm.cn('lg:col-span-8 space-y-6')}>
          <StackTraceBlock
            frames={issue.frames}
            exceptionType={issue.exception_type}
            exceptionValue={issue.exception_value}
          />

          {selectedEvent ? (
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
                {t('issueDetail.metadata', {}, { defaultValue: '// event metadata' })}
              </p>
              <dl
                className={cm.cn(
                  'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs',
                )}
              >
                <div>
                  <dt
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('issueDetail.eventId', {}, { defaultValue: 'Event ID' })}
                  </dt>
                  <dd style={{ color: 'var(--color-text-code)' }}>{selectedEvent.id}</dd>
                </div>
                <div>
                  <dt
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('issueDetail.timestamp', {}, { defaultValue: 'Timestamp' })}
                  </dt>
                  <dd style={{ color: 'var(--color-text)' }}>
                    {new Date(selectedEvent.timestamp).toISOString()}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('issueDetail.userEmail', {}, { defaultValue: 'User' })}
                  </dt>
                  <dd style={{ color: 'var(--color-text)' }}>{selectedEvent.user.email}</dd>
                </div>
                <div>
                  <dt
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('issueDetail.userAgent', {}, { defaultValue: 'User agent' })}
                  </dt>
                  <dd style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedEvent.user_agent}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
