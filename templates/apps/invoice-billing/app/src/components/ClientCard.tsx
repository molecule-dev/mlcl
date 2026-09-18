import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Client card — avatar initials, client name + company, email link, outstanding
 * balance right-aligned in coral tabular-nums, invoice count badge, last activity
 * relative time. Used on /clients grid and as link on dashboard sidebar.
 *
 * Translated from personal-finance/AccountCard.tsx — swapped sparkline for
 * outstanding-balance hero number per DESIGN.md "Client Card" recipe.
 */

export interface ClientCardData {
  id: string
  name: string
  company?: string
  email?: string
  outstanding_cents: number
  invoice_count: number
  last_activity?: string
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

const relative = (iso?: string) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

interface ClientCardProps {
  client: ClientCardData
}

export function ClientCard({ client }: ClientCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const due = client.outstanding_cents
  const dueColor = due > 0 ? 'var(--color-amount-due)' : 'var(--color-amount-positive)'

  return (
    <Link
      to={`/clients/${client.id}`}
      data-mol-id={`client-card-${client.id}`}
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-2xl shadow-sm hover:shadow-lg transition-all group',
      )}
      style={{
        textDecoration: 'none',
        color: 'var(--mol-color-text)',
        border: '1px solid var(--mol-color-border)',
        display: 'block',
      }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
            )}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--mol-color-primary-light)',
              color: 'var(--color-primary-dark)',
              fontSize: '15px',
              letterSpacing: '0.05em',
            }}
          >
            {initials(client.name) || '?'}
          </span>
          <div>
            <div
              className={cm.cn(cm.fontWeight('bold'))}
              style={{ fontSize: '15px', color: 'var(--mol-color-text)' }}
            >
              {client.name}
            </div>
            {client.company ? (
              <div style={{ fontSize: '12px', color: 'var(--mol-color-text-secondary)' }}>
                {client.company}
              </div>
            ) : null}
          </div>
        </div>
        <span
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-draft-light)',
            color: 'var(--color-draft)',
            fontSize: '11px',
            letterSpacing: '0.04em',
          }}
        >
          {t(
            'clientCard.invoiceCount',
            { count: client.invoice_count },
            { defaultValue: '{{count}} inv' },
          )}
        </span>
      </div>

      {client.email ? (
        <div
          className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'xs' }))}
          style={{ color: 'var(--color-sidebar-hover)', fontSize: '13px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            mail
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.email}
          </span>
        </div>
      ) : null}

      <div
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), cm.sp('mt', 5))}
        style={{ borderTop: '1px solid var(--color-draft-light)', paddingTop: '16px' }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--mol-color-text-tertiary)',
              fontWeight: 700,
            }}
          >
            {t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          </div>
          <div
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              fontSize: '22px',
              color: dueColor,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              marginTop: '2px',
            }}
          >
            {formatCurrency(due)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--mol-color-text-tertiary)',
              fontWeight: 700,
            }}
          >
            {t('clientCard.lastActivityLabel', {}, { defaultValue: 'Last activity' })}
          </div>
          <div
            style={{ fontSize: '12px', color: 'var(--mol-color-text-secondary)', marginTop: '2px' }}
          >
            {relative(client.last_activity) ??
              t('clientCard.noActivity', {}, { defaultValue: 'No activity' })}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ClientCard
