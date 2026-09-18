import { getClassMap } from '@molecule/app-ui'

import type { EmailStatus } from './StatusPill.js'
import { StatusPill } from './StatusPill.js'

export interface InboxEmail {
  id: string
  sender_name: string
  sender_email: string
  subject: string
  snippet: string
  /** ISO timestamp. */
  received_at: string
  status: EmailStatus
  unread: boolean
  ai_generated?: boolean
}

interface EmailListItemProps {
  email: InboxEmail
  selected?: boolean
  onSelect?: (email: InboxEmail) => void
  statusLabel: string
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const days = Math.round(hr / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Single email row for the Inbox list pane — left edge unread indicator,
 * sender + subject + snippet stack, right-side timestamp + status pill.
 * Selected state shows a tonal background + thicker accent stripe.
 */
export function EmailListItem({ email, selected, onSelect, statusLabel }: EmailListItemProps) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={() => onSelect?.(email)}
      aria-current={selected ? 'true' : undefined}
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('px', 5),
        cm.sp('py', 4),
        'group text-left border-l-[3px] transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-surface-container-low',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          cm.roundedFull,
          'shrink-0 bg-surface-container text-on-surface text-xs font-bold',
        )}
        aria-hidden="true"
      >
        {email.sender_name.charAt(0).toUpperCase()}
      </span>
      <div className={cm.cn('min-w-0 flex-1')}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              email.unread ? 'font-bold text-on-surface' : 'font-semibold text-on-surface-variant',
              'truncate',
            )}
          >
            {email.sender_name}
          </p>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant whitespace-nowrap tabular-nums',
            )}
          >
            {relativeTime(email.received_at)}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 0),
            email.unread ? 'font-semibold text-on-surface' : 'font-medium text-on-surface-variant',
            'truncate',
          )}
        >
          {email.subject}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('mt', 1),
          )}
        >
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate flex-1')}>
            {email.snippet}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            {email.unread && (
              <span
                className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary inline-block')}
                aria-hidden="true"
              />
            )}
            <StatusPill status={email.status} label={statusLabel} />
          </div>
        </div>
      </div>
    </button>
  )
}
