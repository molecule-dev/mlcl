import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useStatusLabel } from '../lib/issues.js'

/** Colored status chip: submitted/acknowledged/in_review/resolved/dismissed. */
export function StatusBadge({ status }: { status: string }) {
  const cm = getClassMap()
  const label = useStatusLabel()(status)
  const tone =
    status === 'resolved'
      ? 'bg-[var(--color-status-resolved)]/15 text-[var(--color-status-resolved)]'
      : status === 'dismissed'
        ? 'bg-[var(--color-status-dismissed)]/15 text-[var(--color-status-dismissed)]'
        : status === 'in_review'
          ? 'bg-[var(--color-status-in-review)]/15 text-[var(--color-status-in-review)]'
          : status === 'acknowledged'
            ? 'bg-[var(--color-status-acknowledged)]/15 text-[var(--color-status-acknowledged)]'
            : 'bg-[var(--color-status-submitted)]/15 text-[var(--color-status-submitted)]'
  return (
    <span
      data-mol-id="status-badge"
      data-status={status}
      className={cm.cn(
        cm.sp('px', 2),
        'inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap',
        tone,
      )}
      style={{ paddingTop: '0.125rem', paddingBottom: '0.125rem' }}
    >
      {label}
    </span>
  )
}

/** Small category chip with its accent color + material icon. */
export function CategoryBadge({
  category,
  icon,
  label,
}: {
  category: string
  icon: string
  label: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      data-mol-id="category-badge"
      data-category={category}
      className={cm.cn(
        cm.sp('px', 2),
        'inline-flex items-center gap-1 rounded-full text-xs font-medium whitespace-nowrap',
        'bg-[var(--color-cat-other)]/10',
      )}
      style={{ paddingTop: '0.125rem', paddingBottom: '0.125rem' }}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden>
        {icon}
      </span>
      {t('category.label', { category: label }, { defaultValue: '{{category}}' })}
    </span>
  )
}

/** Section header used across the bespoke pages. */
export function PageHeader({
  title,
  subtitle,
  molId,
  action,
}: {
  title: string
  subtitle?: string
  molId: string
  action?: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <header className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 4 }), cm.stack(1))}>
      <div className={cm.stack(1)}>
        <h1
          data-mol-id={molId}
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  )
}

export default StatusBadge
