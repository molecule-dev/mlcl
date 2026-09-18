import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Status pill — `px-3 py-1 text-[10px] font-black uppercase tracking-widest`
 * with light/dark color pair per status.
 *
 * Translated from the §13 status-pill anatomy used on banking-dashboard /
 * crm. Status keys mirror DESIGN.md's "Approval Badge" variants so this
 * component is the canonical surface for any approval-state rendering.
 */
export type ApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'

interface ApprovalBadgeProps {
  status: ApprovalStatus
  className?: string
}

const STATUS_TONE: Record<ApprovalStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  submitted: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)]',
  approved: 'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved)]',
  rejected: 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected)]',
  reimbursed: 'bg-[var(--color-secondary-light)] text-[var(--color-status-reimbursed)]',
}

const STATUS_ICON: Record<ApprovalStatus, string> = {
  draft: 'edit_note',
  submitted: 'schedule',
  approved: 'check_circle',
  rejected: 'cancel',
  reimbursed: 'paid',
}

const STATUS_LABEL_KEY: Record<ApprovalStatus, string> = {
  draft: 'approvalBadge.draft',
  submitted: 'approvalBadge.submitted',
  approved: 'approvalBadge.approved',
  rejected: 'approvalBadge.rejected',
  reimbursed: 'approvalBadge.reimbursed',
}

const STATUS_LABEL_DEFAULT: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  submitted: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Reimbursed',
}

export function ApprovalBadge({ status, className }: ApprovalBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      data-mol-id={`badge-${status}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        'rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap',
        STATUS_TONE[status],
        className ?? '',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
        {STATUS_ICON[status]}
      </span>
      {t(STATUS_LABEL_KEY[status], {}, { defaultValue: STATUS_LABEL_DEFAULT[status] })}
    </span>
  )
}

export default ApprovalBadge
