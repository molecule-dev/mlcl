import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PipelineStatus, StatusPill } from './StatusPill.js'

/**
 * Editorial pipeline row — terminal-aesthetic dark surface with a
 * coloured `border-l-4` status accent, mono SHA + duration columns, a
 * branch chip, hover translate-y, and a trailing chevron. Translated
 * from personal-finance's AccountRecentTransactions row treatment, with
 * KPI-card vibe (uppercase 10px label, font-extrabold values) layered
 * onto each metric column.
 */

export interface PipelineRowData {
  id: string
  name: string
  repository: string
  branch: string
  commit_sha: string
  commit_message: string
  author: string
  status: PipelineStatus
  started_at: string
  duration_seconds: number | null
}

interface PipelineRowProps {
  pipeline: PipelineRowData
  /** When false, renders a non-interactive demo row (used on Landing). */
  linked?: boolean
  /** Drop the secondary metadata columns (commit SHA, started) for narrow
   * embeds like the landing-page hero mock, where the full column set
   * over-commits the row width and squeezes the status pill under the
   * branch chip. */
  dense?: boolean
}

const ACCENT: Record<PipelineStatus, string> = {
  queued: 'var(--color-pill-queued-dot)',
  running: 'var(--color-pill-running-dot)',
  success: 'var(--color-pill-success-dot)',
  failed: 'var(--color-pill-failed-dot)',
  cancelled: 'var(--color-pill-cancelled-dot)',
  skipped: 'var(--color-pill-skipped-dot)',
  healthy: 'var(--color-pill-success-dot)',
  degraded: 'var(--color-pill-degraded-dot)',
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return '— —'
  if (seconds < 1) return '< 1s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s.toString().padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`
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

function authorInitial(author: string): string {
  const trimmed = author.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

export function PipelineRow({ pipeline, linked = true, dense = false }: PipelineRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACCENT[pipeline.status]
  const sha = pipeline.commit_sha.slice(0, 7)
  const isRunning = pipeline.status === 'running'

  const body = (
    <div
      className={cm.cn(
        'group relative flex items-center gap-4 rounded-xl px-5 py-4 transition-all',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'rgba(30, 34, 53, 0.6)',
        border: '1px solid rgba(30, 41, 59, 0.8)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`pipeline-row-${pipeline.id}`}
    >
      {/* Status + name + repo — positioned above later siblings so a
          squeezed pill can never be painted over by the branch chip. */}
      <div className={'relative z-10 flex-1 min-w-0'}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <StatusPill status={pipeline.status} />
          <p className="font-mono text-[15px] font-bold text-on-surface truncate">
            {pipeline.name}
          </p>
        </div>
        <p className={'mt-1.5 text-xs text-on-surface-variant truncate'}>
          <span className="font-semibold">{pipeline.repository}</span>
          <span className={'mx-1.5 opacity-50'}>·</span>
          <span className="truncate">{pipeline.commit_message}</span>
        </p>
      </div>

      {/* Branch chip */}
      <div className={'hidden md:block shrink-0'}>
        <span
          className={
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-medium'
          }
          style={{
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
            fork_right
          </span>
          {pipeline.branch}
        </span>
      </div>

      {/* Commit SHA */}
      <div className={dense ? 'hidden' : 'hidden lg:flex shrink-0 flex-col items-end'}>
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('pipelineRow.commit', {}, { defaultValue: 'Commit' })}
        </span>
        <span className={'font-mono text-xs font-semibold text-on-surface'}>{sha}</span>
      </div>

      {/* Duration */}
      <div className={'hidden sm:flex shrink-0 flex-col items-end w-20'}>
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('form.duration', {}, { defaultValue: 'Duration' })}
        </span>
        <span
          className={'font-mono text-xs font-extrabold'}
          style={{
            color: isRunning ? 'var(--color-pill-running-text)' : 'var(--color-on-surface)',
          }}
        >
          {fmtDuration(pipeline.duration_seconds)}
        </span>
      </div>

      {/* Started + author */}
      <div className={dense ? 'hidden' : 'hidden xl:flex shrink-0 flex-col items-end'}>
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('pipelineRow.started', {}, { defaultValue: 'Started' })}
        </span>
        <span className={'font-mono text-xs text-on-surface-variant'}>
          {fmtRelative(pipeline.started_at)}
        </span>
      </div>

      <div
        className={
          'shrink-0 hidden sm:flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs'
        }
        style={{
          backgroundColor: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
          border: '2px solid rgba(22, 25, 38, 0.9)',
        }}
        title={pipeline.author}
        aria-hidden="true"
      >
        {authorInitial(pipeline.author)}
      </div>

      {linked ? (
        <span
          className={
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0'
          }
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

  return <Link to={`/pipelines/${pipeline.id}`}>{body}</Link>
}
