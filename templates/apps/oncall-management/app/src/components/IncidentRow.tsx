import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Severity, SeverityPill } from './SeverityPill.js'
import { type IncidentStatus, StatusPill } from './StatusPill.js'

/**
 * Editorial incident row — dark ops-console surface with a coloured
 * `border-l-3` severity accent, status + severity pills, mono service chip,
 * escalation layer badge, assignee avatar, and relative age columns in the
 * dev-tools KPI rhythm. Shaped after error-tracker's IssueRow (left-accent
 * + KPI mini columns + chevron) re-keyed to paging semantics.
 */

export interface IncidentRowData {
  id: string
  title: string
  description?: string
  severity: Severity
  status: IncidentStatus
  service: string
  assignee?: string | null
  escalation_policy_name?: string | null
  escalation_level?: number
  triggered_at: string
  acked_at?: string | null
  resolved_at?: string | null
}

interface IncidentRowProps {
  incident: IncidentRowData
  /** When false, renders a non-interactive demo row (used on Landing). */
  linked?: boolean
}

const ACCENT: Record<Severity, string> = {
  critical: 'var(--color-severity-critical)',
  fatal: 'var(--color-severity-critical)',
  error: 'var(--color-severity-error)',
  warning: 'var(--color-severity-warning)',
  info: 'var(--color-severity-info)',
  debug: 'var(--color-severity-muted)',
  resolved: 'var(--color-severity-resolved)',
  unresolved: 'var(--color-severity-critical)',
  ignored: 'var(--color-severity-muted)',
  new: 'var(--color-severity-new)',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function authorInitial(name?: string | null): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

export function IncidentRow({ incident, linked = true }: IncidentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACCENT[incident.severity] ?? ACCENT.warning
  const level = Number(incident.escalation_level ?? 0)

  const body = (
    <div
      className={cm.cn(
        'group relative flex items-center gap-4 rounded-xl px-5 py-3.5 transition-all',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
      }}
      data-mol-id={`incident-row-${incident.id}`}
    >
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <SeverityPill severity={incident.severity} />
          <StatusPill status={incident.status} />
          <p
            className={cm.cn('font-mono text-sm font-bold text-on-surface truncate')}
            style={{ color: 'var(--color-text)' }}
          >
            {incident.title}
          </p>
        </div>
        <p
          className={cm.cn('mt-1 font-mono text-xs truncate')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className={cm.cn('opacity-80')}>{incident.service}</span>
          {incident.escalation_policy_name ? (
            <>
              <span className={cm.cn('mx-1.5 opacity-40')}>·</span>
              <span>{incident.escalation_policy_name}</span>
            </>
          ) : null}
          {level > 0 ? (
            <>
              <span className={cm.cn('mx-1.5 opacity-40')}>·</span>
              <span
                style={{ color: 'var(--color-severity-warning)' }}
                className={cm.cn('font-semibold')}
              >
                L{level}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className={cm.cn('hidden sm:flex shrink-0 flex-col items-end w-20')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-severity-muted)' }}
        >
          {t('incidentRow.triggered', {}, { defaultValue: 'Triggered' })}
        </span>
        <span
          className={cm.cn('font-mono text-xs tabular-nums')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {fmtRelative(incident.triggered_at)}
        </span>
      </div>

      {incident.acked_at ? (
        <div className={cm.cn('hidden md:flex shrink-0 flex-col items-end w-16')}>
          <span
            className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-severity-muted)' }}
          >
            {t('incidentRow.acked', {}, { defaultValue: 'Acked' })}
          </span>
          <span
            className={cm.cn('font-mono text-xs tabular-nums')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {fmtRelative(incident.acked_at)}
          </span>
        </div>
      ) : null}

      {incident.assignee ? (
        <div
          className={cm.cn(
            'shrink-0 hidden sm:flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
          )}
          style={{
            backgroundColor: 'var(--color-severity-info-light)',
            color: 'var(--color-severity-info)',
            border: '2px solid var(--color-border)',
          }}
          title={incident.assignee}
          aria-hidden="true"
        >
          {authorInitial(incident.assignee)}
        </div>
      ) : null}

      {linked ? (
        <span
          className={cm.cn(
            'material-symbols-outlined group-hover:translate-x-0.5 transition-all text-base shrink-0',
          )}
          style={{ color: 'var(--color-severity-muted)' }}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </div>
  )

  if (!linked) {
    return body
  }

  return <Link to={`/incidents/${incident.id}`}>{body}</Link>
}
