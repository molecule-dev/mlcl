/**
 * VoteColumn — the 40px-wide left rail on every Agora thread row.
 *
 * Three stacked elements: upvote arrow, score (tabular-nums), downvote arrow.
 * Default arrow color #c0c8c6, hover transitions to upvote (#e8762c) /
 * downvote-active (#5c6b94). Score uses score-positive / score-negative /
 * text-secondary depending on sign.
 *
 * Translated from personal-finance/NetWorthCard.tsx hover-transform pattern
 * and the reaction-row treatment in crm/ActivityFeed.tsx.
 */
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VoteState = 'up' | 'down' | null

export interface VoteColumnProps {
  score: number
  state?: VoteState
  onVote?: (next: VoteState) => void
  /** Compact density — single inline row instead of stacked column. */
  compact?: boolean
}

export function VoteColumn({ score, state = null, onVote, compact = false }: VoteColumnProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [localState, setLocalState] = useState<VoteState>(state)
  const active: VoteState = onVote ? state : localState

  const handle = (next: VoteState) => {
    const resolved: VoteState = active === next ? null : next
    if (onVote) {
      onVote(resolved)
    } else {
      setLocalState(resolved)
    }
  }

  const formatted = score >= 1000 ? `${(score / 1000).toFixed(1)}k` : String(score)
  const scoreTone =
    score > 0
      ? { color: 'var(--color-pinned, var(--mol-color-primary))' }
      : score < 0
        ? { color: 'var(--color-downvote)' }
        : { color: 'var(--mol-color-text-secondary)' }

  if (compact) {
    return (
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <button
          type="button"
          aria-label={t('voteColumn.upvote', {}, { defaultValue: 'Upvote' })}
          aria-pressed={active === 'up'}
          onClick={() => handle('up')}
          className={cm.cn(cm.flex({ align: 'center' }), 'transition-colors')}
          style={{
            color:
              active === 'up' ? 'var(--color-upvote-active)' : 'var(--mol-color-text-tertiary)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
            arrow_upward
          </span>
        </button>
        <span
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}
          style={{ ...scoreTone, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatted}
        </span>
        <button
          type="button"
          aria-label={t('voteColumn.downvote', {}, { defaultValue: 'Downvote' })}
          aria-pressed={active === 'down'}
          onClick={() => handle('down')}
          className={cm.cn(cm.flex({ align: 'center' }), 'transition-colors')}
          style={{
            color:
              active === 'down' ? 'var(--color-downvote-active)' : 'var(--mol-color-text-tertiary)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
            arrow_downward
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
        cm.sp('py', 3),
        'w-10 shrink-0 border-r',
      )}
      style={{
        borderColor: 'var(--color-vote-divider, var(--color-border))',
        backgroundColor: 'var(--mol-color-surface-secondary)',
      }}
    >
      <button
        type="button"
        aria-label={t('voteColumn.upvote', {}, { defaultValue: 'Upvote' })}
        aria-pressed={active === 'up'}
        onClick={() => handle('up')}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(7),
          cm.h(6),
          'rounded-sm transition-colors hover:bg-primary-container/30',
        )}
        style={{
          color: active === 'up' ? 'var(--color-upvote-active)' : 'var(--mol-color-text-tertiary)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
          style={active === 'up' ? { fontVariationSettings: '"FILL" 1' } : undefined}
        >
          arrow_upward
        </span>
      </button>
      <span
        className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}
        style={{ ...scoreTone, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatted}
      </span>
      <button
        type="button"
        aria-label={t('voteColumn.downvote', {}, { defaultValue: 'Downvote' })}
        aria-pressed={active === 'down'}
        onClick={() => handle('down')}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(7),
          cm.h(6),
          'rounded-sm transition-colors hover:bg-secondary-container/30',
        )}
        style={{
          color:
            active === 'down' ? 'var(--color-downvote-active)' : 'var(--mol-color-text-tertiary)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
          style={active === 'down' ? { fontVariationSettings: '"FILL" 1' } : undefined}
        >
          arrow_downward
        </span>
      </button>
    </div>
  )
}

export default VoteColumn
