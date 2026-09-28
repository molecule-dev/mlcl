import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Expense {
  id: string
  occurred_at: string | null
  merchant: string
  category: string
  category_color: string
  amount_cents: number
  tax_cents: number
  is_deductible: boolean
  has_receipt: boolean
  reconciled: boolean
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Expenses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/expenses')
      .then((res) => {
        if (!cancelled) setExpenses(unwrapList<Expense>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('expenses.loadError', {}, { defaultValue: 'Failed to load expenses.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const total = expenses.reduce((acc, e) => acc + e.amount_cents, 0)
  const deductible = expenses
    .filter((e) => e.is_deductible)
    .reduce((acc, e) => acc + e.amount_cents, 0)
  const unreconciled = expenses.filter((e) => !e.reconciled).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('expenses.heading', {}, { defaultValue: 'Expenses' })}
        </h1>
        <Link
          to="/expenses/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('expenses.newCta', {}, { defaultValue: 'Log expense' })}
        </Link>
      </header>

      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        <Stat
          label={t('expenses.kpi.total', {}, { defaultValue: 'Total spend' })}
          value={fmtUsd(total)}
        />
        <Stat
          label={t('expenses.kpi.deductible', {}, { defaultValue: 'Deductible' })}
          value={fmtUsd(deductible)}
        />
        <Stat
          label={t('expenses.kpi.unreconciled', {}, { defaultValue: 'Unreconciled' })}
          value={String(unreconciled)}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : expenses.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('expenses.empty', {}, { defaultValue: 'No expenses yet.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <ul className="divide-y divide-outline-variant">
            {expenses.map((e) => (
              <li
                key={e.id}
                className={cm.accentCard({ tone: 'custom' })}
                style={{ ['--mol-accent' as string]: e.category_color }}
              >
                <Link
                  to={`/expenses/${e.id}`}
                  className={cm.cn(
                    cm.sp('pr', 5),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', justify: 'between' }),
                    'hover:bg-surface-container',
                  )}
                >
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.fontWeight('semibold')}>{e.merchant}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {fmtDate(e.occurred_at)} · {e.category}
                      {e.has_receipt
                        ? ` · 📎 ${t('expenses.tag.receipt', {}, { defaultValue: 'receipt' })}`
                        : ''}
                      {e.is_deductible
                        ? ` · ${t('expenses.tag.deductible', {}, { defaultValue: 'deductible' })}`
                        : ''}
                      {!e.reconciled
                        ? ` · ${t('expenses.tag.unreconciled', {}, { defaultValue: 'unreconciled' })}`
                        : ''}
                    </p>
                  </div>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums', 'text-error')}>
                    -{fmtUsd(e.amount_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1), 'tabular-nums')}
      >
        {value}
      </p>
    </div>
  )
}
