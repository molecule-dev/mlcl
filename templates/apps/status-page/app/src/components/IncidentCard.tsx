import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from './StatusPill.js'

/**
 * Incident card — severity-coloured `border-l-4` accent, mono incident
 * id eyebrow, title, status badge, monospace timestamps, affected
 * component chips, latest update preview.
 *
 * Translated from ci-cd-dashboard's PipelineRow + crm's ActivityFeed
 * (mixed shape). Severity → accent map matches DESIGN.md's status
 * chain (minor=degraded amber, major=partial orange, critical=major
 * red, maintenance=indigo).
 */

export type IncidentImpact = 'minor' | 'major' | 'critical' | 'maintenance'
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export interface IncidentCardData {
  id: string
  title: string
  message?: string | null
  impact: IncidentImpact
  status: IncidentStatus
  affected_components?: string[]
  created_at: string
  resolved_at?: string | null
  latest_update?: { status: IncidentStatus; message: string; created_at: string } | null
}

const IMPACT_ACCENT: Record<IncidentImpact, string> = {
  minor: '#f59e0b',
  major: '#f97316',
  critical: '#ef4444',
  maintenance: '#6366f1',
}

const IMPACT_LABEL: Record<IncidentImpact, string> = {
  minor: 'Degraded',
  major: 'Partial outage',
  critical: 'Major outage',
  maintenance: 'Maintenance',
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
}

const STATUS_COLOR: Record<IncidentStatus, string> = {
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

interface IncidentCardProps {
  incident: IncidentCardData
  /** When false, renders a non-interactive demo card. */
  linked?: boolean
}

export function IncidentCard({ incident, linked = true }: IncidentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = IMPACT_ACCENT[incident.impact]
  const ms = incident.resolved_at
    ? new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()
    : Date.now() - new Date(incident.created_at).getTime()
  const minutes = Math.max(1, Math.round(ms / 60_000))
  const duration =
    minutes < 60
      ? `${minutes}m`
      : `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, '0')}m`
  const resolved = incident.status === 'resolved'

  const body = (
    <article
      className={cm.cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid var(--color-border-card)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`incident-card-${incident.id}`}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
        <div className={cm.cn('flex items-center gap-2 min-w-0')}>
          <span
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('incidentCard.id', { id: incident.id }, { defaultValue: 'INC-{{id}}' })}
          </span>
          <span
            className={cm.cn('font-mono text-[10px] font-extrabold uppercase tracking-widest')}
            style={{ color: accent }}
          >
            {t(
              `incidentCard.impact.${incident.impact}`,
              {},
              { defaultValue: IMPACT_LABEL[incident.impact] },
            )}
          </span>
        </div>
        <StatusPill
          status={
            resolved
              ? 'operational'
              : incident.impact === 'maintenance'
                ? 'under_maintenance'
                : 'major_outage'
          }
          label={t(
            `incidentCard.status.${incident.status}`,
            {},
            { defaultValue: STATUS_LABEL[incident.status] },
          )}
        />
      </div>

      <h3 className={cm.cn('mt-2 text-lg font-extrabold tracking-tight text-on-surface')}>
        {incident.title}
      </h3>

      {incident.message ? (
        <p className={cm.cn('mt-1.5 text-sm text-on-surface-variant leading-relaxed')}>
          {incident.message}
        </p>
      ) : null}

      {incident.affected_components && incident.affected_components.length > 0 ? (
        <div className={cm.cn('mt-3 flex flex-wrap gap-1.5')}>
          {incident.affected_components.map((c) => (
            <span
              key={c}
              className={cm.cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium',
              )}
              style={{
                backgroundColor: 'var(--color-border-card)',
                color: 'var(--color-chip-text)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[11px]')} aria-hidden="true">
                lan
              </span>
              {c}
            </span>
          ))}
        </div>
      ) : null}

      <footer
        className={cm.cn('mt-4 pt-3 border-t flex items-center justify-between gap-3 text-xs')}
        style={{ borderColor: 'var(--color-border-card)' }}
      >
        <span className={cm.cn('font-mono text-on-surface-variant')}>
          {fmtTimestamp(incident.created_at)}
        </span>
        <span className={cm.cn('flex items-center gap-2')}>
          <span
            className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
            style={{ backgroundColor: STATUS_COLOR[incident.status] }}
            aria-hidden="true"
          />
          <span
            className={cm.cn('font-mono font-extrabold')}
            style={{ color: STATUS_TEXT_COLOR[incident.status] }}
          >
            {duration}
          </span>
          <span className={cm.cn('font-mono text-on-surface-variant')}>
            {resolved
              ? t('incidentCard.totalDuration', {}, { defaultValue: 'total' })
              : t('incidentCard.elapsed', {}, { defaultValue: 'elapsed' })}
          </span>
        </span>
      </footer>
    </article>
  )

  if (!linked) return body
  return <Link to={`/incidents/${incident.id}`}>{body}</Link>
}
