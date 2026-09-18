import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type InvoiceStatus, InvoiceStatusBadge } from './InvoiceStatusBadge.js'

/**
 * Editorial invoice table row — mono invoice number, client name+company stack,
 * tabular-num right-aligned amount in semantic color (paid/overdue/due), status
 * pill, due-date relative time, hover lift surface-secondary.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx — converted
 * to a 6-col table grid keyed to DESIGN.md's "Invoice Table" recipe (52px row,
 * 12/16 padding, divide-y).
 */

export interface InvoiceRow {
  id: string
  invoice_number: string
  client_name: string
  client_company?: string
  total: number
  amount_paid: number
  status: InvoiceStatus
  due_date: string
  currency?: string
}

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount))

const formatRelativeDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface InvoiceTableRowProps {
  invoice: InvoiceRow
}

export function InvoiceTableRow({ invoice }: InvoiceTableRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dueColor =
    invoice.status === 'paid'
      ? 'var(--color-paid)'
      : invoice.status === 'overdue'
        ? 'var(--color-overdue)'
        : invoice.status === 'partial'
          ? 'var(--color-partial)'
          : 'var(--mol-color-text)'

  return (
    <Link
      to={`/invoices/${invoice.id}`}
      data-mol-id={`invoice-row-${invoice.id}`}
      className={cm.cn(cm.flex({ align: 'center' }))}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1.6fr 1.1fr 1.4fr 1.1fr 0.8fr',
        alignItems: 'center',
        padding: '14px 16px',
        backgroundColor: 'var(--mol-color-surface)',
        borderBottom: '1px solid var(--color-draft-light)',
        textDecoration: 'none',
        color: 'var(--mol-color-text)',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.backgroundColor =
          'var(--mol-color-surface-secondary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--mol-color-surface)'
      }}
    >
      <span
        className={cm.cn(cm.fontWeight('semibold'))}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: 'var(--color-primary-dark)',
          letterSpacing: '-0.01em',
        }}
      >
        {invoice.invoice_number}
      </span>
      <div className={cm.cn(cm.flex({ direction: 'col' }))}>
        <span className={cm.cn(cm.fontWeight('semibold'))} style={{ fontSize: '14px' }}>
          {invoice.client_name}
        </span>
        {invoice.client_company ? (
          <span style={{ fontSize: '12px', color: 'var(--mol-color-text-secondary)' }}>
            {invoice.client_company}
          </span>
        ) : null}
      </div>
      <span style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)' }}>
        {formatRelativeDate(invoice.due_date)}
      </span>
      <span
        className={cm.cn(cm.fontWeight('bold'))}
        style={{
          fontSize: '15px',
          color: dueColor,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {formatCurrency(invoice.total, invoice.currency)}
      </span>
      <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <InvoiceStatusBadge status={invoice.status} />
      </span>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--mol-color-text-tertiary)',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {invoice.amount_paid > 0
          ? t(
              'invoiceTableRow.paidLabel',
              { amount: formatCurrency(invoice.amount_paid, invoice.currency) },
              { defaultValue: '{{amount}} paid' },
            )
          : t('invoiceTableRow.openLabel', {}, { defaultValue: 'Awaiting' })}
      </span>
    </Link>
  )
}

export default InvoiceTableRow
