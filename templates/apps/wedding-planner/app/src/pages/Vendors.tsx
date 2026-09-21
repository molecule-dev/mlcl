import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type VendorStatus = 'researching' | 'contacted' | 'booked' | 'paid'

interface Vendor {
  id: string
  category: string
  name: string
  contact: string | null
  status: VendorStatus
}

interface VendorsResponse {
  vendors: Vendor[]
  status_counts: Record<string, number>
}

const STATUSES: VendorStatus[] = ['researching', 'contacted', 'booked', 'paid']

const STATUS_STYLES: Record<VendorStatus, { bg: string; fg: string; icon: string }> = {
  researching: {
    bg: 'var(--color-vendor-researching-bg)',
    fg: 'var(--color-vendor-researching)',
    icon: 'search',
  },
  contacted: {
    bg: 'var(--color-vendor-contacted-bg)',
    fg: 'var(--color-vendor-contacted)',
    icon: 'mail',
  },
  booked: {
    bg: 'var(--color-vendor-booked-bg)',
    fg: 'var(--color-vendor-booked)',
    icon: 'event_available',
  },
  paid: { bg: 'var(--color-vendor-paid-bg)', fg: 'var(--color-vendor-paid)', icon: 'payments' },
}

const CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'videography',
  'attire',
  'flowers',
  'music',
  'beauty',
  'transportation',
  'other',
] as const

const EMPTY_FORM = {
  name: '',
  category: 'other' as (typeof CATEGORIES)[number],
  contact: '',
  status: 'researching' as VendorStatus,
}

