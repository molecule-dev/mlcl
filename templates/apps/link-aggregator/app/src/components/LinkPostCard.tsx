/**
 * Editorial link-post card — vote cluster on the left, title + domain +
 * meta + tag pills on the right. Hover lift + soft purple tint.
 *
 * Translated from blog/PostListItem.tsx + personal-finance/ActivityRow.tsx —
 * adapted for HN/Reddit-style link aggregation with sub badge and bookmark.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VoteCluster, type VoteDirection } from './VoteCluster.js'

export interface LinkPost {
  id: string
  title: string
  url: string | null
  domain: string | null
  text?: string | null
  submitter_id: string
  submitter_name?: string
  sub_slug?: string
  sub_name?: string
  points: number
  comment_count: number
  tags: string[]
  user_vote?: VoteDirection
  saved?: boolean
  created_at: string
}

export interface LinkPostCardProps {
  post: LinkPost
  rank?: number
  onVote?: (id: string, next: VoteDirection) => void
  onSave?: (id: string) => void
}

export function LinkPostCard({ post, rank, onVote, onSave }: LinkPostCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const detailHref = `/links/${post.id}`

  const titleClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.textSize('lg'),
    'text-on-surface group-hover:text-primary transition-colors leading-snug',
  )

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 transition-all group',
      )}
    >
      {typeof rank === 'number' && (
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'text-outline tabular-nums w-6 text-right pt-2',
          )}
        >
          {rank}
        </span>
      )}
      <VoteCluster
        score={post.points}
        direction={post.user_vote ?? null}
        size="md"
        onVote={(next) => onVote?.(post.id, next)}
      />
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), 'flex-wrap')}>
          {post.url ? (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className={titleClass}>
              {post.title}
            </a>
          ) : (
            // Text posts open the in-app thread — router Link, not <a>, so
            // navigation stays client-side.
            <Link to={detailHref} className={titleClass}>
              {post.title}
            </Link>
          )}
          {post.domain && (
            <span className={cm.cn(cm.textSize('xs'), 'text-outline font-mono')}>
              ({post.domain})
            </span>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            'text-on-surface-variant flex-wrap',
          )}
        >
          {post.sub_slug && (
            <Link
              to={`/subs/${post.sub_slug}`}
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline decoration-2 underline-offset-2',
              )}
            >
              {post.sub_name ? `c/${post.sub_name}` : `c/${post.sub_slug}`}
            </Link>
          )}
          <span className="text-outline">·</span>
          <span>
            {t(
              'linkPostCard.byUser',
              { user: post.submitter_name || post.submitter_id },
              { defaultValue: 'by {{user}}' },
            )}
          </span>
          <span className="text-outline">·</span>
          <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          <span className="text-outline">·</span>
          <Link to={detailHref} className={cm.cn('hover:text-primary transition-colors')}>
            {t(
              'linkPostCard.commentsCount',
              { count: post.comment_count },
              { defaultValue: '{{count}} comments' },
            )}
          </Link>
          {onSave && (
            <>
              <span className="text-outline">·</span>
              <button
                type="button"
                onClick={() => onSave(post.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'hover:text-[color:var(--color-saved)] transition-colors',
                )}
                aria-pressed={!!post.saved}
              >
                <span
                  className={'material-symbols-outlined text-base'}
                  style={{ fontVariationSettings: post.saved ? "'FILL' 1" : "'FILL' 0" }}
                >
                  bookmark
                </span>
                {post.saved
                  ? t('common.saved', {}, { defaultValue: 'Saved' })
                  : t('common.save', {}, { defaultValue: 'Save' })}
              </button>
            </>
          )}
        </div>
        {post.tags.length > 0 && (
          <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap mt-1')}>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/feed?tag=${encodeURIComponent(tag)}`}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'py-0.5 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors',
                )}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

export default LinkPostCard
