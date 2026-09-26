/**
 * Thread row — single-column readable list item used on CategoryDetail,
 * UserProfile (Recent threads), Bookmarks, and Search results. Shows the
 * unread dot, status pills (Pinned / Locked / Resolved / Hot), title +
 * excerpt, author with reputation, and reply / view counts. Hover lifts
 * the title into the indigo-primary.
 *
 * Translated from blog's PostListItem (status-pill row, hover-target
 * title, view/comment meta) plus DESIGN.md ThreadRow specs.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReputationBadge, type ReputationTier } from './ReputationBadge.js'

export type ThreadStatus = 'pinned' | 'locked' | 'resolved' | 'hot' | 'open'

const STATUS_PILL: Record<
  Exclude<ThreadStatus, 'open'>,
  { icon: string; label: string; tone: string }
> = {
  pinned: { icon: 'push_pin', label: 'Pinned', tone: 'bg-warning-light text-warning' },
  locked: { icon: 'lock', label: 'Locked', tone: 'bg-border text-foreground-secondary' },
  resolved: { icon: 'check_circle', label: 'Resolved', tone: 'bg-success-light text-success' },
  hot: { icon: 'local_fire_department', label: 'Hot', tone: 'bg-error-light text-error' },
}

interface ThreadRowProps {
  id: string
  slug?: string
  title: string
  excerpt?: string
  author: { username: string; reputation?: number; tier?: ReputationTier }
  category?: { name: string; slug: string; color?: string }
  replyCount: number
  viewCount: number
  lastActivityAt: string
  statuses?: ThreadStatus[]
  unread?: boolean
  votes?: number
  isModeratorAuthor?: boolean
}

const formatCompact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : n.toLocaleString()

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(Date.now() - then, 0)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ThreadRow({
  id,
  slug,
  title,
  excerpt,
  author,
  category,
  replyCount,
  viewCount,
  lastActivityAt,
  statuses = [],
  unread = false,
  votes,
  isModeratorAuthor = false,
}: ThreadRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibleStatuses = statuses.filter((s): s is keyof typeof STATUS_PILL => s !== 'open')
  const initials = author.username.slice(0, 2).toUpperCase()
  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'lg' }),
        cm.sp('px', 5),
        cm.sp('py', 4),
        'group relative border-b border-outline-variant/30 hover:bg-surface-container-lowest transition-colors',
      )}
    >
      {unread && (
        <span
          aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
          className={cm.cn(
            cm.roundedFull,
            cm.w(2),
            cm.h(2),
            'absolute left-1 top-1/2 -translate-y-1/2 bg-primary',
          )}
        />
      )}
      <div
        className={cm.cn('shrink-0 hidden md:flex', cm.flex({ direction: 'col', align: 'center' }))}
      >
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-primary/10 text-primary text-xs',
          )}
          aria-hidden
        >
          {initials}
        </div>
        {typeof votes === 'number' && (
          <div className={cm.cn(cm.textCenter, cm.sp('mt', 2))}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tabular-nums text-on-surface',
              )}
            >
              {votes}
            </span>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-none')}>
              {t('threadRow.votes', {}, { defaultValue: 'votes' })}
            </p>
          </div>
        )}
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(2), 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {visibleStatuses.map((status) => {
            const pill = STATUS_PILL[status]
            return (
              <span
                key={status}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest',
                  pill.tone,
                )}
              >
                <span className="material-symbols-outlined text-[12px]" aria-hidden>
                  {pill.icon}
                </span>
                {t(`threadRow.status.${status}`, {}, { defaultValue: pill.label })}
              </span>
            )
          })}
          <Link
            to={`/t/${slug ?? id}`}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            {title}
          </Link>
        </div>
        {excerpt && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2')}>
            {excerpt}
          </p>
        )}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('xs'),
            'flex-wrap text-on-surface-variant',
          )}
        >
          <Link
            to={`/u/${author.username}`}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {`@${author.username}`}
          </Link>
          {isModeratorAuthor && (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'py-0.5 text-[10px] uppercase tracking-widest bg-[var(--color-moderator-light)] text-[var(--color-moderator)] ring-1 ring-[var(--color-moderator)]/30',
              )}
            >
              {t('threadRow.moderatorBadge', {}, { defaultValue: 'Moderator' })}
            </span>
          )}
          <ReputationBadge score={author.reputation ?? 0} tier={author.tier} />
          {category && (
            <Link
              to={`/c/${category.slug}`}
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors',
              )}
              style={
                category.color ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined
              }
            >
              {category.name}
            </Link>
          )}
          <span className={cm.cn('text-on-surface-variant')}>·</span>
          <span>{formatRelative(lastActivityAt)}</span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
          cm.textRight,
          'shrink-0',
        )}
      >
        <span
          className={cm.cn(cm.fontWeight('bold'), 'inline-flex items-center gap-1 text-on-surface')}
        >
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden>
            chat_bubble
          </span>
          <span className="tabular-nums">{formatCompact(replyCount)}</span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'inline-flex items-center gap-1 text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            visibility
          </span>
          <span className="tabular-nums">{formatCompact(viewCount)}</span>
        </span>
      </div>
    </article>
  )
}

export default ThreadRow
