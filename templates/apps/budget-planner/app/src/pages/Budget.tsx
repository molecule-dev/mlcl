import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BalanceHeroCard } from '../components/BalanceHeroCard.js'
import { type CategoryProgress, CategoryProgressRow } from '../components/CategoryProgressRow.js'
import { EnvelopeKpiCard } from '../components/EnvelopeKpiCard.js'
import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MonthSummary {
  month: string
  income_cents: number
  assigned_cents: number
  spent_cents: number
  available_cents: number
  net_worth_cents: number
  net_worth_change_30d_cents: number
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency())
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function Budget() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [month, setMonth] = useState<string>(thisMonth())
  const [rows, setRows] = useState<CategoryProgress[]>([])
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/reports/category_progress?month=${month}`).catch(() => null),
      http.get(`/api/reports/month_summary?month=${month}`).catch(() => null),
    ])
      .then(([cRes, sRes]) => {
        if (cancelled) return
        setRows(unwrapList<CategoryProgress>(cRes))
        setSummary(unwrapSingle<MonthSummary>(sRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('budget.loadError', {}, { defaultValue: 'Failed to load budget.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, month, t, reloadCounter])

  const [y, m] = month.split('-').map(Number)

  async function assignToCategory(categoryId: string, dollars: number) {
    await http.post('/api/envelopes/assign', {
      category_id: categoryId,
      month: m,
      year: y,
      assigned: dollars,
    })
    // Refetch so the row's assigned/remaining/progress bar reflects the
    // new value on the next render — the user expects the bar to update,
    // not just see a saved-toast.
    setReloadCounter((n) => n + 1)
  }

  const groups = useMemo(() => {
    const map = new Map<string, CategoryProgress[]>()
    for (const r of rows) {
      const arr = map.get(r.group) ?? []
      arr.push(r)
      map.set(r.group, arr)
    }
    return Array.from(map.entries())
  }, [rows])

  const totalAssigned = useMemo(() => rows.reduce((acc, r) => acc + r.assigned_cents, 0), [rows])
  const totalSpent = useMemo(() => rows.reduce((acc, r) => acc + r.spent_cents, 0), [rows])
  const overspentCount = useMemo(
    () => rows.filter((r) => r.spent_cents > r.assigned_cents).length,
    [rows],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('budget.eyebrow', {}, { defaultValue: 'Envelope plan' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-3xl md:text-4xl tracking-tight mt-1',
            )}
          >
            {t('budget.heading', {}, { defaultValue: 'Budget' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'budget.subheading',
              {},
              { defaultValue: 'Give every dollar a job, then watch it work.' },
            )}
          </p>
        </div>

        {/* Month selector */}
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface',
            )}
            aria-label={t('budget.prevMonth', {}, { defaultValue: 'Previous month' })}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              chevron_left
            </span>
          </button>
          <span
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('extrabold'),
              cm.textSize('base'),
              'rounded-full bg-primary text-white min-w-[180px] text-center tracking-wide tabular-nums',
            )}
          >
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface',
            )}
            aria-label={t('budget.nextMonth', {}, { defaultValue: 'Next month' })}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              chevron_right
            </span>
          </button>
        </div>
      </header>

      {summary ? (
        <BalanceHeroCard
          monthLabel={monthLabel(month)}
          availableCents={summary.available_cents}
          incomeCents={summary.income_cents}
          spentCents={summary.spent_cents}
          assignedCents={summary.assigned_cents}
          netWorthChangeCents={summary.net_worth_change_30d_cents}
        />
      ) : null}

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <EnvelopeKpiCard
          tone="assigned"
          icon="account_tree"
          label={t('budget.kpi.totalAssigned', {}, { defaultValue: 'Total assigned' })}
          value={fmt(totalAssigned)}
          caption={t(
            'budget.kpi.acrossEnvelopes',
            { count: rows.length },
            { defaultValue: 'Across {{count}} envelopes' },
          )}
        />
        <EnvelopeKpiCard
          tone="spent"
          icon="paid"
          label={t('budget.kpi.totalSpent', {}, { defaultValue: 'Total spent' })}
          value={fmt(totalSpent)}
          caption={t('budget.kpi.cleared', {}, { defaultValue: 'Cleared so far' })}
        />
        <EnvelopeKpiCard
          tone={overspentCount > 0 ? 'overspent' : 'available'}
          icon={overspentCount > 0 ? 'warning' : 'check_circle'}
          label={t('budget.kpi.overspent', {}, { defaultValue: 'Overspent' })}
          value={String(overspentCount)}
          caption={t(
            'budget.kpi.overspentCaption',
            {},
            { defaultValue: 'Categories needing attention' },
          )}
        />
        <EnvelopeKpiCard
          tone={summary && summary.available_cents < 0 ? 'overspent' : 'available'}
          icon="account_balance_wallet"
          label={t('budget.kpi.available', {}, { defaultValue: 'Available' })}
          value={fmt(summary?.available_cents ?? 0)}
          caption={t(
            'budget.kpi.availableCaption',
            {},
            { defaultValue: 'Left to assign this month' },
          )}
        />
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('budget.loading', {}, { defaultValue: 'Loading envelopes…' })}
        </p>
      ) : groups.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('budget.empty', {}, { defaultValue: 'No categories yet — add some in Categories.' })}
        </p>
      ) : (
        <div className={cm.stack(6)}>
          {groups.map(([group, items]) => {
            const groupAssigned = items.reduce((acc, r) => acc + r.assigned_cents, 0)
            const groupSpent = items.reduce((acc, r) => acc + r.spent_cents, 0)
            const groupRemaining = groupAssigned - groupSpent
            return (
              <section
                key={group}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden',
                )}
                data-mol-id={`budget-group-${group.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <header
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', justify: 'between' }),
                    'bg-surface-container/60 border-b border-outline-variant/40',
                  )}
                >
                  <h2
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('extrabold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {group}
                  </h2>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      'tabular-nums',
                      cm.fontWeight('semibold'),
                      groupRemaining < 0 ? 'text-error' : 'text-on-surface-variant',
                    )}
                  >
                    {fmt(groupSpent)} / {fmt(groupAssigned)}
                  </span>
                </header>
                <ul className="divide-y divide-outline-variant/40">
                  {items.map((r) => (
                    <CategoryProgressRow key={r.category_id} row={r} onAssign={assignToCategory} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
