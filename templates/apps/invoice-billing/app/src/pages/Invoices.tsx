import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { InvoiceStatus } from '../components/InvoiceStatusBadge.js'
import { type InvoiceRow, InvoiceTableRow } from '../components/InvoiceTableRow.js'
import { KpiStatCard } from '../components/KpiStatCard.js'

const STATUS_FILTERS: Array<{ value: 'all' | InvoiceStatus; label: string; defaultLabel: string }> =
  [
    { value: 'all', label: 'invoices.filter.all', defaultLabel: 'All' },
    { value: 'draft', label: 'invoices.filter.draft', defaultLabel: 'Draft' },
    { value: 'sent', label: 'invoices.filter.sent', defaultLabel: 'Sent' },
    { value: 'viewed', label: 'invoices.filter.viewed', defaultLabel: 'Viewed' },
    { value: 'partial', label: 'invoices.filter.partial', defaultLabel: 'Partial' },
    { value: 'paid', label: 'invoices.filter.paid', defaultLabel: 'Paid' },
    { value: 'overdue', label: 'invoices.filter.overdue', defaultLabel: 'Overdue' },
  ]

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function Invoices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<InvoiceRow[]>([])
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')
  // The shell topbar search navigates to /invoices?q=… — honor that param
  // so both search boxes drive the same filter.
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    let active = true
    http
      .get<InvoiceRow[]>('/api/invoices')
      .then((r) => {
        if (active) setData(Array.isArray(r.data) ? r.data : [])
      })
      .catch((err) => {
        if (active) {
          setData([])
          setError(err instanceof Error ? err.message : 'Could not load invoices')
        }
      })
    return () => {
      active = false
    }
  }, [http])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const r = await fetch('/api/exports/invoices.csv', {
        credentials: 'include',
        headers: http.defaultHeaders ?? {},
      })
      if (r.status === 402) {
        setError(
          t(
            'invoices.exportRequiresPaid',
            {},
            { defaultValue: 'Exports are a paid feature — upgrade to enable.' },
          ),
        )
        return
      }
      if (!r.ok) {
        setError(t('invoices.exportError', {}, { defaultValue: 'Export failed.' }))
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'invoices.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const invoices = useMemo<InvoiceRow[]>(() => data, [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (filter !== 'all' && inv.status !== filter) return false
      if (!q) return true
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q) ||
        (inv.client_company ?? '').toLowerCase().includes(q)
      )
    })
  }, [invoices, filter, search])

  const totals = useMemo(() => {
    let outstanding = 0
    let overdue = 0
    let collected = 0
    let count = 0
    for (const inv of invoices) {
      count += 1
      if (inv.status === 'paid') {
        collected += inv.total
      } else if (inv.status === 'overdue') {
        overdue += inv.total - inv.amount_paid
        outstanding += inv.total - inv.amount_paid
      } else if (inv.status === 'partial' || inv.status === 'sent' || inv.status === 'viewed') {
        outstanding += inv.total - inv.amount_paid
      }
    }
    return { outstanding, overdue, collected, count }
  }, [invoices])

  return (
    <div data-mol-id="page-invoices" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('settings.billing', {}, { defaultValue: 'Billing' })}
          </span>
          <h1
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '28px',
              letterSpacing: '-0.02em',
              color: 'var(--mol-color-text)',
              margin: '4px 0 0',
            }}
          >
            {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            data-action="export-invoices"
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-primary-dark)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid var(--mol-color-border)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
          <Link
            to="/invoices/new"
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 6px 18px var(--color-accent-shadow)',
            }}
          >
            {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
          </Link>
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
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        <KpiStatCard
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={formatCurrency(totals.outstanding)}
          icon="schedule_send"
          tone="outstanding"
        />
        <KpiStatCard
          label={t('status.overdue', {}, { defaultValue: 'Overdue' })}
          value={formatCurrency(totals.overdue)}
          icon="schedule"
          tone="overdue"
        />
        <KpiStatCard
          label={t('invoices.kpi.collected', {}, { defaultValue: 'Collected MTD' })}
          value={formatCurrency(totals.collected)}
          icon="paid"
          tone="revenue"
        />
        <KpiStatCard
          label={t('invoices.kpi.count', {}, { defaultValue: 'Total invoices' })}
          value={String(totals.count)}
          icon="receipt_long"
          tone="collected"
          caption={t('invoices.kpi.countCaption', {}, { defaultValue: 'This year' })}
        />
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}
        style={{
          flexWrap: 'wrap',
          padding: '14px 16px',
          backgroundColor: 'var(--mol-color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--mol-color-border)',
        }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          style={{ flexWrap: 'wrap', flex: 1, minWidth: 0 }}
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = filter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cm.cn(cm.fontWeight(isActive ? 'bold' : 'medium'))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? 'var(--color-primary-dark)'
                    : 'var(--color-draft-light)',
                  color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--mol-color-text)',
                  letterSpacing: '0.02em',
                }}
              >
                {t(f.label, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          style={{
            backgroundColor: 'var(--mol-color-surface-secondary)',
            borderRadius: '10px',
            padding: '6px 12px',
            border: '1px solid var(--mol-color-border)',
            minWidth: '240px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: 'var(--mol-color-text-secondary)' }}
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('invoices.search', {}, { defaultValue: 'Invoice # or client' })}
            aria-label={t('invoices.search', {}, { defaultValue: 'Invoice # or client' })}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--mol-color-text)',
            }}
          />
        </div>
      </div>

      <section
        className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}
        style={{ border: '1px solid var(--mol-color-border)' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.6fr 1.1fr 1.4fr 1.1fr 0.8fr',
            padding: '12px 16px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--mol-color-text-tertiary)',
            backgroundColor: 'var(--mol-color-surface-secondary)',
            borderBottom: '1px solid var(--mol-color-border)',
          }}
        >
          <span>{t('invoices.col.number', {}, { defaultValue: 'Invoice' })}</span>
          <span>{t('nav.client', {}, { defaultValue: 'Client' })}</span>
          <span>{t('form.due', {}, { defaultValue: 'Due' })}</span>
          <span style={{ textAlign: 'right' }}>
            {t('form.amount', {}, { defaultValue: 'Amount' })}
          </span>
          <span>{t('nav.status', {}, { defaultValue: 'Status' })}</span>
          <span style={{ textAlign: 'right' }}>
            {t('invoices.col.paid', {}, { defaultValue: 'Paid' })}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div
            data-testid="invoices-empty"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              color: 'var(--mol-color-text-tertiary)',
              fontSize: '14px',
            }}
          >
            {invoices.length === 0
              ? t(
                  'invoices.emptyAll',
                  {},
                  { defaultValue: 'No invoices yet — create your first one.' },
                )
              : t('invoices.empty', {}, { defaultValue: 'No invoices match those filters.' })}
          </div>
        ) : (
          filtered.map((inv) => <InvoiceTableRow key={inv.id} invoice={inv} />)
        )}
      </section>
    </div>
  )
}

export default Invoices
