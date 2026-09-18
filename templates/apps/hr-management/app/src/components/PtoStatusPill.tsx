/**
 * PTO request status pill — uppercase, font-black, tracking-widest pill
 * coloured per the strict DESIGN.md token map: Approved=green, Pending=amber,
 * Denied=red. No substitutions.
 *
 * Translated from applicant-tracking's StagePill.tsx anatomy.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type PtoStatus = 'approved' | 'pending' | 'denied'

const STATUS_FG: Record<PtoStatus, string> = {
  approved: 'var(--color-pto-approved)',
  pending: 'var(--color-pto-pending)',
  denied: 'var(--color-pto-denied)',
}

const STATUS_BG: Record<PtoStatus, string> = {
  approved: 'var(--color-pto-approved-bg)',
  pending: 'var(--color-pto-pending-bg)',
  denied: 'var(--color-pto-denied-bg)',
}

const STATUS_DEFAULT_LABEL: Record<PtoStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  denied: 'Denied',
}

interface PtoStatusPillProps {
  status: PtoStatus
  size?: 'xs' | 'sm'
}

export function PtoStatusPill({ status, size = 'sm' }: PtoStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`ptoStatusPill.${status}`, {}, { defaultValue: STATUS_DEFAULT_LABEL[status] })
  return (
    <span
      className={cm.cn(
        cm.sp('px', size === 'xs' ? 2 : 3),
        cm.sp('py', 1),
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        'inline-flex items-center font-black uppercase tracking-widest rounded-full',
      )}
      style={{ backgroundColor: STATUS_BG[status], color: STATUS_FG[status] }}
    >
      {label}
    </span>
  )
}
