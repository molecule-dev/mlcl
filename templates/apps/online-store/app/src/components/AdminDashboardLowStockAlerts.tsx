import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unpackListPayload } from '../utils/httpUnpack.js'

interface LowStockRow {
  id: string
  name: string
  stock: number
  severity: 'critical' | 'low'
}

function AdminDashboardLowStockAlerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<LowStockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restocking, setRestocking] = useState<Record<string, boolean>>({})

  const reload = () => {
    setLoading(true)
    http
      .get('/api/admin/low-stock?threshold=10')
      .then((res) => {
        const data = unpackListPayload(res) as LowStockRow[]
        setItems(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — reload is a stable fetch trigger defined in this scope

  const handleRestock = async (productId: string) => {
    setRestocking((s) => ({ ...s, [productId]: true }))
    try {
      await http.post(`/api/admin/products/${productId}/restock`, { quantity: 25 })
      reload()
    } finally {
      setRestocking((s) => ({ ...s, [productId]: false }))
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm')}
      data-mol-id="low-stock-card"
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-2')}>
        <span className={cm.cn('material-symbols-outlined text-sale')} data-weight="fill">
          warning
        </span>
        <h5 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('adminDashboardLowStockAlerts.title', {}, { defaultValue: 'Low Stock Alerts' })}
        </h5>
      </div>
      <div className={cm.stack(4)} data-mol-id="low-stock-list">
        {!loading && items.length === 0 && (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}
            data-mol-id="low-stock-empty"
          >
            {t(
              'adminDashboardLowStockAlerts.empty',
              {},
              { defaultValue: 'All products are well stocked.' },
            )}
          </p>
        )}
        {items.map((row) => {
          const isCritical = row.severity === 'critical'
          return (
            <div
              key={row.id}
              data-mol-id={`low-stock-row-${row.id}`}
              data-severity={row.severity}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 3),
                'rounded-lg border',
                isCritical ? 'bg-error-light border-red-100' : 'bg-warning-light border-amber-100',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                <div
                  className={cm.cn(
                    cm.w(2),
                    cm.h(2),
                    cm.roundedFull,
                    isCritical ? 'bg-sale animate-pulse' : 'bg-accent',
                  )}
                ></div>
                <div>
                  <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-foreground')}>
                    {row.name}
                  </p>
                  <p className={cm.cn('text-[10px] text-foreground-secondary')}>
                    {row.stock === 0
                      ? t(
                          'adminDashboardLowStockAlerts.outOfStock',
                          {},
                          { defaultValue: 'Out of stock' },
                        )
                      : t(
                          'adminDashboardLowStockAlerts.unitsRemaining',
                          { count: row.stock },
                          { defaultValue: '{{count}} units remaining' },
                        )}
                  </p>
                </div>
              </div>
              <button
                data-mol-id={`restock-${row.id}`}
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-tighter underline',
                  isCritical ? 'text-sale' : 'text-accent',
                )}
                onClick={() => handleRestock(row.id)}
                disabled={!!restocking[row.id]}
              >
                {restocking[row.id]
                  ? t('common.restocking', {}, { defaultValue: 'Restocking…' })
                  : t('common.restock', {}, { defaultValue: 'Restock' })}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminDashboardLowStockAlerts
export { AdminDashboardLowStockAlerts }
