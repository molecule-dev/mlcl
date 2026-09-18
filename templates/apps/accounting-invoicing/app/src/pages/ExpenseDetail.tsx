import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface AuditEvent {
  id: string
  occurred_at: string
  actor: string
  action: string
}

interface ExpenseDetail {
  id: string
  occurred_at: string | null
  merchant: string
  category: string
  category_color: string
  amount_cents: number
  tax_cents: number
  is_deductible: boolean
  reconciled: boolean
  reconciled_match_id?: string
  reconciled_match_description?: string
  receipt_url?: string | null
  notes?: string
  audit_log: AuditEvent[]
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

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ExpenseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/expenses/${id}`)
      .then((res) => {
        if (!cancelled) setExpense(unwrapSingle<ExpenseDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('expenseDetail.loadError', {}, { defaultValue: 'Failed to load expense.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !expense) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
        <Link
          to="/expenses"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('expenseDetail.back', {}, { defaultValue: 'Expenses' })}
        </Link>
        <div className={cm.cn(cm.card(), cm.sp('p', 8), 'text-center space-y-3')}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('expenseDetail.missingHeading', {}, { defaultValue: 'Expense record unavailable' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {error ??
              t(
                'expenseDetail.missingBody',
                {},
                {
                  defaultValue:
                    'The requested expense could not be loaded. It may have been removed, or you may not have access to it.',
                },
              )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/expenses" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('expenseDetail.back', {}, { defaultValue: 'Expenses' })}
      </Link>

      <header
        className={cm.cn(cm.card(), cm.sp('p', 6))}
        style={{ borderLeft: `4px solid ${expense.category_color}` }}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wide', 'text-on-surface-variant')}
        >
          {expense.category}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
          {expense.merchant}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'tabular-nums text-error',
          )}
        >
          -{fmtUsd(expense.amount_cents)}
        </p>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {fmtDate(expense.occurred_at)}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section
          className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6), 'space-y-3')}
        >
          <h2 className={cm.sectionHeading}>
            {t('expenseDetail.detailsHeading', {}, { defaultValue: 'Transaction details' })}
          </h2>
          <Row
            label={t('form.amount', {}, { defaultValue: 'Amount' })}
            value={fmtUsd(expense.amount_cents)}
          />
          <Row
            label={t('form.tax', {}, { defaultValue: 'Tax' })}
            value={fmtUsd(expense.tax_cents)}
          />
          <Row
            label={t('expenseDetail.deductible', {}, { defaultValue: 'Deductible' })}
            value={
              expense.is_deductible
                ? t('common.yes', {}, { defaultValue: 'Yes' })
                : t('common.no', {}, { defaultValue: 'No' })
            }
          />
          <Row
            label={t('expenseDetail.reconciled', {}, { defaultValue: 'Reconciled' })}
            value={
              expense.reconciled
                ? t(
                    'expenseDetail.matched',
                    { description: expense.reconciled_match_description ?? '' },
                    { defaultValue: 'Matched · {{description}}' },
                  )
                : t('expenseDetail.unreconciled', {}, { defaultValue: 'Unreconciled' })
            }
          />
          {expense.notes ? (
            <Row label={t('form.notes', {}, { defaultValue: 'Notes' })} value={expense.notes} />
          ) : null}
        </section>

        <section
          className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6), 'space-y-3')}
        >
          <h2 className={cm.sectionHeading}>
            {t('expenseDetail.receiptHeading', {}, { defaultValue: 'Receipt' })}
          </h2>
          {expense.receipt_url ? (
            <img
              src={expense.receipt_url}
              alt={t('expenseDetail.receiptAlt', {}, { defaultValue: 'Receipt' })}
              className={cm.cn('w-full max-h-96 object-contain bg-surface-container rounded-md')}
            />
          ) : (
            <div
              className={cm.cn(
                cm.sp('py', 16),
                cm.textCenter,
                'text-on-surface-variant',
                'bg-surface-container rounded-md',
              )}
            >
              <span className="material-symbols-outlined text-4xl block" aria-hidden="true">
                receipt_long
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>
                {t('expenseDetail.noReceipt', {}, { defaultValue: 'No receipt attached' })}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('expenseDetail.auditHeading', {}, { defaultValue: 'Audit trail' })}
        </h2>
        <ol className={cm.cn('space-y-2 text-sm')}>
          {expense.audit_log.map((ev) => (
            <li key={ev.id} className={cm.flex({ align: 'baseline', gap: 'sm' })}>
              <span className={cm.cn('text-on-surface-variant', 'tabular-nums whitespace-nowrap')}>
                {fmtDateTime(ev.occurred_at)}
              </span>
              <span className={cm.fontWeight('medium')}>{ev.actor}</span>
              <span className={'text-on-surface-variant'}>{ev.action}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
      <dt className={'text-on-surface-variant'}>{label}</dt>
      <dd className={cm.cn('tabular-nums', cm.fontWeight('medium'))}>{value}</dd>
    </div>
  )
}
