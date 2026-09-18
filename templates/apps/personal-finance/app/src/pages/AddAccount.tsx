import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'

const ACCOUNT_TYPES: { value: string; labelKey: string; defaultLabel: string }[] = [
  { value: 'checking', labelKey: 'addAccount.types.checking', defaultLabel: 'Checking' },
  { value: 'savings', labelKey: 'addAccount.types.savings', defaultLabel: 'Savings' },
  { value: 'credit', labelKey: 'addAccount.types.credit', defaultLabel: 'Credit' },
  { value: 'investment', labelKey: 'addAccount.types.investment', defaultLabel: 'Investment' },
  { value: 'cash', labelKey: 'addAccount.types.cash', defaultLabel: 'Cash' },
  { value: 'other', labelKey: 'addAccount.types.other', defaultLabel: 'Other' },
]

function AddAccount() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<
    'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other'
  >('checking')
  const [institution, setInstitution] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [initialBalance, setInitialBalance] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('addAccount.nameRequired', {}, { defaultValue: 'Account name is required.' }))
      return
    }
    const balance = Number(initialBalance)
    if (Number.isNaN(balance)) {
      setError(
        t('addAccount.balanceInvalid', {}, { defaultValue: 'Initial balance must be a number.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/accounts', {
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        account_number: accountNumber.trim() || undefined,
        currency: currency.trim() || 'USD',
        initial_balance: balance,
      })
      navigate('/accounts')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('addAccount.createError', {}, { defaultValue: 'Failed to create account.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-mol-id="add-account"
      className={cm.cn(
        'bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'md:ml-64 bg-surface-container')}>
        <header className={cm.cn(cm.sp('px', 12), cm.sp('py', 8))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('3xl'),
              'font-headline text-on-surface',
            )}
          >
            {t('addAccount.title', {}, { defaultValue: 'Add a new account' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'addAccount.subtitle',
              {},
              { defaultValue: 'Track balances across checking, savings, cards and investments.' },
            )}
          </p>
        </header>
        <section
          className={cm.cn(cm.sp('px', 12), cm.sp('pb', 12), cm.flex({ justify: 'center' }))}
        >
          <form
            onSubmit={handleSubmit}
            data-mol-id="add-account-form"
            className={cm.cn(
              cm.w('full'),
              'max-w-2xl',
              cm.sp('p', 10),
              cm.stack(6),
              'bg-surface-container-lowest rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)]',
            )}
          >
            {error && (
              <div role="alert" className={cm.alert({ variant: 'error' })}>
                <div className={cm.alertDescription} data-mol-id="add-account-error">
                  {error}
                </div>
              </div>
            )}

            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                )}
              >
                {t('addAccount.nameLabel', {}, { defaultValue: 'Account name' })}
              </span>
              <input
                data-mol-id="add-account-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.w('full'),
                  'bg-surface-container-low rounded-lg text-on-surface',
                )}
                placeholder={t(
                  'addAccount.namePlaceholder',
                  {},
                  { defaultValue: 'Everyday Checking' },
                )}
                required
              />
            </label>

            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                )}
              >
                {t('addAccount.typeLabel', {}, { defaultValue: 'Account type' })}
              </span>
              <select
                data-mol-id="add-account-type"
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as
                      'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other',
                  )
                }
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.w('full'),
                  'bg-surface-container-low rounded-lg',
                )}
              >
                {ACCOUNT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey, {}, { defaultValue: opt.defaultLabel })}
                  </option>
                ))}
              </select>
            </label>

            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addAccount.institutionLabel', {}, { defaultValue: 'Institution (optional)' })}
                </span>
                <input
                  data-mol-id="add-account-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  placeholder="Bank of Anywhere"
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t(
                    'addAccount.accountNumberLabel',
                    {},
                    { defaultValue: 'Account number (optional)' },
                  )}
                </span>
                <input
                  data-mol-id="add-account-number"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  placeholder="****1234"
                />
              </label>
            </div>

            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addAccount.currencyLabel', {}, { defaultValue: 'Currency' })}
                </span>
                <input
                  data-mol-id="add-account-currency"
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={4}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg uppercase')}
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addAccount.initialBalanceLabel', {}, { defaultValue: 'Initial balance' })}
                </span>
                <input
                  data-mol-id="add-account-balance"
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                />
              </label>
            </div>

            <div
              className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('pt', 4))}
            >
              <button
                type="button"
                data-mol-id="add-account-cancel"
                className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), cm.fontWeight('semibold'))}
                onClick={() => navigate('/accounts')}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="add-account-submit"
                disabled={submitting}
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.cursorPointer,
                  'bg-primary text-on-primary rounded-xl disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default AddAccount
export { AddAccount, AddAccount as AddAccountPage }