export function Vendors() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<VendorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/vendors')
      setData(res.data as VendorsResponse)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  async function addVendor(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/vendors', {
        name: form.name.trim(),
        category: form.category,
        contact: form.contact.trim() || null,
        status: form.status,
      })
      void track({
        name: 'vendor.created',
        properties: { category: form.category, status: form.status },
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not add the vendor')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(vendor: Vendor, status: VendorStatus) {
    setData((d) =>
      d
        ? {
            ...d,
            vendors: d.vendors.map((v) => (v.id === vendor.id ? { ...v, status } : v)),
          }
        : d,
    )
    try {
      await http.put(`/api/vendors/${vendor.id}`, { status })
      if (status === 'booked' || status === 'paid') {
        void track({ name: 'vendor.booked', properties: { vendor_id: vendor.id, status } })
      }
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not update the vendor')
      await load()
    }
  }

  async function removeVendor(id: string, name: string) {
    if (
      !window.confirm(
        t('vendors.deleteConfirm', { name }, { defaultValue: `Remove ${name} from the list?` }),
      )
    ) {
      return
    }
    try {
      await http.delete(`/api/vendors/${id}`)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not remove the vendor')
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  // Group vendors by category for display.
  const byCategory = new Map<string, Vendor[]>()
  for (const vendor of data?.vendors ?? []) {
    const list = byCategory.get(vendor.category) ?? []
    list.push(vendor)
    byCategory.set(vendor.category, list)
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-vendors"
    >
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <p
            className={cm.cn('text-xs font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-accent)' }}
          >
            {t('vendors.eyebrow', {}, { defaultValue: 'Suppliers' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('vendors.title', {}, { defaultValue: 'Vendors' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
            {t(
              'vendors.subtitle',
              {},
              {
                defaultValue:
                  'Every florist, band, and caterer — researching → contacted → booked → paid.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-mol-id="vendors-toggle-form"
          className={cm.cn(
            'px-4 py-2.5 rounded-xl font-bold text-white shadow-md shadow-primary/30',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {showForm
            ? t('vendors.hideForm', {}, { defaultValue: 'Close' })
            : t('vendors.addVendor', {}, { defaultValue: 'Add vendor' })}
        </button>
      </header>

      {error ? (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            'mt-4 rounded-xl bg-error-light text-error font-bold text-sm',
          )}
          data-mol-id="vendors-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Pipeline summary */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'mt-6')}
        data-mol-id="vendors-pipeline"
      >
        {STATUSES.map((status) => (
          <span
            key={status}
            data-mol-id={`vendors-count-${status}`}
            className={cm.cn('px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide')}
            style={{ background: STATUS_STYLES[status].bg, color: STATUS_STYLES[status].fg }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-sm align-middle mr-1')}
              aria-hidden="true"
            >
              {STATUS_STYLES[status].icon}
            </span>
            {t(`vendors.status.${status}`, {}, { defaultValue: status })}{' '}
            {data?.status_counts?.[status] ?? 0}
          </span>
        ))}
      </div>

      {showForm ? (
        <form
          onSubmit={addVendor}
          data-mol-id="vendors-add-form"
          className={cm.cn(
            cm.sp('p', 6),
            'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
            'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
          )}
        >
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('vendors.form.name', {}, { defaultValue: 'Vendor name' })}
            </span>
            <input
              type="text"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-mol-id="vendors-form-name"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('vendors.form.category', {}, { defaultValue: 'Category' })}
            </span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as (typeof CATEGORIES)[number] })
              }
              data-mol-id="vendors-form-category"
              className={inputCls}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`vendors.category.${category}`, {}, { defaultValue: category })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('vendors.form.contact', {}, { defaultValue: 'Contact (optional)' })}
            </span>
            <input
              type="text"
              maxLength={200}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              data-mol-id="vendors-form-contact"
              className={inputCls}
            />
          </label>
          <div className={cm.cn(cm.flex({ align: 'end' }))}>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              data-mol-id="vendors-form-submit"
              className={cm.cn(
                'w-full px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50',
              )}
              style={{ background: 'var(--color-primary)' }}
            >
              {saving
                ? t('vendors.form.saving', {}, { defaultValue: 'Saving…' })
                : t('vendors.form.submit', {}, { defaultValue: 'Add' })}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : byCategory.size === 0 ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'vendors.empty',
            {},
            { defaultValue: 'No vendors yet — start with the venue and the caterer.' },
          )}
        </p>
      ) : (
        <div className={cm.cn('mt-8 grid gap-6 lg:grid-cols-2')}>
          {Array.from(byCategory.entries()).map(([category, vendors]) => (
            <section
              key={category}
              data-mol-id={`vendors-category-${category}`}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
              )}
            >
              <h2 className={cm.cn('text-lg font-bold mb-4')}>
                {t(`vendors.category.${category}`, {}, { defaultValue: category })}{' '}
                <span className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}>
                  ({vendors.length})
                </span>
              </h2>
              <ul className={cm.cn(cm.stack(3))}>
                {vendors.map((vendor) => (
                  <li
                    key={vendor.id}
                    data-mol-id={`vendor-row-${vendor.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
                      'px-4 py-3 rounded-xl bg-surface-container gap-3',
                    )}
                  >
                    <div>
                      <p className={cm.cn('font-bold')}>{vendor.name}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {vendor.contact ??
                          t('vendors.noContact', {}, { defaultValue: 'No contact yet' })}
                      </p>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <select
                        value={vendor.status}
                        onChange={(e) => setStatus(vendor, e.target.value as VendorStatus)}
                        aria-label={t(
                          'vendors.setStatusAria',
                          { name: vendor.name },
                          { defaultValue: 'Status for {{name}}' },
                        )}
                        data-mol-id={`vendor-status-${vendor.id}`}
                        className={cm.cn(
                          'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border-0 cursor-pointer',
                        )}
                        style={{
                          background: STATUS_STYLES[vendor.status].bg,
                          color: STATUS_STYLES[vendor.status].fg,
                        }}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`vendors.status.${status}`, {}, { defaultValue: status })}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeVendor(vendor.id, vendor.name)}
                        aria-label={t(
                          'vendors.removeAria',
                          { name: vendor.name },
                          { defaultValue: 'Remove {{name}}' },
                        )}
                        data-mol-id={`vendor-remove-${vendor.id}`}
                        className={cm.cn(
                          'material-symbols-outlined inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-on-surface-variant hover:text-error hover:bg-error-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-error',
                        )}
                      >
                        delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default Vendors
