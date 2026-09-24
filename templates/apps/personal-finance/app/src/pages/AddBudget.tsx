import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FinanceShell from '../components/FinanceShell.js'

interface Category {
  id: string
  name: string
}

function AddBudget() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const now = new Date()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('0')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/categories')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? (res as Category[])
          : Array.isArray((res as { data?: Category[] })?.data)
            ? (res as { data: Category[] }).data
            : []
        setCategories(list)
        if (list[0] && !categoryId) setCategoryId(list[0].id)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t(
            'addBudget.categoriesError',
            {},
            { defaultValue: 'Could not load categories. Create one in Categories first.' },
          ),
        )
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount; http/t/categoryId are stable refs that do not need re-triggering

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryId) {
      setError(
        t('addBudget.categoryRequired', {}, { defaultValue: 'Pick a category for this budget.' }),
      )
      return
    }
    const amountNum = Number(amount)
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError(
        t('addBudget.amountInvalid', {}, { defaultValue: 'Enter an amount greater than 0.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/budgets', {
        category_id: categoryId,
        amount: amountNum,
        month: Number(month),
        year: Number(year),
      })
      void track({
        name: 'budget.created',
        properties: { category_id: categoryId, amount: amountNum, month: Number(month), year },
      })
      navigate('/budgets')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('addBudget.createError', {}, { defaultValue: 'Failed to create budget.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-mol-id="add-budget"
      className={cm.cn(
        'bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <FinanceShell>
        <div className={cm.cn('bg-surface-container')}>
          <header className={cm.cn(cm.sp('px', 12), cm.sp('py', 8))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('3xl'),
                'font-headline text-on-surface',
              )}
            >
              {t('addBudget.title', {}, { defaultValue: 'New monthly budget' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'addBudget.subtitle',
                {},
                { defaultValue: 'Set a spending cap for a category for a given month.' },
              )}
            </p>
          </header>
          <section
            className={cm.cn(cm.sp('px', 12), cm.sp('pb', 12), cm.flex({ justify: 'center' }))}
          >
            <form
              onSubmit={handleSubmit}
              data-mol-id="add-budget-form"
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
                  <div className={cm.alertDescription} data-mol-id="add-budget-error">
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
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </span>
                <select
                  data-mol-id="add-budget-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categories.length === 0}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                >
                  {categories.length === 0 ? (
                    <option value="">
                      {t(
                        'addBudget.noCategoriesPlaceholder',
                        {},
                        { defaultValue: 'No categories — create one in Categories first' },
                      )}
                    </option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addBudget.amountLabel', {}, { defaultValue: 'Monthly amount' })}
                </span>
                <input
                  data-mol-id="add-budget-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  required
                />
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
                    {t('addBudget.monthLabel', {}, { defaultValue: 'Month' })}
                  </span>
                  <select
                    data-mol-id="add-budget-month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i, 1).toLocaleString(undefined, { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest',
                    )}
                  >
                    {t('addBudget.yearLabel', {}, { defaultValue: 'Year' })}
                  </span>
                  <input
                    data-mol-id="add-budget-year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  />
                </label>
              </div>

              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('pt', 4))}
              >
                <button
                  type="button"
                  data-mol-id="add-budget-cancel"
                  className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), cm.fontWeight('semibold'))}
                  onClick={() => navigate('/budgets')}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-mol-id="add-budget-submit"
                  disabled={submitting || categories.length === 0}
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
                    : t('addBudget.submit', {}, { defaultValue: 'Create budget' })}
                </button>
              </div>
            </form>
          </section>
        </div>
      </FinanceShell>
    </div>
  )
}

export default AddBudget
export { AddBudget, AddBudget as AddBudgetPage }
