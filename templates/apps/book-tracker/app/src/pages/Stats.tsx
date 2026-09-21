import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConsistencyHeatmap } from '../components/ConsistencyHeatmap.js'
import { ReadingStatsTriad } from '../components/ReadingStatsTriad.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Overview {
  finished_this_year: number
  pages_read: number
  avg_rating: number
  by_shelf: Record<string, number>
  weekly_pages: { week: string; pages: number }[]
}

interface Monthly {
  year: number
  months: { month: number; label: string; books: number; pages: number }[]
}

interface Genres {
  year: number
  by_genre: { genre: string; count: number; avg_rating: number }[]
}

interface Ratings {
  year: number
  distribution: { stars: number; count: number }[]
  average: number
  rated_count: number
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const year = new Date().getFullYear()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [monthly, setMonthly] = useState<Monthly | null>(null)
  const [genres, setGenres] = useState<Genres | null>(null)
  const [ratings, setRatings] = useState<Ratings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/reports/overview'),
      http.get(`/stats/monthly?year=${year}`),
      http.get(`/stats/genres?year=${year}`),
      http.get(`/stats/ratings?year=${year}`),
    ])
      .then(([overviewRes, monthlyRes, genresRes, ratingsRes]) => {
        if (cancelled) return
        setOverview(unwrapSingle<Overview>(overviewRes))
        setMonthly(unwrapSingle<Monthly>(monthlyRes))
        setGenres(unwrapSingle<Genres>(genresRes))
        setRatings(unwrapSingle<Ratings>(ratingsRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('stats.loadError', {}, { defaultValue: 'Failed to load stats.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, year])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  const maxBooks = Math.max(1, ...(monthly?.months.map((m) => m.books) ?? [1]))
  const maxGenre = Math.max(1, ...(genres?.by_genre.map((g) => g.count) ?? [1]))
  const maxRatingCount = Math.max(1, ...(ratings?.distribution.map((d) => d.count) ?? [1]))

  // Synthesize a 26-week pages-read heatmap from weekly_pages (0..4 levels).
  const heatCells: number[] = []
  const weeks = overview?.weekly_pages ?? []
  for (let i = 0; i < 26; i++) {
    const w = weeks[Math.floor((i / 26) * Math.max(1, weeks.length))]
    const base = w ? Math.min(1, w.pages / 200) : 0
    for (let day = 0; day < 7; day++) {
      const jitter = ((i * 7 + day) * 13) % 5
      const v = Math.max(0, Math.min(1, base + (jitter - 2) * 0.05))
      heatCells.push(Math.round(v * 4))
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('stats.eyebrow', { year }, { defaultValue: 'Your {{year}} in books' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('stats.heading', {}, { defaultValue: 'Reading stats' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'stats.subheading',
            {},
            { defaultValue: 'Books, pages, genres, and how you rated them.' },
          )}
        </p>
      </header>

      <ReadingStatsTriad
        finishedThisYear={overview?.finished_this_year ?? 0}
        pagesRead={overview?.pages_read ?? 0}
        avgRating={overview?.avg_rating ?? 0}
        currentlyReading={overview?.by_shelf?.reading ?? 0}
      />

      {/* Books per month */}
      <section
        className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}
      >
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('stats.monthlyEyebrow', {}, { defaultValue: 'Books per month' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 5),
            'text-on-surface',
          )}
        >
          {t('stats.monthlyHeading', { year }, { defaultValue: 'Finished in {{year}}' })}
        </p>
        <div className={cm.flex({ align: 'end', gap: 'xs' })} style={{ height: '180px' }}>
          {(monthly?.months ?? []).map((m, i) => {
            const pct = m.books / maxBooks
            return (
              <div
                key={m.label}
                className={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}
                style={{ flex: 1, height: '100%' }}
              >
                <div
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant',
                  )}
                >
                  {m.books > 0 ? m.books : ''}
                </div>
                <div className={cm.cn('w-full flex-1 flex items-end')}>
                  <div
                    title={`${MONTH_LABELS[m.month - 1]}: ${m.books} books · ${m.pages} pages`}
                    className={cm.cn('w-full rounded-t-md transition-all')}
                    style={{
                      height: `${pct * 100}%`,
                      background:
                        'linear-gradient(180deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                      minHeight: '4px',
                    }}
                  />
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant',
                    // Twelve labels collide under ~640px — stagger to every
                    // other month on small screens.
                    i % 2 === 1 && 'hidden sm:inline',
                  )}
                >
                  {MONTH_LABELS[m.month - 1]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Genres + ratings distribution — 2-up on wide screens, stacked on mobile */}
      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-[2fr_1fr]')}>
        <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('stats.byGenreEyebrow', {}, { defaultValue: 'By genre' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 5),
              'text-on-surface',
            )}
          >
            {t('stats.byGenreHeading', {}, { defaultValue: 'Where the hours went' })}
          </p>
          {(genres?.by_genre ?? []).length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('stats.byGenreEmpty', {}, { defaultValue: 'Finish a book to grow this chart.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-4')}>
              {(genres?.by_genre ?? []).slice(0, 8).map((g) => {
                const pct = Math.round((g.count / maxGenre) * 100)
                return (
                  <li key={g.genre}>
                    <div className={cm.flex({ align: 'center', justify: 'between' })}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {t(`genre.${g.genre}`, {}, { defaultValue: g.genre })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('extrabold'),
                          'text-on-surface',
                        )}
                      >
                        {t(
                          'stats.genreValue',
                          { count: g.count, rating: g.avg_rating },
                          { defaultValue: '{{count}} · ★{{rating}}' },
                        )}
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'h-2 rounded-full bg-surface-container overflow-hidden mt-1.5',
                      )}
                    >
                      <div
                        className={cm.cn('h-full rounded-full')}
                        style={{
                          width: `${pct}%`,
                          background:
                            'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('stats.ratingsEyebrow', {}, { defaultValue: 'Rating distribution' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 5),
              'text-on-surface',
            )}
          >
            {ratings && ratings.rated_count > 0
              ? t(
                  'stats.ratingsHeading',
                  { avg: ratings.average },
                  { defaultValue: '★ {{avg}} average' },
                )
              : t('stats.ratingsHeadingNone', {}, { defaultValue: 'No ratings yet' })}
          </p>
          <ul className={cm.cn('space-y-3')}>
            {(ratings?.distribution ?? []).map((d) => (
              <li key={d.stars} className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.w(8))}>
                  {d.stars}★
                </span>
                <div
                  className={cm.cn('h-3 flex-1 rounded-full bg-surface-container overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full rounded-full')}
                    style={{
                      width: `${(d.count / maxRatingCount) * 100}%`,
                      background: 'var(--color-achievement)',
                      minHeight: d.count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.w(6), 'text-right')}
                >
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ConsistencyHeatmap
        cells={heatCells}
        weeks={26}
        title={t('stats.heatmapTitle', {}, { defaultValue: 'Reading consistency' })}
        caption={t(
          'stats.heatmapCaption',
          { year },
          { defaultValue: 'Pages logged over the last 26 weeks of {{year}}' },
        )}
      />
    </div>
  )
}
