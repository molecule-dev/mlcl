import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Colored status pill shared by the Jobs / Quotes / Invoices surfaces.
 *
 * `tone` picks the container pair; `label` falls back to the raw status
 * with underscores replaced, so a new backend status still renders
 * readably before it gets a translation.
 */
const TONE_CLASS: Record<string, string> = {
  neutral: 'bg-surface-container text-on-surface-variant',
  info: 'bg-info-container text-on-info-container',
  progress: 'bg-primary-container text-on-primary-container',
  warning: 'bg-warning-container text-on-warning-container',
  success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container',
}

export const QUOTE_TONE: Record<string, string> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  declined: 'error',
}

export const JOB_TONE: Record<string, string> = {
  scheduled: 'info',
  en_route: 'warning',
  in_progress: 'progress',
  completed: 'success',
  cancelled: 'neutral',
}

export const INVOICE_TONE: Record<string, string> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
}

export function StatusBadge({
  status,
  tone,
  translationKeyPrefix = 'status',
}: {
  status: string
  tone: string
  translationKeyPrefix?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        'rounded-full inline-block whitespace-nowrap',
        TONE_CLASS[tone] ?? TONE_CLASS['neutral']!,
      )}
    >
      {t(
        `${translationKeyPrefix}.${status}`,
        {},
        {
          defaultValue: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      )}
    </span>
  )
}
