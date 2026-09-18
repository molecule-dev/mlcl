import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial incident row — terminal-aesthetic dark surface with a coloured
 * `border-l-4` severity accent, status pill, mono columns for service +
 * impact + duration, owner avatar, and a trailing chevron.
 *
 * Translated from ci-cd-dashboard's PipelineRow row treatment, recoloured
 * to incident severity tones and re-shaped to surface owner team and
 * mean-time-to-resolve / open duration per DESIGN.md "Incidents".
 */

export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'monitoring'
export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4'

export interface IncidentRowData {
  id: string
  title: string
  service: string
  severity: IncidentSeverity
  status: IncidentStatus
  owner: string
  started_at: string
  resolved_at: string | null
  impacted_users: number
}

interface IncidentRowProps {
  incident: IncidentRowData
  /** When false, renders a non-interactive demo row. */
  linked?: boolean
}

const SEVERITY_ACCENT: Record<IncidentSeverity, string> = {
  sev1: 'var(--color-severity-fatal)',
  sev2: 'var(--color-severity-error)',
  sev3: 'var(--color-severity-warn)',
  sev4: 'var(--color-severity-info)',
}

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  sev1: 'SEV1',
  sev2: 'SEV2',
  sev3: 'SEV3',
  sev4: 'SEV4',
}

const STATUS_TINT: Record<IncidentStatus, { bg: string; text: string; defaultLabel: string }> = {
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

function fmtDuration(startedAt: string, resolvedAt: string | null): string {
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now()
  const ms = end - new Date(startedAt).getTime()
  if (Number.isNaN(ms)) return '—'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return '< 1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${(minutes % 60).toString().padStart(2, '0')}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${(hours % 24).toString().padStart(2, '0')}h`
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

function ownerInitial(owner: string): string {
  const trimmed = owner.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

export function IncidentRow({ incident, linked = true }: IncidentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = SEVERITY_ACCENT[incident.severity]
  const status = STATUS_TINT[incident.status]
  const isOpen = incident.resolved_at === null

  const body = (
    <div
      className={cm.cn(
        'group relative flex items-center gap-4 rounded-xl px-5 py-4 transition-all',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'var(--color-surface-container)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`incident-row-${incident.id}`}
    >
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              'inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-black tracking-widest',
            )}
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
              color: accent,
            }}
          >
            {SEVERITY_LABEL[incident.severity]}
          </span>
          <span
            className={cm.cn(
              'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
            )}
            style={{ backgroundColor: status.bg, color: status.text }}
          >
            {t(`incidentRow.status.${incident.status}`, {}, { defaultValue: status.defaultLabel })}
          </span>
          <p className={cm.cn('font-mono text-[15px] font-bold text-on-surface truncate')}>
            {incident.title}
          </p>
        </div>
        <p className={cm.cn('mt-1.5 text-xs text-on-surface-variant truncate')}>
          <span className={cm.cn('font-semibold')}>{incident.service}</span>
          <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
          <span>
            {t(
              'incidentRow.impact',
              { count: incident.impacted_users },
              { defaultValue: '{{count}} impacted users' },
            )}
          </span>
        </p>
      </div>

      <div className={cm.cn('hidden md:flex shrink-0 flex-col items-end')}>
        <span
          className={cm.cn(
            'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('incidentRow.started', {}, { defaultValue: 'Started' })}
        </span>
        <span className={cm.cn('font-mono text-xs text-on-surface-variant')}>
          {fmtRelative(incident.started_at)}
        </span>
      </div>

      <div className={cm.cn('hidden sm:flex shrink-0 flex-col items-end w-24')}>
        <span
          className={cm.cn(
            'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {isOpen
            ? t('common.open', {}, { defaultValue: 'Open' })
            : t('form.duration', {}, { defaultValue: 'Duration' })}
        </span>
        <span
          className={cm.cn('font-mono text-xs font-extrabold')}
          style={{
            color: isOpen
              ? 'var(--color-severity-fatal-light)'
              : 'var(--color-severity-debug-light)',
          }}
        >
          {fmtDuration(incident.started_at, incident.resolved_at)}
        </span>
      </div>

      <div
        className={cm.cn(
          'shrink-0 hidden sm:flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
          color: 'var(--color-accent-hover)',
          border: '2px solid var(--color-background)',
        }}
        title={incident.owner}
        aria-hidden="true"
      >
        {ownerInitial(incident.owner)}
      </div>

      {linked ? (
        <span
          className={cm.cn(
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0',
          )}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </div>
  )

  if (!linked) return body

  return <Link to={`/incidents/${incident.id}`}>{body}</Link>
}
