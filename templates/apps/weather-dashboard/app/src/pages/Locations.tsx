import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LocationCard, type LocationSummary } from '../components/LocationCard.js'

interface ApiLocation extends LocationSummary {
  address?: string | null
  latitude?: number
  longitude?: number
}

function unwrapBody(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const wrapper = payload as { data?: unknown }
  return 'data' in wrapper ? wrapper.data : payload
}

function unwrapList<T>(payload: unknown): T[] {
  const body = unwrapBody(payload)
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: T[] }).items
  }
  return []
}

export function Locations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiLocation[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add-location form state
  const [adding, setAdding] = useState(false)
  const [formAddress, setFormAddress] = useState('')
  const [formName, setFormName] = useState('')
  const [formMakeDefault, setFormMakeDefault] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadLocations() {
    try {
      const res = await http.get<ApiLocation[]>('/api/locations')
      setItems(unwrapList<ApiLocation>(res))
      setError(null)
    } catch (error) {
      logError('locations.load', error)
      setError(t('locations.loadError', {}, { defaultValue: 'Could not load locations.' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadLocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handleRemove = async (id: string) => {
    const previous = items
    setItems((current) => current.filter((loc) => loc.id !== id))
    try {
      await http.delete(`/api/locations/${id}`)
    } catch (error) {
      logError('locations.remove', error)
      setItems(previous)
      setError(t('locations.removeError', {}, { defaultValue: 'Could not remove the location.' }))
    }
  }

  const handleSetDefault = async (id: string) => {
    const previous = items
    setItems((current) => current.map((loc) => ({ ...loc, is_default: loc.id === id })))
    try {
      await http.put(`/api/locations/${id}`, { is_default: true })
      await loadLocations()
    } catch (error) {
      logError('locations.setDefault', error)
      setItems(previous)
      setError(
        t(
          'locations.setDefaultError',
          {},
          { defaultValue: 'Could not change the default location.' },
        ),
      )
    }
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!formAddress.trim()) {
      setFormError(
        t(
          'locations.add.addressRequired',
          {},
          {
            defaultValue: 'Type a city, postal code, or full address.',
          },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { address: formAddress.trim() }
      if (formName.trim()) body['name'] = formName.trim()
      if (formMakeDefault) body['is_default'] = true
      await http.post('/api/locations', body)
      setFormAddress('')
      setFormName('')
      setFormMakeDefault(false)
      setAdding(false)
      await loadLocations()
    } catch (err) {
      let message = ''
      if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: unknown }).message)
      }
      const fallback = t(
        'locations.add.failed',
        {},
        {
          defaultValue:
            "Couldn't add that location. Try a different spelling or include a country.",
        },
      )
      setFormError(message || fallback)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = items.filter((loc) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.region || '').toLowerCase().includes(q) ||
      (loc.address || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('locations.heading', {}, { defaultValue: 'Every place you watch' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'locations.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Add, search, set defaults, and remove the locations {{appName}} tracks for you.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 2),
            cm.sp('px', 5),
            cm.roundedFull,
            'flex-1 bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-on-surface-variant',
              cm.textSize('xl'),
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'locations.searchPlaceholder',
              {},
              { defaultValue: 'Search saved locations…' },
            )}
            className={cm.cn(
              'flex-1 bg-transparent border-0 outline-none text-base text-on-surface placeholder:text-on-surface-variant',
              cm.sp('py', 2),
            )}
            aria-label={t('locations.searchAria', {}, { defaultValue: 'Search saved locations' })}
          />
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full bg-primary text-on-primary font-bold hover:opacity-90',
          )}
          aria-expanded={adding}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {adding ? 'close' : 'add_location'}
          </span>
          {adding
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('locations.add.cta', {}, { defaultValue: 'Add location' })}
        </button>
      </div>

      {adding ? (
        <form
          onSubmit={handleAdd}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
            cm.stack(4),
          )}
          aria-label={t('locations.add.formAria', {}, { defaultValue: 'Add a location' })}
        >
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('locations.add.addressLabel', {}, { defaultValue: 'Address or city' })}
            </span>
            <input
              type="text"
              required
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder={t(
                'locations.add.addressPlaceholder',
                {},
                { defaultValue: 'e.g. Brooklyn, NY' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container border border-outline-variant/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('locations.add.nameLabel', {}, { defaultValue: 'Display name (optional)' })}
            </span>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t(
                'locations.add.namePlaceholder',
                {},
                { defaultValue: 'Defaults to the address' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container border border-outline-variant/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              )}
            />
          </label>
          <label className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="checkbox"
              checked={formMakeDefault}
              onChange={(e) => setFormMakeDefault(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className={cm.textSize('sm')}>
              {t(
                'locations.add.makeDefault',
                {},
                { defaultValue: 'Make this my default location' },
              )}
            </span>
          </label>
          {formError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{formError}</p> : null}
          <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                'rounded-full bg-primary text-on-primary font-bold disabled:opacity-50 hover:opacity-90',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('locations.add.save', {}, { defaultValue: 'Save location' })}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('locations.loading', {}, { defaultValue: 'Loading saved locations…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            cm.stack(3),
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('5xl'), 'text-primary')}>
            location_searching
          </span>
          <p className={cm.fontWeight('bold')}>
            {t('locations.empty.title', {}, { defaultValue: 'No saved locations yet' })}
          </p>
          <p>
            {t(
              'locations.empty.body',
              {},
              { defaultValue: 'Tap "Add location" to save your first city.' },
            )}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t(
            'locations.empty.search',
            {},
            { defaultValue: 'Nothing matches that search yet — try a city name or country code.' },
          )}
        </p>
      ) : (
        <div className={cm.stack(2)}>
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              location={{
                ...loc,
                region: loc.region ?? loc.address ?? null,
              }}
              to={`/location/${loc.id}`}
              onRemove={handleRemove}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
    </div>
  )
}
