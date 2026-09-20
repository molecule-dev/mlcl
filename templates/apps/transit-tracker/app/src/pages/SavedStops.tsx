import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Saved stops: the user's board shortcuts with unsave controls. Saving is
 * done from a stop's board (StopBoard); this page manages the collection.
 */
export function SavedStops() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [saved, setSaved] = useState<
    Array<{ id: string; code: string; name: string; hub: boolean; saved_at?: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get('/api/saved-stops')
      const data = (res as { data?: unknown }).data ?? res
      setSaved(Array.isArray(data) ? (data as typeof saved) : [])
      setError(null)
    } catch (err) {
      console.error('[SavedStops] load failed:', err)
      setError(
        t(
          'savedStops.error',
          {},
          { defaultValue: 'Could not load saved stops. Please try again.' },
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const unsave = async (code: string): Promise<void> => {
    try {
      await http.delete(`/api/saved-stops/${encodeURIComponent(code)}`)
      setSaved((rows) => rows.filter((row) => row.code !== code))
    } catch (err) {
      console.error('[SavedStops] unsave failed:', err)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('savedStops.eyebrow', {}, { defaultValue: 'Your network' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'leading-tight tracking-tight',
          )}
        >
          {t('savedStops.title', {}, { defaultValue: 'Saved stops' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'savedStops.subtitle',
            {},
            { defaultValue: 'The boards you ride daily, one tap from the home screen.' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('savedStops.loading', {}, { defaultValue: 'Loading saved stops…' })}
        </p>
      ) : saved.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl bg-surface-container-low ring-1 ring-outline-variant/40',
          )}
        >
          <span
            className={'material-symbols-outlined text-4xl text-on-surface-variant'}
            aria-hidden="true"
          >
            bookmark_add
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 3))}>
            {t('savedStops.emptyTitle', {}, { defaultValue: 'No saved stops yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'savedStops.emptyBody',
              {},
              { defaultValue: 'Open any stop and tap Save stop to pin its board here.' },
            )}
          </p>
          <Link
            to="/nearby"
            data-mol-id="saved-browse-link"
            className={cm.cn(
              'inline-block',
              cm.sp('mt', 6),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
            )}
          >
            {t('savedStops.browseCta', {}, { defaultValue: 'Browse stops' })}
          </Link>
        </div>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {saved.map((row) => (
            <li
              key={row.id}
              data-mol-id={`saved-stop-${row.code}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl ring-1 ring-outline-variant/40',
              )}
            >
              <Link to={`/stops/${row.code}`} className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={'material-symbols-outlined text-on-surface-variant'}
                  aria-hidden="true"
                >
                  {row.hub ? 'transfer_within_a_station' : 'directions_bus'}
                </span>
                <span>
                  <span className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {row.name}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'block text-on-surface-variant tabular-nums',
                    )}
                  >
                    {row.code}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void unsave(row.code)}
                data-mol-id={`saved-unsave-${row.code}`}
                aria-label={t(
                  'savedStops.unsaveAriaLabel',
                  { stop: row.name },
                  { defaultValue: 'Remove {{stop}} from saved stops' },
                )}
                className={cm.cn(
                  'inline-flex items-center justify-center',
                  cm.w(9),
                  cm.h(9),
                  cm.touchTargetCompact,
                  'rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors',
                )}
              >
                <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
                  bookmark_remove
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
