import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { LicenseKeyDisplay } from '../components/LicenseKeyDisplay.js'

interface OrderItem {
  product_id: string
  product_slug: string
  name: string
  price_cents: number
  license_key?: string | null
  file_type?: string | null
}

interface Order {
  id: string
  number: string
  placed_at: string
  status: string
  total_cents: number
  items: OrderItem[]
}

function unwrap<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  if ('data' in res) {
    const inner = (res as { data: unknown }).data
    if (inner && typeof inner === 'object') return inner as T
  }
  return res as T
}

export function OrderConfirm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    const fetchOrder = async () => {
      try {
        let purchaseId: string | null = null
        if (id.startsWith('cs_')) {
          const sessionRes = await http.get(`/api/checkout/session/${encodeURIComponent(id)}`)
          const inner = unwrap<{ purchaseId?: string | null; purchase_id?: string | null }>(
            sessionRes,
          )
          purchaseId = inner?.purchaseId ?? inner?.purchase_id ?? null
          if (!purchaseId) {
            setError(
              t(
                'orderConfirm.fulfilling',
                {},
                { defaultValue: 'Payment received — finalising your order…' },
              ),
            )
            setOrder(null)
            return
          }
        } else {
          purchaseId = id
        }
        const orderRes = await http.get(`/api/orders/${encodeURIComponent(purchaseId)}`)
        const ord = unwrap<Order>(orderRes)
        if (!ord) {
          setError(t('orderConfirm.notFound', {}, { defaultValue: 'Order not found.' }))
          return
        }
        // Conversion milestone: the Stripe redirect landed back in the app
        // and the fulfilled order is confirmed. Fire once per order load —
        // `track` is a silent no-op without a bonded provider.
        if (ord.status === 'completed') {
          void track({
            name: 'purchase.completed',
            properties: {
              order_id: ord.id,
              product_ids: ord.items.map((i) => i.product_id),
              amount_cents: ord.total_cents,
            },
          })
        }
        setOrder(ord)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [http, id, t])

  const handleDownload = async (item: OrderItem) => {
    setDownloadingId(item.product_id)
    try {
      const res = await http.get(`/api/downloads/${encodeURIComponent(item.product_id)}`)
      const inner = unwrap<{ url?: string }>(res)
      if (inner?.url) {
        void track({
          name: 'download.started',
          properties: { product_id: item.product_id, order_id: order?.id },
        })
        window.location.assign(inner.url)
      } else {
        setError(
          t(
            'orderConfirm.downloadError',
            {},
            { defaultValue: 'Download not available right now.' },
          ),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), 'w-full max-w-[1000px]')}>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/20',
          )}
        >
          <div
            className={cm.cn('absolute -right-20 -bottom-20 rounded-full bg-surface/10 blur-3xl')}
            style={{ width: 320, height: 320 }}
          />
          <div className={cm.cn('relative z-10')}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'bg-surface/25 backdrop-blur-md',
                )}
                style={{ width: 48, height: 48 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                  check_circle
                </span>
              </span>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-white/85',
                )}
              >
                {t('orderConfirm.eyebrow', {}, { defaultValue: 'Order confirmed' })}
              </p>
            </div>
            <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('orderConfirm.title', {}, { defaultValue: 'Your downloads are ready.' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), 'text-white/85 max-w-xl')}>
              {t(
                'orderConfirm.subtitle',
                { id: order?.number ?? id ?? '' },
                {
                  defaultValue:
                    'Order {{id}} — license keys are saved to your library and emailed to you.',
                },
              )}
            </p>
          </div>
        </div>

        <section className={cm.cn(cm.sp('mt', 10), cm.stack(4))} data-testid="order-confirm-items">
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('orderConfirm.downloads', {}, { defaultValue: 'Your files & licenses' })}
          </h2>
          {loading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {!loading && error && (
            <p
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-error-container text-on-error-container text-sm',
              )}
              role="alert"
            >
              {error}
            </p>
          )}
          {!loading &&
            !error &&
            order?.items?.map((item) => (
              <article
                key={item.product_id}
                data-testid="order-confirm-item"
                data-product-slug={item.product_slug}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                    'flex-wrap gap-3',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{item.name}</p>
                    {item.file_type && (
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        {item.file_type}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="order-confirm-download"
                    data-product-slug={item.product_slug}
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.product_id}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'inline-flex items-center gap-2 bg-primary text-on-primary rounded-lg shadow-md shadow-primary/30 hover:bg-primary-hover transition-colors disabled:opacity-60',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      download
                    </span>
                    {downloadingId === item.product_id
                      ? t('orderConfirm.cta.preparing', {}, { defaultValue: 'Preparing…' })
                      : t('common.download', {}, { defaultValue: 'Download' })}
                  </button>
                </div>
                {item.license_key && (
                  <LicenseKeyDisplay
                    licenseKey={item.license_key}
                    productName={item.name}
                    status="active"
                  />
                )}
              </article>
            ))}
        </section>

        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('mt', 10),
            'flex-wrap gap-4',
          )}
        >
          <Link
            to="/library"
            data-testid="order-confirm-library-link"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 bg-bg-secondary text-on-surface rounded-xl hover:bg-primary-light hover:text-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              folder_special
            </span>
            {t('orderConfirm.toLibrary', {}, { defaultValue: 'Open library' })}
          </Link>
          <Link
            to="/shop"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:text-primary-hover',
            )}
          >
            {t('orderConfirm.continue', {}, { defaultValue: 'Keep shopping →' })}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default OrderConfirm
