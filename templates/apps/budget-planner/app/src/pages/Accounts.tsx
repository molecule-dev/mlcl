import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Account {
  id: string
  kind: 'checking' | 'savings' | 'credit' | 'cash' | 'loan' | 'investment'
  name: string
  institution: string
  mask: string
  balance_cents: number
  on_budget: boolean
  closed: boolean
}

const KINDS: Account['kind'][] = ['checking', 'savings', 'credit', 'cash', 'loan', 'investment']

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

const KIND_DEFAULT_LABEL: Record<Account['kind'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
  loan: 'Loan',
  investment: 'Investment',
}

export function Accounts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function reload() {
    setLoading(true)
    setError(null)
    http
      .get('/api/accounts')
      .then((res) => setAccounts(unwrapList<Account>(res)))
      .catch(() =>
        setError(t('accounts.loadError', {}, { defaultValue: 'Failed to load accounts.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/accounts')
      .then((res) => {
        if (!cancelled) setAccounts(unwrapList<Account>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('accounts.loadError', {}, { defaultValue: 'Failed to load accounts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const onBudget = accounts.filter((a) => a.on_budget && !a.closed)
  const tracking = accounts.filter((a) => !a.on_budget && !a.closed)
  const onBudgetTotal = onBudget.reduce((acc, a) => acc + a.balance_cents, 0)
  const trackingTotal = tracking.reduce((acc, a) => acc + a.balance_cents, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('accounts.heading', {}, { defaultValue: 'Accounts' })}
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          type="button"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('accounts.addCta', {}, { defaultValue: 'Add account' })}
        </button>
      </header>

      {showForm ? (
        <AddAccountForm
          onCreated={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : accounts.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('accounts.empty', {}, { defaultValue: 'No accounts yet.' })}
        </p>
      ) : (
        <>
          <Group
            title={t('accounts.onBudgetHeading', {}, { defaultValue: 'On budget' })}
            total={fmt(onBudgetTotal)}
            accounts={onBudget}
          />
          {tracking.length > 0 ? (
            <Group
              title={t('accounts.trackingHeading', {}, { defaultValue: 'Tracking' })}
              total={fmt(trackingTotal)}
              accounts={tracking}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function AddAccountForm({ onCreated }: { onCreated: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Account['kind']>('checking')
  const [institution, setInstitution] = useState('')
  const [mask, setMask] = useState('')
  const [balance, setBalance] = useState('')
  const [onBudget, setOnBudget] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    void http
      .post<{ id?: string }>('/api/accounts', {
        name: name.trim(),
        type: kind,
        institution: institution || undefined,
        mask: mask || undefined,
        balance_cents: Math.round((Number(balance) || 0) * 100),
        on_budget: onBudget,
      })
      .then((created) => {
        track({
          name: 'account.created',
          properties: {
            accountId: created?.data?.id,
            kind,
          },
        })
        onCreated()
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          msg || t('accounts.error.create', {}, { defaultValue: 'Could not create account.' }),
        )
        setSubmitting(false)
      })
  }

  return (
    <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('accounts.form.heading', {}, { defaultValue: 'New account' })}
      </h2>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </label>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.type', {}, { defaultValue: 'Type' })}
        </span>
        <select
          name="type"
          value={kind}
          onChange={(e) => setKind(e.target.value as Account['kind'])}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`accounts.kind.${k}`, {}, { defaultValue: KIND_DEFAULT_LABEL[k] })}
            </option>
          ))}
        </select>
      </label>
      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('accounts.form.institution', {}, { defaultValue: 'Institution' })}
          </span>
          <input
            name="institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('accounts.form.mask', {}, { defaultValue: 'Last four' })}
          </span>
          <input
            name="mask"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            maxLength={4}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>
      </div>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('accounts.form.balance', {}, { defaultValue: 'Opening balance' })}
        </span>
        <input
          name="balance"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
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
          name="on_budget"
          checked={onBudget}
          onChange={(e) => setOnBudget(e.target.checked)}
        />
        <span className={cm.textSize('sm')}>
          {t('accounts.form.onBudget', {}, { defaultValue: 'Include in budget' })}
        </span>
      </label>
      {error ? (
        <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
      <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
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
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </div>
    </form>
  )
}

function Group({ title, total, accounts }: { title: string; total: string; accounts: Account[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.card(), 'overflow-hidden')}>
      <header
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 3),
          cm.flex({ align: 'center', justify: 'between' }),
          'bg-surface-container border-b border-outline-variant',
        )}
      >
        <h2
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'uppercase tracking-wide')}
        >
          {title}
        </h2>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'tabular-nums')}>
          {total}
        </span>
      </header>
      <ul className="divide-y divide-outline-variant">
        {accounts.map((a) => (
          <li key={a.id}>
            <Link
              to={`/accounts/${a.id}`}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 4),
                cm.flex({ align: 'center', justify: 'between' }),
                'hover:bg-surface-container',
              )}
            >
              <div className={cm.cn('min-w-0')}>
                <p className={cm.fontWeight('semibold')}>{a.name}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {[
                    t(`accounts.kind.${a.kind}`, {}, { defaultValue: KIND_DEFAULT_LABEL[a.kind] }),
                    a.institution,
                    a.mask ? `••${a.mask}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'tabular-nums',
                  a.balance_cents < 0 ? 'text-error' : '',
                )}
              >
                {fmt(a.balance_cents)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
