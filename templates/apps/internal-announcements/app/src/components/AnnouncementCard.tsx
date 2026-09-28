/**
 * AnnouncementCard — feed item for /feed, /search, /my-acknowledgments,
 * /profile.
 *
 * Layout: priority-colored 4px left border + author row (avatar + name +
 * role + timestamp + channel chip + priority pill) → title → body excerpt
 * → AcknowledgmentBar → footer meta row (acks · comments · views).
 *
 * Per DESIGN.md the card is single-column (640px column inside the layout),
 * priority is a colored left-border PLUS pill — never priority by color
 * alone, and acknowledgment progress is visible (not buried).
 *
 * Translated from forum/ThreadRow vote-column + meta-row pattern, fused
 * with personal-finance/AccountCard left-border-accent and the
 * AcknowledgmentBar progress treatment.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AcknowledgmentBar } from './AcknowledgmentBar.js'
import { type AnnouncementPriority, PRIORITY_BORDER_COLOR, PriorityPill } from './PriorityPill.js'

export interface AnnouncementCardData {
  id: string
  title: string
  body: string
  author: {
    name: string
    role?: string
    avatar?: string | null
    isAdmin?: boolean
  }
  channel: { slug: string; name: string; color?: string }
  priority: AnnouncementPriority
  publishedAt: string
  acknowledged: number
  ackTotal: number
  hasAcknowledged?: boolean
  commentCount: number
  viewCount?: number
  unread?: boolean
  /** Hide the AcknowledgmentBar (e.g. for /my-acknowledgments where the
   *  whole row is about acks already). */
  hideAckBar?: boolean
}

interface AnnouncementCardProps {
  announcement: AnnouncementCardData
}

function authorInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AnnouncementCard({ announcement: a }: AnnouncementCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = PRIORITY_BORDER_COLOR[a.priority]
  const channelColor = a.channel.color ?? 'var(--mol-color-primary, #4f46e5)'

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'group bg-surface rounded-lg border border-outline-variant/40 shadow-sm hover:shadow-md hover:border-primary/20 transition-all',
      )}
      style={{ ['--mol-accent' as string]: accent }}
    >
      <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {a.unread && (
          <span
            className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'shrink-0')}
            style={{ backgroundColor: 'var(--mol-color-primary, var(--color-priority-normal))' }}
            role="img"
            aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
          />
        )}
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'shrink-0 ring-2 ring-surface',
          )}
          style={{
            backgroundColor:
              'var(--color-priority-normal-light, var(--color-priority-normal-light))',
            color: 'var(--color-priority-normal, var(--color-priority-normal))',
          }}
          aria-hidden="true"
        >
          {a.author.avatar ? (
            <img
              src={a.author.avatar}
              alt=""
              className={cm.cn(cm.w('full'), cm.h('full'), cm.roundedFull, 'object-cover')}
            />
          ) : (
            authorInitials(a.author.name)
          )}
        </span>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            <span
              className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
            >
              {a.author.name}
            </span>
            {a.author.isAdmin && (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest',
                )}
                style={{
                  backgroundColor:
                    'var(--color-priority-pinned-light, var(--color-priority-pinned-light))',
                  color: 'var(--color-priority-pinned, var(--color-priority-pinned))',
                }}
              >
                {t('announcementCard.adminBadge', {}, { defaultValue: 'Admin' })}
              </span>
            )}
            {a.author.role && (
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {a.author.role}
              </span>
            )}
          </div>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {a.publishedAt}
          </span>
        </div>
        <Link
          to={`/feed?channel=${a.channel.slug}`}
          onClick={(e) => e.stopPropagation()}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'min-h-[28px] rounded-full px-2.5 py-1 text-[11px] hover:opacity-80 transition-opacity',
          )}
          style={{
            backgroundColor: `${channelColor}1f`,
            color: channelColor,
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
            tag
          </span>
          {a.channel.name}
        </Link>
        <div className={cm.cn('ml-auto')}>
          <PriorityPill priority={a.priority} />
        </div>
      </header>

      <Link
        to={`/announcement/${a.id}`}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}
      >
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-lg leading-tight text-on-surface group-hover:text-primary transition-colors',
          )}
        >
          {a.title}
        </h3>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'leading-relaxed text-on-surface-variant line-clamp-3',
          )}
        >
          {a.body}
        </p>
      </Link>

      {!a.hideAckBar && a.ackTotal > 0 && (
        <AcknowledgmentBar acknowledged={a.acknowledged} total={a.ackTotal} />
      )}

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          cm.sp('pt', 3),
          'flex-wrap border-t border-outline-variant/30 text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className={cm.cn('material-symbols-outlined text-sm')}>how_to_reg</span>
          {t(
            'announcementCard.ackCount',
            { acknowledged: a.acknowledged, total: a.ackTotal },
            { defaultValue: '{{acknowledged}}/{{total}} acked' },
          )}
        </span>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className={cm.cn('material-symbols-outlined text-sm')}>chat_bubble</span>
          {t(
            'announcementCard.commentCount',
            { count: a.commentCount },
            { defaultValue: '{{count}} comments' },
          )}
        </span>
        {typeof a.viewCount === 'number' && (
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn('material-symbols-outlined text-sm')}>visibility</span>
            {t('common.countViews', { count: a.viewCount }, { defaultValue: '{{count}} views' })}
          </span>
        )}
        <Link
          to={`/announcement/${a.id}`}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'ml-auto min-h-[28px] items-center text-primary hover:underline',
          )}
        >
          {a.hasAcknowledged
            ? t('announcementCard.viewAck', {}, { defaultValue: 'Acknowledged · open' })
            : t('announcementCard.openAndAck', {}, { defaultValue: 'Open & acknowledge' })}
          <span className={cm.cn('material-symbols-outlined text-sm')}>arrow_forward</span>
        </Link>
      </footer>
    </article>
  )
}

export default AnnouncementCard
