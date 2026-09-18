/**
 * Pill-shaped status badge — uppercase 10px label-black tracking-widest.
 * Variants align with DESIGN.md Status Badge spec (resolved / pending /
 * escalated / active).
 *
 * Pattern source: helpdesk-ticketing TicketStatusPill + crm StatusPill.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type StatusVariant = 'resolved' | 'pending' | 'escalated' | 'active' | 'draft'

interface StatusBadgeProps {
  variant: StatusVariant
  /** Override the default localized label (e.g. for custom microcopy). */
  label?: string
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  resolved:
    'bg-[color:var(--color-success-container)] text-[color:var(--color-on-success-container)]',
  pending:
    'bg-[color:var(--color-warning-container)] text-[color:var(--color-on-warning-container)]',
  escalated: 'bg-[var(--color-status-escalated-bg)] text-[var(--color-status-escalated-text)]',
  active: 'bg-primary/15 text-primary',
  draft: 'bg-surface-container-high text-on-surface-variant',
}

const DEFAULT_KEYS: Record<StatusVariant, { key: string; fallback: string }> = {
  resolved: { key: 'statusBadge.resolved', fallback: 'Resolved' },
  pending: { key: 'statusBadge.pending', fallback: 'Pending' },
  escalated: { key: 'statusBadge.escalated', fallback: 'Escalated' },
  active: { key: 'statusBadge.active', fallback: 'Active' },
  draft: { key: 'statusBadge.draft', fallback: 'Draft' },
}

function StatusBadge({ variant, label }: StatusBadgeProps) {
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

export default StatusBadge
export { StatusBadge }
