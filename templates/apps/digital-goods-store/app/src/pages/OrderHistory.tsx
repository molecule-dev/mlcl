import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiOrderItem {
  product_id: string
  product_slug: string
  name: string
  price_cents: number
  license_key?: string | null
  file_type?: string
}

function unwrapDownload(res: unknown): { url?: string } | null {
  if (res && typeof res === 'object' && 'data' in res) {
    const d = (res as { data: unknown }).data
    if (d && typeof d === 'object') return d as { url?: string }
  }
  if (res && typeof res === 'object' && 'url' in (res as Record<string, unknown>)) {
    return res as { url?: string }
  }
  return null
}

interface ApiOrder {
  id: string
  number: string
  placed_at: string
  status: 'completed' | 'refunded' | 'pending'
  total_cents: number
  items: ApiOrderItem[]
}

const STATUS_PILL: Record<ApiOrder['status'], string> = {
  completed: 'bg-success-light text-success',
  refunded: 'bg-error-light text-error',
  pending: 'bg-warning-light text-warning',
}

function unwrap(res: unknown): ApiOrder[] {
  if (Array.isArray(res)) return res as ApiOrder[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiOrder[]
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiOrder[]
    }
  }
  return []
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function OrderHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    http
      .get('/api/orders')
      .then((res) => setOrders(unwrap(res)))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [http])

  const handleDownloadAll = async (order: ApiOrder) => {
    setDownloadError(null)
    setDownloadingId(order.id)
    try {
      // Fetch a signed URL per item; open the first in the current tab and
      // remaining in new tabs so the buyer ends up with one tab per file.
      const urls: string[] = []
      for (const item of order.items) {
        const res = await http.get(`/api/downloads/${encodeURIComponent(item.product_id)}`)
        const inner = unwrapDownload(res)
        if (inner?.url) urls.push(inner.url)
      }
      if (urls.length === 0) {
        setDownloadError(
          t(
            'orderHistory.downloadError',
            {},
            { defaultValue: 'Download not available right now.' },
          ),
        )
        return
      }
      void track({
        name: 'download.started',
        properties: {
          order_id: order.id,
          product_ids: order.items.map((i) => i.product_id),
        },
      })
      const [first, ...rest] = urls
      for (const u of rest) window.open(u, '_blank', 'noopener')
      window.location.assign(first)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(8))}>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('orderHistory.eyebrow', {}, { defaultValue: 'Receipts' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-on-surface',
          )}
        >
          {t('orderHistory.title', {}, { defaultValue: 'Order history' })}
        </h1>
      </div>

      {downloadError && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-error/20',
          )}
        >
          {downloadError}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : orders.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), 'rounded-2xl bg-surface-container-lowest text-center')}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 56 }}
          >
            receipt_long
          </span>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('orderHistory.empty', {}, { defaultValue: 'No orders yet' })}
          </p>
          <Link
            to="/shop"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 3),
              'inline-block text-primary-dark hover:text-primary-hover',
            )}
          >
            {t('orderHistory.browseLink', {}, { defaultValue: 'Browse the storefront →' })}
          </Link>
        </div>
      ) : (
        <ul className={cm.stack(4)}>
          {orders.map((order) => (
            <li
              key={order.id}
              className={cm.cn('rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden')}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'flex-wrap gap-3 border-b border-border-light',
                )}
              >
                <div>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    style={{ fontFamily: 'var(--font-family-mono)' }}
                  >
                    {order.number}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {new Date(order.placed_at).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest',
                      STATUS_PILL[order.status],
                    )}
                  >
                    {t(`orderHistory.status.${order.status}`, {}, { defaultValue: order.status })}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(order.total_cents)}
                  </span>
                </div>
              </div>
              <ul className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), cm.stack(3))}>
                {order.items.map((item) => (
                  <li
                    key={item.product_slug + item.name}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'flex-wrap gap-2',
                    )}
                  >
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <Link
                        to={`/shop/${item.product_slug}`}
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          'text-on-surface hover:text-primary',
                        )}
                      >
                        {item.name}
                      </Link>
                      {item.license_key && (
                        <p
                          className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            color: 'var(--color-license-key, var(--color-accent))',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {item.license_key}
                        </p>
                      )}
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.price_cents === 0
                        ? t('orderHistory.free', {}, { defaultValue: 'Free' })
                        : formatPrice(item.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
              <footer
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'border-t border-border-light bg-bg-secondary',
                )}
              >
                <Link
                  to={`/order/${order.id}/confirm`}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary-dark hover:text-primary-hover',
                  )}
                >
                  {t('orderHistory.viewReceipt', {}, { defaultValue: 'View receipt' })}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownloadAll(order)}
                  disabled={downloadingId === order.id || order.items.length === 0}
                  data-testid={`order-download-${order.id}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'inline-flex items-center gap-2 bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    download
                  </span>
                  {downloadingId === order.id
                    ? t('orderHistory.downloading', {}, { defaultValue: 'Downloading…' })
                    : t('orderHistory.downloadAll', {}, { defaultValue: 'Download all' })}
                </button>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default OrderHistory
