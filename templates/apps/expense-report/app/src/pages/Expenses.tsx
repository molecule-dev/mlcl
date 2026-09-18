import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ExpenseRow, type ExpenseRowItem } from '../components/ExpenseRow.js'

const CATEGORY_FILTERS = [
  { key: 'all', icon: 'receipt_long', label: 'All' },
  { key: 'meals', icon: 'restaurant', label: 'Meals' },
  { key: 'travel', icon: 'flight', label: 'Travel' },
  { key: 'lodging', icon: 'hotel', label: 'Lodging' },
  { key: 'transport', icon: 'directions_car', label: 'Transport' },
  { key: 'supplies', icon: 'inventory_2', label: 'Supplies' },
  { key: 'software', icon: 'memory', label: 'Software' },
  { key: 'entertainment', icon: 'theater_comedy', label: 'Client meals' },
  { key: 'other', icon: 'more_horiz', label: 'Other' },
] as const

const FALLBACK: ExpenseRowItem[] = [
  {
    id: 'e-100',
    merchant: 'Lufthansa LH 9020',
    category: 'travel',
    date: '2026-04-12T08:30:00Z',
    amountCents: 88_400,
    receiptUrl: null,
  },
  {
    id: 'e-101',
    merchant: 'Hotel Adlon Kempinski',
    category: 'lodging',
    date: '2026-04-13T22:00:00Z',
    amountCents: 92_500,
    receiptUrl: null,
  },
  {
    id: 'e-102',
    merchant: 'Restaurant Tim Raue',
    category: 'meals',
    date: '2026-04-14T20:48:00Z',
    amountCents: 18_650,
    receiptUrl: null,
  },
  {
    id: 'e-103',
    merchant: 'Berlin S-Bahn day pass',
    category: 'transport',
    date: '2026-04-14T07:15:00Z',
    amountCents: 950,
    receiptUrl: null,
  },
  {
    id: 'e-104',
    merchant: 'WeWork Friedrichstraße',
    category: 'supplies',
    date: '2026-04-15T11:00:00Z',
    amountCents: 34_050,
    receiptUrl: null,
  },
  {
    id: 'e-105',
    merchant: 'AWS · April compute',
    category: 'software',
    date: '2026-04-30T10:00:00Z',
    amountCents: 142_900,
    receiptUrl: null,
  },
]

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

export function Expenses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [expenses, setExpenses] = useState<ExpenseRowItem[]>(FALLBACK)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ExpenseRowItem[]>('/api/expenses')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          typeof (data[0] as ExpenseRowItem).amountCents === 'number'
        ) {
          setExpenses(data)
        }
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('list')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      if (filter !== 'all' && expense.category.toLowerCase() !== filter) return false
      if (
        search &&
        !expense.merchant.toLowerCase().includes(search.toLowerCase()) &&
        !expense.category.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [expenses, filter, search])

  const totalCents = filtered.reduce((sum, item) => sum + item.amountCents, 0)

  return (
    <div data-mol-id="page-expenses" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('expenses.eyebrow', {}, { defaultValue: 'Receipts and reimbursable items' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t('expenses.title', {}, { defaultValue: 'Expenses' })}
          </h1>
        </div>
        <Link
          to="/expenses/new"
          data-mol-id="btn-add-expense"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-sm',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('expenses.addExpense', {}, { defaultValue: 'Add expense' })}
        </Link>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'expenses.listFallback',
            {},
            { defaultValue: 'Live list unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }),
          cm.sp('p', 4),
          'rounded-2xl bg-surface border border-outline-variant/40',
        )}
      >
        <div className={cm.cn('relative flex-1 min-w-[12rem]')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'expenses.searchPlaceholder',
              {},
              { defaultValue: 'Search merchant or category…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 outline-none',
            )}
          />
        </div>
        <ul className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }))}>
          {CATEGORY_FILTERS.map((cat) => {
            const active = filter === cat.key
            return (
              <li key={cat.key}>
                <button
                  type="button"
                  data-mol-id={`filter-${cat.key}`}
                  onClick={() => setFilter(cat.key)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full uppercase tracking-widest transition-colors',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    {cat.icon}
                  </span>
                  {t(`expenses.filter.${cat.key}`, {}, { defaultValue: cat.label })}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        data-mol-id="expense-list"
        className={cm.cn(
          'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/40',
        )}
      >
        {filtered.map((expense) => (
          <ExpenseRow key={expense.id} item={expense} />
        ))}
        {filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('expenses.empty', {}, { defaultValue: 'No expenses match your filters.' })}
          </div>
        ) : null}
        {filtered.length > 0 ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'bg-surface-container-low text-sm font-semibold',
            )}
          >
            <span className={cm.cn('uppercase tracking-widest text-xs text-on-surface-variant')}>
              {t(
                'expenses.subtotal',
                { count: filtered.length },
                { defaultValue: '{{count}} expenses · subtotal' },
              )}
            </span>
            <span
              className={cm.cn('text-base font-bold tabular-nums text-on-surface tracking-tight')}
            >
              {formatUsd(totalCents)}
            </span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
