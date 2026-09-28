/**
 * Expenses — trip-spending tracker. Per-trip totals + per-category
 * `<BudgetSpendCard>`s + a recent receipts table — every number sourced
 * from /api/expenses (and /api/trips for the budget targets).
 *
 * Lets the user log a new expense inline (POST /api/expenses) so the
 * tracker is actually usable end-to-end.
 */

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BudgetSpendCard } from '../components/BudgetSpendCard.js'
import type { ExpenseRow, TripRow } from '../lib/api.js'

const ALLOWED_CATEGORIES = ['food', 'lodging', 'transport', 'activities', 'other'] as const
type ExpenseCategory = (typeof ALLOWED_CATEGORIES)[number]

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  food: 'Food & drink',
  lodging: 'Lodging',
  transport: 'Transit',
  activities: 'Activities',
  other: 'Other',
}

function fmtMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function coerceCategory(value: string): ExpenseCategory {
  const lower = (value || '').toLowerCase()
  if ((ALLOWED_CATEGORIES as ReadonlyArray<string>).includes(lower)) return lower as ExpenseCategory
  // legacy "accommodation" → "lodging"
  if (lower === 'accommodation') return 'lodging'
  if (lower === 'activity') return 'activities'
  return 'other'
}

export function Expenses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [trips, setTrips] = useState<TripRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [activeTrip, setActiveTrip] = useState<string>('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tripsResp, expensesResp] = await Promise.all([
        http.get<TripRow[]>('/trips'),
        http.get<ExpenseRow[]>('/expenses'),
      ])
      const tripList = Array.isArray(tripsResp.data) ? tripsResp.data : []
      const expList = Array.isArray(expensesResp.data) ? expensesResp.data : []
      setTrips(tripList)
      setExpenses(expList)
      if (!activeTrip && tripList.length > 0) {
        setActiveTrip(tripList[0].id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('expenses.errors.load', {}, { defaultValue: 'Could not load expenses.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t, activeTrip])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const trip = useMemo(
    () => trips.find((t) => t.id === activeTrip) ?? trips[0],
    [trips, activeTrip],
  )

  const tripExpenses = useMemo(
    () => (trip ? expenses.filter((e) => e.trip_id === trip.id) : []),
    [trip, expenses],
  )

  const totalSpent = tripExpenses.reduce((sum, e) => sum + Number(e.amount_cents ?? 0), 0)
  const budgetTotal = Number(trip?.budget_total_cents ?? 0)
  const pct = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0
  const remaining = Math.max(0, budgetTotal - totalSpent)

  // Per-category aggregation. Use evenly-split target by default; the
  // budget plumbing only stores a single overall cap today, but the
  // editorial design wants per-category bars. Once a per-category schema
  // lands, swap the target source — keep the layout.
  const categoryTotals = useMemo(() => {
    const totals = new Map<ExpenseCategory, { spent: number; count: number }>()
    for (const exp of tripExpenses) {
      const cat = coerceCategory(exp.category)
      const prev = totals.get(cat) ?? { spent: 0, count: 0 }
      prev.spent += Number(exp.amount_cents ?? 0)
      prev.count += 1
      totals.set(cat, prev)
    }
    const used = Array.from(totals.entries())
    const cats =
      used.length > 0
        ? used.map(([cat]) => cat)
        : (['lodging', 'food', 'transport', 'activities'] as ExpenseCategory[])
    const split = cats.length > 0 && budgetTotal > 0 ? Math.round(budgetTotal / cats.length) : 0
    return cats.map((cat) => {
      const t = totals.get(cat) ?? { spent: 0, count: 0 }
      return { category: cat, spent_cents: t.spent, recent_count: t.count, budget_cents: split }
    })
  }, [tripExpenses, budgetTotal])

  const recent = useMemo(
    () =>
      [...tripExpenses]
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 12),
    [tripExpenses],
  )

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('expenses.eyebrow', {}, { defaultValue: 'Spend pulse' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('expenses.heading', {}, { defaultValue: 'Where the trip budget actually goes.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'expenses.subheading',
              {},
              {
                defaultValue:
                  'Every receipt and confirmation rolls up into the right category here \u2014 no spreadsheet needed.',
              },
            )}
          </p>
        </div>
        {trip ? (
          <button
            type="button"
            data-testid="expenses-new"
            onClick={() => setShowForm((v) => !v)}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm' }),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              add
            </span>
            {t('expenses.add', {}, { defaultValue: 'Log expense' })}
          </button>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          data-testid="expenses-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </div>
      ) : null}

      {trips.length === 0 && !loading ? (
        <div
          data-testid="expenses-no-trips"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            payments
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('expenses.noTrips.heading', {}, { defaultValue: 'No trips yet.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'expenses.noTrips.body',
              {},
              { defaultValue: 'Plan a trip first \u2014 expenses attach to a trip\u2019s budget.' },
            )}
          </p>
        </div>
      ) : null}

      {trips.length > 1 ? (
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          role="tablist"
        >
          {trips.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`expenses-trip-tab-${t.id}`}
              role="tab"
              aria-selected={activeTrip === t.id}
              onClick={() => setActiveTrip(t.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full transition-colors',
                activeTrip === t.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary',
              )}
            >
              {t.destination ?? t.name}
            </button>
          ))}
        </div>
      ) : null}

      {showForm && trip ? (
        <ExpenseForm
          trip={trip}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await refresh()
          }}
        />
      ) : null}

      {trip ? (
        <>
          <section
            className={cm.cn(
              cm.sp('p', 8),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2rem] relative overflow-hidden min-h-[260px]',
            )}
          >
            <div
              className={cm.cn(
                cm.w(80),
                cm.h(80),
                cm.roundedFull,
                'absolute -right-24 -top-24 bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.w(64),
                cm.h(64),
                cm.roundedFull,
                'absolute -left-20 -bottom-20 bg-accent/40 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'md' }))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent',
                )}
              >
                {t(
                  'expenses.heroEyebrow',
                  { trip: trip.destination ?? trip.name },
                  { defaultValue: '{{trip}} \u2022 budget snapshot' },
                )}
              </p>
              <p
                data-testid="expenses-total-cents"
                className={cm.cn(
                  'text-6xl md:text-7xl font-extrabold tracking-tighter tabular-nums leading-none',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {fmtMoney(totalSpent)}
              </p>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-primary tabular-nums')}>
                {budgetTotal > 0
                  ? t(
                      'expenses.heroBudget',
                      { total: fmtMoney(budgetTotal), pct },
                      { defaultValue: '{{pct}}% of {{total}} planned' },
                    )
                  : t(
                      'expenses.heroNoBudget',
                      {},
                      { defaultValue: 'No budget set on this trip yet.' },
                    )}
              </p>
              {budgetTotal > 0 ? (
                <div
                  className={cm.cn(
                    cm.sp('mt', 2),
                    'h-3 max-w-md rounded-full overflow-hidden bg-surface/15',
                  )}
                >
                  <div
                    className={cm.cn('h-full rounded-full bg-accent transition-all duration-500')}
                    style={{ width: `${Math.min(100, pct)}%` }}
                    aria-hidden="true"
                  />
                </div>
              ) : null}
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md',
                  )}
                >
                  <span
                    className={'material-symbols-outlined text-sm'}
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    savings
                  </span>
                  {t(
                    'expenses.remaining',
                    { amount: fmtMoney(remaining) },
                    { defaultValue: '{{amount}} left to spend' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    receipt_long
                  </span>
                  {t(
                    'expenses.receiptCount',
                    { count: tripExpenses.length },
                    { defaultValue: '{{count}} receipts' },
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('expenses.byCategoryHeading', {}, { defaultValue: 'By category' })}
            </h2>
            <div
              data-testid="expenses-by-category"
              className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}
            >
              {categoryTotals.map((spend) => {
                // Map our normalized expense category onto the BudgetSpendCard
                // category enum (sightseeing / shopping included for parity).
                const cardCat: 'accommodation' | 'food' | 'transport' | 'activity' | 'other' =
                  spend.category === 'lodging'
                    ? 'accommodation'
                    : spend.category === 'activities'
                      ? 'activity'
                      : spend.category === 'food'
                        ? 'food'
                        : spend.category === 'transport'
                          ? 'transport'
                          : 'other'
                return (
                  <BudgetSpendCard
                    key={spend.category}
                    spend={{
                      category: cardCat,
                      spent_cents: spend.spent_cents,
                      budget_cents: spend.budget_cents,
                      recent_count: spend.recent_count,
                    }}
                  />
                )
              })}
            </div>
          </section>

          <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('expenses.recentHeading', {}, { defaultValue: 'Recent expenses' })}
            </h2>
            {recent.length === 0 ? (
              <div
                data-testid="expenses-empty"
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  'rounded-3xl bg-surface-container-low border border-outline-variant/40 text-on-surface-variant',
                )}
              >
                {t(
                  'expenses.empty',
                  {},
                  { defaultValue: 'No expenses logged yet \u2014 add one to start tracking.' },
                )}
              </div>
            ) : (
              <div
                className={cm.cn(
                  'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
                )}
              >
                <table className={cm.cn(cm.w('full'), 'text-left')}>
                  <thead className={cm.cn('bg-surface-container-low')}>
                    <tr>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          cm.fontWeight('extrabold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('form.date', {}, { defaultValue: 'Date' })}
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          cm.fontWeight('extrabold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('form.description', {}, { defaultValue: 'Description' })}
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          cm.fontWeight('extrabold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('form.category', {}, { defaultValue: 'Category' })}
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('xs'),
                          cm.fontWeight('extrabold'),
                          'uppercase tracking-widest text-on-surface-variant text-right',
                        )}
                      >
                        {t('form.amount', {}, { defaultValue: 'Amount' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    data-testid="expenses-rows"
                    className={cm.cn('divide-y divide-surface-container')}
                  >
                    {recent.map((exp) => {
                      const cat = coerceCategory(exp.category)
                      return (
                        <tr
                          key={exp.id}
                          data-testid="expenses-row"
                          className={cm.cn('hover:bg-surface-container-low transition-colors')}
                        >
                          <td
                            className={cm.cn(
                              cm.sp('px', 5),
                              cm.sp('py', 4),
                              cm.textSize('sm'),
                              'tabular-nums text-on-surface-variant whitespace-nowrap',
                            )}
                          >
                            {fmtDate(exp.occurred_at)}
                          </td>
                          <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), cm.textSize('sm'))}>
                            <p className={cm.fontWeight('semibold')}>
                              {exp.description ?? exp.vendor ?? '—'}
                            </p>
                            {exp.vendor && exp.description ? (
                              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                                {exp.vendor}
                              </p>
                            ) : null}
                          </td>
                          <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                            <span
                              className={cm.cn(
                                cm.sp('px', 2),
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                'py-0.5 uppercase tracking-widest rounded-full bg-surface-container text-on-surface-variant',
                              )}
                            >
                              {t(`expenses.cat.${cat}`, {}, { defaultValue: CATEGORY_LABEL[cat] })}
                            </span>
                          </td>
                          <td
                            className={cm.cn(
                              cm.sp('px', 5),
                              cm.sp('py', 4),
                              cm.textSize('sm'),
                              cm.fontWeight('extrabold'),
                              'tabular-nums text-right',
                            )}
                          >
                            {fmtMoney(Number(exp.amount_cents ?? 0))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function ExpenseForm({
  trip,
  onCancel,
  onSaved,
}: {
  trip: TripRow
  onCancel: () => void
  onSaved: () => Promise<void> | void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [amount, setAmount] = useState(0)
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      setError(
        t('expenses.errors.amount', {}, { defaultValue: 'Amount must be greater than zero.' }),
      )
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await http.post('/expenses', {
        trip_id: trip.id,
        category,
        amount_cents: Math.round(amount * 100),
        vendor: vendor || undefined,
        description: description || undefined,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      })
      void track({
        name: 'expense.logged',
        properties: { trip_id: trip.id, category, amount_cents: Math.round(amount * 100) },
      })
      await onSaved()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('expenses.errors.create', {}, { defaultValue: 'Could not log expense.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      data-testid="expenses-form"
      onSubmit={submit}
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface border border-outline-variant',
        cm.flex({ direction: 'col', gap: 'md' }),
      )}
    >
      <h3
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {t(
          'expenses.formHeading',
          { trip: trip.destination ?? trip.name },
          { defaultValue: 'Log expense for {{trip}}' },
        )}
      </h3>
      {error ? (
        <div
          role="alert"
          data-testid="expenses-form-error"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </div>
      ) : null}
      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </span>
          <select
            data-testid="expenses-form-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          >
            {ALLOWED_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`expenses.cat.${c}`, {}, { defaultValue: CATEGORY_LABEL[c] })}
              </option>
            ))}
          </select>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('expenses.field.amount', {}, { defaultValue: 'Amount (USD)' })}
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            data-testid="expenses-form-amount"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary tabular-nums',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('expenses.field.vendor', {}, { defaultValue: 'Vendor' })}
          </span>
          <input
            data-testid="expenses-form-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.date', {}, { defaultValue: 'Date' })}
          </span>
          <input
            type="date"
            data-testid="expenses-form-date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
      </div>
      <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-on-surface-variant')}
        >
          {t('form.notes', {}, { defaultValue: 'Notes' })}
        </span>
        <input
          data-testid="expenses-form-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
          )}
        />
      </label>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'end' }))}>
        <button
          type="button"
          onClick={onCancel}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          data-testid="expenses-form-submit"
          type="submit"
          disabled={submitting || amount <= 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full bg-primary text-on-primary disabled:opacity-50',
          )}
        >
          {submitting
            ? t('expenses.saving', {}, { defaultValue: 'Saving\u2026' })
            : t('expenses.save', {}, { defaultValue: 'Save expense' })}
        </button>
      </div>
    </form>
  )
}
