import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Visual tone for a chip, keyed by semantic state. */
export type ChipTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger'

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant',
  info: 'bg-secondary-container text-on-secondary-container',
  progress: 'bg-primary-container text-on-primary-container',
  success: 'bg-tertiary-container text-on-tertiary-container',
  warning: 'bg-tertiary-container text-on-tertiary-container',
  danger: 'bg-error-container text-on-error-container',
}

/** Tone lookup for punch-item severities. */
export const SEVERITY_TONE: Record<string, ChipTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
}

/** Tone lookup for workflow statuses (punch items, RFIs, subs). */
export const STATUS_TONE: Record<string, ChipTone> = {
  open: 'info',
  in_progress: 'progress',
  closed: 'neutral',
  answered: 'success',
  invited: 'info',
  active: 'success',
  terminated: 'danger',
}

export function StatusBadge({
  value,
  tone,
  translationKeyPrefix,
}: {
  value: string
  tone: ChipTone
  translationKeyPrefix: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span
      data-mol-id={`badge-${value}`}
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        'inline-flex items-center rounded-full whitespace-nowrap',
        TONE_CLASS[tone] ?? TONE_CLASS.neutral,
      )}
    >
      {t(`${translationKeyPrefix}.${value}`, {}, { defaultValue: label })}
    </span>
  )
}
