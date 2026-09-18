import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unpackListPayload } from '../utils/httpUnpack.js'

function AdminDashboardTopProducts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  type ProductRow = { id?: string; name?: string; title?: string; price?: number }

  const [products, setProducts] = useState<ProductRow[]>([])

  useEffect(() => {
    http.get('/api/products').then((res) => {
      const data = unpackListPayload(res) as ProductRow[]
      if (data.length > 0) setProducts(data.slice(0, 3))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — http client is stable, re-subscribing would double-fetch

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm')}>
      <h5
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'text-foreground',
        )}
      >
        {t('adminDashboardTopProducts.heading', {}, { defaultValue: 'Top Products' })}
      </h5>
      <div className={cm.stack(6)}>
        {products.map((product, i) => {
          const label = product.name ?? product.title ?? ''
          return (
            <div key={product.id ?? i} className={cm.flex({ align: 'center', gap: 4 })}>
              <div
                className={cm.cn(
                  cm.w(12),
                  cm.h(12),
                  cm.shrink0,
                  'rounded-lg bg-surface-secondary overflow-hidden',
                )}
              >
                <img
                  alt={label}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  src={`https://picsum.photos/seed/${product.id ?? i}/120/120`}
                />
              </div>
              <div className={cm.flex1}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-foreground truncate',
                  )}
                >
                  {label}
                </p>
              </div>
              <div className={cm.textRight}>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground')}>
                  {fmt(product.price || 0)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <Link
        to="/admin/products"
        className={cm.cn(
          'w-full mt-6 py-2 border border-border rounded-lg text-sm font-semibold text-foreground-secondary hover:bg-surface-secondary transition-colors',
        )}
      >
        {t(
          'adminDashboardTopProducts.viewAllInventory',
          {},
          { defaultValue: 'View All Inventory' },
        )}
      </Link>
    </div>
  )
}

export default AdminDashboardTopProducts
export { AdminDashboardTopProducts }
