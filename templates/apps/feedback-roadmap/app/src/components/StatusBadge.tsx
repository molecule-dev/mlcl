/**
 * StatusBadge — the official workflow pill shown on every post surface
 * (board rows, post detail, roadmap cards, admin table).
 *
 * Colors come from the theme's status token pair (`--color-status-<x>` +
 * `-light`), each tuned for ≥4.5:1 text contrast on its own tint in both
 * color schemes.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export const POST_STATUS_VALUES = [
  'open',
  'planned',
  'in_progress',
  'shipped',
  'declined',
  'merged',
] as const

export type PostStatusValue = (typeof POST_STATUS_VALUES)[number]

const STATUS_STYLES: Record<
  PostStatusValue,
  { bg: string; fg: string; icon: string; key: string }
> = {
  open: {
    bg: 'var(--color-status-open-light)',
    fg: 'var(--color-status-open)',
    icon: 'radio_button_unchecked',
    key: 'status.open',
  },
  planned: {
    bg: 'var(--color-status-planned-light)',
    fg: 'var(--color-status-planned)',
    icon: 'event_available',
    key: 'status.planned',
  },
  in_progress: {
    bg: 'var(--color-status-inprogress-light)',
    fg: 'var(--color-status-inprogress)',
    icon: 'progress_activity',
    key: 'status.inProgress',
  },
  shipped: {
    bg: 'var(--color-status-shipped-light)',
    fg: 'var(--color-status-shipped)',
    icon: 'check_circle',
    key: 'status.shipped',
  },
  declined: {
    bg: 'var(--color-status-declined-light)',
    fg: 'var(--color-status-declined)',
    icon: 'do_not_disturb_on',
    key: 'status.declined',
  },
  merged: {
    bg: 'var(--color-status-merged-light)',
    fg: 'var(--color-status-merged)',
    icon: 'merge',
    key: 'status.merged',
  },
}

const STATUS_LABELS: Record<PostStatusValue, string> = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Declined',
  merged: 'Moved',
}

export interface StatusBadgeProps {
  status: PostStatusValue
  /** Render the quarter label (e.g. "Q1 2027") beside roadmap statuses. */
  label?: string | null
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.open
  return (
    <span
      data-mol-id={`status-badge-${status}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        'rounded-full whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        'uppercase tracking-widest',
      )}
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      <span
        className={cm.cn('material-symbols-outlined', size === 'sm' ? 'text-xs' : 'text-sm')}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      {t(style.key, {}, { defaultValue: STATUS_LABELS[status] })}
      {label ? <span className={cm.cn('normal-case', 'tracking-normal')}>{label}</span> : null}
    </span>
  )
}

export default StatusBadge
