import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ClientOption {
  id: string
  name: string
  company?: string | null
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

interface InvoiceCreated {
  id: string
  invoice_number: string
  status: string
}

interface InvoiceFetched {
  id: string
  invoice_number: string
  client_id?: string | null
  client_name?: string | null
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  currency: string
  notes: string | null
  due_date: string | null
  items: Array<{ description: string; quantity: number; unit_price: number }>
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function InvoiceEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const presetClient = params.get('client') ?? ''
  const http = useHttpClient()

  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState<string>('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  )
  const [taxRate, setTaxRate] = useState(8.5)
  const [notes, setNotes] = useState('Net 14. Thanks for the partnership!')
  const [items, setItems] = useState<LineItem[]>([
    { id: 'i1', description: 'Brand strategy workshop', quantity: 1, unit_price: 1800 },
    { id: 'i2', description: 'Logo system & guidelines', quantity: 1, unit_price: 2400 },
    { id: 'i3', description: 'Web hero photography (8 hrs)', quantity: 8, unit_price: 75 },
  ])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<ClientOption[]>('/api/clients')
      .then((r) => {
        if (!active) return
        const list = Array.isArray(r.data) ? r.data : []
        setClients(list)
        if (presetClient && list.find((c) => c.id === presetClient)) {
          setClientId(presetClient)
        } else if (list[0] && !clientId) {
          setClientId(list[0].id)
        }
      })
      .catch(() => {
        if (active) setClients([])
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, presetClient]) // clientId intentionally omitted: checked only at initial load to avoid re-fetching on every selection change

  useEffect(() => {
    if (!editId) return
    let active = true
    http
      .get<InvoiceFetched>(`/api/invoices/${editId}`)
      .then((r) => {
        if (!active || !r.data) return
        const inv = r.data
        setClientId(inv.client_id ?? '')
        if (inv.due_date) setDueDate(inv.due_date.slice(0, 10))
        if (inv.notes !== null) setNotes(inv.notes)
        setTaxRate(inv.tax_rate ?? 0)
        if (Array.isArray(inv.items) && inv.items.length > 0) {
          setItems(
            inv.items.map((line, idx) => ({
              id: `existing-${idx}`,
              description: line.description ?? '',
              quantity: Number(line.quantity ?? 0),
              unit_price: Number(line.unit_price ?? 0),
            })),
          )
        }
      })
      .catch(() => {
        if (active)
          setError(t('invoiceEditor.loadError', {}, { defaultValue: 'Could not load invoice.' }))
      })
    return () => {
      active = false
    }
  }, [editId, http, t])

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items],
  )
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: `i${Date.now()}`, description: '', quantity: 1, unit_price: 0 },
    ])

  const persist = async (action: 'draft' | 'send'): Promise<InvoiceCreated | null> => {
    if (!clientId) {
      setError(
        t('invoiceEditor.error.client', {}, { defaultValue: 'Choose a client before saving.' }),
      )
      return null
    }
    const cleanItems = items.filter((i) => i.description.trim() && i.quantity > 0)
    if (cleanItems.length === 0) {
      setError(t('invoiceEditor.error.items', {}, { defaultValue: 'Add at least one line item.' }))
      return null
    }
    setError(null)
    setBusy(action)
    try {
      const body = {
        client_id: clientId,
        items: cleanItems.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        due_date: dueDate || undefined,
        notes: notes || undefined,
        tax_rate: Number(taxRate) || 0,
        currency: 'USD',
      }
      let response: { data: InvoiceCreated }
      if (editId) {
        response = await http.put<InvoiceCreated>(`/api/invoices/${editId}`, body)
      } else {
        response = await http.post<InvoiceCreated>('/api/invoices', body)
      }
      const inv = response.data
      if (action === 'send' && inv?.id) {
        await http.post(`/api/invoices/${inv.id}/send`, {})
      }
      return inv ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
      return null
    } finally {
      setBusy(null)
    }
  }

  const handleSaveDraft = async () => {
    const created = await persist('draft')
    if (created) navigate(`/invoices/${created.id}`)
  }

  const handleSend = async () => {
    const sent = await persist('send')
    if (sent) navigate(`/invoices/${sent.id}`)
  }

  const selectedClient = clients.find((c) => c.id === clientId) ?? null
  const billToLabel = selectedClient
    ? selectedClient.name + (selectedClient.company ? ' · ' + selectedClient.company : '')
    : t('invoiceEditor.preview.unassigned', {}, { defaultValue: 'No client selected' })

  return (
    <div
      data-mol-id="page-invoice-editor"
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <Link
            to="/invoices"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-sidebar-hover)',
              textDecoration: 'none',
            }}
          >
            {t('invoiceEditor.back', {}, { defaultValue: '← Back to invoices' })}
          </Link>
          <h1
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '28px',
              letterSpacing: '-0.02em',
              color: 'var(--mol-color-text)',
              margin: '6px 0 0',
            }}
          >
            {editId
              ? t('invoiceEditor.titleEdit', {}, { defaultValue: 'Edit invoice' })
              : t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
          </h1>
          <p
            style={{ color: 'var(--mol-color-text-secondary)', fontSize: '13px', marginTop: '4px' }}
          >
            {t(
              'invoiceEditor.subtitle',
              {},
              { defaultValue: 'Build it on the left, watch the preview update on the right.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy !== null}
            data-action="save-draft"
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-primary-dark)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid var(--mol-color-border)',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy === 'draft' ? 0.6 : 1,
            }}
          >
            {busy === 'draft'
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy !== null}
            data-action="send-invoice"
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 18px var(--color-accent-shadow)',
              opacity: busy === 'send' ? 0.6 : 1,
            }}
          >
            {busy === 'send'
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('invoiceEditor.send', {}, { defaultValue: 'Send invoice' })}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
            border:
              '1px solid color-mix(in srgb, var(--mol-color-error) 40%, var(--mol-color-surface))',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}
          style={{ border: '1px solid var(--mol-color-border)' }}
        >
          <h3
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '14px',
              color: 'var(--color-primary-dark)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {t('invoiceEditor.section.details', {}, { defaultValue: 'Invoice details' })}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginTop: '14px',
            }}
          >
            <Field label={t('invoiceEditor.field.client', {}, { defaultValue: 'Bill to' })}>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={inputStyle}
                aria-label={t('invoiceEditor.field.client', {}, { defaultValue: 'Bill to' })}
                data-field="client"
              >
                {clients.length === 0 ? (
                  <option value="">
                    {t('invoiceEditor.noClients', {}, { defaultValue: '— no clients yet —' })}
                  </option>
                ) : null}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ' · ' + c.company : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('invoiceEditor.field.taxRate', {}, { defaultValue: 'Tax rate %' })}>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                style={inputStyle}
                aria-label={t('invoiceEditor.field.taxRate', {}, { defaultValue: 'Tax rate %' })}
              />
            </Field>
            <Field label={t('invoiceEditor.field.issueDate', {}, { defaultValue: 'Issue date' })}>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={inputStyle}
                aria-label={t('invoiceEditor.field.issueDate', {}, { defaultValue: 'Issue date' })}
              />
            </Field>
            <Field label={t('invoiceEditor.field.dueDate', {}, { defaultValue: 'Due date' })}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
                aria-label={t('invoiceEditor.field.dueDate', {}, { defaultValue: 'Due date' })}
              />
            </Field>
          </div>

          <h3
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '14px',
              color: 'var(--color-primary-dark)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: '24px',
            }}
          >
            {t('invoiceEditor.section.items', {}, { defaultValue: 'Line items' })}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr 28px',
              gap: '8px',
              marginTop: '12px',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--mol-color-text-tertiary)',
              fontWeight: 700,
            }}
          >
            <span>{t('form.description', {}, { defaultValue: 'Description' })}</span>
            <span>{t('invoiceEditor.col.qty', {}, { defaultValue: 'Qty' })}</span>
            <span style={{ textAlign: 'right' }}>
              {t('form.rate', {}, { defaultValue: 'Rate' })}
            </span>
            <span style={{ textAlign: 'right' }}>
              {t('form.amount', {}, { defaultValue: 'Amount' })}
            </span>
            <span />
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr 28px',
                gap: '8px',
                alignItems: 'center',
                marginTop: '8px',
              }}
            >
              <input
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder={t(
                  'invoiceEditor.placeholder.description',
                  {},
                  { defaultValue: 'What did you do?' },
                )}
                aria-label={t('form.description', {}, { defaultValue: 'Description' })}
                style={inputStyle}
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })}
                aria-label={t('invoiceEditor.col.qty', {}, { defaultValue: 'Qty' })}
                style={inputStyle}
              />
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, { unit_price: Number(e.target.value) || 0 })}
                aria-label={t('form.rate', {}, { defaultValue: 'Rate' })}
                style={{ ...inputStyle, textAlign: 'right' }}
              />
              <span
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '14px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(item.quantity * item.unit_price)}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t('invoiceEditor.removeItem', {}, { defaultValue: 'Remove item' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--mol-color-text-tertiary)',
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.fontWeight('semibold'))}
            style={{
              marginTop: '14px',
              padding: '8px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-primary-light)',
              color: 'var(--color-primary-dark)',
              border: '1px dashed var(--color-primary-dark)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
            {t('invoiceEditor.addItem', {}, { defaultValue: 'Add item' })}
          </button>

          <div
            style={{
              marginTop: '20px',
              borderTop: '1px solid var(--color-draft-light)',
              paddingTop: '14px',
            }}
          >
            <Field label={t('invoiceEditor.field.notes', {}, { defaultValue: 'Notes / terms' })}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-label={t('invoiceEditor.field.notes', {}, { defaultValue: 'Notes / terms' })}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>
          </div>
        </section>

        <section
          className={cm.cn('bg-surface rounded-2xl shadow-sm')}
          style={{
            border: '1px solid var(--mol-color-border)',
            padding: '36px',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '4px 10px',
              backgroundColor: 'var(--color-sent-light)',
              color: 'var(--color-sent)',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: '9999px',
            }}
          >
            {t('invoiceEditor.preview.draft', {}, { defaultValue: 'Draft' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}>
            <div>
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary-dark)',
                  color: 'var(--color-sidebar-text-active)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  marginBottom: '12px',
                }}
              >
                R
              </span>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  margin: 0,
                }}
              >
                {APP_NAME}
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--mol-color-text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                {t(
                  'invoiceEditor.preview.companyAddress',
                  {},
                  { defaultValue: '141 Bridge Lane · Brooklyn, NY · 11211' },
                )}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  color: 'var(--mol-color-text-tertiary)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {t('invoiceEditor.preview.invoiceLabel', {}, { defaultValue: 'Invoice' })}
              </p>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)',
                  margin: '2px 0 0',
                }}
              >
                INV-{Date.now().toString().slice(-6)}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--mol-color-text-secondary)',
                  margin: '8px 0 0',
                }}
              >
                {t(
                  'invoiceEditor.preview.issued',
                  { date: issueDate },
                  { defaultValue: 'Issued {{date}}' },
                )}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--mol-color-text-secondary)',
                  margin: '2px 0 0',
                }}
              >
                {t(
                  'invoiceEditor.preview.due',
                  { date: dueDate },
                  { defaultValue: 'Due {{date}}' },
                )}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              padding: '12px 14px',
              backgroundColor: 'var(--mol-color-surface-secondary)',
              borderRadius: '12px',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--mol-color-text-tertiary)',
              }}
            >
              {t('invoiceEditor.preview.billTo', {}, { defaultValue: 'Bill to' })}
            </p>
            <p
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--mol-color-text)',
                marginTop: '4px',
              }}
            >
              {billToLabel}
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--mol-color-text-tertiary)',
                fontWeight: 800,
                paddingBottom: '8px',
                borderBottom: '1px solid var(--mol-color-border)',
              }}
            >
              <span>{t('form.description', {}, { defaultValue: 'Description' })}</span>
              <span>{t('invoiceEditor.preview.col.qty', {}, { defaultValue: 'Qty' })}</span>
              <span style={{ textAlign: 'right' }}>
                {t('form.rate', {}, { defaultValue: 'Rate' })}
              </span>
              <span style={{ textAlign: 'right' }}>
                {t('form.amount', {}, { defaultValue: 'Amount' })}
              </span>
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-draft-light)',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'var(--mol-color-text)', fontWeight: 500 }}>
                  {item.description || '—'}
                </span>
                <span style={{ color: 'var(--mol-color-text-secondary)' }}>{item.quantity}</span>
                <span
                  style={{
                    textAlign: 'right',
                    color: 'var(--mol-color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(item.unit_price)}
                </span>
                <span
                  style={{
                    textAlign: 'right',
                    color: 'var(--mol-color-text)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(item.quantity * item.unit_price)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '6px' }}>
            <Row
              label={t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              value={formatCurrency(subtotal)}
            />
            <Row
              label={t(
                'invoiceEditor.preview.tax',
                { rate: taxRate },
                { defaultValue: 'Tax ({{rate}}%)' },
              )}
              value={formatCurrency(tax)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '10px',
                borderTop: '2px solid var(--color-primary-dark)',
                marginTop: '4px',
              }}
            >
              <span
                style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '15px' }}
              >
                {t('invoiceEditor.preview.total', {}, { defaultValue: 'Total due' })}
              </span>
              <span
                data-testid="preview-total"
                style={{
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  fontSize: '24px',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {notes ? (
            <p
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--mol-color-text-secondary)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {notes}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--mol-color-border)',
  backgroundColor: 'var(--mol-color-surface-secondary)',
  fontSize: '13px',
  color: 'var(--mol-color-text)',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)' }}>{label}</span>
      <span
        style={{
          fontSize: '13px',
          color: 'var(--mol-color-text)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default InvoiceEditor
