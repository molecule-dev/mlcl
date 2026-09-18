/**
 * Application status pill — uppercase, font-black, tracking-widest pill colored
 * by the application's status in the seeker's pipeline (submitted → reviewing
 * → interviewing → offered / rejected) plus listing states (active / urgent /
 * new / closed) used by employer-facing job rows.
 *
 * Translated from applicant-tracking's StagePill — same uppercase 10px
 * tracking-widest pill anatomy, with Placement's seeker/employer semantic
 * tokens (theme.css: --color-status-* / --color-listing-*).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'active'
  | 'urgent'
  | 'new'
  | 'closed'

const STATUS_FG: Record<ApplicationStatus, string> = {
  submitted: 'var(--color-status-applied)',
  reviewing: 'var(--color-status-reviewing)',
  interview: 'var(--color-status-interviewing)',
  offered: 'var(--color-status-offered)',
  rejected: 'var(--color-status-rejected)',
  active: 'var(--color-listing-active)',
  urgent: 'var(--color-listing-urgent)',
  new: 'var(--color-listing-new)',
  closed: 'var(--color-status-closed)',
}

const STATUS_BG: Record<ApplicationStatus, string> = {
  submitted: 'var(--color-status-applied-bg)',
  reviewing: 'var(--color-status-reviewing-bg)',
  interview: 'var(--color-status-interviewing-bg)',
  offered: 'var(--color-status-offered-bg)',
  rejected: 'var(--color-status-rejected-bg)',
  active: 'var(--color-listing-active-bg)',
  urgent: 'var(--color-listing-urgent-bg)',
  new: 'var(--color-listing-new-bg)',
  closed: 'var(--color-status-closed-bg)',
}

const DEFAULT_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Applied',
  reviewing: 'Reviewing',
  interview: 'Interviewing',
  offered: 'Offered',
  rejected: 'Rejected',
  active: 'Active',
  urgent: 'Urgent',
  new: 'New',
  closed: 'Closed',
}

interface ApplicationStatusPillProps {
  status: ApplicationStatus
  size?: 'xs' | 'sm'
}

export function ApplicationStatusPill({ status, size = 'sm' }: ApplicationStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`applicationStatusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })
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
