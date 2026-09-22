import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LicenseKeyDisplay } from '../components/LicenseKeyDisplay.js'

interface ApiLibraryItem {
  id: string
  product_id: string
  product_slug: string
  name: string
  cover_image?: string
  file_type?: string
  license_key?: string | null
  purchased_at: string
  version?: string
  update_available?: boolean
  downloads_remaining?: number | null
  size_mb?: number | null
}

function unwrap(res: unknown): ApiLibraryItem[] {
  if (Array.isArray(res)) return res as ApiLibraryItem[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiLibraryItem[]
    // useHttpClient wraps API JSON in `{ data: <json>, status, ... }`,
    // and our API returns `{ data: [...] }`, so peel the second layer.
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiLibraryItem[]
    }
  }
  return []
}

export function CustomerLibrary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    http
      .get('/api/library')
      .then((res) => setItems(unwrap(res)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [http])

  const handleDownload = async (item: ApiLibraryItem) => {
    setDownloadingId(item.id)
    setError(null)
    try {
      const res: unknown = await http.get(`/api/downloads/${encodeURIComponent(item.product_id)}`)
      const url =
        (res as { url?: string; data?: { url?: string } })?.url ??
        (res as { data?: { url?: string } })?.data?.url ??
        null
      if (url) {
        void track({
          name: 'download.started',
          properties: { product_id: item.product_id, license_id: item.id },
        })
        window.location.assign(url)
      } else {
        setError(t('library.downloadError', {}, { defaultValue: 'Could not prepare download.' }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-on-surface',
          )}
        >
          {t('library.title', {}, { defaultValue: 'Files & licenses' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'library.subtitle',
            { count: items.length },
            { defaultValue: '{{count}} purchased products. Re-download anytime.' },
          )}
        </p>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), 'rounded-2xl bg-surface-container-lowest text-center')}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 56 }}
          >
            folder_open
          </span>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('library.empty', {}, { defaultValue: 'Your library is empty' })}
          </p>
          <Link
            to="/shop"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 6),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors',
            )}
          >
            {t('library.browse', {}, { defaultValue: 'Browse the storefront' })}
          </Link>
        </div>
      ) : (
        <>
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
          <ul
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}
            data-testid="library-items"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className={cm.cn(
                  'rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden',
                )}
              >
                <div className={cm.cn(cm.flex({ gap: 'md' }), cm.sp('p', 5))}>
                  {item.cover_image && (
                    <img
                      src={item.cover_image}
                      alt=""
                      className={cm.cn('rounded-xl object-cover')}
                      style={{ width: 120, height: 80 }}
                    />
                  )}
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface truncate')}>
                      {item.name}
                    </p>
                    <p
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                      style={{ fontFamily: 'var(--font-family-mono)' }}
                    >
                      {item.file_type ?? '—'} · {item.version ?? 'v1.0'}
                      {item.size_mb && ` · ${item.size_mb} MB`}
                    </p>
                    <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 3), 'flex-wrap')}>
                      <button
                        type="button"
                        data-testid="library-download"
                        data-product-slug={item.product_slug}
                        onClick={() => handleDownload(item)}
                        disabled={downloadingId === item.id}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'inline-flex items-center gap-2 bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60',
                        )}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          download
                        </span>
                        {downloadingId === item.id
                          ? t('library.preparing', {}, { defaultValue: 'Preparing…' })
                          : t('common.download', {}, { defaultValue: 'Download' })}
                      </button>
                      {item.update_available && (
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            'inline-flex items-center gap-1 bg-success-light text-success uppercase tracking-widest',
                          )}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            new_releases
                          </span>
                          {t('pwa.update', {}, { defaultValue: 'Update' })}
                        </span>
                      )}
                      {typeof item.downloads_remaining === 'number' && (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'library.downloadsLeft',
                            { count: item.downloads_remaining },
                            { defaultValue: '{{count}} downloads left' },
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.license_key && (
                  <div className={cm.cn(cm.sp('px', 5), cm.sp('pb', 5))}>
                    <LicenseKeyDisplay
                      licenseKey={item.license_key}
                      status="active"
                      issuedAt={item.purchased_at}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default CustomerLibrary
