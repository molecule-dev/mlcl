import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DealCard, type DealCardDeal } from '../components/DealCard.js'
import { unwrapList } from '../lib/unwrap.js'

const CATEGORIES = [
  'All',
  'Restaurants',
  'Beauty',
  'Fitness',
  'Activities',
  'Online',
  'Services',
] as const

function readCategoryFromHash(): string {
  if (typeof window === 'undefined') return 'All'
  const h = decodeURIComponent(window.location.hash.replace('#', ''))
  return (CATEGORIES as readonly string[]).includes(h) ? h : 'All'
}

export function Deals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [deals, setDeals] = useState<DealCardDeal[]>([])
  const location = useLocation()
  const [category, setCategory] = useState<string>(readCategoryFromHash)

  useEffect(() => {
    setCategory(readCategoryFromHash())
    const onHashChange = () => setCategory(readCategoryFromHash())
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [location.pathname, location.hash])

  function selectCategory(next: string) {
    setCategory(next)
    if (typeof window !== 'undefined') {
      window.location.hash = encodeURIComponent(next)
    }
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/deals')
      .then((res) => {
        if (!cancelled) setDeals(unwrapList<DealCardDeal>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('deals.loadError', {}, { defaultValue: 'Failed to load deals.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (category === 'All') return deals
    return deals.filter((d) => d.category === category)
  }, [deals, category])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('deals.heading', {}, { defaultValue: 'Deals' })}
        </h1>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ gap: 'sm' }), 'overflow-x-auto')}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => selectCategory(c)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              'whitespace-nowrap',
              category === c
                ? cm.cn('bg-primary text-on-primary')
                : cm.cn(
                    'bg-surface-container',
                    'text-on-surface-variant',
                    'hover:bg-surface-container-high',
                  ),
            )}
          >
            {c === 'All' ? t('deals.categoryAll', {}, { defaultValue: 'All' }) : c}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('deals.empty', {}, { defaultValue: 'No deals in this category.' })}
        </p>
      ) : (
        <ul
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {filtered.map((d) => (
            <li key={d.id}>
              <DealCard deal={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
