import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SavedPropertiesEmptyState from '../components/SavedPropertiesEmptyState.js'
import SavedPropertiesFooter from '../components/SavedPropertiesFooter.js'
import SavedPropertiesPageHeader from '../components/SavedPropertiesPageHeader.js'
import SavedPropertiesTopAppBar from '../components/SavedPropertiesTopAppBar.js'
import SavedPropertyCard from '../components/SavedPropertyCard.js'

interface SavedProperty {
  id: string
  title: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  property_type: string
  photos: string[]
  status: string
}

function SavedPropertiesPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string }>()
  const cm = getClassMap()

  const [properties, setProperties] = useState<SavedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSaved = useCallback(async () => {
    // Saved properties require an authenticated session — /api/bookmarks
    // is user-scoped and 401s for anonymous visitors. Skip the fetch and
    // render the empty state instead of firing a request that errors.
    if (!user?.id) {
      setProperties([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. List the user's bookmarks scoped to property resources.
      const bookmarkRes = (await http.get('/api/bookmarks?resourceType=property')) as unknown
      const bookmarkBody = (bookmarkRes as { data?: unknown })?.data
      const bookmarks: Array<{ resourceId?: string; resource_id?: string }> = Array.isArray(
        bookmarkBody,
      )
        ? bookmarkBody
        : Array.isArray((bookmarkBody as { data?: unknown[] })?.data)
          ? (bookmarkBody as { data: Array<{ resourceId?: string; resource_id?: string }> }).data
          : []
      const ids = bookmarks
        .map((b) => b.resourceId ?? b.resource_id)
        .filter((id): id is string => Boolean(id))
      if (ids.length === 0) {
        setProperties([])
        return
      }
      // 2. Hydrate each bookmarked property in parallel. Single-resource
      //    GETs return the row directly (no { data } wrap), but the
      //    HttpResponse from the bonded fetch client puts the parsed body
      //    on `.data` — so unwrap one layer.
      const settled = await Promise.allSettled(ids.map((id) => http.get(`/api/properties/${id}`)))
      const list: SavedProperty[] = []
      for (const r of settled) {
        if (r.status !== 'fulfilled') continue
        const body = (r.value as { data?: unknown })?.data
        if (body && typeof body === 'object' && 'id' in (body as object)) {
          list.push(body as SavedProperty)
        }
      }
      setProperties(list)
    } catch (error) {
      logError('savedProperties.fetch', error)
      setProperties([])
      setError(
        t(
          'saved.fetchError',
          {},
          { defaultValue: 'Unable to load saved properties. Please try again.' },
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t, user?.id])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  async function handleRemove(id: string) {
    // Optimistic remove; revert on failure.
    setProperties((prev) => prev.filter((p) => p.id !== id))
    try {
      await http.delete(`/api/bookmarks/property/${id}`)
    } catch (_error) {
      // Re-fetch to restore the list on failure; error is handled via the UI state
      fetchSaved()
    }
  }

  return (
    <div
      className={cm.cn(cm.page, 'font-body text-on-background antialiased')}
      data-mol-id="page-saved-properties"
    >
      <SavedPropertiesTopAppBar />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl')}>
        <SavedPropertiesPageHeader count={properties.length} />

        {loading ? (
          <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 12))}>
            <div className={cm.spinner({ size: 'lg' })} />
          </div>
        ) : error ? (
          <div className={cm.cn('mb-24')}>
            <div className={cm.card()}>
              <div className={cm.cn(cm.cardContent, cm.sp('p', 8))}>
                <div data-mol-id="error-state-01" className={cm.emptyState}>
                  <div className={cm.emptyStateIcon}>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-text-muted)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p className={cm.emptyStateTitle}>
                    {t('saved.errorTitle', {}, { defaultValue: 'Something went wrong' })}
                  </p>
                  <p className={cm.emptyStateDescription}>{error}</p>
                  <button
                    onClick={fetchSaved}
                    className={cm.cn(
                      cm.button({ variant: 'solid', color: 'primary' }),
                      cm.sp('mt', 4),
                    )}
                  >
                    {t('saved.tryAgain', {}, { defaultValue: 'Try Again' })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className={cm.cn('mb-24')}>
            <SavedPropertiesEmptyState />
          </div>
        ) : (
          <section
            className={cm.cn(
              cm.grid({ cols: 1, gap: 'xl' }),
              'md:grid-cols-2 lg:grid-cols-4 mb-24',
            )}
            data-mol-id="property-grid-01"
          >
            {properties.map((property) => (
              <Link key={property.id} to={`/property/${property.id}`} className={cm.cn('contents')}>
                <SavedPropertyCard property={property} onRemove={handleRemove} />
              </Link>
            ))}
          </section>
        )}
      </main>
      <SavedPropertiesFooter />
    </div>
  )
}

export default SavedPropertiesPage
export { SavedPropertiesPage }
