/**
 * Triad of summary stat cards — MTD revenue, MTD expenses, Outstanding.
 * Each card has a colored icon chip on the left, an uppercase eyebrow,
 * and an extrabold tabular-numeric value.
 *
 * Translated from personal-finance's DashboardAccountOverview.tsx
 * (account triad pattern). Uses Ledger brand navy primary + gold accent
 * for the third card to mirror the hero treatment.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LedgerStatTriadProps {
  mtdRevenueCents: number
  mtdExpensesCents: number
  outstandingCents: number
  overdueCents: number
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface StatProps {
  eyebrow: string
  label: string
  value: string
  sub?: string
  icon: string
  accent: 'primary' | 'success' | 'warning'
}

function Stat({ eyebrow, label, value, sub, icon, accent }: StatProps) {
  const cm = getClassMap()
  const accentBg =
    accent === 'success'
      ? 'bg-success/10 text-success'
      : accent === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-primary/10 text-primary'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'lg:col-span-4 bg-surface-container-lowest rounded-2xl border-l-4 hover:-translate-y-0.5 transition-transform',
      )}
      style={{
        borderLeftColor:
          accent === 'success'
            ? 'var(--mol-color-success)'
            : accent === 'warning'
              ? 'var(--mol-color-warning)'
              : 'var(--mol-color-primary)',
      }}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 5))}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl',
            cm.flex({ align: 'center', justify: 'center' }),
            accentBg,
          )}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant',
          )}
        >
          {eyebrow}
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tabular-nums tracking-tight')}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  )
}

export function LedgerStatTriad({
  mtdRevenueCents,
  mtdExpensesCents,
  outstandingCents,
  overdueCents,
}: LedgerStatTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const netCents = mtdRevenueCents - mtdExpensesCents

  return (
    <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-12')}>
      <Stat
        eyebrow={t('ledgerStatTriad.eyebrow.mtd', {}, { defaultValue: 'Month to date' })}
        label={t('ledgerStatTriad.revenueLabel', {}, { defaultValue: 'Revenue' })}
        value={fmtUsd(mtdRevenueCents)}
        sub={t(
          'ledgerStatTriad.netSub',
          { amount: fmtUsd(netCents) },
          { defaultValue: 'Net {{amount}}' },
        )}
        icon="trending_up"
        accent="success"
      />
      <Stat
        eyebrow={t('ledgerStatTriad.eyebrow.mtd', {}, { defaultValue: 'Month to date' })}
        label={t('ledgerStatTriad.expensesLabel', {}, { defaultValue: 'Expenses' })}
        value={fmtUsd(mtdExpensesCents)}
        icon="receipt_long"
        accent="primary"
      />
      <Stat
        eyebrow={t('ledgerStatTriad.eyebrow.ar', {}, { defaultValue: 'Accounts receivable' })}
        label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
        value={fmtUsd(outstandingCents)}
        sub={t(
          'ledgerStatTriad.overdueSub',
          { amount: fmtUsd(overdueCents) },
          { defaultValue: '{{amount}} overdue' },
        )}
        icon="schedule"
        accent="warning"
      />
    </section>
  )
}

export default LedgerStatTriad
