import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Merchant {
  id: string
  name: string
  category: string
  city: string
  rating: number
  active_deals: number
  initial: string
}

export function Merchants() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/merchants')
      .then((res) => {
        if (!cancelled) setMerchants(unwrapList<Merchant>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('merchants.loadError', {}, { defaultValue: 'Failed to load merchants.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (!query.trim()) return merchants
    const q = query.toLowerCase().trim()
    return merchants.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q),
    )
  }, [merchants, query])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('merchants.heading', {}, { defaultValue: 'Merchants' })}
        </h1>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('merchants.searchPlaceholder', {}, { defaultValue: 'Search merchants…' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('merchants.empty', {}, { defaultValue: 'No merchants match.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((m) => (
            <li key={m.id}>
              <Link
                to={`/merchants/${m.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  'block hover:shadow-md transition-shadow space-y-3',
                )}
              >
                <header className={cm.flex({ align: 'center', gap: 'md' })}>
                  <span
                    className={cm.cn(
                      'h-12 w-12',
                      cm.roundedFull,
                      'bg-primary-container grid place-items-center',
                      cm.fontWeight('bold'),
                      cm.textPrimary,
                      cm.textSize('lg'),
                    )}
                  >
                    {m.initial}
                  </span>
                  <div className={cm.cn('min-w-0')}>
                    <h2
                      className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}
                    >
                      {m.name}
                    </h2>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {m.category} · {m.city}
                    </p>
                  </div>
                </header>
                <footer
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span>★ {m.rating.toFixed(1)}</span>
                  <span>
                    {m.active_deals}{' '}
                    {t('merchants.activeDeals', {}, { defaultValue: 'active deals' })}
                  </span>
                </footer>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
