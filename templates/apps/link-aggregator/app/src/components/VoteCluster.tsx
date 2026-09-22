/**
 * Vertical up/down vote control with score between the chevrons.
 *
 * Treatment: tabular-nums score, orange (upvote) and indigo (downvote)
 * tints when active, hover-tinted background per direction. Material
 * Symbols arrow_upward / arrow_downward glyphs.
 *
 * Translated from personal-finance's KpiCard / banking-dashboard's
 * KPI accent pattern — applied to a Reddit/HN-style vote cluster.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VoteDirection = 'up' | 'down' | null

export interface VoteClusterProps {
  score: number
  direction?: VoteDirection
  size?: 'sm' | 'md'
  onVote?: (next: VoteDirection) => void
}

export function VoteCluster({ score, direction = null, size = 'md', onVote }: VoteClusterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // 40px on the feed (md), 36px in dense comment threads (sm) — the mobile
  // floor for a comfortable thumb target.
  const btnSize = size === 'sm' ? 'w-9 h-9 text-lg' : 'w-10 h-10 text-xl'
  const scoreSize = size === 'sm' ? cm.textSize('xs') : cm.textSize('sm')

  const upActive = direction === 'up'
  const downActive = direction === 'down'

  const scoreClass = upActive
    ? 'text-[color:var(--color-upvote)]'
    : downActive
      ? 'text-[color:var(--color-downvote)]'
      : 'text-on-surface'

  const handleClick = (next: 'up' | 'down') => {
    if (!onVote) return
    onVote(direction === next ? null : next)
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
        cm.sp('py', 1),
        'select-none',
      )}
    >
      <button
        type="button"
        onClick={() => handleClick('up')}
        aria-label={t('voteCluster.upvote', {}, { defaultValue: 'Upvote' })}
        aria-pressed={upActive}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'transition-all duration-150',
          btnSize,
          upActive
            ? 'bg-[color:var(--color-upvote)] text-white shadow-sm'
            : 'text-outline hover:text-[color:var(--color-upvote)] hover:bg-[color:var(--color-upvote)]/10',
        )}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: upActive ? "'FILL' 1" : "'FILL' 0" }}
        >
          arrow_upward
        </span>
      </button>
      <span
        className={cm.cn(
          scoreSize,
          cm.fontWeight('bold'),
          scoreClass,
          'tabular-nums tracking-tight',
        )}
      >
        {formatScore(score)}
      </span>
      <button
        type="button"
        onClick={() => handleClick('down')}
        aria-label={t('voteCluster.downvote', {}, { defaultValue: 'Downvote' })}
        aria-pressed={downActive}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'transition-all duration-150',
          btnSize,
          downActive
            ? 'bg-[color:var(--color-downvote)] text-white shadow-sm'
            : 'text-outline hover:text-[color:var(--color-downvote)] hover:bg-[color:var(--color-downvote)]/10',
        )}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: downActive ? "'FILL' 1" : "'FILL' 0" }}
        >
          arrow_downward
        </span>
      </button>
    </div>
  )
}

function formatScore(score: number): string {
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(1)}k`
  }
  return String(score)
}

export default VoteCluster
