/**
 * ThreadRow — feed item for /feed, /c/:slug, /search.
 *
 * Layout: 40px vote column on the left, content cell on the right.
 * Content cell stacks: status pill row → title → meta row (author · category
 * pill · timestamp · comment count).
 *
 * Translated from blog/PostListItem.tsx (hover row + meta line) and
 * personal-finance/AccountRecentTransactions.tsx (status pill / divide).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VoteColumn, type VoteState } from './VoteColumn.js'

export type ThreadStatus = 'pinned' | 'locked' | 'resolved' | 'hot' | 'flagged' | 'open'

export interface ThreadRowData {
  id: string
  title: string
  author: string
  /**
   * URL-safe slug for the author's profile route. Falls back to a
   * truncated id when a username isn't set so display name spacing
   * doesn't leak into the URL.
   */
  authorSlug?: string
  authorBadge?: 'op' | 'mod' | 'admin' | null
  category: string
  categorySlug: string
  categoryColor?: string
  flair?: string | null
  timestamp: string
  commentCount: number
  score: number
  voteState?: VoteState
  status?: ThreadStatus
  excerpt?: string
  thumbnail?: string | null
}

interface ThreadRowProps {
  thread: ThreadRowData
  onVote?: (id: string, next: VoteState) => void
  /**
   * Override the destination URL for the row's title/category/author links.
   * Used on marketing pages (/) where sample threads, fake authors, and
   * non-existent categories link to /signup instead of dead routes.
   */
  href?: string
}

const STATUS_STYLES: Record<ThreadStatus, { bg: string; fg: string; icon: string; key: string }> = {
  pinned: {
    bg: 'var(--color-pinned-light, #e6f5f2)',
    fg: 'var(--color-pinned, #0e7c6b)',
    icon: 'push_pin',
    key: 'threadRow.statusPinned',
  },
  locked: {
    bg: 'var(--color-locked-light, #f3f4f6)',
    fg: 'var(--color-locked, #6b7280)',
    icon: 'lock',
    key: 'threadRow.statusLocked',
  },
  resolved: {
    bg: 'var(--color-resolved-light, #dcfce7)',
    fg: 'var(--color-resolved, #16a34a)',
    icon: 'check_circle',
    key: 'threadRow.statusResolved',
  },
  hot: {
    bg: 'var(--color-hot-light, #fee2e2)',
    fg: 'var(--color-hot, #dc2626)',
    icon: 'local_fire_department',
    key: 'threadRow.statusHot',
  },
  flagged: {
    bg: 'var(--color-flagged-light, #fef9ee)',
    fg: 'var(--color-flagged, #d97706)',
    icon: 'flag',
    key: 'threadRow.statusFlagged',
  },
  open: { bg: '', fg: '', icon: '', key: '' },
}

export function ThreadRow({ thread, onVote, href }: ThreadRowProps) {
  const titleHref = href ?? `/thread/${thread.id}`
  const categoryHref = href ?? `/c/${thread.categorySlug}`
  const authorHref = href ?? `/u/${thread.authorSlug ?? thread.author}`
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = thread.status && thread.status !== 'open' ? STATUS_STYLES[thread.status] : null
  const statusLabel: Record<ThreadStatus, string> = {
    pinned: t('threadRow.statusPinned', {}, { defaultValue: 'Pinned' }),
    locked: t('threadRow.statusLocked', {}, { defaultValue: 'Locked' }),
    resolved: t('status.resolved', {}, { defaultValue: 'Resolved' }),
    hot: t('threadRow.statusHot', {}, { defaultValue: 'Hot' }),
    flagged: t('threadRow.statusFlagged', {}, { defaultValue: 'Under Review' }),
    open: '',
  }

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        'group bg-surface rounded-lg border border-outline-variant/40 hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden relative',
      )}
    >
      <VoteColumn
        score={thread.score}
        state={thread.voteState ?? null}
        onVote={onVote ? (next) => onVote(thread.id, next) : undefined}
      />
      <div
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col', gap: 'xs' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'min-w-0',
        )}
      >
        {status && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'self-start text-[10px] uppercase tracking-widest rounded-full px-2.5 py-0.5',
            )}
            style={{ backgroundColor: status.bg, color: status.fg }}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              {status.icon}
            </span>
            {statusLabel[thread.status ?? 'open']}
          </span>
        )}
        <h3
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('base'),
            'leading-snug text-on-surface group-hover:text-primary transition-colors',
          )}
        >
          <Link
            to={titleHref}
            className={cm.cn(
              'after:absolute after:inset-0 after:content-[""] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            {thread.title}
          </Link>
        </h3>
        {thread.excerpt && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant leading-relaxed line-clamp-2',
            )}
          >
            {thread.excerpt}
          </p>
        )}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'flex-wrap text-on-surface-variant relative z-10',
          )}
        >
          <Link
            to={categoryHref}
            className={cm.cn(
              'rounded-full px-2.5 py-0.5 hover:opacity-80 transition-opacity relative',
            )}
            style={{
              backgroundColor: thread.categoryColor
                ? `${thread.categoryColor}1f`
                : 'var(--color-primary-light, var(--color-pinned-light))',
              // Category accents are data-driven mid-tones (~3-4.3:1 raw on their
              // own 12% tint); mixing 30% black guarantees >=4.5:1 for any accent.
              color: thread.categoryColor
                ? `color-mix(in srgb, ${thread.categoryColor} 70%, black)`
                : 'var(--color-primary, var(--color-pinned))',
            }}
          >
            {thread.category}
          </Link>
          {thread.flair && (
            <span
              className={cm.cn(
                'rounded-full px-2.5 py-0.5 border border-outline-variant/40 text-on-surface-variant',
              )}
            >
              {thread.flair}
            </span>
          )}
          <Link
            to={authorHref}
            className={cm.cn(cm.fontWeight('semibold'), 'hover:underline relative')}
            style={{ color: 'var(--color-primary, var(--color-pinned))' }}
          >
            {t('threadRow.authorPrefix', {}, { defaultValue: 'u/' })}
            {thread.author}
          </Link>
          {thread.authorBadge && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-moderator-light, var(--color-moderator-light))',
                color: 'var(--color-moderator, var(--color-moderator))',
              }}
            >
              {thread.authorBadge}
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>{thread.timestamp}</span>
          <span aria-hidden="true">·</span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              chat_bubble
            </span>
            {t(
              'threadRow.commentCount',
              { count: thread.commentCount },
              { defaultValue: '{{count}} comments' },
            )}
          </span>
        </div>
      </div>
      {thread.thumbnail && (
        <div className={cm.cn(cm.sp('p', 3), 'shrink-0 relative z-10')}>
          <img
            src={thread.thumbnail}
            alt=""
            className={cm.cn(cm.w(20), cm.h(20), 'rounded-md object-cover')}
          />
        </div>
      )}
    </article>
  )
}

export default ThreadRow
