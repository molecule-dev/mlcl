import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

// Keep in sync with MAX_DOWNLOADS_PER_PURCHASE in api/handlers/downloads.ts —
// used only to render "X of N left"; the server is the real gate.
const MAX_DOWNLOADS = 3

// A paid order the caller owns (GET /api/downloads — see api/handlers/downloads.ts).
interface Purchase {
  id: string
  product_id: string
  download_count: number
  created_at: string
}

// A storefront product (GET /api/products — see api/handlers/products.ts).
interface Product {
  id: string
  title: string
  filename: string
}

export function MyDownloadsPage() {
  const { t } = useTranslation()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The purchases list is already owner-scoped server-side (GET /downloads
      // returns only THIS user's paid orders). The product catalog is public and
      // gives us each item's title/filename to join in.
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/downloads', { credentials: 'include' }),
        fetch('/api/products', { credentials: 'include' }),
      ])
      if (!ordersRes.ok) {
        throw new Error(
          t('myDownloads.error.load', {}, { defaultValue: 'Could not load your downloads.' }),
        )
      }
      const orders = (await ordersRes.json()) as Purchase[]
      const catalog = productsRes.ok ? ((await productsRes.json()) as Product[]) : []
      const byId: Record<string, Product> = {}
      for (const product of catalog) byId[product.id] = product
      setPurchases(orders)
      setProducts(byId)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('myDownloads.error.load', {}, { defaultValue: 'Could not load your downloads.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function download(purchase: Purchase, product: Product | undefined): Promise<void> {
    setError(null)
    setBusyId(purchase.id)
    try {
      // Authenticated, ownership-checked download. The server verifies THIS user
      // owns the order, it's paid, and the download cap isn't spent — a user can
      // only ever fetch a file they actually bought (no IDOR). We fetch (rather
      // than link) so a 402/403/429 surfaces as a readable message, not raw JSON
      // in a new tab.
      const res = await fetch(`/api/downloads/${purchase.id}`, { credentials: 'include' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          body.error ?? t('myDownloads.error.download', {}, { defaultValue: 'Download failed.' }),
        )
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = product?.filename ?? 'download'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      // Refresh so the "downloads left" counter reflects this fetch (the server
      // increments the per-order counter on every successful download).
      await load()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('myDownloads.error.download', {}, { defaultValue: 'Download failed.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}
      style={{ maxWidth: '40rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('myDownloads.title', {}, { defaultValue: 'My downloads' })}
      </h1>

      {error ? (
        <p className={cm.textSize('sm')} role="alert" data-mol-id="my-downloads-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.textSize('sm')}>
          {t('myDownloads.loading', {}, { defaultValue: 'Loading your purchases…' })}
        </p>
      ) : purchases.length === 0 ? (
        <p className={cm.textSize('sm')} data-mol-id="my-downloads-empty">
          {t('myDownloads.empty', {}, { defaultValue: 'You have no purchases yet.' })}
        </p>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {purchases.map((purchase) => {
            const product = products[purchase.product_id]
            const remaining = Math.max(0, MAX_DOWNLOADS - purchase.download_count)
            const exhausted = remaining === 0
            const busy = busyId === purchase.id
            return (
              <li key={purchase.id} className={cm.flex({ align: 'center', gap: 'md' })}>
                <span className={cm.fontWeight('medium')} style={{ flex: 1 }}>
                  {product?.title ??
                    t('myDownloads.unknownProduct', {}, { defaultValue: 'Purchased item' })}
                </span>
                <span className={cm.textSize('sm')}>
                  {t(
                    'myDownloads.remaining',
                    { count: remaining, max: MAX_DOWNLOADS },
                    { defaultValue: `${remaining} of ${MAX_DOWNLOADS} downloads left` },
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void download(purchase, product)}
                  disabled={exhausted || busy}
                  data-mol-id="my-downloads-download"
                  className={cm.button({ variant: 'solid', size: 'sm' })}
                >
                  {busy
                    ? t('myDownloads.downloading', {}, { defaultValue: 'Downloading…' })
                    : exhausted
                      ? t('myDownloads.exhausted', {}, { defaultValue: 'Limit reached' })
                      : t('myDownloads.download', {}, { defaultValue: 'Download' })}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
