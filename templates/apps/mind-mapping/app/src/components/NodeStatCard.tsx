import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI card for the Dendrite dashboard — `border-l-4` accent in a node-type
 * color, uppercase label, extrabold metric, and a small change pill.
 *
 * Translated from project-management's KpiCard.tsx (uppercase 10px label,
 * extrabold metric, hover-lift). Adapted so the accent maps to a node
 * "type" (Idea / Task / Reference / Note) which mirrors the DESIGN.md
 * node-type palette.
 */

export type NodeStatType = 'default' | 'idea' | 'task' | 'reference' | 'note'

const ACCENT_BY_TYPE: Record<NodeStatType, { border: string; iconBg: string; iconText: string }> = {
  default: {
    border: 'border-primary',
    iconBg: 'bg-primary-fixed',
    iconText: 'text-primary',
  },
  idea: {
    border: 'border-tertiary',
    iconBg: 'bg-tertiary-fixed',
    iconText: 'text-tertiary',
  },
  task: {
    border: 'border-secondary',
    iconBg: 'bg-secondary-fixed',
    iconText: 'text-secondary',
  },
  reference: {
    border: 'border-primary-container',
    iconBg: 'bg-primary-container/40',
    iconText: 'text-on-primary-container',
  },
  note: {
    border: 'border-outline',
    iconBg: 'bg-surface-container-high',
    iconText: 'text-on-surface-variant',
  },
}

export interface NodeStatCardProps {
  icon: string
  label: string
  value: string | number
  delta?: string
  deltaTone?: 'positive' | 'negative' | 'neutral'
  type?: NodeStatType
}

export function NodeStatCard({
  icon,
  label,
  value,
  delta,
  deltaTone = 'neutral',
  type = 'default',
}: NodeStatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACCENT_BY_TYPE[type]
  const deltaColor =
    deltaTone === 'positive'
      ? 'text-success'
      : deltaTone === 'negative'
        ? 'text-error'
        : 'text-on-surface-variant'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.stack(3),
        'bg-surface-container-lowest rounded-2xl border-l-4 shadow-sm hover:-translate-y-0.5 transition-transform duration-300',
        accent.border,
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.textSize('xl'),
            'rounded-xl material-symbols-outlined',
            accent.iconBg,
            accent.iconText,
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        {delta && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), deltaColor)}>
            {delta}
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
        {typeof value === 'number'
          ? t('nodeStat.value', { value }, { defaultValue: '{{value}}' })
          : value}
      </p>
    </div>
  )
}

export default NodeStatCard
