import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface AccountOption {
  id: string
  name: string
}
interface CategoryOption {
  id: string
  name: string
  group: string
}

export function AddTransaction() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState('')
  const [payee, setPayee] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<'inflow' | 'outflow'>('outflow')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([http.get('/api/accounts'), http.get('/api/categories')]).then(([a, c]) => {
      if (cancelled) return
      const accs = unwrapList<AccountOption>(a)
      const cats = unwrapList<CategoryOption>(c)
      setAccounts(accs)
      setCategories(cats)
      if (accs.length > 0 && !accountId) setAccountId(accs[0].id)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accountId intentionally omitted: setting it as a dep would re-run the loader on every account selection
  }, [http])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!accountId) {
      setError(t('addTransaction.error.account', {}, { defaultValue: 'Pick an account first.' }))
      return
    }
    const cents = Math.round(Number(amount) * 100)
    if (!Number.isFinite(cents) || cents === 0) {
      setError(t('addTransaction.error.amount', {}, { defaultValue: 'Enter a non-zero amount.' }))
      return
    }
    setSubmitting(true)
    void http
      .post<{ id?: string }>('/api/transactions', {
        account_id: accountId,
        category_id: categoryId || null,
        payee: payee || null,
        amount_cents: Math.abs(cents),
        type,
        date,
        memo: memo || null,
      })
      .then((created) => {
        track({
          name: 'expense.logged',
          properties: {
            transactionId: created?.data?.id,
            type,
            accountId,
            amountCents: Math.abs(cents),
          },
        })
        navigate('/transactions')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
        setSubmitting(false)
      })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <Link
        to="/transactions"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        ← {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('addTransaction.heading', {}, { defaultValue: 'Add transaction' })}
      </h1>

      <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <Field
          label={t('form.date', {}, { defaultValue: 'Date' })}
          name="date"
          type="date"
          value={date}
          onChange={setDate}
        />

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </span>
          <select
            name="account_id"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            <option value="">
              {accounts.length === 0
                ? t(
                    'addTransaction.account.empty',
                    {},
                    { defaultValue: 'No accounts yet — add one first.' },
                  )
                : t('addTransaction.account.placeholder', {}, { defaultValue: 'Select account' })}
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <Field
          label={t('addTransaction.payee', {}, { defaultValue: 'Payee' })}
          name="payee"
          value={payee}
          onChange={setPayee}
          placeholder={t('addTransaction.payeePlaceholder', {}, { defaultValue: 'Whole Foods' })}
        />

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </span>
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            <option value="">
              {t('addTransaction.category.uncategorized', {}, { defaultValue: 'Uncategorized' })}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.group} · {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('form.type', {}, { defaultValue: 'Type' })}
          </span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'inflow' | 'outflow')}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            <option value="outflow">
              {t('addTransaction.type.outflow', {}, { defaultValue: 'Outflow' })}
            </option>
            <option value="inflow">
              {t('addTransaction.type.inflow', {}, { defaultValue: 'Inflow' })}
            </option>
          </select>
        </label>

        <Field
          label={t('form.amount', {}, { defaultValue: 'Amount' })}
          name="amount"
          type="number"
          value={amount}
          onChange={setAmount}
          placeholder="42.18"
        />
        <Field
          label={t('addTransaction.memo', {}, { defaultValue: 'Memo (optional)' })}
          name="memo"
          value={memo}
          onChange={setMemo}
        />

        {error ? (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }), cm.sp('pt', 2))}>
          <Link
            to="/transactions"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('addTransaction.saveCta', {}, { defaultValue: 'Save transaction' })}
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}

function Field({ label, name, value, onChange, type = 'text', placeholder }: FieldProps) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
