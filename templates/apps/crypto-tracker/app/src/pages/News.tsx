import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NewsSignalCard, type NewsSignalCardData } from '../components/NewsSignalCard.js'
import { unwrapList } from '../lib/unwrap.js'

type Filter = 'all' | 'bullish' | 'bearish' | 'neutral'

export function News() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NewsSignalCardData[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/news')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<NewsSignalCardData>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('news.loadError', {}, { defaultValue: 'Failed to load news.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((n) => n.signal === filter)
  }, [items, filter])

  const counts = useMemo(
    () => ({
      bullish: items.filter((n) => n.signal === 'bullish').length,
      bearish: items.filter((n) => n.signal === 'bearish').length,
      neutral: items.filter((n) => n.signal === 'neutral').length,
    }),
    [items],
  )

  const filterButtons: { id: Filter; label: string; count?: number }[] = [
    { id: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: items.length },
    {
      id: 'bullish',
      label: t('news.filter.bullish', {}, { defaultValue: 'Bullish' }),
      count: counts.bullish,
    },
    {
      id: 'bearish',
      label: t('news.filter.bearish', {}, { defaultValue: 'Bearish' }),
      count: counts.bearish,
    },
    {
      id: 'neutral',
      label: t('news.filter.neutral', {}, { defaultValue: 'Neutral' }),
      count: counts.neutral,
    },
  ]

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        'lg:px-10 space-y-6',
      )}
    >
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('news.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} signals' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tracking-tight',
          )}
        >
          {t('news.heading', {}, { defaultValue: 'News & signals' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'news.subheading',
            {},
            { defaultValue: 'Curated headlines, classified by directional signal.' },
          )}
        </p>
      </header>

      <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
        {filterButtons.map((btn) => {
          const active = filter === btn.id
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilter(btn.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full border transition-colors',
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-low/40 border-outline-variant/60 text-on-surface-variant hover:bg-surface-container',
              )}
              data-mol-id={`news-filter-${btn.id}`}
            >
              {btn.label}
              {btn.count !== undefined ? (
                <span className={cm.cn(cm.sp('ml', 2), 'tabular-nums opacity-70')}>
                  {btn.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('news.empty', {}, { defaultValue: 'No news yet.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((n) => (
            <NewsSignalCard key={n.id} item={n} />
          ))}
        </div>
      )}
    </div>
  )
}
