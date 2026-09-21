/**
 * PostCard — the feedback request row used on Boards, BoardDetail, Search,
 * and My Activity.
 *
 * Layout: vote pill on the left, content cell on the right stacking the
 * status badge row → title → excerpt → meta row (board chip · author ·
 * timestamp · comment count · roadmap label).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiPost, authorName, displayStatus, excerptOf, timeAgo } from '../utils/posts.js'
import { StatusBadge } from './StatusBadge.js'
import { VoteButton } from './VoteButton.js'

interface PostCardProps {
  post: ApiPost
  /** Toggle handler — absent means the visitor is signed out. */
  onVote?: (post: ApiPost) => void
  /** Disable the pill while a toggle is in flight. */
  votingDisabled?: boolean
  /** Override the destination (marketing page samples link to /signup). */
  href?: string
}

export function PostCard({ post, onVote, votingDisabled, href }: PostCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const titleHref = href ?? `/post/${post.id}`
  const boardHref = href ?? (post.board ? `/b/${post.board.slug}` : '#')
  const status = displayStatus(post)

  return (
    <article
      data-mol-id="post-card"
      className={cm.cn(
        cm.flex({ align: 'stretch', gap: 'sm' }),
        cm.sp('p', 4),
        'bg-surface rounded-xl border border-outline-variant/40 hover:border-primary/40 hover:shadow-sm transition-all',
      )}
    >
      <VoteButton
        count={post.vote_count ?? 0}
        voted={post.viewer_voted ?? false}
        onVote={onVote ? () => onVote(post) : undefined}
        disabled={votingDisabled}
      />
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          <StatusBadge status={status} label={post.roadmap_label} />
          {post.board && (
            <Link
              to={boardHref}
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'rounded-full px-2.5 min-h-[24px] hover:opacity-80 transition-opacity',
              )}
              style={{
                backgroundColor: post.board.color
                  ? `${post.board.color}1f`
                  : 'var(--color-primary-container)',
                color: post.board.color
                  ? `color-mix(in srgb, ${post.board.color} 70%, black)`
                  : 'var(--color-primary)',
              }}
            >
              {post.board.icon ? `${post.board.icon} ` : ''}
              {post.board.name}
            </Link>
          )}
        </div>
        <h3
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('base'),
            'leading-snug text-on-surface',
          )}
        >
          <Link to={titleHref} className="hover:text-primary transition-colors">
            {post.title}
          </Link>
        </h3>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-on-surface-variant leading-relaxed line-clamp-2',
          )}
        >
          {excerptOf(post)}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'flex-wrap text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.fontWeight('semibold'))}>{authorName(post.author)}</span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo(post.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              chat_bubble
            </span>
            {t(
              'postCard.commentCount',
              { count: post.comment_count ?? 0 },
              { defaultValue: '{{count}} comments' },
            )}
          </span>
          {post.shipped_at && (
            <>
              <span aria-hidden="true">·</span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                  local_shipping
                </span>
                {timeAgo(post.shipped_at)}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export default PostCard
