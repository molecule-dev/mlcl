/**
 * VoteButton — the Canny-style demand pill: upvote chevron + live count.
 *
 * One vote per user, toggled on click. When `onVote` is absent (logged-out
 * visitor on a public board) the pill renders as a link to /login so the
 * vote intent converts to a signup instead of a dead click.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VoteButtonProps {
  count: number
  voted?: boolean
  onVote?: () => void
  /** Size step — detail pages use the roomier 'lg' pill. */
  size?: 'md' | 'lg'
  /** Disable interaction (e.g. while a toggle request is in flight). */
  disabled?: boolean
}

export function VoteButton({
  count,
  voted = false,
  onVote,
  size = 'md',
  disabled,
}: VoteButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatted = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)

  const pillClass = cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
    cm.fontWeight('bold'),
    'rounded-lg border transition-colors select-none',
    size === 'lg' ? 'w-16 py-2' : 'w-12 py-1.5',
    voted ? 'border-transparent' : 'border-outline-variant/50',
    disabled && 'opacity-60 cursor-not-allowed',
  )
  const pillStyle = voted
    ? {
        backgroundColor: 'var(--color-vote-bg)',
        color: 'var(--color-vote)',
        borderColor: 'var(--color-vote)',
      }
    : {
        backgroundColor: 'var(--mol-color-surface-secondary)',
        color: 'var(--mol-color-text-secondary)',
      }

  const inner = (
    <>
      <span
        className={cm.cn(
          'material-symbols-outlined',
          size === 'lg' ? cm.textSize('lg') : cm.textSize('base'),
        )}
        style={voted ? { fontVariationSettings: '"FILL" 1' } : undefined}
        aria-hidden="true"
      >
        arrow_drop_up
      </span>
      <span
        className={cm.cn(cm.textSize(size === 'lg' ? 'lg' : 'sm'))}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatted}
      </span>
    </>
  )

  const label = voted
    ? t('voteButton.voted', { count: formatted }, { defaultValue: 'Voted — {{count}} votes' })
    : t('voteButton.vote', { count: formatted }, { defaultValue: 'Vote — {{count}} votes' })

  if (!onVote) {
    return (
      <Link
        to="/login"
        data-mol-id="vote-button-login"
        aria-label={label}
        title={t('voteButton.signInToVote', {}, { defaultValue: 'Sign in to vote' })}
        className={pillClass}
        style={pillStyle}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      data-mol-id="vote-button"
      aria-pressed={voted}
      aria-label={label}
      disabled={disabled}
      onClick={() => onVote()}
      className={cm.cn(pillClass, !disabled && 'hover:border-primary/50 cursor-pointer')}
      style={pillStyle}
    >
      {inner}
    </button>
  )
}

export default VoteButton
