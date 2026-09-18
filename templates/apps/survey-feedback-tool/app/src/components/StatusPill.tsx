/**
 * Pill-shaped status badge — uppercase 10px-black tracking-widest. Maps
 * Gauge's response/survey lifecycle (active / draft / closed / complete
 * / partial / abandoned / promoter / passive / detractor) onto the
 * catalog "Status pills" recipe.
 *
 * Translated from customer-support-chat StatusPill; palette aligned with
 * DESIGN.md "Semantic" colors.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type StatusVariant =
  | 'active'
  | 'draft'
  | 'closed'
  | 'complete'
  | 'partial'
  | 'abandoned'
  | 'promoter'
  | 'passive'
  | 'detractor'
  | 'unread'

interface StatusPillProps {
  variant: StatusVariant
  /** Override the default localized label. */
  label?: string
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  active: 'bg-success-light text-[color:var(--color-on-success)]',
  draft: 'bg-[var(--color-bg-tertiary)] text-[color:var(--color-text-neutral)]',
  closed: 'bg-primary/15 text-primary',
  complete: 'bg-success-light text-[color:var(--color-on-success)]',
  partial: 'bg-warning-light text-[color:var(--color-on-warning)]',
  abandoned: 'bg-[var(--color-bg-tertiary)] text-[color:var(--color-text-neutral)]',
  promoter: 'bg-success-light text-[color:var(--color-on-success)]',
  passive: 'bg-warning-light text-[color:var(--color-on-warning)]',
  detractor: 'bg-error-light text-[color:var(--color-on-error)]',
  unread: 'bg-secondary/15 text-secondary',
}

const DEFAULT_KEYS: Record<StatusVariant, { key: string; fallback: string }> = {
  active: { key: 'statusPill.active', fallback: 'Active' },
  draft: { key: 'statusPill.draft', fallback: 'Draft' },
  closed: { key: 'statusPill.closed', fallback: 'Closed' },
  complete: { key: 'statusPill.complete', fallback: 'Complete' },
  partial: { key: 'statusPill.partial', fallback: 'Partial' },
  abandoned: { key: 'statusPill.abandoned', fallback: 'Abandoned' },
  promoter: { key: 'statusPill.promoter', fallback: 'Promoter' },
  passive: { key: 'statusPill.passive', fallback: 'Passive' },
  detractor: { key: 'statusPill.detractor', fallback: 'Detractor' },
  unread: { key: 'statusPill.unread', fallback: 'New' },
}

function StatusPill({ variant, label }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { key, fallback } = DEFAULT_KEYS[variant]
  const text = label ?? t(key, {}, { defaultValue: fallback })
  return (
    <span
      className={cm.cn(
        cm.sp('px', 3),
        cm.fontWeight('bold'),
        cm.roundedFull,
        'py-1 inline-flex items-center text-[10px] tracking-widest uppercase',
        VARIANT_CLASSES[variant],
      )}
    >
      {text}
    </span>
  )
}

export default StatusPill
export { StatusPill }
