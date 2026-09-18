import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const CATEGORIES = [
  'Office supplies',
  'Software',
  'Travel',
  'Meals',
  'Marketing',
  'Utilities',
  'Rent',
  'Other',
] as const

export function NewExpense() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Office supplies')
  const [amount, setAmount] = useState('')
  const [tax, setTax] = useState('')
  const [deductible, setDeductible] = useState(true)
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [submitError, setSubmitError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires.
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      const occurredAt = date ? new Date(date) : new Date()
      const amountCents = Math.round((Number(amount) || 0) * 100)
      const taxCents = Math.round((Number(tax) || 0) * 100)
      await http.post('/api/expenses', {
        merchant,
        category,
        occurred_at: occurredAt.toISOString(),
        amount_cents: amountCents,
        tax_cents: taxCents,
        is_deductible: deductible,
        notes,
        has_receipt: !!receipt,
      })
      navigate('/expenses')
    } catch (error) {
      setSubmitError(t('newExpense.failed', {}, { defaultValue: 'Could not save expense.' }))
      logError('newExpense.submit', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <Link to="/expenses" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('newExpense.back', {}, { defaultValue: 'Expenses' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('newExpense.heading', {}, { defaultValue: 'Log expense' })}
      </h1>

      <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <section
          className={cm.cn('p-8 border-2 border-dashed border-outline rounded-md text-center')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) setReceipt(f)
          }}
        >
          <span
            className="material-symbols-outlined text-3xl text-primary block"
            aria-hidden="true"
          >
            receipt_long
          </span>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mt', 2))}>
            {receipt
              ? receipt.name
              : t(
                  'newExpense.dropPrompt',
                  {},
                  { defaultValue: 'Drop a receipt photo or PDF here to attach.' },
                )}
          </p>
          {receipt ? (
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('sm'),
                cm.textPrimary,
                'hover:underline',
              )}
            >
              {t('newExpense.clearReceiptCta', {}, { defaultValue: 'Clear attached receipt' })}
            </button>
          ) : null}
        </section>

        <Field
          label={t('form.date', {}, { defaultValue: 'Date' })}
          type="date"
          value={date}
          onChange={setDate}
        />
        <Field
          label={t('newExpense.merchant', {}, { defaultValue: 'Merchant' })}
          value={merchant}
          onChange={setMerchant}
        />
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <Field
            label={t('form.amount', {}, { defaultValue: 'Amount' })}
            type="number"
            value={amount}
            onChange={setAmount}
          />
          <Field
            label={t('newExpense.tax', {}, { defaultValue: 'Tax (optional)' })}
            type="number"
            value={tax}
            onChange={setTax}
          />
        </div>

        <label className={cm.flex({ align: 'center', gap: 'sm' })}>
          <input
            type="checkbox"
            checked={deductible}
            onChange={(e) => setDeductible(e.target.checked)}
            className={cm.cn('h-4 w-4')}
          />
          <span className={cm.textSize('sm')}>
            {t('newExpense.deductible', {}, { defaultValue: 'Tax deductible' })}
          </span>
        </label>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('newExpense.notes', {}, { defaultValue: 'Notes (optional)' })}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>

        {submitError ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{submitError}</p>
        ) : null}

        <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }), cm.sp('pt', 2))}>
          <Link
            to="/expenses"
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
              : t('newExpense.saveCta', {}, { defaultValue: 'Save expense' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
