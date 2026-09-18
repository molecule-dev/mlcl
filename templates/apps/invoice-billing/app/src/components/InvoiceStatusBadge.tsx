import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Color-coded pill badge for invoice lifecycle state.
 * Variants per DESIGN.md: draft / sent / viewed / partial / paid / overdue / recurring.
 *
 * Translated visually from project-management / online-store status pill patterns —
 * 10px font-black uppercase tracking-widest in a rounded-full pill, paired with
 * Remit's semantic color tokens.
 */

export type InvoiceStatus =
  'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'recurring' | 'void'

const STATUS_THEME: Record<InvoiceStatus, { bg: string; fg: string }> = {
  draft: { bg: 'var(--color-draft-light)', fg: 'var(--color-draft)' },
  sent: { bg: 'var(--color-sent-light)', fg: 'var(--color-sent)' },
  viewed: { bg: 'var(--color-viewed-light)', fg: 'var(--color-viewed)' },
  partial: { bg: 'var(--color-partial-light)', fg: 'var(--color-partial)' },
  paid: { bg: 'var(--color-paid-light)', fg: 'var(--color-paid)' },
  overdue: { bg: 'var(--color-overdue-light)', fg: 'var(--color-overdue)' },
  recurring: { bg: 'var(--color-recurring-light)', fg: 'var(--color-recurring)' },
  void: { bg: 'var(--color-void-light)', fg: 'var(--color-void)' },
}

const STATUS_DEFAULTS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  recurring: 'Recurring',
  void: 'Void',
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[status] ?? STATUS_THEME.draft
  const label = t(
    `invoiceStatusBadge.${status}`,
    {},
    { defaultValue: STATUS_DEFAULTS[status] ?? 'Draft' },
  )

  return (
    <span
      data-mol-id={`status-pill-${status}`}
      className={cm.cn(cm.fontWeight('bold'))}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: theme.bg,
        color: theme.fg,
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          backgroundColor: theme.fg,
          opacity: 0.85,
        }}
      />
      {label}
    </span>
  )
}

export default InvoiceStatusBadge
