import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

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

type Category = (typeof CATEGORIES)[number]

/**
 * Merchant-name keyword heuristics behind "Smart suggestions" — a purely
 * local classification: the merchant string is matched against vendors that
 * clearly belong to a category.
 */
const MERCHANT_HINTS: { keywords: string[]; category: Category }[] = [
  {
    keywords: [
      'adobe',
      'figma',
      'slack',
      'zoom',
      'microsoft',
      'google workspace',
      'aws',
      'github',
      'dropbox',
      'canva',
      'notion',
      'atlassian',
    ],
    category: 'Software',
  },
  {
    keywords: [
      'uber',
      'lyft',
      'delta',
      'united',
      'airline',
      'hotel',
      'marriott',
      'hilton',
      'airbnb',
      'amtrak',
      'flight',
      'taxi',
    ],
    category: 'Travel',
  },
  {
    keywords: [
      'starbucks',
      'restaurant',
      'cafe',
      'coffee',
      'doordash',
      'grubhub',
      'ubereats',
      'bistro',
      'pizzeria',
    ],
    category: 'Meals',
  },
  {
    keywords: ['staples', 'office depot', 'officemax', 'paper', 'ink'],
    category: 'Office supplies',
  },
  {
    keywords: ['facebook ads', 'google ads', 'linkedin', 'mailchimp', 'hubspot', 'billboard'],
    category: 'Marketing',
  },
  {
    keywords: ['verizon', 'comcast', 'at&t', 'electric', 'water utility', 'internet'],
    category: 'Utilities',
  },
  {
    keywords: ['wework', 'landlord', 'lease', 'rent'],
    category: 'Rent',
  },
]

