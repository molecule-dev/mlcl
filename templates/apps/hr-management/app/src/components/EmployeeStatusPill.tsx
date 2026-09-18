/**
 * Employee status pill — uppercase, font-black, tracking-widest pill colored
 * by employment status. Active=teal, On-leave=violet, Probation=amber,
 * Terminated=slate. Always paired with the dot+label pattern from DESIGN.md.
 *
 * Translated from applicant-tracking's StagePill.tsx — same uppercase 10px
 * tracking-widest pill anatomy with brand-token colours.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type EmployeeStatus = 'active' | 'on-leave' | 'on_leave' | 'probation' | 'terminated'

type CanonicalStatus = 'active' | 'on-leave' | 'probation' | 'terminated'

const CANONICAL: Record<EmployeeStatus, CanonicalStatus> = {
  active: 'active',
  'on-leave': 'on-leave',
  on_leave: 'on-leave',
  probation: 'probation',
  terminated: 'terminated',
}

const STATUS_FG: Record<CanonicalStatus, string> = {
  active: 'var(--color-status-active)',
  'on-leave': 'var(--color-status-on-leave)',
  probation: 'var(--color-status-probation)',
  terminated: 'var(--color-status-terminated)',
}

const STATUS_BG: Record<CanonicalStatus, string> = {
  active: 'var(--color-status-active-bg)',
  'on-leave': 'var(--color-status-on-leave-bg)',
  probation: 'var(--color-status-probation-bg)',
  terminated: 'var(--color-status-terminated-bg)',
}

const STATUS_DEFAULT_LABEL: Record<CanonicalStatus, string> = {
  active: 'Active',
  'on-leave': 'On leave',
  probation: 'Probation',
  terminated: 'Terminated',
}

interface EmployeeStatusPillProps {
  status: EmployeeStatus
  size?: 'xs' | 'sm'
  withDot?: boolean
}

export function EmployeeStatusPill({
  status,
  size = 'sm',
  withDot = true,
}: EmployeeStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const canonical = CANONICAL[status] ?? 'active'
  const label = t(
    `employeeStatusPill.${canonical}`,
    {},
    { defaultValue: STATUS_DEFAULT_LABEL[canonical] },
  )
  return (
    <span
      className={cm.cn(
        cm.sp('px', size === 'xs' ? 2 : 3),
        cm.sp('py', 1),
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        'inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-full',
      )}
      style={{ backgroundColor: STATUS_BG[canonical], color: STATUS_FG[canonical] }}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
          style={{ backgroundColor: STATUS_FG[canonical] }}
        />
      ) : null}
      {label}
    </span>
  )
}
