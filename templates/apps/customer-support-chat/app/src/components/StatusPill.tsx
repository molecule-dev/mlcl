/**
 * Pill-shaped status badge — uppercase 10px-black tracking-widest. Maps
 * Liaison status semantics (online / away / offline / urgent / resolved
 * / pending / bot) onto the catalog "Status pills" recipe.
 *
 * Translated from ai-customer-service-bot StatusBadge, palette aligned
 * with DESIGN.md "Semantic" colors.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type StatusVariant =
  'online' | 'away' | 'offline' | 'urgent' | 'pending' | 'resolved' | 'bot' | 'unread'

interface StatusPillProps {
  variant: StatusVariant
  /** Override the default localized label. */
  label?: string
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  online: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
  away: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]',
  offline: 'bg-border-secondary text-text-secondary',
  urgent: 'bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
  pending: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]',
  resolved: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
  bot: 'bg-[var(--color-bot-bg)] text-[var(--color-bot-text)]',
  unread: 'bg-primary/15 text-primary-dark',
}

const DEFAULT_KEYS: Record<StatusVariant, { key: string; fallback: string }> = {
  online: { key: 'statusPill.online', fallback: 'Online' },
  away: { key: 'statusPill.away', fallback: 'Away' },
  offline: { key: 'statusPill.offline', fallback: 'Offline' },
  urgent: { key: 'statusPill.urgent', fallback: 'Urgent' },
  pending: { key: 'statusPill.pending', fallback: 'Pending' },
  resolved: { key: 'statusPill.resolved', fallback: 'Resolved' },
  bot: { key: 'statusPill.bot', fallback: 'Bot' },
  unread: { key: 'statusPill.unread', fallback: 'Unread' },
}

function StatusPill({ variant, label }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { key, fallback } = DEFAULT_KEYS[variant]
  const text = label ?? t(key, {}, { defaultValue: fallback })
  return (
    <span
      className={cm.cn(
        cm.sp('px', 3),
        cm.fontWeight('bold'),
        cm.roundedFull,
        'py-1 inline-flex items-center text-[10px] tracking-widest uppercase',
        VARIANT_CLASSES[variant],
      )}
    >
      {text}
    </span>
  )
}

export default StatusPill
export { StatusPill }
