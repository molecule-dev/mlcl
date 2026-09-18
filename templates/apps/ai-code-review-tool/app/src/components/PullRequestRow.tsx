import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type PRStatus = 'open' | 'merged' | 'closed' | 'draft'

export interface PullRequest {
  id: string
  title: string
  repo: string
  branch?: string
  status: PRStatus
  /** AI quality score, 0-10. */
  score: number | null
  additions: number
  deletions: number
  files: number
  /** ISO timestamp. */
  createdAt: string
  authorAvatar?: string | null
  authorName?: string
}

interface PullRequestRowProps {
  pr: PullRequest
  /** Render in dense mode (table-like). */
  dense?: boolean
}

const STATUS_TINT: Record<PRStatus, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-emerald-500/15', text: 'text-success', label: 'Open' },
  merged: { bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Merged' },
  closed: { bg: 'bg-red-500/15', text: 'text-error', label: 'Closed' },
  draft: { bg: 'bg-slate-400/15', text: 'text-on-surface-variant', label: 'Draft' },
}

/**
 * Editorial PR list-item — title + repo + status pill + +/- stats +
 * AI score chip + relative timestamp. Tap-to-detail.
 *
 * Translated from api-documentation's EndpointsList row anatomy
 * (method-tinted left badge + monospace path + truncated summary +
 * meta on the right + arrow_forward affordance), recoloured with PR
 * semantic states and Refract violet accents.
 */
export function PullRequestRow({ pr, dense = false }: PullRequestRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = STATUS_TINT[pr.status]
  const date = new Date(pr.createdAt)

  return (
    <Link
      to={`/prs/${pr.id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 5),
        cm.sp('py', dense ? 3 : 4),
        'group hover:bg-surface-container-low transition-colors',
      )}
      data-mol-id={`pr-row-${pr.id}`}
    >
      <span
        className={cm.cn(
          'px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest font-mono shrink-0 w-[68px] text-center uppercase',
          tint.bg,
          tint.text,
        )}
      >
        {t(`pullRequestRow.status.${pr.status}`, {}, { defaultValue: tint.label })}
      </span>

      <span className={cm.cn('flex-1 min-w-0')}>
        <span className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            {pr.title}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'baseline', gap: 'sm' }),
            cm.sp('mt', 1),
            cm.textSize('xs'),
            'text-on-surface-variant font-mono',
          )}
        >
          <span>{pr.repo}</span>
          {pr.branch ? <span className="opacity-60">· {pr.branch}</span> : null}
          {pr.authorName ? <span className="opacity-60">· {pr.authorName}</span> : null}
        </span>
      </span>

      <span
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          'shrink-0 font-mono tabular-nums text-xs',
        )}
      >
        <span className="text-success font-bold">+{pr.additions}</span>
        <span className="text-error font-bold">-{pr.deletions}</span>
        <span className="text-on-surface-variant">
          {t('pullRequestRow.files', { count: pr.files }, { defaultValue: '{{count}} f' })}
        </span>
      </span>

      {pr.score !== null ? (
        <span
          className={cm.cn(
            'shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-extrabold tabular-nums border-2',
          )}
          style={{
            borderColor:
              pr.score >= 8
                ? 'var(--color-score-high)'
                : pr.score >= 5
                  ? 'var(--color-score-mid)'
                  : 'var(--color-score-low)',
            color:
              pr.score >= 8
                ? 'var(--color-score-high)'
                : pr.score >= 5
                  ? 'var(--color-score-mid)'
                  : 'var(--color-score-low)',
          }}
          aria-label={t(
            'pullRequestRow.scoreAria',
            { score: pr.score },
            { defaultValue: 'AI quality score {{score}} / 10' },
          )}
        >
          {pr.score.toFixed(1)}
        </span>
      ) : (
        <span
          className={cm.cn(
            'shrink-0 text-[10px] uppercase tracking-widest font-mono text-on-surface-variant',
          )}
        >
          {t('pullRequestRow.scorePending', {}, { defaultValue: '· · ·' })}
        </span>
      )}

      <span
        className={cm.cn(
          'shrink-0 text-[10px] tabular-nums font-mono text-on-surface-variant w-20 text-right',
        )}
      >
        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>

      <span
        className={cm.cn(
          'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0',
        )}
        aria-hidden="true"
      >
        arrow_forward
      </span>
    </Link>
  )
}
