import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Rollout bar — 8px-tall rounded track that visualises a rollout
 * percentage. Single-bar mode shows a flag-on→flag-on gradient fill;
 * variant mode renders stacked segments (for multivariate flags) with
 * the DESIGN.md palette of `flag-on / accent / rollout-partial / cyan
 * / pink` separated by 1px gaps.
 */

const VARIANT_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'] as const

export interface RolloutVariant {
  key: string
  label?: string
  weight: number
}

interface RolloutBarProps {
  /** Single-bar mode — emerald gradient up to this percent (0-100). */
  percent?: number
  /** Variant mode — stacked segments. Sum should equal 100. */
  variants?: RolloutVariant[]
  /** Show the "%" label on the right above the bar. */
  showLabel?: boolean
}

export function RolloutBar({ percent, variants, showLabel = true }: RolloutBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (variants && variants.length > 0) {
    const total = variants.reduce((s, v) => s + v.weight, 0) || 100

    return (
      <div className={cm.cn('w-full')} data-mol-id="rollout-bar-variants">
        {showLabel ? (
          <p className={cm.cn('mb-1.5 flex items-baseline justify-between gap-2')}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('rolloutBar.variants', {}, { defaultValue: 'Variants' })}
            </span>
            <span
              className={cm.cn('font-mono text-xs text-on-surface-variant')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {total}%
            </span>
          </p>
        ) : null}
        <div
          className={cm.cn('flex w-full overflow-hidden rounded-full')}
          style={{ height: 8, backgroundColor: 'rgba(100, 116, 139, 0.20)', gap: 1 }}
        >
          {variants.map((v, i) => {
            const color = VARIANT_COLORS[i % VARIANT_COLORS.length]
            return (
              <span
                key={v.key}
                className={cm.cn('h-full')}
                style={{ width: `${v.weight}%`, backgroundColor: color }}
                aria-label={`${v.label ?? v.key}: ${v.weight}%`}
              />
            )
          })}
        </div>
        <ul className={cm.cn('mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3')}>
          {variants.map((v, i) => (
            <li key={`legend-${v.key}`} className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span
                className={cm.cn('h-2 w-2 rounded-full shrink-0')}
                style={{ backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
                aria-hidden="true"
              />
              <span className={cm.cn('font-mono text-xs text-on-surface truncate')}>
                {v.label ?? v.key}
              </span>
              <span
                className={cm.cn('ml-auto font-mono text-xs text-on-surface-variant')}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {v.weight}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const pct = Math.max(0, Math.min(100, percent ?? 0))
  return (
    <div className={cm.cn('w-full')} data-mol-id="rollout-bar">
      {showLabel ? (
        <p className={cm.cn('mb-1.5 flex items-baseline justify-between gap-2')}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('rolloutBar.rollout', {}, { defaultValue: 'Rollout' })}
          </span>
          <span
            className={cm.cn('font-mono text-xs font-bold text-on-surface')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {pct}%
          </span>
        </p>
      ) : null}
      <div
        className={cm.cn('overflow-hidden rounded-full')}
        style={{ height: 8, backgroundColor: 'rgba(100, 116, 139, 0.20)' }}
      >
        <span
          className={cm.cn('block h-full rounded-full')}
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--color-primary-dark), var(--color-primary) 60%, var(--color-primary-hover))',
            boxShadow: '0 0 12px -2px rgba(16, 185, 129, 0.5)',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
