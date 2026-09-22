import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const CATEGORIES = [
  { value: 'meals', label: 'Meals', icon: 'restaurant' },
  { value: 'travel', label: 'Travel', icon: 'flight' },
  { value: 'lodging', label: 'Lodging', icon: 'hotel' },
  { value: 'transport', label: 'Transport', icon: 'directions_car' },
  { value: 'supplies', label: 'Supplies', icon: 'inventory_2' },
  { value: 'software', label: 'Software', icon: 'memory' },
  { value: 'entertainment', label: 'Client meals', icon: 'theater_comedy' },
  { value: 'other', label: 'Other', icon: 'receipt_long' },
] as const

function readFileAsBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const idx = result.indexOf('base64,')
      const base64 = idx >= 0 ? result.slice(idx + 'base64,'.length) : ''
      resolve({ base64, mime: file.type || 'image/jpeg' })
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export function NewExpense() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>('meals')
  const [description, setDescription] = useState('')
  const [receiptName, setReceiptName] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let receipt_url: string | undefined
      if (receiptFile) {
        try {
          const { base64, mime } = await readFileAsBase64(receiptFile)
          const upload = await http.post<{ url?: string; location?: string }>('/api/receipts', {
            image_base64: base64,
            mime_type: mime,
            filename: receiptFile.name,
          })
          receipt_url = upload?.data?.url ?? upload?.data?.location ?? undefined
        } catch (err) {
          // Receipt-upload failures should NOT block the expense save —
          // the user can re-upload from the detail page later. Surface
          // the failure so they know.
          console.warn('Receipt upload failed', err)
          setError(
            t(
              'newExpense.receiptUploadFailed',
              {},
              {
                defaultValue: 'Receipt upload failed; expense was not saved. Please try again.',
              },
            ),
          )
          setSubmitting(false)
          return
        }
      }
      const saved = await http.post<{ id?: string }>('/api/expenses', {
        merchant,
        amount: Number(amount),
        date,
        category,
        description,
        receipt_url,
      })
      // Domain analytics: the funnel's entry point — an expense actually filed.
      void track({
        name: 'expense.filed',
        properties: {
          expense_id: saved?.data?.id,
          category,
          amount_cents: Math.round(Number(amount) * 100),
          has_receipt: Boolean(receipt_url),
        },
      })
      navigate('/expenses')
    } catch (err) {
      console.warn('Expense save failed', err)
      setError(
        t(
          'newExpense.saveFailed',
          {},
          {
            defaultValue: 'Could not save expense. Please check your inputs and try again.',
          },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-mol-id="page-new-expense" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('newExpense.eyebrow', {}, { defaultValue: 'Reimbursable item' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('newExpense.title', {}, { defaultValue: 'Add expense' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            cm.fontWeight('medium'),
            'text-on-surface-variant max-w-2xl',
          )}
        >
          {t(
            'newExpense.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Snap or upload a receipt and {{appName}} will pre-fill the merchant, date, and total. Confirm everything below before saving.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          data-mol-id="new-expense-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        data-mol-id="form-new-expense"
        className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}
      >
        <section className={cm.cn('lg:col-span-2 space-y-6')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label
                htmlFor="merchant"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newExpense.merchant', {}, { defaultValue: 'Merchant' })}
              </label>
              <input
                id="merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                placeholder={t(
                  'newExpense.merchantPlaceholder',
                  {},
                  { defaultValue: 'Hotel Adlon Kempinski' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
              />
            </div>

            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="amount"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('newExpense.amount', {}, { defaultValue: 'Amount (USD)' })}
                </label>
                <div className={cm.cn('relative')}>
                  <span
                    className={cm.cn(
                      'absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant pointer-events-none',
                    )}
                  >
                    $
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 8),
                      cm.sp('pr', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none tabular-nums',
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="date"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none tabular-nums',
                  )}
                />
              </div>
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.category', {}, { defaultValue: 'Category' })}
              </span>
              <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.value
                  return (
                    <li key={cat.value}>
                      <button
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          'py-2.5',
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full uppercase tracking-widest transition-colors',
                          active
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          {cat.icon}
                        </span>
                        {t(`newExpense.category.${cat.value}`, {}, { defaultValue: cat.label })}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label
                htmlFor="description"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newExpense.description', {}, { defaultValue: 'Notes' })}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t(
                  'newExpense.descriptionPlaceholder',
                  {},
                  {
                    defaultValue:
                      'Why this expense was business-related (visible to your approver).',
                  },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none',
                )}
              />
            </div>
          </div>
        </section>

        <aside className={cm.cn('space-y-4')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newExpense.receipt', {}, { defaultValue: 'Receipt' })}
          </h2>
          <label
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary-container/40 transition-colors cursor-pointer',
            )}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              data-mol-id="input-receipt"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setReceiptFile(f)
                setReceiptName(f?.name ?? null)
              }}
            />
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
              aria-hidden="true"
            >
              upload_file
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {receiptName ??
                t(
                  'newExpense.receiptPrompt',
                  {},
                  { defaultValue: 'Drop a photo or PDF here, or click to browse' },
                )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('newExpense.receiptHint', {}, { defaultValue: 'JPG, PNG, or PDF · 10 MB max' })}
            </p>
            <span
              className={cm.cn(
                'text-[11px] font-mono uppercase tracking-widest text-on-surface-variant rounded bg-surface px-2 py-0.5 mt-1',
              )}
            >
              {t('newExpense.receiptOcrHint', {}, { defaultValue: 'OCR pre-fills fields' })}
            </span>
          </label>

          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'rounded-xl bg-primary-container/50 text-on-primary-container',
            )}
          >
            {t(
              'newExpense.policyHint',
              {},
              {
                defaultValue:
                  'Reminder: meals over $80/day or any item over $250 require a justification note.',
              },
            )}
          </div>
        </aside>

        <div
          className={cm.cn(
            'lg:col-span-3',
            cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' }),
          )}
        >
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            data-mol-id="btn-submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full text-white shadow-md shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center gap-2',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              save
            </span>
            {submitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('newExpense.save', {}, { defaultValue: 'Save expense' })}
          </button>
        </div>
      </form>
    </div>
  )
}
