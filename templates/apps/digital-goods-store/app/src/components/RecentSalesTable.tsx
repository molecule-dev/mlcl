import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Recent sales table — uppercase 10px headers, divider rows, hover bg, status
 * pill (licensed/refund/expired), tabular revenue column, mono license key.
 * Per DESIGN.md "Sales Table" spec.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx + the
 * catalog §3.x editorial table recipe.
 */

export interface SaleRow {
  id: string
  productName: string
  productSlug?: string
  customerName: string
  customerEmail?: string
  /** Avatar URL for the customer. */
  customerAvatar?: string
  /** Revenue in cents (gross, post-fee). */
  amountCents: number
  /** ISO timestamp. */
  occurredAt: string
  status: 'licensed' | 'refunded' | 'expired' | 'pending'
  licenseKey?: string
}

interface RecentSalesTableProps {
  sales: SaleRow[]
  title?: string
  viewAllHref?: string
  /** Show the license-key column. Defaults to true. */
  showLicense?: boolean
}

const STATUS_PILL: Record<SaleRow['status'], string> = {
  licensed: 'bg-success-light text-success',
  refunded: 'bg-error-light text-error',
  expired: 'bg-bg-tertiary text-on-surface-variant',
  pending: 'bg-warning-light text-warning',
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function avatarInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export default function RecentSalesTable({
  sales,
  title,
  viewAllHref = '/sales',
  showLicense = true,
}: RecentSalesTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.sp('p', 8), 'rounded-2xl bg-surface-container-lowest shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
          {title ?? t('recentSalesTable.title', {}, { defaultValue: 'Recent Sales' })}
        </h3>
        <Link
          to={viewAllHref}
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary-dark hover:text-primary-hover',
          )}
        >
          {t('common.viewAll', {}, { defaultValue: 'View all' })}
        </Link>
      </div>
      {sales.length === 0 ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('py', 8),
            'text-on-surface-variant text-center',
          )}
        >
          {t(
            'recentSalesTable.empty',
            {},
            { defaultValue: 'No sales yet — share your storefront to make your first sale.' },
          )}
        </p>
      ) : (
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn(cm.w('full'), 'border-collapse')}>
            <thead>
              <tr className={cm.cn('border-b border-border')}>
                <th
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.sp('pr', 4),
                    cm.fontWeight('bold'),
                    'text-left text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.product', {}, { defaultValue: 'Product' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.sp('pr', 4),
                    cm.fontWeight('bold'),
                    'text-left text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.customer', {}, { defaultValue: 'Customer' })}
                </th>
                {showLicense && (
                  <th
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.sp('pr', 4),
                      cm.fontWeight('bold'),
                      'text-left text-[10px] uppercase tracking-widest text-on-surface-variant hidden md:table-cell',
                    )}
                  >
                    {t('recentSalesTable.col.license', {}, { defaultValue: 'License' })}
                  </th>
                )}
                <th
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.sp('pr', 4),
                    cm.fontWeight('bold'),
                    'text-left text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-right text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-border')}>
              {sales.map((sale) => (
                <tr key={sale.id} className={cm.cn('hover:bg-bg-secondary transition-colors')}>
                  <td className={cm.cn(cm.sp('py', 4), cm.sp('pr', 4))}>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        {sale.productSlug ? (
                          <Link
                            to={`/shop/${sale.productSlug}`}
                            className={cm.cn('hover:text-primary')}
                          >
                            {sale.productName}
                          </Link>
                        ) : (
                          sale.productName
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {formatDate(sale.occurredAt)}
                      </p>
                    </div>
                  </td>
                  <td className={cm.cn(cm.sp('py', 4), cm.sp('pr', 4))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      {sale.customerAvatar ? (
                        <img
                          src={sale.customerAvatar}
                          alt=""
                          className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                          style={{ border: '2px solid var(--color-surface)' }}
                        />
                      ) : (
                        <div
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'bg-primary-light text-on-primary-container',
                          )}
                        >
                          {avatarInitials(sale.customerName)}
                        </div>
                      )}
                      <div>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            'text-on-surface',
                          )}
                        >
                          {sale.customerName}
                        </p>
                        {sale.customerEmail && (
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {sale.customerEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {showLicense && (
                    <td className={cm.cn(cm.sp('py', 4), cm.sp('pr', 4), 'hidden md:table-cell')}>
                      {sale.licenseKey ? (
                        <code
                          className={cm.cn(cm.textSize('xs'))}
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            color: 'var(--color-license-key, var(--color-accent))',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {sale.licenseKey}
                        </code>
                      ) : (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          —
                        </span>
                      )}
                    </td>
                  )}
                  <td className={cm.cn(cm.sp('py', 4), cm.sp('pr', 4))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest',
                        STATUS_PILL[sale.status],
                      )}
                    >
                      {t(
                        `recentSalesTable.status.${sale.status}`,
                        {},
                        { defaultValue: sale.status },
                      )}
                    </span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'text-right text-on-surface',
                    )}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatUsd(sale.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export { RecentSalesTable }
