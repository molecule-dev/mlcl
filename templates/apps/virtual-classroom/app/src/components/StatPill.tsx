import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI tile — left-edge accent border, uppercase 10px label, large
 * extrabold value, hover lift.
 *
 * Translated from lms/KpiCard.tsx — same icon-chip + value structure,
 * tightened to a single configurable component for the Aula dashboard.
 */
export type StatPillTone = 'primary' | 'secondary' | 'success' | 'tertiary' | 'error'

const TONE_VAR: Record<StatPillTone, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  tertiary: 'var(--color-tertiary)',
  error: 'var(--color-error)',
}

const TONE_ICON_BG: Record<StatPillTone, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary/15 text-secondary-dark',
  success: 'bg-success/15 text-success',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  error: 'bg-error-container text-on-error-container',
}

const TONE_DELTA: Record<StatPillTone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary-dark',
  success: 'text-success',
  tertiary: 'text-tertiary',
  error: 'text-error',
}

export interface StatPillProps {
  icon?: string
  label?: string
  value?: string | number
  unit?: string
  delta?: string
  deltaTrend?: 'up' | 'down' | 'flat'
  tone?: StatPillTone
}

export function StatPill({
  icon = 'school',
  label,
  value = '5',
  unit,
  delta,
  deltaTrend = 'up',
  tone = 'primary',
}: StatPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const labelText = label ?? t('statPill.label', {}, { defaultValue: 'Active courses' })

  const trendIcon =
    deltaTrend === 'down'
      ? 'trending_down'
      : deltaTrend === 'flat'
        ? 'trending_flat'
        : 'trending_up'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.accentCard({ tone: 'custom' }),
        'group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
        'hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ ['--mol-accent' as string]: TONE_VAR[tone] }}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            'h-11 w-11 rounded-xl flex items-center justify-center',
            TONE_ICON_BG[tone],
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[22px]')}>{icon}</span>
        </div>
        {delta ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              TONE_DELTA[tone],
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')}>{trendIcon}</span>
            {delta}
          </span>
        ) : null}
      </div>
      <p className={cm.accentCardLabel({ tone: 'custom' })}>{labelText}</p>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          'text-3xl leading-none tracking-tight tabular-nums text-on-surface',
        )}
      >
        {value}
        {unit ? (
          <span className={cm.cn('ml-1 text-base font-semibold text-on-surface-variant')}>
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  )
}

export default StatPill
