/**
 * Status pill for swap requests and open-shift claims —
 * pending / approved / denied with the shared semantic colors.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RequestStatus = 'pending' | 'approved' | 'denied'

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone: Record<RequestStatus, string> = {
    approved: 'bg-[color:var(--color-req-approved-bg)] text-[color:var(--color-req-approved)]',
    pending: 'bg-[color:var(--color-req-pending-bg)] text-[color:var(--color-req-pending)]',
    denied: 'bg-[color:var(--color-req-denied-bg)] text-[color:var(--color-req-denied)]',
  }
  const icon: Record<RequestStatus, string> = {
    approved: 'check_circle',
    pending: 'hourglass_top',
    denied: 'cancel',
  }
  const label: Record<RequestStatus, string> = {
    approved: t('requestStatus.approved', {}, { defaultValue: 'Approved' }),
    pending: t('requestStatus.pending', {}, { defaultValue: 'Pending' }),
    denied: t('requestStatus.denied', {}, { defaultValue: 'Denied' }),
  }
  return (
    <span
      data-mol-id={`request-status-${status}`}
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'inline-flex items-center gap-1 rounded-full uppercase tracking-wider',
        tone[status],
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[13px]')} aria-hidden="true">
        {icon[status]}
      </span>
      {label[status]}
    </span>
  )
}
