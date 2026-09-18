import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FrequencySparkline } from './FrequencySparkline.js'
import { type Severity, SeverityPill } from './SeverityPill.js'

/**
 * Editorial issue row — terminal-aesthetic dark surface with a coloured
 * `border-l-3` severity accent (sacred per DESIGN.md "Error Group Row"),
 * mono title fragment, mono fingerprint badge, frequency sparkline at the
 * far right, and uppercase 10px metadata columns (events, users, last
 * seen) in the dev-tools KPI rhythm.
 *
 * Translated from ci-cd-dashboard's PipelineRow (left-accent + KPI mini
 * columns + chevron) recoloured to severity-keyed accents and swapped the
 * branch chip for an environment chip so the affordance maps to error
 * triage instead of pipeline status.
 */

export interface IssueRowData {
  id: string
  title: string
  culprit?: string
  level: Severity
  status: 'unresolved' | 'resolved' | 'ignored' | 'new'
  event_count: number
  user_count: number
  first_seen: string
  last_seen: string
  fingerprint: string
  environment: string
  release?: string
  assignee?: string | null
  frequency?: number[]
  is_regression?: boolean
}

interface IssueRowProps {
  issue: IssueRowData
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

function fmtCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function authorInitial(name?: string | null): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

export function IssueRow({ issue, linked = true }: IssueRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const severity =
    issue.status === 'resolved' ? 'resolved' : issue.status === 'ignored' ? 'ignored' : issue.level
  const accent = ACCENT[severity]
  const fingerprint = (issue.fingerprint ?? '').slice(0, 8)
  const frequency = issue.frequency ?? []

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
      data-mol-id={`issue-row-${issue.id}`}
    >
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <SeverityPill severity={severity} />
          {issue.is_regression ? (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-new-light)',
                color: 'var(--color-severity-new)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                trending_up
              </span>
              {t('issueRow.regression', {}, { defaultValue: 'Regression' })}
            </span>
          ) : null}
          <p
            className={cm.cn('font-mono text-sm font-bold text-on-surface truncate')}
            style={{ color: 'var(--color-text)' }}
          >
            {issue.title}
          </p>
        </div>
        <p
          className={cm.cn('mt-1 font-mono text-xs truncate')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className={cm.cn('opacity-80')}>{issue.culprit}</span>
          <span className={cm.cn('mx-1.5 opacity-40')}>·</span>
          <span style={{ color: accent }} className={cm.cn('font-semibold')}>
            #{fingerprint}
          </span>
          {issue.release ? (
            <>
              <span className={cm.cn('mx-1.5 opacity-40')}>·</span>
              <span>{issue.release}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className={cm.cn('hidden md:block shrink-0')}>
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
      </div>

      <div className={cm.cn('hidden sm:flex shrink-0 flex-col items-end w-14')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-severity-muted)' }}
        >
          {t('issueRow.events', {}, { defaultValue: 'Events' })}
        </span>
        <span
          className={cm.cn('font-mono text-xs font-extrabold tabular-nums')}
          style={{ color: 'var(--color-text)' }}
        >
          {fmtCount(issue.event_count)}
        </span>
      </div>

      <div className={cm.cn('hidden lg:flex shrink-0 flex-col items-end w-14')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-severity-muted)' }}
        >
          {t('issueRow.users', {}, { defaultValue: 'Users' })}
        </span>
        <span
          className={cm.cn('font-mono text-xs font-extrabold tabular-nums')}
          style={{ color: 'var(--color-text)' }}
        >
          {fmtCount(issue.user_count)}
        </span>
      </div>

      <div className={cm.cn('hidden xl:flex shrink-0 flex-col items-end w-16')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-severity-muted)' }}
        >
          {t('issueRow.lastSeen', {}, { defaultValue: 'Last seen' })}
        </span>
        <span
          className={cm.cn('font-mono text-xs tabular-nums')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {fmtRelative(issue.last_seen)}
        </span>
      </div>

      <div className={cm.cn('hidden md:block shrink-0')}>
        <FrequencySparkline
          values={frequency}
          width={88}
          height={28}
          color={accent}
          spikeColor={
            severity === 'critical' || severity === 'unresolved'
              ? 'var(--color-severity-critical)'
              : accent
          }
          ariaLabel={`${issue.title} frequency`}
        />
      </div>

      {issue.assignee ? (
        <div
          className={cm.cn(
            'shrink-0 hidden sm:flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
          )}
          style={{
            backgroundColor: 'var(--color-severity-info-light)',
            color: 'var(--color-severity-info)',
            border: '2px solid var(--color-border)',
          }}
          title={issue.assignee}
          aria-hidden="true"
        >
          {authorInitial(issue.assignee)}
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

  return <Link to={`/issues/${issue.id}`}>{body}</Link>
}
