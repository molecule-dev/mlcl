import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI card with semantic accent border-l, uppercase 10px label,
 * extrabold value, and an optional micro-bar sparkline. Used in the
 * Home and SpacesIndex summary rows.
 *
 * Translated from document-collaboration/QuillonKpiCard.tsx and the
 * editorial KPI treatment from contract-management — adapted to
 * Cairn's primary teal + amber palette.
 */
export interface CairnKpiCardProps {
  label: string
  value: string | number
  hint?: string
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  trend?: number[]
}

const ACCENT_BORDER: Record<NonNullable<CairnKpiCardProps['tone']>, string> = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  error: 'border-l-error',
  info: 'border-l-info',
  neutral: 'border-l-outline',
}

const ACCENT_BAR: Record<NonNullable<CairnKpiCardProps['tone']>, string> = {
  primary: 'bg-primary/70',
  success: 'bg-success/70',
  warning: 'bg-warning/70',
  error: 'bg-error/70',
  info: 'bg-info/70',
  neutral: 'bg-outline/60',
}

export function CairnKpiCard({ label, value, hint, tone = 'primary', trend }: CairnKpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trendBars = trend && trend.length > 0 ? trend.slice(-8) : null
  const max = trendBars ? Math.max(...trendBars, 1) : 1

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[7rem] rounded-2xl border border-outline-variant bg-surface-container-lowest border-l-4 shadow-sm transition-transform hover:-translate-y-0.5',
        ACCENT_BORDER[tone],
      )}
    >
      <p
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'uppercase tracking-widest text-on-surface-variant text-[10px]',
        )}
      >
        {label}
      </p>
      <div
        className={cm.cn(
          cm.sp('mt', 2),
          cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }),
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tabular-nums text-on-surface',
          )}
        >
          {value}
        </span>
        {trendBars ? (
          <div
            className={cm.cn(cm.flex({ align: 'end' }), 'h-8 gap-0.5')}
            aria-label={t('cairnKpiCard.trend', {}, { defaultValue: 'Recent trend' })}
            role="img"
          >
            {trendBars.map((v, i) => (
              <span
                key={i}
                className={cm.cn('w-1 rounded-t-sm', ACCENT_BAR[tone])}
                style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      {hint ? (
        <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