function suggestCategory(merchant: string): Category | null {
  const m = merchant.trim().toLowerCase()
  if (!m) return null
  for (const hint of MERCHANT_HINTS) {
    if (hint.keywords.some((k) => m.includes(k))) return hint.category
  }
  return null
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function NewExpense() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState<Category>('Office supplies')
  const [amount, setAmount] = useState('')
  const [tax, setTax] = useState('')
  const [deductible, setDeductible] = useState(true)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [submitError, setSubmitError] = useState<string | null>(null)

  const suggestion = useMemo(() => suggestCategory(merchant), [merchant])

  const amountCents = Math.round((Number(amount) || 0) * 100)
  const taxCents = Math.round((Number(tax) || 0) * 100)
  const totalCents = amountCents

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires.
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      const occurredAt = date ? new Date(date) : new Date()
      // Tags ride along in the expense's notes so they survive without their
      // own storage: "Notes…\nTags: a, b".
      const tagLine = tags.trim() ? `Tags: ${tags.trim()}` : ''
      const mergedNotes = [notes.trim(), tagLine].filter(Boolean).join('\n')
      const res = await http.post('/api/expenses', {
        merchant,
        category,
        occurred_at: occurredAt.toISOString(),
        amount_cents: amountCents,
        tax_cents: taxCents,
        is_deductible: deductible,
        description: description.trim() || undefined,
        notes: mergedNotes || undefined,
        has_receipt: !!receipt,
      })
      const createdId = unwrapSingle<{ id?: string }>(res)?.id
      track({
        name: 'expense.created',
        properties: { id: createdId, category, amount_cents: amountCents },
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
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link to="/expenses" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('newExpense.back', {}, { defaultValue: 'Expenses' })}
      </Link>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
        {t('newExpense.heading', {}, { defaultValue: 'Record expense' })}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mt', 1),
          cm.sp('mb', 6),
          'text-on-surface-variant',
        )}
      >
        {t(
          'newExpense.subtitle',
          {},
          { defaultValue: 'Manual entry or upload a receipt to keep the details together.' },
        )}
      </p>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <form
          onSubmit={onSubmit}
          className={cm.cn('col-span-12 lg:col-span-8', cm.card(), cm.sp('p', 6), 'space-y-5')}
        >
          <section className={cm.cn('space-y-3')} aria-labelledby="new-expense-receipt-heading">
            <h2 id="new-expense-receipt-heading" className={cm.sectionHeading}>
              <GlyphTile icon="receipt_long" />{' '}
              <span>
                {t('newExpense.receiptHeading', {}, { defaultValue: 'Receipt document' })}
              </span>
            </h2>
            <div
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
                upload_file
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
            </div>
          </section>

          <section className={cm.cn('space-y-4')} aria-labelledby="new-expense-details-heading">
            <h2 id="new-expense-details-heading" className={cm.sectionHeading}>
              <GlyphTile icon="list_alt" />{' '}
              <span>
                {t('newExpense.detailsHeading', {}, { defaultValue: 'Transaction details' })}
              </span>
            </h2>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
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
            </div>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
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
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
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
              <Field
                label={t('form.amount', {}, { defaultValue: 'Amount' })}
                type="number"
                value={amount}
                onChange={setAmount}
              />
            </div>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <Field
                label={t('newExpense.tax', {}, { defaultValue: 'Tax (optional)' })}
                type="number"
                value={tax}
                onChange={setTax}
              />
              <Field
                label={t('newExpense.memoLabel', {}, { defaultValue: 'Description / memo' })}
                value={description}
                onChange={setDescription}
              />
            </div>
          </section>

          <section className={cm.cn('space-y-3')} aria-labelledby="new-expense-tax-heading">
            <h2 id="new-expense-tax-heading" className={cm.sectionHeading}>
              <GlyphTile icon="account_balance_wallet" />{' '}
              <span>{t('newExpense.taxHeading', {}, { defaultValue: 'Tax treatment' })}</span>
            </h2>
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
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'newExpense.taxHint',
                {},
                {
                  defaultValue:
                    'Deductible expenses flow into the tax summary and the deductibles-by-category report.',
                },
              )}
            </p>
          </section>

          <section className={cm.cn('space-y-3')} aria-labelledby="new-expense-classification">
            <h2 id="new-expense-classification" className={cm.sectionHeading}>
              <GlyphTile icon="sell" />{' '}
              <span>
                {t('newExpense.classificationHeading', {}, { defaultValue: 'Classification' })}
              </span>
            </h2>
            <Field
              label={t('newExpense.tagsLabel', {}, { defaultValue: 'Tags' })}
              value={tags}
              onChange={setTags}
            />
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
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
            <p
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('xs'),
                'rounded-md bg-surface-container text-on-surface-variant',
              )}
            >
              {t(
                'newExpense.reconciliationNote',
                {},
                {
                  defaultValue:
                    'Make sure the date and amount match your bank statement exactly so the payment can be matched automatically later.',
                },
              )}
            </p>
          </section>

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

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4')}>
          {/* Live summary of what will be recorded. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <h2 className={cm.sectionHeading}>
              {t('newExpense.summaryHeading', {}, { defaultValue: 'Expense summary' })}
            </h2>
            <SummaryRow
              label={t('newExpense.summarySubtotal', {}, { defaultValue: 'Subtotal' })}
              value={fmtUsd(amountCents)}
            />
            <SummaryRow
              label={t('form.tax', {}, { defaultValue: 'Tax' })}
              value={fmtUsd(taxCents)}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'border-t border-outline pt-2',
                cm.fontWeight('bold'),
              )}
            >
              <span>{t('newExpense.summaryTotal', {}, { defaultValue: 'Total to record' })}</span>
              <span className="tabular-nums">{fmtUsd(totalCents)}</span>
            </div>
          </section>

          {/* Merchant-name based category suggestion with one-click apply. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <h2 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sectionHeading)}>
              <span
                className={cm.cn(
                  cm.sp('p', 1),
                  'rounded-md bg-primary/10 text-primary flex items-center justify-center',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>auto_awesome</span>
              </span>{' '}
              <span>
                {t('newExpense.suggestionsHeading', {}, { defaultValue: 'Smart suggestions' })}
              </span>
            </h2>
            {suggestion && suggestion !== category ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('p', 3),
                  'rounded-md bg-surface-container',
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {suggestion}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'newExpense.suggestionHint',
                      { merchant: merchant.trim() },
                      { defaultValue: 'Looks like a {{merchant}} expense.' },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  data-mol-id="new-expense-apply-suggestion"
                  onClick={() => setCategory(suggestion)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md bg-primary text-on-primary',
                  )}
                >
                  {t('newExpense.applySuggestion', {}, { defaultValue: 'Apply' })}
                </button>
              </div>
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'newExpense.suggestionsEmpty',
                  {},
                  {
                    defaultValue:
                      'Start typing a merchant — recognized vendors suggest a category here.',
                  },
                )}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{value}</span>
    </div>
  )
}

/** Glyph tile for the form's section headings (icon chip + label). */
function GlyphTile({ icon }: { icon: string }) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.sp('p', 1),
        'rounded-md bg-surface-container flex items-center justify-center',
      )}
      aria-hidden="true"
    >
      <span className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}>
        {icon}
      </span>
    </span>
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
