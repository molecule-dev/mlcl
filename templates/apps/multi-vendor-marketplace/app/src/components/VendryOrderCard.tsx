import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VendryOrderStatus =
  'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export interface VendryOrderItem {
  id: string
  name: string
  vendor_name: string
  vendor_slug?: string
  quantity: number
  price_cents: number
  image_url?: string
}

export interface VendryOrderVendorGroup {
  vendor_id: string
  vendor_name: string
  vendor_slug?: string
  vendor_verified?: boolean
  status: VendryOrderStatus
  subtotal_cents: number
  items: VendryOrderItem[]
  tracking_number?: string
  carrier?: string
}

export interface VendryOrder {
  id: string
  display_id: string
  placed_at: string
  status: VendryOrderStatus
  total_cents: number
  vendor_groups: VendryOrderVendorGroup[]
}

interface VendryOrderCardProps {
  order: VendryOrder
  /** Hide the linked detail row (used on detail screens themselves). */
  hideDetailLink?: boolean
}

const statusToTokens: Record<VendryOrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-warning/15', text: 'text-warning', label: 'Pending' },
  paid: { bg: 'bg-info/15', text: 'text-sky-700 dark:text-info', label: 'Paid' },
  processing: { bg: 'bg-info/15', text: 'text-sky-700 dark:text-info', label: 'Processing' },
  shipped: { bg: 'bg-primary/15', text: 'text-primary', label: 'Shipped' },
  delivered: { bg: 'bg-success/15', text: 'text-success', label: 'Delivered' },
  cancelled: { bg: 'bg-error/15', text: 'text-error', label: 'Cancelled' },
  refunded: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', label: 'Refunded' },
}

const FALLBACK_STATUS_TOKEN = {
  bg: 'bg-surface-container-high',
  text: 'text-on-surface-variant',
  label: 'Unknown',
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Multi-vendor order card — header summary plus a per-vendor block for
 * each shop in the order. Each vendor group shows its own status pill and
 * tracking, since fulfillment in Vendry is per-seller.
 *
 * Translated from online-store's OrderCard.tsx, expanded to handle the
 * per-vendor grouping unique to a marketplace.
 */
export function VendryOrderCard({ order, hideDetailLink = false }: VendryOrderCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const orderStatus = statusToTokens[order.status] ?? FALLBACK_STATUS_TOKEN
  const statusLabel = (status: VendryOrderStatus, fallback: string): string =>
    t(`status.${status}`, {}, { defaultValue: fallback })

  return (
    <article
      className={cm.cn(
        'overflow-hidden rounded-2xl border border-outline-variant bg-surface transition-all hover:shadow-md',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'bg-surface-container-low border-b border-outline-variant',
        )}
      >
        <div className={cm.cn(cm.stack(1))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant font-semibold',
            )}
          >
            {t('vendryOrderCard.idLabel', {}, { defaultValue: 'Order' })}{' '}
            <span className="font-mono text-on-surface">{order.display_id}</span>
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'vendryOrderCard.placedOn',
              { date: formatDate(order.placed_at) },
              { defaultValue: 'Placed {{date}}' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'uppercase tracking-widest',
              orderStatus.bg,
              orderStatus.text,
            )}
          >
            {statusLabel(order.status, orderStatus.label)}
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tabular-nums')}>
            {formatCents(order.total_cents)}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.stack(0))}>
        {order.vendor_groups.map((group, idx) => {
          const groupStatus = statusToTokens[group.status] ?? FALLBACK_STATUS_TOKEN
          return (
            <section
              key={`${order.id}-${group.vendor_id}-${idx}`}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 4),
                idx > 0 && 'border-t border-outline-variant',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'sm' }),
                  cm.sp('mb', 3),
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                    'min-w-0',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-info"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden
                  >
                    storefront
                  </span>
                  {group.vendor_slug ? (
                    <Link
                      to={`/vendors/${group.vendor_slug}`}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'text-sky-700 dark:text-info hover:underline',
                      )}
                    >
                      {group.vendor_name}
                    </Link>
                  ) : (
                    <span
                      className={cm.cn(cm.fontWeight('semibold'), 'text-sky-700 dark:text-info')}
                    >
                      {group.vendor_name}
                    </span>
                  )}
                  {group.vendor_verified && (
                    <span
                      className="material-symbols-outlined text-secondary"
                      style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                      aria-label={t(
                        'vendryOrderCard.verifiedAria',
                        {},
                        { defaultValue: 'Verified vendor' },
                      )}
                    >
                      verified
                    </span>
                  )}
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.sp('px', 2),
                      cm.sp('py', 0),
                      cm.roundedFull,
                      'uppercase tracking-widest',
                      groupStatus.bg,
                      groupStatus.text,
                    )}
                  >
                    {statusLabel(group.status, groupStatus.label)}
                  </span>
                </div>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface tabular-nums')}>
                  {formatCents(group.subtotal_cents)}
                </span>
              </div>
              <ul className={cm.cn(cm.stack(2))}>
                {group.items.map((item) => (
                  <li key={item.id} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                    <img
                      src={
                        item.image_url ?? `https://picsum.photos/seed/vendry-order-${item.id}/72/72`
                      }
                      alt={item.name}
                      className={
                        'h-12 w-12 shrink-0 rounded-xl object-cover bg-surface-container-low'
                      }
                      loading="lazy"
                    />
                    <div className={'min-w-0 flex-1'}>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface truncate')}>
                        {item.name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'vendryOrderCard.qty',
                          { count: item.quantity },
                          { defaultValue: 'Qty {{count}}' },
                        )}
                      </p>
                    </div>
                    <span
                      className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface tabular-nums')}
                    >
                      {formatCents(item.price_cents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              {group.tracking_number && (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 3),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px' }}
                    aria-hidden
                  >
                    local_shipping
                  </span>
                  {t(
                    'vendryOrderCard.tracking',
                    {
                      carrier:
                        group.carrier ??
                        t('vendryOrderCard.carrierFallback', {}, { defaultValue: 'Carrier' }),
                      tracking: group.tracking_number,
                    },
                    { defaultValue: '{{carrier}} · {{tracking}}' },
                  )}
                </p>
              )}
            </section>
          )
        })}
      </div>
      {!hideDetailLink && (
        <footer
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            'border-t border-outline-variant bg-surface-container-low',
          )}
        >
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'vendryOrderCard.vendorCount',
              { count: order.vendor_groups.length },
              { defaultValue: '{{count}} vendor(s) in this order' },
            )}
          </span>
          <Link
            to={`/orders/${order.id}`}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-primary hover:underline inline-flex items-center gap-1',
            )}
          >
            {t('vendryOrderCard.viewDetails', {}, { defaultValue: 'View details' })}
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
              arrow_forward
            </span>
          </Link>
        </footer>
      )}
    </article>
  )
}

export default VendryOrderCard
