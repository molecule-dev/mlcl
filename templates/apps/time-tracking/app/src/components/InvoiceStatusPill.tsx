import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Status pill — uppercase 10px font-black tracking-widest rounded-full,
 * tinted by status. Used on Invoices/InvoiceDetail and project headers.
 *
 * Treatment translated from helpdesk-ticketing's status badge + crm's
 * DealCard pipeline pill.
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'

const STATUS_TONE: Record<InvoiceStatus, { bg: string; text: string; icon: string }> = {
  draft: { bg: 'bg-surface-secondary', text: 'text-foreground', icon: 'edit_note' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'send' },
  paid: { bg: 'bg-success-light', text: 'text-success', icon: 'check_circle' },
  overdue: { bg: 'bg-rose-100', text: 'text-error', icon: 'priority_high' },
  void: {
    bg: 'bg-surface-secondary',
    text: 'text-foreground-secondary line-through',
    icon: 'block',
  },
}

export interface InvoiceStatusPillProps {
  status: InvoiceStatus
}

export function InvoiceStatusPill({ status }: InvoiceStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = STATUS_TONE[status]

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        'h-6 rounded-full text-[10px] font-black uppercase tracking-widest',
        tone.bg,
        tone.text,
      )}
    >
      <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>{tone.icon}</span>
      {t(
        `invoiceStatusPill.${status}`,
        {},
        {
          defaultValue:
            status === 'paid'
              ? 'Paid'
              : status === 'sent'
                ? 'Sent'
                : status === 'overdue'
                  ? 'Overdue'
                  : status === 'void'
                    ? 'Void'
                    : 'Draft',
        },
      )}
    </span>
  )
}

export default InvoiceStatusPill
