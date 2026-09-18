import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DurationKpiCard } from '../components/DurationKpiCard.js'
import { type InvoiceStatus, InvoiceStatusPill } from '../components/InvoiceStatusPill.js'
import { formatCents } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiInvoice, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface InvoiceForm {
  client_id: string
  due_at: string
  notes: string
  source_entry_ids: string[]
}

function defaultForm(): InvoiceForm {
  return { client_id: '', due_at: '', notes: '', source_entry_ids: [] }
}

function computedStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'void' || inv.status === 'cancelled') return 'void'
  if (inv.status === 'draft') return 'draft'
  if (inv.due_at) {
    const due = new Date(inv.due_at).getTime()
    if (Number.isFinite(due) && due < Date.now()) return 'overdue'
  }
  return 'sent'
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Invoices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { entriesVersion } = useTimer()

  const [invoices, setInvoices] = useState<ReadonlyArray<ApiInvoice>>([])
  const [clients, setClients] = useState<ReadonlyArray<ApiClient>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<InvoiceForm>(() => defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/invoices').catch((e: unknown) => e),
      http.get('/api/clients').catch((e: unknown) => e),
      http.get('/api/projects').catch((e: unknown) => e),
      http.get('/api/entries').catch((e: unknown) => e),
    ])
      .then(([i, c, p, e]) => {
        if (cancelled) return
        if (i instanceof Error) setError(i.message)
        else setInvoices(unwrapList<ApiInvoice>(i))
        if (!(c instanceof Error)) setClients(unwrapList<ApiClient>(c))
        if (!(p instanceof Error)) setProjects(unwrapList<ApiProject>(p))
        if (!(e instanceof Error)) setEntries(unwrapList<ApiTimeEntry>(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, version, entriesVersion])

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter((i) => {
          const s = computedStatus(i)
          return s === 'sent' || s === 'overdue'
        })
        .reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices],
  )
  const totalOverdue = useMemo(
    () =>
      invoices
        .filter((i) => computedStatus(i) === 'overdue')
        .reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices],
  )

  const monthAgo = useMemo(() => Date.now() - 30 * 86_400_000, [])
  const totalPaid30 = useMemo(
    () =>
      invoices
        .filter(
          (i) => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getTime() >= monthAgo,
        )
        .reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices, monthAgo],
  )
  const draftCount = invoices.filter((i) => i.status === 'draft').length

  const billableUninvoicedEntries = useMemo(() => {
    return entries
      .filter((e) => e.is_billable && !e.invoiced && e.duration_seconds && e.duration_seconds > 0)
      .filter((e) => !!e.project_id)
  }, [entries])

  // Filter to entries whose project belongs to the chosen client. Without
  // this filter we'd offer every billable entry across all clients on the
  // form, which would let a user invoice Acme for hours billed to Globex.
  const eligibleEntriesForClient = useMemo(() => {
    if (!form.client_id) return []
    return billableUninvoicedEntries.filter((e) => {
      if (!e.project_id) return false
      const project = projectById.get(e.project_id)
      return project?.client_id === form.client_id
    })
  }, [form.client_id, billableUninvoicedEntries, projectById])

  // When the user selects a client, default to billing every eligible
  // unbilled entry. They can deselect specific rows below if they want
  // to invoice partially. This avoids the silent footgun where pressing
  // "Create invoice" with nothing checked produces a $0 invoice.
  useEffect(() => {
    if (!form.client_id) return
    const eligibleIds = eligibleEntriesForClient.map((e) => e.id)
    setForm((f) => {
      if (f.client_id !== form.client_id) return f
      const same =
        f.source_entry_ids.length === eligibleIds.length &&
        f.source_entry_ids.every((id) => eligibleIds.includes(id))
      if (same) return f
      return { ...f, source_entry_ids: eligibleIds }
    })
    // eligibleEntriesForClient is derived purely from form.client_id +
    // upstream data — re-running on its change is the point, since fresh
    // entries should auto-include.
  }, [form.client_id, eligibleEntriesForClient])

  const onCreate = async () => {
    if (!form.client_id) {
      setError(t('invoices.clientRequired', {}, { defaultValue: 'Choose a client first.' }))
      return
    }
    if (form.source_entry_ids.length === 0) {
      setError(
        t(
          'invoices.noEntries',
          {},
          {
            defaultValue:
              "No billable hours to invoice for this client. Track some time first or assign existing entries to one of this client's projects.",
          },
        ),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        client_id: form.client_id,
        notes: form.notes || null,
        due_at: form.due_at || null,
        source_entry_ids: form.source_entry_ids,
      }
      const res = await http.post('/api/invoices', payload)
      const created = unwrapSingle<ApiInvoice>(res)
      setForm(defaultForm())
      setShowForm(false)
      setVersion((n) => n + 1)
      void created
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="invoices-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('invoices.eyebrow', {}, { defaultValue: 'Get paid' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'invoices.subtitle',
              {},
              { defaultValue: 'Tracked hours roll up into invoices, automatically.' },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2.5),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all',
          )}
          data-test="new-invoice-toggle"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
        </button>
      </section>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
          data-test="invoices-error"
        >
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onCreate()
          }}
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface rounded-2xl shadow-sm border border-border',
          )}
          data-test="new-invoice-form"
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('invoices.formTitle', {}, { defaultValue: 'Create invoice' })}
          </h2>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('nav.client', {}, { defaultValue: 'Client' })}
              </span>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                required
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="invoice-client"
              >
                <option value="">
                  {t('invoices.form.chooseClient', {}, { defaultValue: 'Choose a client…' })}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('invoices.form.due', {}, { defaultValue: 'Due date' })}
              </span>
              <input
                type="date"
                value={form.due_at}
                onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
                className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'border border-border rounded-lg')}
                data-test="invoice-due"
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('form.notes', {}, { defaultValue: 'Notes' })}
              </span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-border rounded-lg sm:col-span-2',
                )}
                data-test="invoice-notes"
              />
            </label>
          </div>
          {eligibleEntriesForClient.length > 0 && (
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t(
                  'invoices.form.linkEntries',
                  {},
                  { defaultValue: 'Link billable entries (optional)' },
                )}
              </span>
              <div
                className={cm.cn(
                  cm.stack(1),
                  'max-h-40 overflow-y-auto border border-border rounded-lg p-2',
                )}
              >
                {eligibleEntriesForClient.map((e) => {
                  const checked = form.source_entry_ids.includes(e.id)
                  return (
                    <label
                      key={e.id}
                      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          setForm((f) => ({
                            ...f,
                            source_entry_ids: ev.target.checked
                              ? [...f.source_entry_ids, e.id]
                              : f.source_entry_ids.filter((x) => x !== e.id),
                          }))
                        }}
                      />
                      <span className={cm.cn('text-foreground flex-1 truncate')}>
                        {e.description ||
                          t('invoices.form.untitledEntry', {}, { defaultValue: 'Untitled entry' })}
                      </span>
                      <span className={cm.cn('tabular-nums font-mono text-foreground-secondary')}>
                        {((e.duration_seconds ?? 0) / 3600).toFixed(1)}h
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-colors disabled:opacity-60',
              )}
              data-test="invoice-submit"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('invoices.save', {}, { defaultValue: 'Create invoice' })}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      <section className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
        <DurationKpiCard
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={formatCents(totalOutstanding)}
          icon="hourglass_top"
          accent="amber"
        />
        <DurationKpiCard
          label={t('status.overdue', {}, { defaultValue: 'Overdue' })}
          value={formatCents(totalOverdue)}
          icon="priority_high"
          accent="rose"
        />
        <DurationKpiCard
          label={t('invoices.kpi.paid30', {}, { defaultValue: 'Paid · last 30d' })}
          value={formatCents(totalPaid30)}
          icon="check_circle"
          accent="emerald"
        />
        <DurationKpiCard
          label={t('invoices.kpi.drafts', {}, { defaultValue: 'Drafts' })}
          value={String(draftCount)}
          icon="edit_note"
          accent="primary"
          mono={false}
        />
      </section>

      <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
        <div
          className={cm.cn(
            'grid items-center bg-surface-secondary border-b border-border text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
          )}
          style={{
            gridTemplateColumns:
              'minmax(140px,0.7fr) minmax(220px,1.3fr) minmax(110px,0.7fr) minmax(110px,0.7fr) minmax(140px,0.9fr) minmax(120px,0.6fr)',
          }}
        >
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 3))}>
            {t('invoices.col.number', {}, { defaultValue: 'Invoice' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('nav.client', {}, { defaultValue: 'Client' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('invoices.col.issued', {}, { defaultValue: 'Issued' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>{t('form.due', {}, { defaultValue: 'Due' })}</div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('form.amount', {}, { defaultValue: 'Amount' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('nav.status', {}, { defaultValue: 'Status' })}
          </div>
        </div>
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
          >
            {t('invoices.loading', {}, { defaultValue: 'Loading invoices…' })}
          </p>
        ) : invoices.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
            data-test="invoices-empty"
          >
            {t(
              'invoices.empty',
              {},
              { defaultValue: 'No invoices yet. Create your first invoice above.' },
            )}
          </p>
        ) : (
          invoices.map((inv) => {
            const status = computedStatus(inv)
            const client = clientById.get(inv.client_id)
            return (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className={cm.cn(
                  'grid items-center border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors',
                )}
                style={{
                  gridTemplateColumns:
                    'minmax(140px,0.7fr) minmax(220px,1.3fr) minmax(110px,0.7fr) minmax(110px,0.7fr) minmax(140px,0.9fr) minmax(120px,0.6fr)',
                }}
                data-test={`invoice-row-${inv.id}`}
              >
                <div
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-foreground tabular-nums font-mono',
                  )}
                >
                  {inv.number}
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 4))}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-foreground',
                    )}
                  >
                    {client?.name ?? inv.client_id}
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-foreground-secondary tabular-nums font-mono',
                  )}
                >
                  {fmtShort(inv.issued_at)}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-foreground-secondary tabular-nums font-mono',
                  )}
                >
                  {inv.due_at ? fmtShort(inv.due_at) : '—'}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-foreground tabular-nums font-mono',
                  )}
                >
                  {formatCents(inv.total_cents ?? 0, inv.currency)}
                </div>
                <div>
                  <InvoiceStatusPill status={status} />
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}

export default Invoices
export { Invoices as InvoicesPage }
