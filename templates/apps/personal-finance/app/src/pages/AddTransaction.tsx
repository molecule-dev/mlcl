// Phase 1 baseline — verbatim JSX of design-personal-finance-add-transaction.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AddTransactionAmountSection from '../components/AddTransactionAmountSection.js'
import AddTransactionFab from '../components/AddTransactionFab.js'
import AddTransactionFormActions from '../components/AddTransactionFormActions.js'
import AddTransactionHeader from '../components/AddTransactionHeader.js'
import AddTransactionInfoPanels from '../components/AddTransactionInfoPanels.js'
import RecurringTransactionPanel from '../components/RecurringTransactionPanel.js'
import SideNavBar from '../components/SideNavBar.js'

interface Category {
  id: string
  name: string
}
interface Account {
  id: string
  name: string
}

const INITIAL_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: 0,
  category_id: '',
  account_id: '',
  type: 'expense',
  notes: '',
  tags: [] as string[],
  recurring_enabled: false,
  recurring_frequency: 'Monthly',
}

function AddTransaction() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    Promise.all([
      http
        .get('/api/categories')
        .then((r) => setCategories(Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [])),
      http
        .get('/api/accounts')
        .then((r) => setAccounts(Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [])),
    ])
      // Category/account options are progressive enhancement — on fetch
      // failure the selects simply stay empty and the form still submits.
      .catch(() => {})
  }, [http])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formData.description.trim() || formData.amount <= 0) {
      setError(
        t(
          'addTransaction.validationError',
          {},
          { defaultValue: 'Enter a description and an amount greater than $0.' },
        ),
      )
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      // Map the UI toggle to the API's `recurring` flag; `tags` already matches the API field.
      // (recurring_frequency has no column yet, so it's intentionally not sent.)
      await http.post('/api/transactions', { ...formData, recurring: formData.recurring_enabled })
      void track({
        name: 'transaction.created',
        properties: { type: formData.type, account_id: formData.account_id },
      })
      navigate('/transactions')
    } catch (_error) {
      // Failure is surfaced to the user via the error banner below.
      setError(
        t('addTransaction.createError', {}, { defaultValue: 'Failed to create transaction.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'md:ml-64 bg-surface-container')}>
        <AddTransactionHeader />
        <section
          className={cm.cn(cm.sp('px', 12), cm.sp('py', 12), cm.flex({ justify: 'center' }))}
        >
          <div
            className={cm.cn(
              cm.w('full'),
              'max-w-4xl',
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)]',
            )}
          >
            <form className={cm.stack(10)} onSubmit={handleSubmit}>
              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.sp('p', 3),
                    cm.sp('mb', 4),
                    'text-error bg-error-light rounded-lg',
                  )}
                >
                  {error}
                </div>
              )}
              <AddTransactionAmountSection
                type={formData.type}
                onTypeChange={(type) => setFormData((f) => ({ ...f, type }))}
                amount={formData.amount}
                onAmountChange={(amount) => setFormData((f) => ({ ...f, amount }))}
              />
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'none' }), 'gap-x-12 gap-y-8')}>
                <div className={cm.cn(cm.stack(2), 'relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('addTransaction.payeeLabel', {}, { defaultValue: 'Payee / Description' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <input
                      data-mol-id="add-transaction-description"
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                      )}
                      placeholder={t(
                        'addTransaction.payeePlaceholder',
                        {},
                        { defaultValue: 'Who did you pay?' },
                      )}
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2), 'relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('form.category', {}, { defaultValue: 'Category' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center', justify: 'between' }),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>
                        restaurant
                      </span>
                      <select
                        data-mol-id="add-transaction-category"
                        className={cm.cn(
                          cm.sp('p', 0),
                          cm.fontWeight('medium'),
                          cm.cursorPointer,
                          'bg-transparent border-none focus:ring-0 text-on-surface pr-8',
                        )}
                        value={formData.category_id}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, category_id: e.target.value }))
                        }
                      >
                        <option value="">
                          {t(
                            'addTransaction.categoryPlaceholder',
                            {},
                            { defaultValue: 'Select category' },
                          )}
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2), 'relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('settings.account', {}, { defaultValue: 'Account' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center', justify: 'between' }),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={cm.cn('material-symbols-outlined text-secondary')}>
                        credit_card
                      </span>
                      <select
                        data-mol-id="add-transaction-account"
                        className={cm.cn(
                          cm.sp('p', 0),
                          cm.fontWeight('medium'),
                          cm.cursorPointer,
                          'bg-transparent border-none focus:ring-0 text-on-surface pr-8',
                        )}
                        value={formData.account_id}
                        onChange={(e) => setFormData((f) => ({ ...f, account_id: e.target.value }))}
                      >
                        <option value="">
                          {t(
                            'addTransaction.accountPlaceholder',
                            {},
                            { defaultValue: 'Select account' },
                          )}
                        </option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2), 'relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('addTransaction.dateLabel', {}, { defaultValue: 'Transaction Date' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center' }),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <span
                      className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
                    >
                      calendar_today
                    </span>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface',
                      )}
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2), 'col-span-2 relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('form.tags', {}, { defaultValue: 'Tags' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 2))}>
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.textPrimary,
                            'bg-success-light',
                          )}
                        >
                          #{tag}
                          <button
                            type="button"
                            aria-label={t(
                              'addTransaction.removeTag',
                              { tag },
                              { defaultValue: 'Remove tag {{tag}}' },
                            )}
                            className={cm.cn(
                              cm.cursorPointer,
                              'material-symbols-outlined text-[14px]',
                            )}
                            onClick={() =>
                              setFormData((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
                            }
                          >
                            close
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                      )}
                      placeholder={t(
                        'addTransaction.tagsPlaceholder',
                        {},
                        { defaultValue: 'Add tags separated by comma...' },
                      )}
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          const trimmed = tagInput.replace(/,/g, '').trim()
                          if (trimmed && !formData.tags.includes(trimmed))
                            setFormData((f) => ({ ...f, tags: [...f.tags, trimmed] }))
                          setTagInput('')
                        }
                      }}
                    />
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2), 'col-span-2 relative input-active-bar')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 1),
                      'text-[10px] tracking-widest uppercase text-outline',
                    )}
                  >
                    {t('addTransaction.notesLabel', {}, { defaultValue: 'Notes (Optional)' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-surface-container-low rounded-t-lg transition-colors focus-within:bg-surface-container-high',
                    )}
                  >
                    <textarea
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant resize-none',
                      )}
                      placeholder={t(
                        'addTransaction.notesPlaceholder',
                        {},
                        { defaultValue: 'Add additional details about this transaction...' },
                      )}
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    ></textarea>
                  </div>
                </div>
              </div>
              <RecurringTransactionPanel
                enabled={formData.recurring_enabled}
                frequency={formData.recurring_frequency}
                onChange={({ enabled, frequency }) =>
                  setFormData((f) => ({
                    ...f,
                    recurring_enabled: enabled,
                    recurring_frequency: frequency,
                  }))
                }
              />
              <AddTransactionFormActions
                submitting={submitting}
                onCancel={() => navigate('/transactions')}
              />
            </form>
          </div>
        </section>
        <AddTransactionInfoPanels />
      </main>
      <AddTransactionFab />
    </div>
  )
}

export default AddTransaction
export { AddTransaction, AddTransaction as AddTransactionPage }
