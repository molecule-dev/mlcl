import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ContractStatus, ContractStatusPill } from './ContractStatusPill.js'

/**
 * Editorial contract row — left status accent stripe, title + counterparty
 * stack, right-aligned amount + expiry meta. Used by the dashboard
 * "expiring soon" feed and any other contract list preview.
 *
 * Translated from crm/CompanyRow.tsx + blog/ArticleListItem.tsx — emphasis
 * on legible typography hierarchy and a clear status accent.
 */
const ACCENT_STRIPE: Record<ContractStatus, string> = {
  draft: 'bg-outline',
  pending: 'bg-warning',
  active: 'bg-success',
  expiring: 'bg-warning',
  expired: 'bg-error',
  voided: 'bg-error/60',
}

export interface VellumContractRowProps {
  id: string
  title: string
  counterparty: string
  status: ContractStatus
  amountCents: number | null
  expiresAt: string | null
  href?: string
}

function fmtUsd(cents: number | null): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function VellumContractRow({
  id,
  title,
  counterparty,
  status,
  amountCents,
  expiresAt,
  href,
}: VellumContractRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const target = href ?? `/contracts/${id}`

  return (
    <Link
      to={target}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 4),
        'group relative overflow-hidden rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant transition-all hover:-translate-y-0.5 hover:ring-primary/30 hover:shadow-md',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('absolute inset-y-0 left-0 w-1', ACCENT_STRIPE[status])}
      />

      <div className={cm.cn(cm.flex1, cm.sp('pl', 2), 'min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <p className={cm.cn(cm.fontWeight('semibold'), 'truncate text-on-surface')}>{title}</p>
          <ContractStatusPill status={status} />
        </div>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'vellumContractRow.counterparty',
            { name: counterparty },
            { defaultValue: '{{name}}' },
          )}
          {expiresAt
            ? ` · ${t('vellumContractRow.expires', { when: fmtDate(expiresAt) }, { defaultValue: 'expires {{when}}' })}`
            : ''}
        </p>
      </div>

      <div className={cm.cn(cm.textRight, 'shrink-0')}>
        <p className={cm.cn(cm.fontWeight('extrabold'), 'tabular-nums text-on-surface')}>
          {fmtUsd(amountCents)}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('vellumContractRow.view', {}, { defaultValue: 'Open contract →' })}
        </p>
      </div>
    </Link>
  )
}
