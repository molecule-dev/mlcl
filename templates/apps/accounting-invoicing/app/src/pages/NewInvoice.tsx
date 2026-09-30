import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
}

interface CompanyDefaults {
  legal_name?: string
  currency?: string
  payment_terms?: string
  invoice_late_fee_enabled?: boolean
  invoice_recurring_enabled?: boolean
}

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const

const PAYMENT_TERMS = [
  { value: 'net_7', label: 'Net 7', days: 7 },
  { value: 'net_14', label: 'Net 14', days: 14 },
  { value: 'net_30', label: 'Net 30', days: 30 },
] as const

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

  // Invoice-default preferences (Settings → Invoice defaults). The rail seeds
  // from the saved profile; the toggles write back through the same settings
  // endpoint, and currency/terms apply to THIS invoice.
  const [company, setCompany] = useState<CompanyDefaults>({})
  const [currency, setCurrency] = useState('USD')
  const [terms, setTerms] = useState('net_30')
  const [lateFee, setLateFee] = useState(false)
  const [recurring, setRecurring] = useState(false)

  useEffect(() => {
    let active = true
    http
      .get('/api/settings/company')
      .then((res: { data?: unknown }) => {
        if (!active) return
        const body = (res?.data ?? res) as CompanyDefaults & { default_tax_rate_pct?: unknown }
        setCompany(body ?? {})
        const rate = Number(body?.default_tax_rate_pct)
        // Treat 0/unset as "no saved default" and keep the built-in fallback.
        if (!taxTouched.current && Number.isFinite(rate) && rate > 0) setTaxRate(rate)
        if (typeof body?.currency === 'string' && body.currency) setCurrency(body.currency)
        if (typeof body?.payment_terms === 'string' && body.payment_terms)
          setTerms(body.payment_terms)
        if (typeof body?.invoice_late_fee_enabled === 'boolean')
          setLateFee(body.invoice_late_fee_enabled)
        if (typeof body?.invoice_recurring_enabled === 'boolean')
          setRecurring(body.invoice_recurring_enabled)
      })
      .catch(() => {
        // Best-effort seed; fall back to the built-in defaults.
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

  // Choosing payment terms derives the due date from the issue date; a manual
  // due-date edit afterwards always wins until terms are changed again.
  function applyTerms(value: string) {
    setTerms(value)
    const term = PAYMENT_TERMS.find((pt) => pt.value === value)
    if (!term) return
    const issuedMs = Date.parse(issued)
    if (Number.isFinite(issuedMs)) {
      const dueDate = new Date(issuedMs + term.days * 86_400_000)
      setDue(dueDate.toISOString().slice(0, 10))
    }
  }

  // The late-fee / recurring toggles are saved defaults — persist them so the
  // next invoice (and Settings → Invoice defaults) reflects the choice.
  function persistDefault(patch: Record<string, unknown>) {
    http.put('/api/settings/company', patch).catch(() => {
      // best-effort — the toggle already reflects the user's choice
    })
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
        currency,
        notes,
      }
      const res = await http.post('/api/invoices', payload)
      const createdId = unwrapSingle<{ id?: string }>(res)?.id
      track({
        name: 'invoice.created',
        properties: { id: createdId, status, total_cents: total },
      })
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

  const issuerName = company.legal_name?.trim()

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link to="/invoices" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4), cm.sp('mb', 6))}
      >
        {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
      </h1>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <form
          onSubmit={onSubmit}
          className={cm.cn('col-span-12 lg:col-span-8', cm.card(), cm.sp('p', 6), 'space-y-6')}
        >
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

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4')}>
          {/* Issuer — the "From" block; the signed-in business is the issuer. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('newInvoice.issuerEyebrow', {}, { defaultValue: 'From' })}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-lg bg-primary-container text-primary font-bold flex items-center justify-center',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined')}>account_balance_wallet</span>
              </span>
              <div>
                <p className={cm.cn(cm.fontWeight('bold'))}>
                  {issuerName ||
                    t('newInvoice.issuerFallback', {}, { defaultValue: 'Your business' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'newInvoice.issuerCaption',
                    {},
                    { defaultValue: 'Set in Settings → Business identity' },
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Design's "Settings" card — currency + terms apply to this invoice. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}
            >
              <GlyphTile icon="tune" />{' '}
              <span>
                {t('newInvoice.settingsHeading', {}, { defaultValue: 'Invoice settings' })}
              </span>
            </h2>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('newInvoice.currencyLabel', {}, { defaultValue: 'Currency' })}
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md bg-surface',
                )}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
                {t('newInvoice.termsLabel', {}, { defaultValue: 'Payment terms' })}
              </span>
              <select
                value={terms}
                onChange={(e) => applyTerms(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md bg-surface',
                )}
              >
                {PAYMENT_TERMS.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="checkbox"
                checked={lateFee}
                onChange={(e) => {
                  setLateFee(e.target.checked)
                  persistDefault({ invoice_late_fee_enabled: e.target.checked })
                }}
                className={cm.cn('h-4 w-4')}
              />
              <span className={cm.textSize('sm')}>
                {t('newInvoice.lateFeeLabel', {}, { defaultValue: 'Apply late fee' })}
              </span>
            </label>
            <label className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => {
                  setRecurring(e.target.checked)
                  persistDefault({ invoice_recurring_enabled: e.target.checked })
                }}
                className={cm.cn('h-4 w-4')}
              />
              <span className={cm.textSize('sm')}>
                {t('newInvoice.recurringLabel', {}, { defaultValue: 'Recurring invoice' })}
              </span>
            </label>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'newInvoice.settingsHint',
                {},
                { defaultValue: 'Toggles are saved to your invoice defaults.' },
              )}
            </p>
          </section>

          {/* Design's "Branding" card — how the issuer appears on the invoice. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}
            >
              <GlyphTile icon="palette" />{' '}
              <span>{t('newInvoice.brandingHeading', {}, { defaultValue: 'Branding' })}</span>
            </h2>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-md bg-surface-container border border-outline-variant',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.sp('p', 2),
                    'rounded-md bg-primary text-on-primary font-bold flex items-center justify-center relative',
                  )}
                  aria-hidden="true"
                >
                  {(issuerName || 'Y').charAt(0).toUpperCase()}
                  <span
                    className={cm.cn(
                      'absolute -bottom-1 -right-1 p-0.5 rounded-full bg-success text-on-success flex items-center justify-center',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xs')}>check</span>
                  </span>
                </span>
                <div>
                  <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {issuerName ||
                      t('newInvoice.issuerFallback', {}, { defaultValue: 'Your business' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'newInvoice.brandingCaption',
                      {},
                      { defaultValue: 'Shown as the issuer on every invoice you send.' },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Design's "Send options" card — what Send vs Draft actually do. */}
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <h2
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}
            >
              <GlyphTile icon="mail" />{' '}
              <span>
                {t('newInvoice.sendOptionsHeading', {}, { defaultValue: 'Send options' })}
              </span>
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'newInvoice.sendExplain',
                {},
                {
                  defaultValue:
                    'Send marks the invoice as sent and starts the payment clock. Save as draft keeps it editable and visible only to you.',
                },
              )}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** Glyph tile for the rail's section headings (icon chip + label). */
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
