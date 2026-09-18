import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Notification feed row — coloured left border (semantic by kind), icon
 * chip, title + body, relative timestamp, optional inline action button.
 *
 * Translated from the helpdesk-ticketing/notifications-feed pattern + the
 * crm/ActivityFeed activity-row composition.
 */
export type NotificationKind =
  'outbid' | 'ending' | 'won' | 'new_bid' | 'sold' | 'watchlist' | 'system'

interface NotificationRowProps {
  kind: NotificationKind
  title: string
  body: string
  whenIso: string
  actionTo?: string
  actionLabel?: string
  unread?: boolean
}

const KIND_STYLE: Record<
  NotificationKind,
  { color: string; bg: string; icon: string; defaultBadge: string }
> = {
  outbid: {
    color: 'var(--color-status-outbid-fg)',
    bg: 'var(--color-status-outbid-bg)',
    icon: 'gavel',
    defaultBadge: 'Outbid',
  },
  ending: {
    color: 'var(--color-status-ending-fg)',
    bg: 'var(--color-status-ending-bg)',
    icon: 'hourglass_top',
    defaultBadge: 'Ending',
  },
  won: {
    color: 'var(--color-status-won-fg)',
    bg: 'var(--color-status-won-bg)',
    icon: 'celebration',
    defaultBadge: 'Won',
  },
  new_bid: {
    color: 'var(--color-status-live-fg)',
    bg: 'var(--color-status-live-bg)',
    icon: 'campaign',
    defaultBadge: 'New bid',
  },
  sold: {
    color: 'var(--color-status-won-fg)',
    bg: 'var(--color-status-won-bg)',
    icon: 'sell',
    defaultBadge: 'Sold',
  },
  watchlist: {
    color: 'var(--color-status-watchlist-fg)',
    bg: 'var(--color-status-watchlist-bg)',
    icon: 'visibility',
    defaultBadge: 'Watchlist',
  },
  system: {
    color: 'var(--color-status-neutral-fg)',
    bg: 'var(--color-status-neutral-bg)',
    icon: 'info',
    defaultBadge: 'System',
  },
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function NotificationRow({
  kind,
  title,
  body,
  whenIso,
  actionTo,
  actionLabel,
  unread,
}: NotificationRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const v = KIND_STYLE[kind]
  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface border border-outline-variant/40 hover:shadow-sm transition-all',
      )}
      style={{ borderLeft: `4px solid ${v.color}` }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-10 h-10 rounded-full shrink-0',
        )}
        style={{ backgroundColor: v.bg }}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-lg')} style={{ color: v.color }}>
          {v.icon}
        </span>
      </div>
      <div className={cm.cn(cm.stack(1), 'flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            )}
            style={{ backgroundColor: v.bg, color: v.color }}
          >
            {t(`notificationRow.kind.${kind}`, {}, { defaultValue: v.defaultBadge })}
          </span>
          {unread ? (
            <span
              className={cm.cn('w-1.5 h-1.5 rounded-full')}
              style={{ backgroundColor: v.color }}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>{title}</p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {body}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{relative(whenIso)}</span>
          {actionTo ? (
            <Link
              to={actionTo}
              className={cm.cn(cm.textSize('xs'), 'font-bold text-primary hover:underline')}
            >
              {actionLabel ?? t('notificationRow.view', {}, { defaultValue: 'View →' })}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default NotificationRow
