import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type Verdict =
  'approved' | 'rejected' | 'pending' | 'reviewing' | 'escalated' | 'auto_moderated'

interface VerdictBadgeProps {
  verdict: Verdict
  label?: string
  size?: 'sm' | 'md'
}

const VERDICT_STYLES: Record<
  Verdict,
  { text: string; bg: string; border: string; defaultLabel: string }
> = {
  approved: {
    text: 'text-success',
    bg: 'bg-success-light',
    border: 'border-emerald-500',
    defaultLabel: 'Approved',
  },
  rejected: {
    text: 'text-error',
    bg: 'bg-error-light',
    border: 'border-red-500',
    defaultLabel: 'Rejected',
  },
  pending: {
    text: 'text-warning',
    bg: 'bg-warning-light',
    border: 'border-amber-500',
    defaultLabel: 'Pending',
  },
  reviewing: {
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-500',
    defaultLabel: 'Reviewing',
  },
  escalated: {
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    defaultLabel: 'Escalated',
  },
  auto_moderated: {
    text: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-500',
    defaultLabel: 'Auto-moderated',
  },
}

/**
 * Verdict pill — colored left-border + tinted background. Used in the queue
 * table and review-detail header.
 */
export function VerdictBadge({ verdict, label, size = 'md' }: VerdictBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const style = VERDICT_STYLES[verdict]
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
  return (
    <span
      className={cm.cn(
        'inline-flex items-center rounded-sm font-bold uppercase tracking-wider border-l-2',
        sizeClasses,
        style.text,
        style.bg,
        style.border,
      )}
    >
      {label ?? t(`verdict.${verdict}`, {}, { defaultValue: style.defaultLabel })}
    </span>
  )
}
