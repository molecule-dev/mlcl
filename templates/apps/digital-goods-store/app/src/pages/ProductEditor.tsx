import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface ApiProduct {
  id: string
  slug: string
  name: string
  description?: string
  price_cents: number
  pricing_model?: 'free' | 'paid' | 'pwyw'
  cover_image?: string | null
  category?: string | null
  status?: string | null
  file_url?: string | null
  file_type?: string | null
}

function unwrap<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  if ('data' in res) {
    const inner = (res as { data: unknown }).data
    if (inner && typeof inner === 'object') return inner as T
  }
  return res as T
}

export function ProductEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pricing, setPricing] = useState<'paid' | 'free' | 'pwyw'>('paid')
  const [priceCents, setPriceCents] = useState(0)
  const [coverImage, setCoverImage] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft')
  const [licenseType, setLicenseType] = useState<'personal' | 'team' | 'extended'>('personal')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !id) return
    setLoading(true)
    http
      .get(`/api/products/${encodeURIComponent(id)}?mine=true`)
      .then((res) => {
        const p = unwrap<ApiProduct>(res)
        if (!p) {
          setError(t('productEditor.notFound', {}, { defaultValue: 'Product not found.' }))
          return
        }
        setName(p.name)
        setDescription(p.description ?? '')
        setPricing(p.pricing_model ?? 'paid')
        setPriceCents(p.price_cents)
        setCoverImage(p.cover_image ?? '')
        setCategory(p.category ?? '')
        setStatus((p.status as 'draft' | 'active' | 'archived') ?? 'draft')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [http, id, isNew, t])

  const handleDelete = async () => {
    if (isNew || !id) return
    setSaving(true)
    setError(null)
    try {
      await http.delete(`/api/products/${encodeURIComponent(id)}`)
      void track({ name: 'product.deleted', properties: { product_id: id } })
      navigate('/products')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (publish: boolean) => {
    setSaving(true)
    setError(null)
    setStatusMsg(null)
    const finalStatus = publish ? 'active' : status
    const body: Record<string, unknown> = {
      name,
      description,
      price_cents: pricing === 'free' ? 0 : priceCents,
      cover_image: coverImage || null,
      category: category || null,
      status: finalStatus,
    }
    try {
      let savedId = id
      if (isNew) {
        const res = await http.post('/api/products', body)
        const p = unwrap<ApiProduct>(res)
        if (!p) throw new Error('Could not create product')
        savedId = p.id
        void track({
          name: 'product.created',
          properties: { product_id: p.id, status: finalStatus, pricing_model: pricing },
        })
      } else if (id) {
        await http.put(`/api/products/${encodeURIComponent(id)}`, body)
        void track({
          name: 'product.updated',
          properties: { product_id: id, status: finalStatus, pricing_model: pricing },
        })
      }
      setStatus(finalStatus)
      setStatusMsg(
        publish
          ? t('productEditor.published', {}, { defaultValue: 'Product published.' })
          : t('productEditor.saved', {}, { defaultValue: 'Draft saved.' }),
      )
      if (isNew && savedId) {
        navigate(`/products/${savedId}/edit`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface border border-border focus:outline-none focus:border-primary text-on-surface',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    cm.sp('mb', 2),
    'block uppercase tracking-widest text-on-surface-variant',
  )

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant text-sm')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(6))}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <Link
            to="/products"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-primary',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_back
            </span>
            {t('productEditor.back', {}, { defaultValue: 'All products' })}
          </Link>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'text-on-surface',
            )}
          >
            {isNew
              ? t('productEditor.newTitle', {}, { defaultValue: 'New product' })
              : t('productEditor.editTitle', {}, { defaultValue: 'Edit product' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          {!isNew && (
            <ConfirmButton
              label={t('common.delete', {}, { defaultValue: 'Delete' })}
              confirmLabel={t(
                'productEditor.confirmDelete',
                {},
                { defaultValue: 'Delete this product? This cannot be undone.' },
              )}
              onConfirm={handleDelete}
              disarmSeconds={6}
              disabled={saving}
              data-testid="product-delete"
              aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
              color="error"
            />
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            data-testid="product-save-draft"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'rounded-xl bg-bg-secondary text-on-surface hover:bg-border-light transition-colors disabled:opacity-60',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || !name}
            data-testid="product-publish"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-xl bg-primary text-on-primary hover:bg-primary-hover shadow-md shadow-primary/30 transition-colors disabled:opacity-60',
            )}
          >
            {t('common.publish', {}, { defaultValue: 'Publish' })}
          </button>
        </div>
      </div>

      {error && (
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
      {statusMsg && !error && (
        <p
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-success-container text-on-success-container text-sm',
          )}
          role="status"
          data-testid="product-status-message"
        >
          {statusMsg}
        </p>
      )}

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn(cm.stack(6), 'lg:col-span-2')}>
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('productEditor.basics.title', {}, { defaultValue: 'Basics' })}
            </h2>
            <div className={cm.stack(4)}>
              <div>
                <label className={labelClass} htmlFor="prod-name">
                  {t('productEditor.basics.name', {}, { defaultValue: 'Product name' })}
                </label>
                <input
                  id="prod-name"
                  data-testid="product-name"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-description">
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </label>
                <textarea
                  id="prod-description"
                  data-testid="product-description"
                  className={cm.cn(fieldClass)}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-cover">
                  {t('productEditor.basics.cover', {}, { defaultValue: 'Cover image URL' })}
                </label>
                <input
                  id="prod-cover"
                  data-testid="product-cover"
                  className={fieldClass}
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-category">
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </label>
                <input
                  id="prod-category"
                  className={fieldClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className={cm.cn(cm.stack(6))}>
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </h2>
            <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mb', 4))}>
              {(['free', 'paid', 'pwyw'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPricing(p)}
                  data-testid={`pricing-${p}`}
                  className={cm.cn(
                    'flex-1',
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'uppercase tracking-widest transition-colors',
                    pricing === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-bg-secondary text-on-surface-variant hover:bg-primary-light hover:text-primary',
                  )}
                >
                  {t(`productEditor.pricing.${p}`, {}, { defaultValue: p })}
                </button>
              ))}
            </div>
            {pricing !== 'free' && (
              <div>
                <label className={labelClass} htmlFor="prod-price">
                  {t('productEditor.pricing.price', {}, { defaultValue: 'Price (USD)' })}
                </label>
                <input
                  id="prod-price"
                  data-testid="product-price"
                  type="number"
                  step="0.01"
                  className={fieldClass}
                  value={(priceCents / 100).toFixed(2)}
                  onChange={(e) =>
                    setPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))
                  }
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                />
              </div>
            )}
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('productEditor.license.title', {}, { defaultValue: 'License' })}
            </h2>
            <div className={cm.stack(2)}>
              {(['personal', 'team', 'extended'] as const).map((opt) => (
                <label
                  key={opt}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 3),
                    cm.cursorPointer,
                    'rounded-xl border border-border hover:border-primary',
                    licenseType === opt ? 'border-primary bg-primary-light' : '',
                  )}
                >
                  <input
                    type="radio"
                    name="license-type"
                    value={opt}
                    checked={licenseType === opt}
                    onChange={() => setLicenseType(opt)}
                    className={cm.cn('accent-primary')}
                  />
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface capitalize',
                      )}
                    >
                      {t(`productEditor.license.${opt}`, {}, { defaultValue: opt })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        `productEditor.license.${opt}Body`,
                        {},
                        {
                          defaultValue:
                            opt === 'personal'
                              ? '1 user, personal projects'
                              : opt === 'team'
                                ? 'Up to 5 users in one team'
                                : 'Unlimited use, including resale',
                        },
                      )}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ProductEditor
