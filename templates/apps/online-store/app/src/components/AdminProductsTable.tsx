/**
 * Thin shim around @molecule/app-admin-table-react. Maps the Product
 * shape to AdminTableColumn render fns; the shared package owns the
 * loading skeleton + row hover + bulk-select + row-action kebab menu.
 *
 * Sale-price chip, stock badge, SKU+thumbnail cell stay in the app —
 * they're commerce-specific.
 */
import { useNavigate } from 'react-router'

import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableRowAction,
} from '@molecule/app-admin-table-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminProductsPagination from './AdminProductsPagination.js'

interface Product {
  id: string
  name: string
  price: number
  thumbnails?: string[]
  category: string
  stock: number
  status: 'active' | 'archived' | 'draft'
  sku: string
  originalPrice?: number
}

interface Props {
  products: Product[]
  loading: boolean
  page: number
  totalPages: number
  totalProducts: number
  onPageChange: (p: number) => void
}

function stockBadgeStyle(stock: number | undefined): {
  labelKey: string
  labelDefault: string
  cls: string
} {
  if (stock == null) {
    return {
      labelKey: 'adminProductsTable.unknownStock',
      labelDefault: 'Unknown',
      cls: 'bg-surface-secondary text-foreground-secondary',
    }
  }
  if (stock === 0) {
    return {
      labelKey: 'adminProductsTable.outOfStock',
      labelDefault: 'Out of Stock',
      cls: 'bg-surface-secondary text-foreground-secondary',
    }
  }
  if (stock <= 10) {
    return {
      labelKey: 'adminProductsTable.lowStock',
      labelDefault: 'Low Stock',
      cls: 'bg-warning-light text-warning',
    }
  }
  return {
    labelKey: 'adminProductsTable.inStock',
    labelDefault: 'In Stock',
    cls: 'bg-success-light text-success',
  }
}

function AdminProductsTable({
  products,
  loading,
  page,
  totalPages,
  totalProducts,
  onPageChange,
}: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const perPage = 8
  const startItem = totalProducts > 0 ? (page - 1) * perPage + 1 : 0
  const endItem = Math.min(page * perPage, totalProducts)

  const columns: AdminTableColumn<Product>[] = [
    {
      id: 'product',
      header: t('nav.product', {}, { defaultValue: 'Product' }),
      render: (p) => {
        const thumbnail = p.thumbnails?.[0] ?? `https://picsum.photos/seed/${p.id}/120/120`
        const isOnSale = p.originalPrice != null && p.originalPrice > p.price
        return (
          <div className={cm.flex({ align: 'center', gap: 3 })}>
            <div className={cm.cn('relative')}>
              <img
                alt={t('nav.product', {}, { defaultValue: 'Product' })}
                className={cm.cn(
                  cm.w(12),
                  cm.h(12),
                  'rounded-lg object-cover border border-border',
                )}
                src={thumbnail}
              />
              {isOnSale && (
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    'absolute -top-2 -right-2 bg-accent text-white text-[9px] font-black px-1.5 py-0.5 shadow-sm',
                  )}
                >
                  {t('adminProductsTable.saleBadge', {}, { defaultValue: 'SALE' })}
                </span>
              )}
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), 'text-foreground')}>{p.name}</p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>{p.sku}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'category',
      header: t('form.category', {}, { defaultValue: 'Category' }),
      render: (p) => p.category,
      className: cm.cn(cm.textSize('sm'), 'text-foreground-secondary'),
    },
    {
      id: 'price',
      header: t('form.price', {}, { defaultValue: 'Price' }),
      className: 'tabular-nums',
      render: (p) => {
        const isOnSale = p.originalPrice != null && p.originalPrice > p.price
        if (isOnSale) {
          return (
            <>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-sale')}>
                {t(
                  'adminProductsTable.salePrice',
                  { amount: (p.price / 100).toFixed(2) },
                  { defaultValue: '${{amount}}' },
                )}
              </span>
              <span className={cm.cn('block text-[10px] text-foreground-tertiary line-through')}>
                {t(
                  'adminProductsTable.originalPrice',
                  { amount: (p.originalPrice! / 100).toFixed(2) },
                  { defaultValue: '${{amount}}' },
                )}
              </span>
            </>
          )
        }
        return (
          <span className={cm.fontWeight('bold')}>
            {t(
              'adminProductsTable.price',
              { amount: (p.price / 100).toFixed(2) },
              { defaultValue: '${{amount}}' },
            )}
          </span>
        )
      },
    },
    {
      id: 'stock',
      header: t('adminProductsTable.stockHeader', {}, { defaultValue: 'Stock' }),
      className: cm.cn(cm.textSize('sm'), 'text-foreground-secondary'),
      render: (p) =>
        p.stock != null ? `${p.stock} ${t('common.units', {}, { defaultValue: 'units' })}` : '—',
    },
    {
      id: 'status',
      header: t('nav.status', {}, { defaultValue: 'Status' }),
      render: (p) => {
        const { labelKey, labelDefault, cls } = stockBadgeStyle(p.stock)
        return (
          <span
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'px-2.5 py-0.5 uppercase',
              cls,
            )}
          >
            {t(labelKey, {}, { defaultValue: labelDefault })}
          </span>
        )
      },
    },
  ]

  const rowActions: AdminTableRowAction<Product>[] = [
    {
      label: t('common.edit', {}, { defaultValue: 'Edit' }),
      hrefFor: (p) => `/product/${p.id}`,
      onSelect: () => {},
    },
    {
      label: t('common.delete', {}, { defaultValue: 'Delete' }),
      destructive: true,
      dataMolIdFor: (p) => `delete-product-${p.id}`,
      onSelect: async (p) => {
        await http.delete(`/api/products/${p.id}`)
        onPageChange(page)
      },
    },
  ]

  return (
    <AdminTable
      rows={products}
      columns={columns}
      rowKey={(p) => p.id}
      loading={loading}
      onRowClick={(p) => navigate(`/product/${p.id}`)}
      bulkSelect
      rowActions={rowActions}
      rowActionsAriaLabel={(p) =>
        t(
          'adminProductsTable.actionsFor',
          { name: p.name },
          { defaultValue: 'Actions for {{name}}' },
        )
      }
      footer={
        <AdminProductsPagination
          page={page}
          totalPages={totalPages}
          totalProducts={totalProducts}
          startItem={startItem}
          endItem={endItem}
          onPageChange={onPageChange}
        />
      }
    />
  )
}

export default AdminProductsTable
export { AdminProductsTable }
