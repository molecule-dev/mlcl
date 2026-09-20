import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { languageLabel } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface GuestRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  preferred_language: string
  stay_count: number
}

export function Guests() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [guests, setGuests] = useState<GuestRow[] | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setGuests(null)
    ;(async () => {
      try {
        const query = search.trim() === '' ? '' : '?search=' + encodeURIComponent(search.trim())
        const res = await http.get('/api/guests' + query)
        if (cancelled) return
        setGuests(unwrapList<GuestRow>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('guests.loadError', {}, { defaultValue: 'Failed to load guests.' }))
          setGuests([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, search])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))} data-mol-id="guests-heading">
        {t('guests.heading', {}, { defaultValue: 'Guests' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'guests.subheading',
          {},
          {
            defaultValue:
              'Guest profiles with preferred language and stay history — the voice agent greets repeat guests in theirs.',
          },
        )}
      </p>

      <input
        id="guest_search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('guests.searchPlaceholder', {}, { defaultValue: 'Search guests by name…' })}
        data-mol-id="guests-search"
        aria-label={t('guests.searchLabel', {}, { defaultValue: 'Search guests' })}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.sp('mt', 4),
          'w-full max-w-md bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />

      {error ? (
        <p
          data-mol-id="guests-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      <ul className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'sm' }))}>
        {guests === null ? (
          <li data-mol-id="guests-loading" className="text-on-surface-variant">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : guests.length === 0 ? (
          <li data-mol-id="guests-empty" className="text-on-surface-variant">
            {t('guests.empty', {}, { defaultValue: 'No guests match that search.' })}
          </li>
        ) : (
          guests.map((g) => (
            <li key={g.id}>
              <Link
                to={'/guests/' + g.id}
                data-mol-id={'guest-row-' + g.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'block rounded-xl bg-surface border border-outline-variant hover:border-primary/60 transition-colors',
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                )}
              >
                <span>
                  <span className="font-semibold">{g.name}</span>
                  <span className={cm.cn('block', cm.textSize('sm'), 'text-on-surface-variant')}>
                    {g.email ?? g.phone ?? '—'}
                  </span>
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {languageLabel(g.preferred_language)} ·{' '}
                  {t('guests.stays', { count: g.stay_count }, { defaultValue: '{{count}} stays' })}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
