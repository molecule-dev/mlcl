import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

/**
 * Activity feed row — left-edge tinted icon chip, multi-line label with
 * verb + event name + timestamp, optional CTA. Used on Notifications and
 * Dashboard's "Recent activity" panel.
 *
 * Translated from auction-platform's NotificationRow.tsx — same anatomy,
 * Turnstile palette + ticketing verbs (purchase, transfer, check-in,
 * refund, announcement).
 */
export type NotificationKind =
  'purchase' | 'transfer' | 'check_in' | 'refund' | 'announcement' | 'reminder'

interface NotificationRowProps {
  kind: NotificationKind
  title: string
  body?: string
  timeAgo: string
  unread?: boolean
  to?: string
}

const KIND_META: Record<NotificationKind, { icon: string; tint: string; bg: string }> = {
  purchase: {
    icon: 'confirmation_number',
    tint: 'var(--color-notif-purchase)',
    bg: 'var(--color-notif-purchase-bg)',
  },
  transfer: {
    icon: 'swap_horiz',
    tint: 'var(--color-notif-transfer)',
    bg: 'var(--color-notif-transfer-bg)',
  },
  check_in: {
    icon: 'qr_code_2',
    tint: 'var(--color-notif-check-in)',
    bg: 'var(--color-notif-check-in-bg)',
  },
  refund: {
    icon: 'undo',
    tint: 'var(--color-notif-refund)',
    bg: 'var(--color-notif-refund-bg)',
  },
  announcement: {
    icon: 'campaign',
    tint: 'var(--color-notif-announcement)',
    bg: 'var(--color-notif-announcement-bg)',
  },
  reminder: {
    icon: 'schedule',
    tint: 'var(--color-notif-reminder)',
    bg: 'var(--color-notif-purchase-bg)',
  },
}

export function NotificationRow({ kind, title, body, timeAgo, unread, to }: NotificationRowProps) {
  const cm = getClassMap()
  const meta = KIND_META[kind]
  const Wrapper: React.ElementType = to ? Link : 'div'
  const wrapperProps = to ? { to } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 4),
        'bg-surface rounded-xl border border-outline-variant/40 transition-all',
        to ? 'hover:-translate-y-0.5 hover:shadow-sm cursor-pointer' : '',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-11 h-11 rounded-xl shrink-0',
        )}
        style={{ background: meta.bg, color: meta.tint }}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
          {meta.icon}
        </span>
      </div>
      <div className={cm.cn(cm.stack(1), 'flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' })}>
          <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface line-clamp-1')}>
            {title}
          </p>
          <span
            className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant shrink-0')}
          >
            {timeAgo}
          </span>
        </div>
        {body ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant leading-snug line-clamp-2',
            )}
          >
            {body}
          </p>
        ) : null}
      </div>
      {unread ? (
        <span
          className={cm.cn('w-2 h-2 rounded-full mt-2 shrink-0')}
          style={{ background: 'var(--color-accent)' }}
          aria-hidden="true"
        />
      ) : null}
    </Wrapper>
  )
}

export default NotificationRow
