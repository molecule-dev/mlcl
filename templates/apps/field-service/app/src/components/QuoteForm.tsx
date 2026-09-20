import { useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'

export interface QuoteFormItem {
  id: string
  description: string
  qty: string
  unit: string
  /** Dollars as typed by the user; converted to cents on submit. */
  rate: string
}

export interface QuoteFormPayload {
  customer_id: string
  title: string
  valid_until: string | null
  notes: string
  items: Array<{ description: string; qty: number; unit: string; rate_cents: number }>
}

export interface QuoteFormInitial {
  customer_id?: string
  title?: string
  valid_until?: string | null
  notes?: string
  items?: Array<{ id?: string; description: string; qty: number; unit: string; rate_cents: number }>
}

let rowSeq = 0
function blankRow(): QuoteFormItem {
  rowSeq += 1
  return { id: `row-${rowSeq}`, description: '', qty: '1', unit: 'each', rate: '' }
}

/** Parse a dollars-as-typed string into integer cents; '' -> 0. */
function dollarsToCents(input: string): number {
  const n = Number(input)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Shared quote editor body — customer, heading, validity, notes, and the
 * line-item table (qty × unit × rate). Used by QuoteNew and QuoteEdit.
 * The parent owns submission; this component only builds the payload.
 */
export function QuoteForm({
  customers,
  initial,
  submitLabel,
  onSubmit,
  submitting = false,
  error = null,
}: {
  customers: Array<{ id: string; name: string }>
  initial?: QuoteFormInitial
  submitLabel: string
  onSubmit: (payload: QuoteFormPayload) => void
  submitting?: boolean
  error?: string | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [customerId, setCustomerId] = useState(initial?.customer_id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [validUntil, setValidUntil] = useState(
    initial?.valid_until ? initial.valid_until.slice(0, 10) : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState<QuoteFormItem[]>(
    initial?.items?.length
      ? initial.items.map((it, i) => ({
          id: it.id ?? `row-${i}`,
          description: it.description,
          qty: String(it.qty),
          unit: it.unit,
          rate: centsToDollars(it.rate_cents),
        }))
      : [blankRow()],
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const totalCents = useMemo(
    () => items.reduce((sum, it) => sum + dollarsToCents(it.rate) * (Number(it.qty) || 0), 0),
    [items],
  )

  function setItem(id: string, patch: Partial<QuoteFormItem>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) {
      setValidationError(
        t('quotes.form.customerRequired', {}, { defaultValue: 'Pick a customer.' }),
      )
      return
    }
    if (!title.trim()) {
      setValidationError(t('quotes.form.titleRequired', {}, { defaultValue: 'Add a title.' }))
      return
    }
    const payloadItems = items
      .filter((it) => it.description.trim() !== '' || it.rate !== '')
      .map((it) => ({
        description: it.description.trim(),
        qty: Number(it.qty) || 1,
        unit: it.unit || 'each',
        rate_cents: dollarsToCents(it.rate),
      }))
    if (payloadItems.length === 0) {
      setValidationError(
        t('quotes.form.itemRequired', {}, { defaultValue: 'Add at least one line item.' }),
      )
      return
    }
    setValidationError(null)
    onSubmit({
      customer_id: customerId,
      title: title.trim(),
      valid_until: validUntil ? new Date(`${validUntil}T09:00:00`).toISOString() : null,
      notes: notes.trim(),
      items: payloadItems,
    })
  }

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full',
  )

  return (
    <form onSubmit={submit} className={cm.cn(cm.stack(6))}>
      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('quotes.form.customer', {}, { defaultValue: 'Customer' })}
          </span>
          <select
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
          >
            <option value="">
              {t('quotes.form.pickCustomer', {}, { defaultValue: 'Pick a customer…' })}
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('quotes.form.title', {}, { defaultValue: 'Title' })}
          </span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'quotes.form.titlePlaceholder',
              {},
              { defaultValue: 'Rooftop A/C tune-up' },
            )}
            className={inputCls}
          />
        </label>
      </div>

      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('quotes.form.validUntil', {}, { defaultValue: 'Valid until' })}
          </span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('quotes.form.notes', {}, { defaultValue: 'Notes' })}
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'quotes.form.notesPlaceholder',
              {},
              { defaultValue: 'Visible to the customer' },
            )}
            className={inputCls}
          />
        </label>
      </div>

      <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
        <table className={'w-full text-left text-sm'}>
          <thead>
            <tr className={'border-b border-outline-variant'}>
              <Th>{t('quotes.form.col.description', {}, { defaultValue: 'Description' })}</Th>
              <Th>{t('quotes.form.col.qty', {}, { defaultValue: 'Qty' })}</Th>
              <Th>{t('quotes.form.col.unit', {}, { defaultValue: 'Unit' })}</Th>
              <Th>{t('quotes.form.col.rate', {}, { defaultValue: 'Rate ($)' })}</Th>
              <Th>{t('quotes.form.col.lineTotal', {}, { defaultValue: 'Line total' })}</Th>
              <Th aria-label={t('common.actions', {}, { defaultValue: 'Actions' })} />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className={'border-b border-outline-variant'}>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                  <input
                    type="text"
                    aria-label={t(
                      'quotes.form.col.description',
                      {},
                      { defaultValue: 'Description' },
                    )}
                    value={row.description}
                    onChange={(e) => setItem(row.id, { description: e.target.value })}
                    placeholder={t(
                      'quotes.form.itemPlaceholder',
                      {},
                      { defaultValue: 'Seasonal tune-up' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'border border-outline-variant rounded-md w-full min-w-48',
                    )}
                  />
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    aria-label={t('quotes.form.col.qty', {}, { defaultValue: 'Qty' })}
                    value={row.qty}
                    onChange={(e) => setItem(row.id, { qty: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'border border-outline-variant rounded-md w-20',
                    )}
                  />
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                  <input
                    type="text"
                    aria-label={t('quotes.form.col.unit', {}, { defaultValue: 'Unit' })}
                    value={row.unit}
                    onChange={(e) => setItem(row.id, { unit: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'border border-outline-variant rounded-md w-20',
                    )}
                  />
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label={t('quotes.form.col.rate', {}, { defaultValue: 'Rate ($)' })}
                    value={row.rate}
                    onChange={(e) => setItem(row.id, { rate: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'border border-outline-variant rounded-md w-24 font-mono',
                    )}
                  />
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'font-mono text-on-surface-variant',
                  )}
                >
                  {formatMoney(dollarsToCents(row.rate) * (Number(row.qty) || 0))}
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.textRight)}>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((rows) =>
                        rows.length > 1 ? rows.filter((r) => r.id !== row.id) : rows,
                      )
                    }
                    aria-label={t('quotes.form.removeItem', {}, { defaultValue: 'Remove line' })}
                    className={cm.cn(cm.textSize('sm'), 'text-error hover:opacity-80')}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={cm.cn(cm.sp('p', 3), cm.flex({ align: 'center', justify: 'between' }))}>
          <button
            type="button"
            onClick={() => setItems((rows) => [...rows, blankRow()])}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md hover:bg-surface-container',
            )}
          >
            + {t('quotes.form.addLine', {}, { defaultValue: 'Add line' })}
          </button>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('quotes.form.total', {}, { defaultValue: 'Total' })}{' '}
            <span className={'font-mono'}>{formatMoney(totalCents)}</span>
          </p>
        </div>
      </div>

      {validationError || error ? (
        <p className={'text-error text-sm'} role="alert">
          {validationError ?? error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {submitting ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' }) : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Th({
  children,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  'aria-label'?: string
}) {
  const cm = getClassMap()
  return (
    <th
      aria-label={ariaLabel}
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
