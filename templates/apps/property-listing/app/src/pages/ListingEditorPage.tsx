import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import type { HttpResponse } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ListingEditorAmenitiesSection from '../components/ListingEditorAmenitiesSection.js'
import ListingEditorClassificationSection from '../components/ListingEditorClassificationSection.js'
import ListingEditorFooter from '../components/ListingEditorFooter.js'
import ListingEditorHeader from '../components/ListingEditorHeader.js'
import ListingEditorImageGallery from '../components/ListingEditorImageGallery.js'
import ListingEditorPropertyDescriptionSection from '../components/ListingEditorPropertyDescriptionSection.js'
import ListingEditorPropertyDetailsSection from '../components/ListingEditorPropertyDetailsSection.js'
import ListingEditorSideNavBar from '../components/ListingEditorSideNavBar.js'

interface ListingForm {
  title: string
  address: string
  city: string
  state: string
  zip_code: string
  price: string
  bedrooms: string
  bathrooms: string
  square_feet: string
  lot_size: string
  year_built: string
  style: string
  property_type: string
  listing_status: string
  description: string
  features: string[]
}

/** API listing record (subset used by the editor). */
interface ListingApiRecord {
  title?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  price?: number | string
  bedrooms?: number | string
  bathrooms?: number | string
  square_feet?: number | string
  lot_size?: number | string
  year_built?: number | string
  style?: string
  property_type?: string
  listing_status?: string
  status?: string
  description?: string
  features?: string[]
}

const EMPTY_FORM: ListingForm = {
  title: '',
  address: '',
  city: '',
  state: 'California',
  zip_code: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  square_feet: '',
  lot_size: '',
  year_built: '',
  style: 'Contemporary',
  // backend property_type enum: house | condo | townhouse | apartment | land
  property_type: 'house',
  listing_status: 'active',
  description: '',
  features: [],
}

function ListingEditorPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const isEditing = Boolean(id)
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    http
      .get<ListingApiRecord | ListingApiRecord[] | { data: ListingApiRecord }>(
        `/api/properties/${id}`,
      )
      .then(
        (res: HttpResponse<ListingApiRecord | ListingApiRecord[] | { data: ListingApiRecord }>) => {
          const raw = res.data
          let d: ListingApiRecord | undefined
          if (Array.isArray(raw)) d = raw[0]
          else if (
            raw &&
            typeof raw === 'object' &&
            'data' in raw &&
            (raw as { data: ListingApiRecord }).data
          )
            d = (raw as { data: ListingApiRecord }).data
          else if (raw && typeof raw === 'object') d = raw as ListingApiRecord
          if (!d) return
          // The backend stores `features` as JSONB; depending on driver
          // it can come back as either an array or its stringified form.
          let features: string[] = []
          const fRaw = d.features as unknown
          if (Array.isArray(fRaw)) features = fRaw as string[]
          else if (typeof fRaw === 'string') {
            try {
              const parsed = JSON.parse(fRaw)
              if (Array.isArray(parsed)) features = parsed
            } catch (_error) {
              // JSON.parse failed — features value is not valid JSON, keep empty array
            }
          }
          setForm({
            title: d.title || '',
            address: d.address || '',
            city: d.city || '',
            state: d.state || 'California',
            zip_code: d.zip_code || '',
            price: d.price != null ? String(d.price) : '',
            bedrooms: d.bedrooms != null ? String(d.bedrooms) : '',
            bathrooms: d.bathrooms != null ? String(d.bathrooms) : '',
            square_feet: d.square_feet != null ? String(d.square_feet) : '',
            lot_size: d.lot_size != null ? String(d.lot_size) : '',
            year_built: d.year_built != null ? String(d.year_built) : '',
            style: d.style || 'Contemporary',
            property_type: d.property_type || 'house',
            listing_status: (d.status || d.listing_status || 'active').toLowerCase(),
            description: d.description || '',
            features,
          })
        },
      )
      .catch(() =>
        setError(
          t('listingEditor.error.loadFailed', {}, { defaultValue: 'Failed to load listing' }),
        ),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]) // http and t are stable refs; only re-fetch when the listing id changes

  function updateField(key: keyof ListingForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleFeature(feature: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  async function handleSave(intent: 'draft' | 'active') {
    setSaving(true)
    setError(null)
    try {
      // Validate the minimum subset the backend property schema requires
      // before we POST — surface client-side errors instead of letting
      // the server reject silently.
      const required: Array<keyof ListingForm> = [
        'title',
        'description',
        'address',
        'city',
        'state',
        'zip_code',
        'price',
        'bedrooms',
        'bathrooms',
        'square_feet',
      ]
      const missing = required.filter((k) => !String(form[k] ?? '').trim())
      if (missing.length > 0) {
        setError(
          t(
            'listingEditor.error.missingFields',
            { fields: missing.join(', ') },
            { defaultValue: 'Please fill in: {{fields}}' },
          ),
        )
        setSaving(false)
        return
      }

      const allowedTypes = ['house', 'condo', 'townhouse', 'apartment', 'land']
      const property_type = allowedTypes.includes(form.property_type) ? form.property_type : 'house'

      // Map the editor's user-facing 'draft' intent onto the backend's
      // 'inactive' status — the create handler also defaults to 'active'.
      const status =
        intent === 'draft'
          ? 'inactive'
          : form.listing_status === 'pending' || form.listing_status === 'sold'
            ? form.listing_status
            : 'active'

      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim(),
        price: Number(form.price),
        bedrooms: Math.max(0, Math.floor(Number(form.bedrooms))),
        bathrooms: Number(form.bathrooms),
        square_feet: Number(form.square_feet),
        lot_size: form.lot_size ? Number(form.lot_size) : undefined,
        year_built: form.year_built ? Math.floor(Number(form.year_built)) : undefined,
        property_type,
        features: form.features,
      }

      if (isEditing) {
        await http.put(`/api/properties/${id}`, { ...body, status })
      } else {
        // POST /api/properties does not accept `status` in its create
        // schema (always defaults to 'active' on the server). If the
        // user picked Draft, immediately patch it to inactive after.
        const created = (await http.post('/api/properties', body)) as {
          data?: { id?: string }
        }
        const createdId =
          (created?.data as { id?: string } | undefined)?.id ??
          (created as { id?: string } | undefined)?.id
        if (intent === 'draft' && createdId) {
          await http.put(`/api/properties/${createdId}`, { status: 'inactive' })
        }
      }
      navigate('/admin/listings')
    } catch (error) {
      logError('listingEditor.save', error)
      setError(t('listingEditor.error.saveFailed', {}, { defaultValue: 'Failed to save listing' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-background text-on-surface font-body selection:bg-secondary-container',
        )}
      >
        <span className={cm.cn('text-5xl', 'material-symbols-outlined text-primary')}>
          progress_activity
        </span>
      </div>
    )
  }

  return (
    <div
      className={cm.cn('bg-background text-on-surface font-body selection:bg-secondary-container')}
    >
      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'fixed top-4 right-4 z-50 bg-error-light text-error rounded-xl shadow-lg',
          )}
        >
          {error}
        </div>
      )}
      <ListingEditorSideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'ml-64 pb-24')}>
        <ListingEditorHeader />
        <div className={cm.cn(cm.mxAuto, cm.sp('px', 12), cm.sp('pt', 6), 'max-w-6xl')}>
          <h2
            className={cm.cn(
              cm.textSize('4xl'),
              cm.sp('mb', 8),
              'font-headline font-extrabold text-primary tracking-tight',
            )}
          >
            {isEditing
              ? t('listingEditor.editTitle', {}, { defaultValue: 'Edit Listing' })
              : t('listingEditor.createTitle', {}, { defaultValue: 'Create New Listing' })}
          </h2>
          <div className={cm.stack(8)}>
            <ListingEditorImageGallery />
            <section>
              <h3
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'font-headline text-on-surface',
                )}
              >
                {t(
                  'listingEditor.basicInfoSectionTitle',
                  {},
                  { defaultValue: 'Basic Information' },
                )}
              </h3>
              <div className={cm.cn(cm.grid({ cols: 6, gap: 'none' }), 'gap-x-6 gap-y-4')}>
                <div className={cm.cn('col-span-6')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      cm.sp('px', 1),
                      'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                    )}
                  >
                    {t('listingEditor.label.listingTitle', {}, { defaultValue: 'Listing Title' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('medium'),
                      'bg-surface-container-low border-0 rounded-xl text-on-surface placeholder:text-foreground-tertiary',
                    )}
                    placeholder={t(
                      'listingEditor.placeholder.listingTitle',
                      {},
                      { defaultValue: 'e.g. The Obsidian Estate' },
                    )}
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                </div>
                <div className={cm.cn('col-span-4')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      cm.sp('px', 1),
                      'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                    )}
                  >
                    {t('listingEditor.label.streetAddress', {}, { defaultValue: 'Street Address' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('medium'),
                      'bg-surface-container-low border-0 rounded-xl text-on-surface placeholder:text-foreground-tertiary',
                    )}
                    placeholder={t(
                      'listingEditor.placeholder.streetAddress',
                      {},
                      { defaultValue: 'Enter physical address' },
                    )}
                    type="text"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                </div>
                <div className={cm.cn('col-span-2')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      cm.sp('px', 1),
                      'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                    )}
                  >
                    {t('listingEditor.label.city', {}, { defaultValue: 'City' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('medium'),
                      'bg-surface-container-low border-0 rounded-xl text-on-surface placeholder:text-foreground-tertiary',
                    )}
                    placeholder={t(
                      'listingEditor.placeholder.city',
                      {},
                      { defaultValue: 'Beverly Hills' },
                    )}
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div className={cm.cn('col-span-3')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      cm.sp('px', 1),
                      'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                    )}
                  >
                    {t('listingEditor.label.state', {}, { defaultValue: 'State' })}
                  </label>
                  <select
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('medium'),
                      'bg-surface-container-low border-0 rounded-xl text-on-surface appearance-none',
                    )}
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  >
                    <option value="California">
                      {t('listingEditor.state.california', {}, { defaultValue: 'California' })}
                    </option>
                    <option value="New York">
                      {t('listingEditor.state.newYork', {}, { defaultValue: 'New York' })}
                    </option>
                    <option value="Florida">
                      {t('listingEditor.state.florida', {}, { defaultValue: 'Florida' })}
                    </option>
                    <option value="Texas">
                      {t('listingEditor.state.texas', {}, { defaultValue: 'Texas' })}
                    </option>
                  </select>
                </div>
                <div className={cm.cn('col-span-3')}>
                  <label
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      cm.sp('px', 1),
                      'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                    )}
                  >
                    {t('listingEditor.label.zipCode', {}, { defaultValue: 'Zip Code' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('medium'),
                      'bg-surface-container-low border-0 rounded-xl text-on-surface placeholder:text-foreground-tertiary',
                    )}
                    placeholder={t(
                      'listingEditor.placeholder.zipCode',
                      {},
                      { defaultValue: '90210' },
                    )}
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                  />
                </div>
              </div>
            </section>
            <ListingEditorPropertyDetailsSection
              price={form.price}
              bedrooms={form.bedrooms}
              bathrooms={form.bathrooms}
              squareFeet={form.square_feet}
              lotSize={form.lot_size}
              yearBuilt={form.year_built}
              style={form.style}
              onChange={(key, value) => updateField(key as keyof ListingForm, value)}
            />
            <div className={cm.grid({ cols: 2, gap: 'lg' })}>
              <ListingEditorClassificationSection
                propertyType={form.property_type}
                listingStatus={form.listing_status}
                onPropertyTypeChange={(v) => updateField('property_type', v)}
                onListingStatusChange={(v) => updateField('listing_status', v)}
              />
              <ListingEditorAmenitiesSection
                features={form.features}
                onToggleFeature={toggleFeature}
              />
            </div>
            <ListingEditorPropertyDescriptionSection
              description={form.description}
              onDescriptionChange={(v) => updateField('description', v)}
            />
          </div>
        </div>
        <ListingEditorFooter
          onSaveDraft={() => handleSave('draft')}
          onPublish={() => handleSave('active')}
          saving={saving}
        />
      </main>
    </div>
  )
}

export default ListingEditorPage
export { ListingEditorPage, ListingEditorPage as ListingEditorPagePage }
