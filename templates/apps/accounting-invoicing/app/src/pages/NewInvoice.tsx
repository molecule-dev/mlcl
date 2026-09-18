import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

let nextId = 1

export function NewInvoice() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [customer, setCustomer] = useState('')
  const [issued, setIssued] = useState(new Date().toISOString().slice(0, 10))
  const [due, setDue] = useState('')
  const [taxRate, setTaxRate] = useState(8.5)
  // The tax rate defaults to the company's saved "Default tax rate" (Settings),
  // unless the user edits it here first.
  const taxTouched = useRef(false)
  const [lines, setLines] = useState<LineItem[]>([
    { id: 'l_0', description: '', quantity: 1, unit_price_cents: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    http
      .get('/api/settings/company')
      .then((res: { data?: unknown }) => {
        if (!active || taxTouched.current) return
        const body = (res?.data ?? res) as { default_tax_rate_pct?: unknown }
        const rate = Number(body?.default_tax_rate_pct)
        // Treat 0/unset as "no saved default" and keep the built-in fallback.
        if (Number.isFinite(rate) && rate > 0) setTaxRate(rate)
      })
      .catch(() => {
        // Best-effort seed; fall back to the built-in default rate.
      })
    return () => {
      active = false
    }
  }, [http])

  function addLine() {
    setLines([...lines, { id: `l_${nextId++}`, description: '', quantity: 1, unit_price_cents: 0 }])
  }
  function removeLine(id: string) {
    setLines(lines.filter((l) => l.id !== id))
  }
  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price_cents, 0)
  const tax = Math.round(subtotal * (taxRate / 100))
  const total = subtotal + tax

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  async function save(status: 'sent' | 'draft') {
    setSubmitError(null)
    const setBusy = status === 'draft' ? setSavingDraft : setSubmitting
    setBusy(true)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires.
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      const issuedDate = new Date(issued)
      const dueDate = due ? new Date(due) : null
      const lineItemsPayload = lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price_cents / 100,
        amount: (l.quantity * l.unit_price_cents) / 100,
      }))
      const payload = {
        customer_name: customer,
        status,
        issue_date: issuedDate.toISOString(),
        due_date: dueDate ? dueDate.toISOString() : undefined,
        line_items: lineItemsPayload,
        subtotal_cents: subtotal,
        tax_rate_pct: taxRate,
        tax_cents: tax,
        total_cents: total,
        amount_cents: total,
        currency: 'USD',
        notes,
      }
      await http.post('/api/invoices', payload)
      navigate('/invoices')
    } catch (error) {
      setSubmitError(
        status === 'draft'
          ? t('newInvoice.draftFailed', {}, { defaultValue: 'Could not save draft.' })
          : t('newInvoice.failed', {}, { defaultValue: 'Could not send invoice.' }),
      )
      logError('newInvoice.submit', error)
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save('sent')
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto)}>
      <Link to="/invoices" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
      </h1>

      <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-6')}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <Field
            label={t('nav.customer', {}, { defaultValue: 'Customer' })}
            value={customer}
            onChange={setCustomer}
          />
          <Field
            label={t('newInvoice.issued', {}, { defaultValue: 'Issue date' })}
            type="date"
            value={issued}
            onChange={setIssued}
          />
          <Field
            label={t('newInvoice.due', {}, { defaultValue: 'Due date' })}
            type="date"
            value={due}
            onChange={setDue}
          />
          <Field
            label={t('newInvoice.taxRate', {}, { defaultValue: 'Tax rate (%)' })}
            type="number"
            value={String(taxRate)}
            onChange={(v) => {
              taxTouched.current = true
              setTaxRate(Number(v) || 0)
            }}
          />
        </div>

        <section>
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
          >
            <h2 className={cm.sectionHeading}>
              {t('newInvoice.lines', {}, { defaultValue: 'Line items' })}
            </h2>
            <button
              type="button"
              onClick={addLine}
              className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
            >
              + {t('newInvoice.addLine', {}, { defaultValue: 'Add line' })}
            </button>
          </header>
          <ul className={cm.cn('space-y-2')}>
            {lines.map((l) => (
              <li key={l.id} className={cm.cn(cm.grid({ cols: 12, gap: 'sm' }))}>
                <input
                  type="text"
                  value={l.description}
                  onChange={(e) => updateLine(l.id, { description: e.target.value })}
                  placeholder={t('form.description', {}, { defaultValue: 'Description' })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'col-span-6 border border-outline-variant rounded-md',
                  )}
                />
                <input
                  type="number"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) || 0 })}
                  step="any"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'col-span-2 border border-outline-variant rounded-md tabular-nums text-right',
                  )}
                />
                <input
                  type="number"
                  value={l.unit_price_cents / 100}
                  onChange={(e) =>
                    updateLine(l.id, {
                      unit_price_cents: Math.round((Number(e.target.value) || 0) * 100),
                    })
                  }
                  step="any"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'col-span-3 border border-outline-variant rounded-md tabular-nums text-right',
                  )}
                />
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  disabled={lines.length === 1}
                  className={cm.cn('col-span-1 text-error hover:underline disabled:opacity-30')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className={cm.cn(cm.flex({ justify: 'end' }))}>
          <dl className={cm.cn('w-64 space-y-1', cm.textSize('sm'))}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className={'text-on-surface-variant'}>
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </dt>
              <dd className="tabular-nums">{fmtUsd(subtotal)}</dd>
            </div>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className={'text-on-surface-variant'}>
                {t('form.tax', {}, { defaultValue: 'Tax' })}
              </dt>
              <dd className="tabular-nums">{fmtUsd(tax)}</dd>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'border-t border-outline pt-2',
                cm.fontWeight('bold'),
              )}
            >
              <dt>{t('nav.total', {}, { defaultValue: 'Total' })}</dt>
              <dd className="tabular-nums">{fmtUsd(total)}</dd>
            </div>
          </dl>
        </div>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('newInvoice.notes', {}, { defaultValue: 'Notes (optional)' })}
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
            to="/invoices"
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
            type="button"
            onClick={() => {
              void save('draft')
            }}
            disabled={submitting || savingDraft}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container disabled:opacity-50',
            )}
          >
            {savingDraft
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('newInvoice.draftCta', {}, { defaultValue: 'Save as draft' })}
          </button>
          <button
            type="submit"
            disabled={submitting || savingDraft}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('newInvoice.sendCta', {}, { defaultValue: 'Send invoice' })}
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}

function Field({ label, value, onChange, type = 'text', required }: FieldProps) {
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
