import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Category slugs match the Catalog page's filter values (and the seeded
// product rows) so published listings show up under their category filter.
const CATEGORIES = [
  { slug: 'home', label: 'Home & Living' },
  { slug: 'apparel', label: 'Apparel' },
  { slug: 'jewelry', label: 'Jewelry' },
  { slug: 'art', label: 'Art & Prints' },
  { slug: 'paper', label: 'Paper Goods' },
  { slug: 'wellness', label: 'Wellness' },
  { slug: 'kitchen', label: 'Kitchen' },
  { slug: 'kids', label: 'Kids' },
]

interface ApiProduct {
  id: string
  name?: string | null
  description?: string | null
  price?: string | number | null
  category?: string | null
}

function parsePrice(s: string): number {
  const n = Number(s.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function VendorProductForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const isEdit = Boolean(productId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].slug)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit mode — prefill the form from the existing product.
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    http
      .get<ApiProduct | { data?: ApiProduct }>(`/api/products/${encodeURIComponent(productId)}`)
      .then((res) => {
        if (cancelled) return
        const raw = (res as { data?: unknown })?.data ?? res
        const body = (
          raw &&
          typeof raw === 'object' &&
          'data' in (raw as Record<string, unknown>) &&
          (raw as { id?: unknown }).id === undefined
            ? (raw as { data?: ApiProduct }).data
            : (raw as ApiProduct)
        ) as ApiProduct | undefined
        if (!body?.id) return
        setName(body.name ?? '')
        setDescription(body.description ?? '')
        if (body.price != null) setPrice(Number(body.price).toFixed(2))
        if (body.category) {
          const known = CATEGORIES.find(
            (c) => c.slug === body.category || c.label === body.category,
          )
          setCategory(known?.slug ?? body.category)
        }
      })
      .catch(() => {
        // keep the blank form — publish will surface any real error
      })
    return () => {
      cancelled = true
    }
  }, [http, productId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('vendorProductForm.error.name', {}, { defaultValue: 'Product name is required' }))
      return
    }
    const priceNum = parsePrice(price)
    if (priceNum <= 0) {
      setError(t('vendorProductForm.error.price', {}, { defaultValue: 'Enter a positive price' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category,
      }
      if (isEdit && productId) {
        await http.put(`/api/products/${encodeURIComponent(productId)}`, payload)
      } else {
        await http.post('/api/products', payload)
      }
      navigate('/vendor/products')
    } catch (err) {
      setError(
        (err as Error)?.message ||
          t('vendorProductForm.error.publish', {}, { defaultValue: 'Failed to publish' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1200px] space-y-8')}>
      <header className={cm.cn(cm.stack(2))}>
        <Link
          to="/vendor/products"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'text-on-surface-variant hover:text-primary',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
            arrow_back
          </span>
          {t('vendorProductForm.back', {}, { defaultValue: 'Back to products' })}
        </Link>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-sky-700 dark:text-info',
          )}
        >
          {isEdit
            ? t('vendorProductForm.eyebrowEdit', {}, { defaultValue: 'Edit listing' })
            : t('vendorProductForm.eyebrow', {}, { defaultValue: 'New listing' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('vendorProductForm.title', {}, { defaultValue: 'Tell shoppers about your piece' })}
        </h1>
      </header>

      <form
        className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[1.5fr_1fr]')}
        onSubmit={submit}
        data-testid="vendor-product-form"
      >
        <div className={cm.cn(cm.stack(6))}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-3xl border border-outline-variant bg-surface',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('vendorProductForm.basics.title', {}, { defaultValue: 'Basics' })}
            </h2>
            <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <span className="font-semibold text-on-surface-variant">
                {t('vendorProductForm.nameLabel', {}, { defaultValue: 'Product name' })}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sienna Stoneware Mug — set of 2"
                data-testid="vendor-product-name"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <span className="font-semibold text-on-surface-variant">
                {t('form.description', {}, { defaultValue: 'Description' })}
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  'vendorProductForm.descriptionPlaceholder',
                  {},
                  { defaultValue: 'Where is it made? What story does it carry?' },
                )}
                data-testid="vendor-product-description"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors resize-none',
                )}
              />
            </label>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t('form.price', {}, { defaultValue: 'Price' })}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="$48.00"
                  data-testid="vendor-product-price"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors tabular-nums',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                <span className="font-semibold text-on-surface-variant">
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                  )}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {t(`catalog.category.${c.slug}`, {}, { defaultValue: c.label })}
                    </option>
                  ))}
                  {!CATEGORIES.some((c) => c.slug === category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </label>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-3xl border border-outline-variant bg-surface',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('vendorProductForm.images.title', {}, { defaultValue: 'Photos' })}
            </h2>
            <p className={'text-on-surface-variant text-sm'}>
              {t(
                'vendorProductForm.images.body',
                {},
                {
                  defaultValue:
                    'Drag-and-drop up to 8 images. The first photo becomes the storefront cover.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.sp('p', 12),
                'rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low text-center',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: '40px' }}
                aria-hidden
              >
                add_photo_alternate
              </span>
              <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 3), 'text-on-surface')}>
                {t(
                  'vendorProductForm.images.cta',
                  {},
                  { defaultValue: 'Drag photos here or browse' },
                )}
              </p>
              <p className={'text-on-surface-variant text-sm'}>
                {t(
                  'vendorProductForm.images.hint',
                  {},
                  { defaultValue: 'PNG / JPG · max 8MB each' },
                )}
              </p>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-3xl border border-outline-variant bg-surface',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('vendorProductForm.variants.title', {}, { defaultValue: 'Variants & inventory' })}
            </h2>
            <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
              <thead>
                <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                  <th className={cm.cn(cm.sp('py', 2))}>
                    {t('vendorProductForm.variants.colVariant', {}, { defaultValue: 'Variant' })}
                  </th>
                  <th>{t('form.price', {}, { defaultValue: 'Price' })}</th>
                  <th>
                    {t(
                      'vendorProductForm.variants.colInventory',
                      {},
                      { defaultValue: 'Inventory' },
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {[
                  { name: 'Sienna · regular', price: '$48.00', stock: 24 },
                  { name: 'Bone · regular', price: '$48.00', stock: 12 },
                  { name: 'Olive · regular', price: '$50.00', stock: 6 },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className={cm.cn(cm.sp('py', 3), cm.fontWeight('semibold'))}>{row.name}</td>
                    <td className="tabular-nums">{row.price}</td>
                    <td className="tabular-nums">{row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className={cm.cn(cm.stack(6))}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-3xl border border-outline-variant bg-surface',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('vendorProductForm.preview.title', {}, { defaultValue: 'Storefront preview' })}
            </h2>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-2xl border border-outline-variant bg-surface-container-low',
              )}
            >
              <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                {name ||
                  t(
                    'vendorProductForm.preview.namePlaceholder',
                    {},
                    { defaultValue: 'Product name' },
                  )}
              </p>
              <p className={'text-on-surface-variant text-sm'}>
                {t(
                  `catalog.category.${category}`,
                  {},
                  { defaultValue: CATEGORIES.find((c) => c.slug === category)?.label ?? category },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'text-on-surface tabular-nums',
                )}
              >
                {price || '$0.00'}
              </p>
            </div>
          </section>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {error && (
              <p
                className={'rounded-2xl bg-error/10 px-4 py-3 text-sm text-error'}
                data-testid="vendor-product-error"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              data-testid="vendor-product-publish"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : isEdit
                  ? t('vendorProductForm.saveCta', {}, { defaultValue: 'Save changes' })
                  : t(
                      'vendorProductForm.publishCta',
                      {},
                      { defaultValue: 'Publish to storefront' },
                    )}
            </button>
            <button
              type="button"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}

export default VendorProductForm
