/**
 * KPI-style budget card — uppercase 10px label band, tabular-nums spend
 * total in extrabold display type, hover-lift transition, and a thin
 * progress bar whose fill color shifts from primary → accent → error as
 * the trip approaches and exceeds the planned budget (per DESIGN.md
 * "Under budget: primary color fill / Near budget (>80%): accent color
 * fill / Over budget: error color fill").
 *
 * Translated from personal-finance's MetricsCard.tsx (KPI label/value
 * stack + inset accent bar + hover lift) and project-management's StatsRow.tsx
 * progress-bar treatment — adapted for travel spending categories.
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type BudgetCategory =
  'accommodation' | 'food' | 'sightseeing' | 'transport' | 'activity' | 'shopping' | 'other'

export interface BudgetSpend {
  category: BudgetCategory
  spent_cents: number
  budget_cents: number
  recent_count: number
}

const CATEGORY_LABELS: Record<BudgetCategory, { label: string; icon: string; stripe: string }> = {
  accommodation: { label: 'Lodging', icon: 'hotel', stripe: 'var(--color-cyan-700)' },
  food: { label: 'Food & drink', icon: 'restaurant', stripe: 'var(--color-orange-600)' },
  sightseeing: { label: 'Sightseeing', icon: 'photo_camera', stripe: 'var(--color-violet-500)' },
  transport: { label: 'Transit', icon: 'directions', stripe: 'var(--color-border-secondary)' },
  activity: { label: 'Activities', icon: 'hiking', stripe: 'var(--color-emerald-600)' },
  shopping: { label: 'Shopping', icon: 'shopping_bag', stripe: 'var(--color-pink-500)' },
  other: { label: 'Other', icon: 'more_horiz', stripe: 'var(--color-border-secondary)' },
}

function fmtMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function BudgetSpendCard({ spend }: { spend: BudgetSpend }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = CATEGORY_LABELS[spend.category]
  const pct =
    spend.budget_cents > 0 ? Math.round((spend.spent_cents / spend.budget_cents) * 100) : 0
  const remaining = spend.budget_cents - spend.spent_cents

  const fillClass = pct > 100 ? 'bg-error' : pct > 80 ? 'bg-accent' : 'bg-primary'

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
      style={{ ['--mol-accent' as string]: meta.stripe }}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.accentCardLabel({ tone: 'custom' }),
            cm.flex({ align: 'center', gap: 'xs' }),
          )}
        >
          <span
            className={'material-symbols-outlined text-base'}
            aria-hidden="true"
            style={{ fontSize: '1rem' }}
          >
            {meta.icon}
          </span>
          {t(`budgetSpendCard.category.${spend.category}`, {}, { defaultValue: meta.label })}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'py-0.5 uppercase tracking-widest rounded-full',
            pct > 100
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
              : pct > 80
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200'
                : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
          )}
        >
          {t('budgetSpendCard.pct', { pct }, { defaultValue: '{{pct}}%' })}
        </span>
      </header>
      <p
        className={cm.cn(
          cm.sp('mt', 3),
          'text-3xl font-extrabold tracking-tight tabular-nums leading-none',
        )}
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {fmtMoney(spend.spent_cents)}
      </p>
      <p
        className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant tabular-nums')}
      >
        {t(
          'budgetSpendCard.budgetTotal',
          { total: fmtMoney(spend.budget_cents) },
          { defaultValue: 'of {{total}} planned' },
        )}
      </p>
      <div
        className={cm.cn(cm.sp('mt', 4), 'h-2 rounded-full overflow-hidden bg-surface-container')}
      >
        <div
          className={cm.cn('h-full rounded-full transition-all duration-500', fillClass)}
          style={{ width: `${Math.min(100, pct)}%` }}
          aria-hidden="true"
        />
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 3),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'text-on-surface-variant tabular-nums',
        )}
      >
        <span>
          {remaining >= 0
            ? t(
                'budgetSpendCard.remaining',
                { amount: fmtMoney(remaining) },
                { defaultValue: '{{amount}} remaining' },
              )
            : t(
                'budgetSpendCard.overBy',
                { amount: fmtMoney(Math.abs(remaining)) },
                { defaultValue: '{{amount}} over budget' },
              )}
        </span>
        <span>
          {t(
            'budgetSpendCard.recentCount',
            { count: spend.recent_count },
            { defaultValue: '{{count}} recent' },
          )}
        </span>
      </p>
    </article>
  )
}
