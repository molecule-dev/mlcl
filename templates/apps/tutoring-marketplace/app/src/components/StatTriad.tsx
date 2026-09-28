import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Triad of summary KPI cards — icon chip, uppercase 10px label, big
 * extrabold value, optional trend caption. Hover lifts the card.
 *
 * Translated from personal-finance DashboardAccountOverview / lms KpiCard.
 */

export type StatTriadItem = {
  key: string
  icon: string
  label: string
  value: string
  trend?: string
  tone?: 'primary' | 'success' | 'warning' | 'verified'
}

const toneClasses: Record<NonNullable<StatTriadItem['tone']>, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  verified: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
}

export type StatTriadProps = {
  items: StatTriadItem[]
}

export function StatTriad({ items }: StatTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map((item) => (
        <div
          key={item.key}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
            cm.accentCard({ tone: 'primary' }),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-xl',
                toneClasses[item.tone ?? 'primary'],
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')}>{item.icon}</span>
            </div>
            {item.trend && (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-on-surface-variant uppercase tracking-widest',
                )}
                style={{ fontSize: '0.625rem' }}
              >
                {item.trend}
              </span>
            )}
          </div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'uppercase tracking-widest',
              cm.accentCardLabel({ tone: 'primary' }),
            )}
            style={{ fontSize: '0.625rem' }}
          >
            {t(`statTriad.label.${item.key}`, {}, { defaultValue: item.label })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'font-display tracking-tight tabular-nums',
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export default StatTriad
