import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AdminLayout } from '../components/AdminLayout.js'
import AdminProductsActionBar from '../components/AdminProductsActionBar.js'
import AdminProductsHeader from '../components/AdminProductsHeader.js'
import AdminProductsTable from '../components/AdminProductsTable.js'
import { unpackAdminProductsList } from '../utils/httpUnpack.js'

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

interface Category {
  name: string
  count: number
}

function AdminProductsPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createPrice, setCreatePrice] = useState('')
  const [createCategory, setCreateCategory] = useState('Electronics')
  const [createDescription, setCreateDescription] = useState('')
  const [createStock, setCreateStock] = useState('10')
  const [createSku, setCreateSku] = useState('')

  const fetchProducts = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '8')
    if (searchQuery) params.set('q', searchQuery)
    if (categoryFilter) params.set('category', categoryFilter)
    if (statusFilter) params.set('status', statusFilter)
    Promise.all([http.get(`/api/products?${params}`), http.get('/api/storefront/categories')]).then(
      ([productsRes, categoriesRes]) => {
        const { products, total, totalPages } = unpackAdminProductsList(productsRes)
        setProducts(products as Product[])
        setTotalPages(totalPages)
        setTotalProducts(total)
        const cats = (categoriesRes as { data?: unknown })?.data ?? categoriesRes
        setCategories(Array.isArray(cats) ? (cats as Category[]) : [])
        setLoading(false)
      },
    )
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, page, searchQuery, categoryFilter, statusFilter]) // fetchProducts is recreated each render; deps intentionally omit it to avoid re-fetch loops

  const resetCreateForm = () => {
    setCreateName('')
    setCreatePrice('')
    setCreateCategory('Electronics')
    setCreateDescription('')
    setCreateStock('10')
    setCreateSku('')
    setCreateError(null)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createSubmitting) return
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      const priceDollars = parseFloat(createPrice)
      if (Number.isNaN(priceDollars) || priceDollars <= 0) {
        throw new Error(
          t('adminProducts.invalidPrice', {}, { defaultValue: 'Please enter a valid price.' }),
        )
      }
      const created = (await http.post('/api/products', {
        name: createName,
        description: createDescription,
        price: priceDollars,
        category: createCategory,
        sku: createSku || undefined,
      })) as { id?: string }

      if (created?.id) {
        const stockQty = parseInt(createStock, 10)
        if (Number.isFinite(stockQty) && stockQty > 0) {
          await http
            .post(`/api/products/${created.id}/inventory`, {
              quantity: stockQty,
              reason: 'initial',
            })
            .catch(() => {})
        }
      }

      setShowCreate(false)
      resetCreateForm()
      fetchProducts()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('adminProducts.createError', {}, { defaultValue: 'Failed to create product.' }),
      )
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <AdminLayout>
      <div className={cm.cn('bg-surface-secondary font-body text-foreground min-h-screen')}>
        <AdminProductsHeader
          searchQuery={searchQuery}
          onSearch={(q: string) => {
            setSearchQuery(q)
            setPage(1)
          }}
        />
        <section
          aria-label={t('admin.products.regionLabel', {}, { defaultValue: 'Admin products' })}
          className={cm.cn(cm.sp('p', 8))}
          data-mol-id="main-content"
        >
          <div className={cm.stack(8)}>
            <AdminProductsActionBar
              totalProducts={totalProducts}
              categories={categories}
              categoryFilter={categoryFilter}
              statusFilter={statusFilter}
              onCategoryChange={(v: string) => {
                setCategoryFilter(v)
                setPage(1)
              }}
              onStatusChange={(v: string) => {
                setStatusFilter(v)
                setPage(1)
              }}
              onAddProduct={() => setShowCreate(true)}
            />
            <AdminProductsTable
              products={products}
              loading={loading}
              page={page}
              totalPages={totalPages}
              totalProducts={totalProducts}
              onPageChange={setPage}
            />
          </div>
        </section>
        {showCreate && (
          <div
            data-mol-id="admin-product-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-create-heading"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 50,
            }}
          >
            <form
              onSubmit={handleCreateSubmit}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <h2 id="admin-product-create-heading" style={{ fontSize: '20px', fontWeight: 700 }}>
                {t('adminProducts.createHeading', {}, { defaultValue: 'New Product' })}
              </h2>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
                <input
                  data-mol-id="admin-product-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('adminProducts.fieldPrice', {}, { defaultValue: 'Price (USD)' })}
                <input
                  data-mol-id="admin-product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createPrice}
                  onChange={(e) => setCreatePrice(e.target.value)}
                  required
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('form.category', {}, { defaultValue: 'Category' })}
                <select
                  data-mol-id="admin-product-category"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                >
                  {(categories.length > 0
                    ? categories.map((c) => c.name)
                    : ['Electronics', 'Fashion', 'Home & Living', 'Sports', 'Accessories']
                  ).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('adminProducts.fieldStock', {}, { defaultValue: 'Initial stock' })}
                <input
                  data-mol-id="admin-product-stock"
                  type="number"
                  min="0"
                  value={createStock}
                  onChange={(e) => setCreateStock(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('adminProducts.fieldSku', {}, { defaultValue: 'SKU (optional)' })}
                <input
                  data-mol-id="admin-product-sku"
                  value={createSku}
                  onChange={(e) => setCreateSku(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
                <textarea
                  data-mol-id="admin-product-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '8px',
                  }}
                />
              </label>
              {createError && (
                <p
                  data-mol-id="admin-product-create-error"
                  role="alert"
                  style={{ color: 'var(--color-error-text)', fontSize: '14px' }}
                >
                  {createError}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  data-mol-id="admin-product-cancel"
                  onClick={() => {
                    setShowCreate(false)
                    resetCreateForm()
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--color-border-light)',
                    color: 'var(--color-label-text)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-mol-id="admin-product-save"
                  disabled={createSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--color-in-stock)',
                    color: 'var(--color-surface)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: createSubmitting ? 0.7 : 1,
                  }}
                >
                  {createSubmitting
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('adminProducts.create', {}, { defaultValue: 'Create Product' })}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminProductsPage
export { AdminProductsPage, AdminProductsPage as AdminProductsPagePage }
