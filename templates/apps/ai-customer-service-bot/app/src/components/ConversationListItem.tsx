/**
 * Conversation thread row for the Conversations split-pane sidebar.
 * Avatar with status dot bottom-right, single-line preview, timestamp,
 * unread pip. Active state pulls a 3px primary left border.
 *
 * Pattern source: team-chat ChannelListItem + helpdesk-ticketing
 * TicketListItem (combined treatment).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { StatusVariant } from './StatusBadge.js'

interface ConversationListItemProps {
  id: string
  customerName: string
  preview: string
  timestamp: string
  /** Unread message count; 0 hides the pip. */
  unread?: number
  status: StatusVariant
  /** Bottom-right status dot color — slightly redundant with status but
   * lets us decouple visual urgency from the textual badge. */
  active?: boolean
  avatarUrl?: string
  initials?: string
}

const DOT_COLOR: Record<StatusVariant, string> = {
  resolved: 'bg-[var(--color-status-resolved-accent)]',
  pending: 'bg-[var(--color-status-pending-accent)]',
  escalated: 'bg-secondary-container',
  active: 'bg-primary',
  draft: 'bg-outline-variant',
}

function ConversationListItem({
  id,
  customerName,
  preview,
  timestamp,
  unread = 0,
  status,
  active = false,
  avatarUrl,
  initials,
}: ConversationListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initialsFallback =
    initials ??
    customerName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  return (
    <Link
      data-mol-id={`conversation-card-${id}`}
      to={`/conversations/${id}`}
      className={cm.cn(
        cm.flex({ gap: 3, align: 'center' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-lg transition-colors relative',
        active
          ? 'bg-surface-container border-l-[3px] border-primary'
          : 'hover:bg-surface-container-low',
      )}
    >
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            alt={t(
              'conversationListItem.avatarAlt',
              { name: customerName },
              { defaultValue: '{{name}} avatar' },
            )}
            src={avatarUrl}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
          />
        ) : (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-primary-container text-on-primary-container',
            )}
          >
            {initialsFallback}
          </div>
        )}
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'absolute -bottom-0.5 -right-0.5 ring-2 ring-surface-container-lowest',
            DOT_COLOR[status],
          )}
        />
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface truncate',
            )}
          >
            {customerName}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-[var(--color-text-muted)] shrink-0')}>
            {timestamp}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>{preview}</p>
      </div>
      {unread > 0 && (
        <span
          aria-label={t(
            'common.countUnread',
            { count: unread },
            { defaultValue: '{{count}} unread' },
          )}
          className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary shrink-0')}
        />
      )}
    </Link>
  )
}

export default ConversationListItem
export { ConversationListItem }
