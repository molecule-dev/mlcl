import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate, formatMoney, getCurrency, getDateFormat } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Account {
  id: string
  kind: string
  name: string
  institution: string
  mask: string
  balance_cents: number
  on_budget: boolean
  closed?: boolean
}

interface Transaction {
  id: string
  posted_at: string
  payee: string
  category: string
  amount_cents: number
  cleared: boolean
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

function fmtDate(iso: string): string {
  return formatDate(iso, getDateFormat())
}

export function AccountDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<Account | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editMask, setEditMask] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [editOnBudget, setEditOnBudget] = useState(true)
  const [editClosed, setEditClosed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/accounts/${id}`).catch(() => null),
      http.get(`/api/transactions?account_id=${id}`).catch(() => null),
    ])
      .then(([aRes, tRes]) => {
        if (cancelled) return
        const acc = unwrapSingle<Account>(aRes)
        setAccount(acc)
        if (acc) {
          setEditName(acc.name)
          setEditInstitution(acc.institution ?? '')
          setEditMask(acc.mask ?? '')
          setEditBalance((acc.balance_cents / 100).toFixed(2))
          setEditOnBudget(acc.on_budget)
          setEditClosed(!!acc.closed)
        }
        setTxs(unwrapList<Transaction>(tRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('accountDetail.loadError', {}, { defaultValue: 'Failed to load account.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, reload])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setEditError(null)
    try {
      await http.put(`/api/accounts/${id}`, {
        name: editName,
        institution: editInstitution,
        mask: editMask,
        balance_cents: Math.round(Number(editBalance) * 100),
        on_budget: editOnBudget,
        closed: editClosed,
      })
      setEditing(false)
      setReload((n) => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setEditError(
        msg || t('accountDetail.saveError', {}, { defaultValue: 'Could not save account.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!id) return
    if (
      !confirm(
        t(
          'accountDetail.confirmDelete',
          {},
          { defaultValue: 'Delete this account and all its transactions? This cannot be undone.' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/accounts/${id}`)
      track({ name: 'account.deleted', properties: { accountId: id } })
      navigate('/accounts')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg || t('accountDetail.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !account) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('accountDetail.notFound', {}, { defaultValue: 'Account not found.' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/accounts" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('accountDetail.back', {}, { defaultValue: 'All accounts' })}
      </Link>

      {editing ? (
        <form onSubmit={save} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-3')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('accountDetail.editHeading', {}, { defaultValue: 'Edit account' })}
          </h2>
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </label>
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
                {t('accounts.form.institution', {}, { defaultValue: 'Institution' })}
              </span>
              <input
                value={editInstitution}
                onChange={(e) => setEditInstitution(e.target.value)}
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
                {t('accounts.form.mask', {}, { defaultValue: 'Last four' })}
              </span>
              <input
                value={editMask}
                onChange={(e) => setEditMask(e.target.value)}
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
              {t('accountDetail.openingBalance', {}, { defaultValue: 'Opening balance' })}
            </span>
            <input
              type="number"
              step="0.01"
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
            <span
              className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'block text-on-surface-variant')}
            >
              {t(
                'accountDetail.openingBalanceHint',
                {},
                {
                  defaultValue:
                    'Edits to opening balance recompute the running balance from your existing transactions.',
                },
              )}
            </span>
          </label>
          <label className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="checkbox"
              checked={editOnBudget}
              onChange={(e) => setEditOnBudget(e.target.checked)}
            />
            <span className={cm.textSize('sm')}>
              {t('accounts.form.onBudget', {}, { defaultValue: 'Include in budget' })}
            </span>
          </label>
          <label className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="checkbox"
              checked={editClosed}
              onChange={(e) => setEditClosed(e.target.checked)}
            />
            <span className={cm.textSize('sm')}>
              {t('accountDetail.closed', {}, { defaultValue: 'Closed (hide from active lists)' })}
            </span>
          </label>
          {editError ? (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {editError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'between' }))}>
            <button
              type="button"
              onClick={() => {
                void deleteAccount()
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-error hover:bg-error/10 rounded-md',
              )}
              data-testid="account-delete"
            >
              {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
            <div className={cm.flex({ gap: 'sm' })}>
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
                data-testid="account-save"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <header
          className={cm.cn(
            cm.card(),
            cm.sp('p', 6),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {account.name}
              {account.closed ? (
                <span
                  className={cm.cn(
                    cm.sp('ml', 2),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('extrabold'),
                    'rounded-full bg-on-surface-variant/15 text-on-surface-variant uppercase tracking-widest',
                  )}
                >
                  {t('accountDetail.closedBadge', {}, { defaultValue: 'Closed' })}
                </span>
              ) : null}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {[account.institution, account.mask ? `••${account.mask}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tabular-nums',
                account.balance_cents < 0 ? 'text-error' : '',
              )}
              data-testid="account-balance"
            >
              {fmt(account.balance_cents)}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'border border-outline rounded-md hover:bg-surface-container',
              )}
              data-testid="account-edit"
            >
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </button>
          </div>
        </header>
      )}

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container border-b border-outline-variant',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
            )}
          >
            {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
          </h2>
        </header>
        {txs.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('accountDetail.empty', {}, { defaultValue: 'No transactions yet.' })}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {txs.map((tx) => (
              <li key={tx.id}>
                <Link
                  to={`/transactions/${tx.id}`}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', justify: 'between' }),
                    'hover:bg-surface-container',
                  )}
                  data-testid={`tx-row-${tx.id}`}
                >
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.fontWeight('medium')}>{tx.payee}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {fmtDate(tx.posted_at)} · {tx.category} ·{' '}
                      {tx.cleared
                        ? t('accountDetail.cleared', {}, { defaultValue: 'cleared' })
                        : t('accountDetail.uncleared', {}, { defaultValue: 'uncleared' })}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'tabular-nums',
                      tx.amount_cents >= 0 ? 'text-success' : '',
                    )}
                  >
                    {fmt(tx.amount_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
