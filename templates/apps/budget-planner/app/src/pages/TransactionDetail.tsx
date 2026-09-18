import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type TransactionRecord, TransactionRow } from '../components/TransactionRow.js'
import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Account {
  id: string
  name: string
}
interface Category {
  id: string
  name: string
}

function fmt(cents: number, opts?: { sign?: boolean }): string {
  return formatMoney(cents, getCurrency(), { signed: opts?.sign })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function isoForInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export function TransactionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [tx, setTx] = useState<TransactionRecord | null>(null)
  const [related, setRelated] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  // Editing state
  const [editing, setEditing] = useState(false)
  const [draftPayee, setDraftPayee] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [draftMemo, setDraftMemo] = useState('')
  const [draftCategory, setDraftCategory] = useState<string>('')
  const [draftCleared, setDraftCleared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/transactions/${id}`).catch(() => null),
      http.get('/api/categories').catch(() => null),
      http.get('/api/accounts').catch(() => null),
    ])
      .then(async ([txRes, catRes, accRes]) => {
        if (cancelled) return
        const found = unwrapSingle<TransactionRecord>(txRes)
        setTx(found)
        setCategories(unwrapList<Category>(catRes))
        setAccounts(unwrapList<Account>(accRes))
        if (found) {
          setDraftPayee(found.payee ?? '')
          setDraftAmount(((found.amount_cents ?? 0) / 100).toFixed(2))
          setDraftDate(isoForInput(found.posted_at))
          setDraftMemo(found.memo ?? '')
          setDraftCategory((found as { category_id?: string }).category_id ?? '')
          setDraftCleared(!!found.cleared)
          // Recent at this payee — we still need a list call for related
          const listRes = await http.get(`/api/transactions?limit=200`).catch(() => null)
          if (cancelled) return
          const list = unwrapList<TransactionRecord>(listRes)
          setRelated(
            list.filter((t) => t.id !== id && t.payee && t.payee === found.payee).slice(0, 4),
          )
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('transactionDetail.loadError', {}, { defaultValue: 'Failed to load transaction.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, reload])

  const accountName = useMemo(() => {
    if (!tx) return ''
    const acc = accounts.find((a) => a.id === (tx as { account_id?: string }).account_id)
    return acc?.name ?? tx.account_name ?? ''
  }, [accounts, tx])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !tx) return
    const dollars = Number(draftAmount)
    if (!Number.isFinite(dollars)) {
      setEditError(
        t('transactionDetail.invalidAmount', {}, { defaultValue: 'Enter a numeric amount.' }),
      )
      return
    }
    setSaving(true)
    setEditError(null)
    try {
      const nextType: 'inflow' | 'outflow' = dollars >= 0 ? 'inflow' : 'outflow'
      await http.put(`/api/transactions/${id}`, {
        payee: draftPayee,
        amount: Math.abs(dollars),
        type: nextType,
        date: draftDate ? new Date(draftDate).toISOString() : undefined,
        memo: draftMemo,
        category_id: draftCategory || null,
        cleared: draftCleared,
      })
      setEditing(false)
      setReload((n) => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setEditError(
        msg ||
          t('transactionDetail.saveError', {}, { defaultValue: 'Could not save transaction.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteTx() {
    if (!id) return
    if (
      !confirm(
        t(
          'transactionDetail.confirmDelete',
          {},
          { defaultValue: 'Delete this transaction? This cannot be undone.' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/transactions/${id}`)
      navigate('/transactions')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('transactionDetail.deleteError', {}, { defaultValue: 'Could not delete.' }))
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-on-surface-variant')}>
        {t('transactionDetail.loading', {}, { defaultValue: 'Loading transaction…' })}
      </div>
    )
  }
  if (error || !tx) {
    return (
      <div className={cm.cn(cm.sp('p', 10), 'space-y-4 text-center')}>
        <p className="text-on-surface-variant">
          {error ?? t('transactionDetail.notFound', {}, { defaultValue: 'Transaction not found.' })}
        </p>
        <Link
          to="/transactions"
          className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('transactionDetail.back', {}, { defaultValue: 'Back to transactions' })}
        </Link>
      </div>
    )
  }

  const isInflow = tx.amount_cents > 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8 max-w-4xl mx-auto')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/transactions"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
            arrow_back
          </span>
          {t('transactionDetail.back', {}, { defaultValue: 'Back to transactions' })}
        </Link>
        <div className={cm.flex({ gap: 'sm' })}>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'border border-outline rounded-md hover:bg-surface-container',
              )}
              data-testid="tx-edit"
            >
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void deleteTx()
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-error hover:bg-error/10 rounded-md',
            )}
            data-testid="tx-delete"
          >
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={save}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('transactionDetail.editHeading', {}, { defaultValue: 'Edit transaction' })}
          </h2>
          <div className={cm.grid({ cols: 2, gap: 'md' })}>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('transactionDetail.payee', {}, { defaultValue: 'Payee' })}
              </span>
              <input
                value={draftPayee}
                onChange={(e) => setDraftPayee(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('transactionDetail.amount', {}, { defaultValue: 'Amount (negative = outflow)' })}
              </span>
              <input
                type="number"
                step="0.01"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('form.date', {}, { defaultValue: 'Date' })}
              </span>
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('form.category', {}, { defaultValue: 'Category' })}
              </span>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              >
                <option value="">
                  — {t('transactionDetail.uncategorized', {}, { defaultValue: 'Uncategorized' })} —
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('transactionDetail.memo', {}, { defaultValue: 'Memo' })}
            </span>
            <input
              value={draftMemo}
              onChange={(e) => setDraftMemo(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </label>
          <label className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="checkbox"
              checked={draftCleared}
              onChange={(e) => setDraftCleared(e.target.checked)}
            />
            <span className={cm.textSize('sm')}>
              {t('transactionDetail.markCleared', {}, { defaultValue: 'Cleared' })}
            </span>
          </label>
          {editError ? (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {editError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'border border-outline rounded-md hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
              data-testid="tx-save"
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      ) : (
        <section
          className={cm.cn(
            cm.sp('p', 10),
            'bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
          )}
        >
          <div className={cm.cn('relative z-10 space-y-3')}>
            <p
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-[10px] uppercase tracking-widest text-white/70',
              )}
            >
              {tx.category} · {fmtDate(tx.posted_at)}
            </p>
            <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}>
              {tx.payee}
            </h1>
            <p
              className={cm.cn(
                'text-5xl md:text-6xl font-extrabold tracking-tighter tabular-nums text-white',
              )}
            >
              {fmt(tx.amount_cents, { sign: true })}
            </p>
            {tx.memo ? (
              <p className={cm.cn(cm.textSize('base'), 'text-white/85 italic max-w-2xl')}>
                "{tx.memo}"
              </p>
            ) : null}
          </div>
          <span
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-32 -bottom-32 bg-surface/10 blur-3xl pointer-events-none',
            )}
            aria-hidden="true"
          />
        </section>
      )}

      <section className={cm.grid({ cols: 2, gap: 'md' })}>
        <DetailField
          label={t('settings.account', {}, { defaultValue: 'Account' })}
          value={accountName}
          icon="account_balance"
        />
        <DetailField
          label={t('form.category', {}, { defaultValue: 'Category' })}
          value={tx.category}
          icon="category"
        />
        <DetailField
          label={t('nav.status', {}, { defaultValue: 'Status' })}
          value={
            tx.cleared === false
              ? t('status.pending', {}, { defaultValue: 'Pending' })
              : t('transactionDetail.clearedYes', {}, { defaultValue: 'Cleared' })
          }
          icon={tx.cleared === false ? 'pending' : 'check_circle'}
          tone={tx.cleared === false ? 'warning' : 'success'}
        />
        <DetailField
          label={t('transactionDetail.amountSign', {}, { defaultValue: 'Direction' })}
          value={
            isInflow
              ? t('transactionDetail.inflow', {}, { defaultValue: 'Inflow' })
              : t('transactionDetail.outflow', {}, { defaultValue: 'Outflow' })
          }
          icon={isInflow ? 'south_west' : 'north_east'}
          tone={isInflow ? 'success' : 'neutral'}
        />
      </section>

      {related.length > 0 ? (
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <header className={cm.sp('mb', 4)}>
            <p
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('transactionDetail.relatedEyebrow', {}, { defaultValue: 'Recent at this payee' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {t(
                'transactionDetail.relatedHeading',
                { payee: tx.payee },
                { defaultValue: 'More from {{payee}}' },
              )}
            </h2>
          </header>
          <ul className={cm.stack(1)}>
            {related.map((r) => (
              <TransactionRow key={r.id} tx={r} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function DetailField({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  icon: string
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const cm = getClassMap()
  const toneClasses =
    tone === 'success'
      ? 'bg-success/10 text-success'
      : tone === 'warning'
        ? 'bg-warning-light text-warning'
        : 'bg-primary/10 text-primary'
  return (
    <div className={cm.cn(cm.sp('p', 5), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            toneClasses,
          )}
          aria-hidden="true"
        >
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>{icon}</span>
        </span>
        <p
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </p>
      </div>
      <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 2))}>{value}</p>
    </div>
  )
}
