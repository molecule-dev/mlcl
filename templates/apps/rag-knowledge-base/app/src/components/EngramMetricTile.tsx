import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EngramMetricTileProps {
  label: string
  value: ReactNode
  icon: string
  /** Tier — picks the icon-chip background tint and accent border color. */
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'cited'
  /** Helper text or inline trend below the value. */
  caption?: ReactNode
  /** When set, shows a thin progress meter under the value. 0..100. */
  meter?: number
}

const TONE_VAR: Record<NonNullable<EngramMetricTileProps['tone']>, string> = {
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  cited: 'var(--color-cited)',
}

/**
 * KPI tile — uppercase 10px label, large extrabold value, icon chip in the
 * top-right, optional left-edge accent rule + hover-lift.
 *
 * Translated from ai-document-processor's ParcelaMetricTile (banking-dashboard
 * KpiCard pattern). Each tile carries a tone derived from DESIGN.md's
 * relevance / status palette so meaning reads at a glance.
 */
export function EngramMetricTile({
  label,
  value,
  icon,
  tone = 'primary',
  caption,
  meter,
}: EngramMetricTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const color = TONE_VAR[tone]

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all overflow-hidden',
      )}
      style={{ ['--mol-accent' as string]: color }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span className={cm.accentCardLabel({ tone: 'custom' })}>{label}</span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-lg',
          )}
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 20 }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </span>
      </div>
      <div>
        <div
          className={cm.cn(
            cm.textSize('3xl'),
            'font-extrabold tracking-tight tabular-nums text-on-surface',
          )}
        >
          {value}
        </div>
        {typeof meter === 'number' ? (
          <div
            className={cm.cn(
              cm.sp('mt', 3),
              cm.w('full'),
              'h-1.5 rounded-full bg-surface-container overflow-hidden',
            )}
            role="progressbar"
            aria-valuenow={Math.round(meter)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t(
              'engramMetricTile.meterAria',
              { label },
              { defaultValue: `${label} progress` },
            )}
          >
            <div
              className={cm.cn('h-full rounded-full')}
              style={{ width: `${Math.max(0, Math.min(100, meter))}%`, background: color }}
            />
          </div>
        ) : null}
        {caption ? (
          <div
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 3),
              'text-on-surface-variant flex items-center gap-1',
            )}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  )
}
