/**
 * Post / reply card — author sidebar (avatar, username, reputation, role,
 * join date) on the left, body + action bar on the right. Body uses the
 * Georgia serif markdown family per DESIGN.md; action bar exposes reply,
 * quote, upvote, bookmark, flag, and (for moderators) pin/lock controls.
 *
 * Translated from personal-finance's AccountRecentTransactions row + the
 * DESIGN.md "Post / Reply" spec.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReputationBadge, type ReputationTier } from './ReputationBadge.js'

interface PostCardProps {
  id: string
  isOriginalPost?: boolean
  body: string
  createdAt: string
  editedAt?: string
  author: {
    username: string
    displayName?: string
    avatarUrl?: string
    reputation: number
    tier?: ReputationTier
    role?: 'member' | 'moderator' | 'admin'
    joinedAt?: string
    postCount?: number
  }
  upvotes: number
  hasUpvoted?: boolean
  bookmarked?: boolean
  flagged?: boolean
  isSolution?: boolean
  onReply?: () => void
  onQuote?: () => void
  onUpvote?: () => void
  onBookmark?: () => void
  onFlag?: () => void
  onMarkSolution?: () => void
}

const formatJoinDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const formatPostedAt = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function PostCard({
  isOriginalPost = false,
  body,
  createdAt,
  editedAt,
  author,
  upvotes,
  hasUpvoted = false,
  bookmarked = false,
  flagged = false,
  isSolution = false,
  onReply,
  onQuote,
  onUpvote,
  onBookmark,
  onFlag,
  onMarkSolution,
}: PostCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initials = (author.displayName ?? author.username).slice(0, 2).toUpperCase()
  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border md:flex-row',
        isSolution
          ? 'border-emerald-300/60 ring-1 ring-emerald-200/60 bg-success-light/40'
          : isOriginalPost
            ? 'border-primary/30 shadow-sm shadow-primary/5'
            : 'border-outline-variant/30',
      )}
    >
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
          cm.textCenter,
          'shrink-0 md:w-40',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-primary-dark text-white text-base shadow-md shadow-primary/30',
          )}
        >
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt=""
              className={cm.cn('h-full w-full rounded-full object-cover')}
            />
          ) : (
            initials
          )}
        </div>
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
          {`@${author.username}`}
        </p>
        {author.displayName && author.displayName !== author.username && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {author.displayName}
          </p>
        )}
        <ReputationBadge score={author.reputation} tier={author.tier} showScore />
        {author.role === 'moderator' || author.role === 'admin' ? (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest bg-[var(--color-moderator-light)] text-[var(--color-moderator)] ring-1 ring-[var(--color-moderator)]/30',
            )}
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden>
              shield
            </span>
            {t(
              `postCard.role.${author.role}`,
              {},
              { defaultValue: author.role === 'admin' ? 'Admin' : 'Moderator' },
            )}
          </span>
        ) : null}
        {author.joinedAt && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'postCard.joinedAt',
              { date: formatJoinDate(author.joinedAt) },
              { defaultValue: 'Joined {{date}}' },
            )}
          </p>
        )}
        {typeof author.postCount === 'number' && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {t(
              'postCard.postCount',
              { count: author.postCount.toLocaleString() },
              { defaultValue: '{{count}} posts' },
            )}
          </p>
        )}
      </aside>
      <div className={cm.cn(cm.flex1, cm.stack(4), 'min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            {isOriginalPost && (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'py-0.5 text-[10px] uppercase tracking-widest bg-primary/10 text-primary',
                )}
              >
                {t('postCard.originalPost', {}, { defaultValue: 'Original Post' })}
              </span>
            )}
            {isSolution && (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest bg-success-light text-success',
                )}
              >
                <span className="material-symbols-outlined text-[12px]" aria-hidden>
                  check_circle
                </span>
                {t('postCard.solution', {}, { defaultValue: 'Solution' })}
              </span>
            )}
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {formatPostedAt(createdAt)}
              {editedAt && (
                <span className={cm.cn('italic ml-1 text-on-surface-variant')}>
                  {t('postCard.edited', {}, { defaultValue: '(edited)' })}
                </span>
              )}
            </span>
          </div>
        </header>
        <div
          className="prose max-w-none text-on-surface leading-[1.75]"
          style={{ fontFamily: 'var(--mol-font-serif, Georgia, serif)' }}
        >
          {body.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <footer
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'flex-wrap pt-2 border-t border-outline-variant/30',
          )}
        >
          {/* Action buttons render only when a handler is wired — an
              unclickable control is worse than no control. */}
          {onUpvote && (
            <button
              type="button"
              onClick={onUpvote}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs transition-colors min-h-10 md:min-h-0',
                hasUpvoted
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary border border-outline-variant/40',
              )}
              aria-pressed={hasUpvoted}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                arrow_upward
              </span>
              <span className="tabular-nums">{upvotes}</span>
            </button>
          )}
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary border border-transparent transition-colors min-h-10 md:min-h-0',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                reply
              </span>
              {t('common.reply', {}, { defaultValue: 'Reply' })}
            </button>
          )}
          {onQuote && (
            <button
              type="button"
              onClick={onQuote}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs text-on-surface-variant hover:bg-surface-container hover:text-primary border border-transparent transition-colors min-h-10 md:min-h-0',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                format_quote
              </span>
              {t('postCard.quote', {}, { defaultValue: 'Quote' })}
            </button>
          )}
          {onBookmark && (
            <button
              type="button"
              onClick={onBookmark}
              aria-pressed={bookmarked}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs transition-colors border border-transparent min-h-10 md:min-h-0',
                bookmarked
                  ? 'text-warning bg-warning-light'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-warning',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                {bookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
              {t('common.save', {}, { defaultValue: 'Save' })}
            </button>
          )}
          {onMarkSolution && (
            <button
              type="button"
              onClick={onMarkSolution}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs text-success hover:bg-success-light border border-transparent transition-colors min-h-10 md:min-h-0',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                task_alt
              </span>
              {t('postCard.markSolution', {}, { defaultValue: 'Mark solution' })}
            </button>
          )}
          <span className={cm.cn(cm.flex1)} />
          {onFlag && (
            <button
              type="button"
              onClick={onFlag}
              disabled={flagged}
              aria-pressed={flagged}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 text-xs border border-transparent transition-colors min-h-10 md:min-h-0',
                flagged
                  ? 'text-error bg-error-light cursor-default'
                  : 'text-on-surface-variant hover:text-error hover:bg-error-light',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                flag
              </span>
              {flagged
                ? t('postCard.flagged', {}, { defaultValue: 'Flagged' })
                : t('postCard.flag', {}, { defaultValue: 'Flag' })}
            </button>
          )}
        </footer>
      </div>
    </article>
  )
}

export default PostCard
