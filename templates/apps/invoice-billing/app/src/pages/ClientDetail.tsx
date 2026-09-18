import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeed, type ActivityItem, type ActivityKind } from '../components/ActivityFeed.js'
import { type InvoiceRow, InvoiceTableRow } from '../components/InvoiceTableRow.js'

interface ClientData {
  id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  address: string | Record<string, unknown> | null
  outstanding_cents: number
  invoice_count: number
  total_billed: number
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

const renderAddress = (addr: ClientData['address']): string => {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  const parts = ['line1', 'line2', 'city', 'state', 'postal_code', 'country']
    .map((k) => (addr as Record<string, unknown>)[k])
    .filter(Boolean)
    .map(String)
  return parts.join(', ')
}

export function ClientDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [client, setClient] = useState<ClientData | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const [c, inv] = await Promise.all([
        http.get<ClientData>(`/api/clients/${id}`),
        http.get<InvoiceRow[]>(`/api/invoices?client_id=${id}`),
      ])
      setClient(c.data)
      setInvoices(Array.isArray(inv.data) ? inv.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load client')
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!client) {
    return (
      <div data-mol-id="page-client-detail" style={{ padding: '40px', textAlign: 'center' }}>
        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger-hover)' }}>
            {error}
          </p>
        ) : (
          <p style={{ color: 'var(--mol-color-text-secondary)' }}>
            {t('clientDetail.loading', {}, { defaultValue: 'Loading client…' })}
          </p>
        )}
        <Link to="/clients" style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600 }}>
          {t('clientDetail.back', {}, { defaultValue: '← Back to clients' })}
        </Link>
      </div>
    )
  }

  const lifetimeCents = Math.round((client.total_billed ?? 0) * 100)
  const timeline: ActivityItem[] = []
  for (const inv of invoices.slice(0, 10)) {
    timeline.push({
      id: 'inv-' + inv.id,
      kind: 'created' as ActivityKind,
      invoice_number: inv.invoice_number,
      client_name: client.name,
      message: t(
        'clientDetail.event.created',
        { number: inv.invoice_number },
        { defaultValue: 'Drafted {{number}}' },
      ),
      amount_cents: Math.round(inv.total * 100),
      occurred_at:
        (inv as unknown as { created_at?: string }).created_at ?? new Date().toISOString(),
    })
  }

  return (
    <div
      data-mol-id="page-client-detail"
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
    >
      <Link
        to="/clients"
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-sidebar-hover)',
          textDecoration: 'none',
        }}
      >
        {t('clientDetail.back', {}, { defaultValue: '← Back to clients' })}
      </Link>

      <section
        className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-sm')}
        style={{ border: '1px solid var(--mol-color-border)' }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}
          style={{ flexWrap: 'wrap', gap: '24px' }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
              )}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'var(--mol-color-primary-light)',
                color: 'var(--color-primary-dark)',
                fontSize: '24px',
                letterSpacing: '0.04em',
              }}
            >
              {initials(client.name) || '?'}
            </span>
            <div>
              <h1
                data-testid="client-name"
                className={cm.cn(cm.fontWeight('bold'))}
                style={{
                  fontSize: '28px',
                  letterSpacing: '-0.02em',
                  color: 'var(--mol-color-text)',
                  margin: 0,
                }}
              >
                {client.name}
              </h1>
              <p
                style={{
                  color: 'var(--mol-color-text-secondary)',
                  fontSize: '13px',
                  margin: '4px 0 0',
                }}
              >
                {client.company ?? ''}
                {renderAddress(client.address) ? ' · ' + renderAddress(client.address) : ''}
              </p>
              {client.email ? (
                <p
                  style={{
                    color: 'var(--color-sidebar-hover)',
                    fontSize: '13px',
                    margin: '6px 0 0',
                    fontWeight: 600,
                  }}
                >
                  {client.email}
                </p>
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--mol-color-text-tertiary)',
                fontWeight: 700,
              }}
            >
              {t('clientDetail.outstanding', {}, { defaultValue: 'Outstanding balance' })}
            </span>
            <div
              data-testid="client-outstanding"
              className={cm.cn(cm.fontWeight('bold'))}
              style={{
                fontSize: '32px',
                color: client.outstanding_cents > 0 ? 'var(--color-accent)' : 'var(--color-paid)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.025em',
                marginTop: '4px',
              }}
            >
              {formatCurrency(client.outstanding_cents)}
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: 'var(--mol-color-text-secondary)',
              }}
            >
              {t(
                'clientDetail.lifetime',
                { amount: formatCurrency(lifetimeCents) },
                { defaultValue: '{{amount}} lifetime billed' },
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <section
          className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}
          style={{ border: '1px solid var(--mol-color-border)' }}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
            style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-draft-light)' }}
          >
            <h3
              className={cm.cn(cm.fontWeight('bold'))}
              style={{ fontSize: '16px', color: 'var(--mol-color-text)', letterSpacing: '-0.01em' }}
            >
              {t('clientDetail.invoiceHistory', {}, { defaultValue: 'Invoice history' })}
            </h3>
            <Link
              to={`/invoices/new?client=${client.id}`}
              data-action="bill-again"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-sidebar-hover)',
                textDecoration: 'none',
              }}
            >
              {t('clientDetail.newForClient', {}, { defaultValue: 'Bill again →' })}
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div
              data-testid="client-invoices-empty"
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--mol-color-text-tertiary)',
                fontSize: '13px',
              }}
            >
              {t(
                'clientDetail.noInvoices',
                {},
                { defaultValue: 'No invoices for this client yet.' },
              )}
            </div>
          ) : (
            <>
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
                <span>{t('clientDetail.col.number', {}, { defaultValue: 'Invoice' })}</span>
                <span>{t('nav.client', {}, { defaultValue: 'Client' })}</span>
                <span>{t('form.due', {}, { defaultValue: 'Due' })}</span>
                <span style={{ textAlign: 'right' }}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </span>
                <span>{t('nav.status', {}, { defaultValue: 'Status' })}</span>
                <span style={{ textAlign: 'right' }}>
                  {t('clientDetail.col.paid', {}, { defaultValue: 'Paid' })}
                </span>
              </div>
              {invoices.map((inv) => (
                <InvoiceTableRow key={inv.id} invoice={inv} />
              ))}
            </>
          )}
        </section>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}
            style={{ border: '1px solid var(--mol-color-border)' }}
          >
            <h3
              className={cm.cn(cm.fontWeight('bold'))}
              style={{ fontSize: '14px', color: 'var(--mol-color-text)' }}
            >
              {t('nav.contact', {}, { defaultValue: 'Contact' })}
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: '12px' }}>
              {client.email ? (
                <li
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                  style={{
                    padding: '6px 0',
                    fontSize: '13px',
                    color: 'var(--mol-color-text-secondary)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--color-sidebar-hover)' }}
                  >
                    mail
                  </span>
                  {client.email}
                </li>
              ) : null}
              {client.phone ? (
                <li
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                  style={{
                    padding: '6px 0',
                    fontSize: '13px',
                    color: 'var(--mol-color-text-secondary)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--color-sidebar-hover)' }}
                  >
                    call
                  </span>
                  {client.phone}
                </li>
              ) : null}
              {renderAddress(client.address) ? (
                <li
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                  style={{
                    padding: '6px 0',
                    fontSize: '13px',
                    color: 'var(--mol-color-text-secondary)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--color-sidebar-hover)' }}
                  >
                    pin_drop
                  </span>
                  {renderAddress(client.address)}
                </li>
              ) : null}
              {!client.email && !client.phone && !renderAddress(client.address) ? (
                <li
                  style={{
                    padding: '6px 0',
                    fontSize: '13px',
                    color: 'var(--mol-color-text-tertiary)',
                  }}
                >
                  {t('clientDetail.noContact', {}, { defaultValue: 'No contact info on file.' })}
                </li>
              ) : null}
            </ul>
          </section>

          <ActivityFeed
            items={timeline}
            title={t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          />
        </div>
      </div>
    </div>
  )
}

export default ClientDetail
