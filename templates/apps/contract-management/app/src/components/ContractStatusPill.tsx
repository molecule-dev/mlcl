import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Pill badge for the Vellum contract status taxonomy
 * (Draft / Pending / Active / Expiring / Expired / Voided).
 *
 * Translated from the editorial pill treatment used across crm /
 * helpdesk-ticketing — uppercase 10px font-black tracking-widest.
 */
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expiring' | 'expired' | 'voided'

const STATUS_CLASS: Record<ContractStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  pending: 'bg-warning/15 text-warning',
  active: 'bg-success/15 text-success',
  expiring: 'bg-warning/20 text-warning',
  expired: 'bg-error/15 text-error',
  voided: 'bg-error/10 text-error/80 line-through',
}

const DEFAULT_LABEL: Record<ContractStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  voided: 'Voided',
}

export interface ContractStatusPillProps {
  status: ContractStatus
  size?: 'sm' | 'md'
}

export function ContractStatusPill({ status, size = 'sm' }: ContractStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`contractStatusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })

  return (
    <span
      className={cm.cn(
        cm.fontWeight('extrabold'),
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]',
        'inline-flex items-center rounded-full uppercase tracking-widest font-black',
        STATUS_CLASS[status],
      )}
    >
      {label}
    </span>
  )
}
