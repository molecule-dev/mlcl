/**
 * BoardCard — grid tile for the public Boards page.
 *
 * Icon chip tinted by the board's accent color, name, description, and a
 * live post count.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApiBoardSummary } from '../utils/posts.js'

interface BoardCardProps {
  board: ApiBoardSummary
  /** Override the destination (marketing samples link to /signup). */
  href?: string
}

export function BoardCard({ board, href }: BoardCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const to = href ?? `/b/${board.slug}`

  return (
    <Link
      to={to}
      data-mol-id="board-card"
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-xl border border-outline-variant/40 bg-surface hover:border-primary/40 hover:shadow-sm transition-all',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          cm.roundedFull,
          cm.textSize('2xl'),
        )}
        style={{
          backgroundColor: board.color ? `${board.color}1f` : 'var(--color-primary-container)',
        }}
        aria-hidden="true"
      >
        {board.icon || '🗂️'}
      </span>
      <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
        {board.name}
      </span>
      {board.description && (
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {board.description}
        </span>
      )}
      <span
        className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'uppercase tracking-widest')}
        style={{ color: 'var(--color-primary)' }}
      >
        {t(
          'boardCard.postCount',
          { count: board.post_count ?? 0 },
          { defaultValue: '{{count}} posts' },
        )}
      </span>
    </Link>
  )
}

export default BoardCard
