import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtCompact } from '../lib/money.js'

interface PayrollKpiTriadProps {
  activeEmployees: number
  annualPayroll: number
  ytdTaxesWithheld: number
  /** ISO 8601 date for the next pay-run pay-date. */
  nextPayDate: string | null
}

/**
 * Triad/quad of KPI cards — uppercase 10px tracking-widest label,
 * extrabold value, semantic-tinted icon chip, hover lift. Each card has
 * a colored top border accent.
 *
 * Translated from crm/KpiCard.tsx + banking-dashboard/AccountsTriad.tsx.
 */
export function PayrollKpiTriad({
  activeEmployees,
  annualPayroll,
  ytdTaxesWithheld,
  nextPayDate,
}: PayrollKpiTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const cards = [
    {
      key: 'employees',
      defaultLabel: 'Active employees',
      icon: 'group',
      tint: 'text-primary bg-primary/10',
      accentBorder: 'border-t-primary',
      value: activeEmployees.toLocaleString(),
      sub: t('payrollKpiTriad.employeesSub', {}, { defaultValue: 'On the next pay run' }),
    },
    {
      key: 'annualPayroll',
      defaultLabel: 'Annual payroll',
      icon: 'payments',
      tint: 'text-secondary bg-secondary/10',
      accentBorder: 'border-t-secondary',
      value: fmtCompact(annualPayroll),
      sub: t('payrollKpiTriad.annualSub', {}, { defaultValue: 'Gross, current FY' }),
    },
    {
      key: 'taxes',
      defaultLabel: 'YTD taxes withheld',
      icon: 'account_balance',
      tint: 'text-tertiary bg-tertiary/10',
      accentBorder: 'border-t-tertiary',
      value: fmtCompact(ytdTaxesWithheld),
      sub: t('payrollKpiTriad.taxesSub', {}, { defaultValue: 'Federal, state, FICA' }),
    },
    {
      key: 'nextPay',
      defaultLabel: 'Next pay date',
      icon: 'event_available',
      tint: 'text-info bg-info/10',
      accentBorder: 'border-t-info',
      value: nextPayDate
        ? new Date(nextPayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : t('payrollKpiTriad.nextPayNone', {}, { defaultValue: '—' }),
      sub: t('payrollKpiTriad.nextPaySub', {}, { defaultValue: 'Biweekly cycle' }),
    },
  ] as const

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', justify: 'between' }),
            'bg-surface-container-lowest rounded-2xl border-t-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all',
            card.accentBorder,
          )}
        >
          <div className={cm.flex({ justify: 'between', align: 'start' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`payrollKpiTriad.${card.key}`, {}, { defaultValue: card.defaultLabel })}
            </span>
            <span
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                card.tint,
              )}
              aria-hidden="true"
            >
              <span className={cm.cn(`material-symbols-outlined text-base`)}>{card.icon}</span>
            </span>
          </div>
          <div className={cm.cn(cm.sp('mt', 4))}>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                'font-extrabold tabular-nums text-on-surface tracking-tight',
              )}
            >
              {card.value}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {card.sub}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
