/**
 * KPI card — icon badge top-left, optional trend pill top-right, uppercase
 * label, large numeric value, optional unit. Hover lift + left border accent.
 *
 * Translated from lms's KpiCard.tsx and personal-finance's StatRow card.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type KpiAccent = 'primary' | 'streak' | 'success' | 'info'

export interface StudyKpiCardProps {
  icon: string
  labelKey: string
  labelDefault: string
  value: string | number
  unit?: string
  delta?: number
  accent?: KpiAccent
}

const ACCENT_BORDER: Record<KpiAccent, string> = {
  primary: 'border-l-primary',
  streak: 'border-l-warning',
  success: 'border-l-success',
  info: 'border-l-info',
}

const ACCENT_ICON_BG: Record<KpiAccent, string> = {
  primary: 'bg-primary-container/60 text-primary',
  streak: 'bg-warning-container/60 text-warning',
  success: 'bg-success-container/60 text-success',
  info: 'bg-info-container/60 text-info',
}

export function StudyKpiCard({
  icon,
  labelKey,
  labelDefault,
  value,
  unit,
  delta,
  accent = 'primary',
}: StudyKpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-l-4 border-outline-variant/30 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md',
        ACCENT_BORDER[accent],
      )}
      data-mol-id={`kpi-${labelKey}`}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 rounded-xl',
            ACCENT_ICON_BG[accent],
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {icon}
          </span>
        </div>
        {typeof delta === 'number' && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-bold rounded-full px-2 py-1',
              delta >= 0
                ? 'bg-success-container/60 text-on-success-container'
                : 'bg-error-container/60 text-on-error-container',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {delta >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'studyKpiCard.delta',
              { percent: Math.abs(delta).toFixed(1) },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">
        {t(labelKey, {}, { defaultValue: labelDefault })}
      </p>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 2),
          'text-4xl font-extrabold tracking-tight',
        )}
      >
        {value}
        {unit && (
          <span className={cm.cn('text-base font-semibold text-on-surface-variant ml-1')}>
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}
