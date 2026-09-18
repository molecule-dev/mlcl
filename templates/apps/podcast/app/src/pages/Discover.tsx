import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EpisodeHeroCard } from '../components/EpisodeHeroCard.js'
import { FeaturedShowsRow } from '../components/FeaturedShowsRow.js'
import { ShowGrid } from '../components/ShowGrid.js'
import { unwrapList } from '../lib/unwrap.js'

interface Show {
  id: string
  title: string
  publisher: string
  description: string
  cover_index: number
  category:
    'news' | 'tech' | 'business' | 'comedy' | 'culture' | 'science' | 'health' | 'true_crime'
  episodes_count: number
  rating: number
  featured: boolean
  trending: boolean
  subscribed: boolean
  unplayed_count: number
}

interface Episode {
  id: string
  show_id: string
  show_title: string
  title: string
  description: string
  cover_index: number
  duration_seconds: number
  played_position: number
  played: boolean
  published_at: string
}

const CATEGORIES = [
  'all',
  'news',
  'tech',
  'business',
  'comedy',
  'culture',
  'science',
  'health',
  'true_crime',
] as const
type Category = (typeof CATEGORIES)[number]

export function Discover() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [shows, setShows] = useState<Show[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/shows').catch(() => null),
      http.get('/api/episodes').catch(() => null),
    ])
      .then(([sRes, eRes]) => {
        if (cancelled) return
        setShows(unwrapList<Show>(sRes))
        setEpisodes(unwrapList<Episode>(eRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('discover.loadError', {}, { defaultValue: 'Failed to load shows.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (category === 'all') return shows
    return shows.filter((s) => s.category === category)
  }, [shows, category])

  const featured = shows.filter((s) => s.featured)
  const trending = shows.filter((s) => s.trending)
  // Hero pick: a partially-played episode (resume), else most recent
  const heroEpisode = useMemo(() => {
    const partial = episodes.find((e) => e.played_position > 0 && !e.played)
    return partial ?? episodes[0] ?? null
  }, [episodes])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(10))}>
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.discover', {}, { defaultValue: 'Discover' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'discover.subheading',
            {},
            { defaultValue: 'Tune into every story — handpicked shows and episodes.' },
          )}
        </p>
      </header>

      <EpisodeHeroCard
        episode={heroEpisode}
        streakLabel={t(
          'discover.streakLabel',
          { count: 12 },
          { defaultValue: '{{count}}-day listening streak' },
        )}
      />

      {category === 'all' && (
        <>
          <FeaturedShowsRow
            shows={featured}
            title={t('discover.featuredHeading', {}, { defaultValue: 'Featured shows' })}
            seeAllHref="/library"
          />
          <FeaturedShowsRow
            shows={trending}
            title={t('discover.trendingHeading', {}, { defaultValue: 'Trending now' })}
            seeAllHref="/library"
          />
        </>
      )}

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {t('discover.browseHeading', {}, { defaultValue: 'Browse all shows' })}
          </h2>
        </div>
        <nav
          aria-label={t('discover.filterLabel', {}, { defaultValue: 'Filter shows by category' })}
          className={cm.flex({ gap: 'sm', align: 'center', wrap: 'wrap' })}
        >
          {CATEGORIES.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'text-xs font-bold uppercase tracking-widest rounded-full transition-all',
                  active
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-low border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container',
                )}
                aria-pressed={active}
              >
                {t(
                  `discover.category.${c}`,
                  {},
                  { defaultValue: c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
        <ShowGrid shows={filtered} />
      </section>
    </div>
  )
}
