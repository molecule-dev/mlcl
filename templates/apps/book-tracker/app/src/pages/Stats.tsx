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

const RUBRIC_TIERS = {
  deep: {
    label: 'Deep Companion',
    stars: '5 of 5',
    icon: 'star',
    tone: 'bg-primary-container text-on-primary-container',
    body: "Life-shaping reread; permanently lives within arm's reach of the reading chair.",
  },
  resonant: {
    label: 'Resonant Volume',
    stars: '4 of 5',
    icon: 'auto_stories',
    tone: 'bg-secondary-container text-on-secondary-container',
    body: 'Rich prose, striking architecture, lingering philosophical questions that echo.',
  },
  acquaintance: {
    label: 'Quiet Acquaintance',
    stars: '3 of 5',
    icon: 'coffee',
    tone: 'bg-surface-container-high text-on-surface-variant',
    body: 'Pleasant company for a season; served its chapter gracefully.',
  },
  paused: {
    label: 'Paused With Respect',
    stars: 'hold',
    icon: 'pause_circle',
    tone: 'bg-surface-container text-outline',
    body: 'Not suited for this season of mind; zero reader guilt.',
  },
} as const

type RubricRow = {
  key: keyof typeof RUBRIC_TIERS
  count: number
  pct: number
  label: string
  stars: string
  icon: string
  tone: string
  body: string
}

function rubricRows(ratings: Ratings | null, overview: Overview | null): RubricRow[] {
  const dist = new Map((ratings?.distribution ?? []).map((d) => [d.stars, d.count]))
  const paused = overview?.by_shelf?.dnf ?? 0
  const counts: Record<keyof typeof RUBRIC_TIERS, number> = {
    deep: dist.get(5) ?? 0,
    resonant: dist.get(4) ?? 0,
    acquaintance: dist.get(3) ?? 0,
    paused,
  }
  const total = Math.max(1, counts.deep + counts.resonant + counts.acquaintance + counts.paused)
  return (Object.keys(RUBRIC_TIERS) as (keyof typeof RUBRIC_TIERS)[]).map((key) => ({
    key,
    count: counts[key],
    pct: Math.round((counts[key] / total) * 100),
    ...RUBRIC_TIERS[key],
  }))
}

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
          {t(
            'stats.heading',
            { year },
            { defaultValue: 'The {{year}} Reading Ledger & Annual Cadence' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'stats.subheading',
            {},
            { defaultValue: 'Books, pages, genres, and how you rated them.' },
          )}
        </p>
      </header>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('stats.kicker', {}, { defaultValue: 'Reading stats' })}
        </h2>
        <ReadingStatsTriad
          finishedThisYear={overview?.finished_this_year ?? 0}
          pagesRead={overview?.pages_read ?? 0}
          avgRating={overview?.avg_rating ?? 0}
          currentlyReading={overview?.by_shelf?.reading ?? 0}
        />
      </section>

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
          {t('stats.monthlyEyebrow', {}, { defaultValue: 'Monthly Rhythm & Seasonal Immersion' })}
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
        {/* Sanctuary editorial observation under the chart */}
        <div
          className={cm.cn(
            cm.sp('mt', 5),
            cm.sp('p', 4),
            'rounded-lg bg-surface-container-low/70 border border-outline-variant flex items-start gap-3',
          )}
        >
          <span className="material-symbols-outlined text-secondary mt-0.5" aria-hidden="true">
            auto_stories
          </span>
          <div className="flex-1">
            <h4
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary uppercase tracking-wider',
              )}
            >
              {t('stats.observationTitle', {}, { defaultValue: 'Sanctuary Observation' })}
            </h4>
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface italic', cm.sp('mt', 1))}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'stats.observationBody',
                {},
                {
                  defaultValue:
                    'Your pace is allowed to deepen and to rest — every month on this ledger counts the same, loud or quiet.',
                },
              )}
            </p>
          </div>
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
            {t('stats.byGenreHeading', {}, { defaultValue: 'Genre Taxonomy & Literary Affinity' })}
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

      {/* Companion resonance rubric — the non-punitive rating scale */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-6">
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <div>
            <h2
              className={cm.cn('text-xl md:text-2xl font-medium tracking-tight text-primary')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('stats.rubricHeading', {}, { defaultValue: 'Companion Resonance Rubric' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-outline', cm.sp('mt', 1))}>
              {t(
                'stats.rubricSub',
                {},
                {
                  defaultValue:
                    'Books are relationships, not commodities reviewed for delivery speed.',
                },
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-semibold">
            <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">
              verified
            </span>
            {t('stats.rubricChip', {}, { defaultValue: 'Zero punitive scores assigned' })}
          </span>
        </div>
        <ul className={cm.cn('space-y-3', cm.sp('mt', 5))}>
          {rubricRows(ratings, overview).map((row) => (
            <li
              key={row.key}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3',
              )}
            >
              <div className={cm.flex({ align: 'start', gap: 'sm' })}>
                <div
                  className={cm.cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    row.tone,
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {row.icon}
                  </span>
                </div>
                <div>
                  <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                    <h4
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-primary',
                      )}
                    >
                      {t(`stats.rubricTier.${row.key}`, {}, { defaultValue: row.label })}
                    </h4>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {row.stars}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-outline', cm.sp('mt', 1))}>
                    {t(`stats.rubricTierBody.${row.key}`, {}, { defaultValue: row.body })}
                  </p>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'shrink-0')}>
                <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('medium'), 'text-primary')}>
                  {row.count}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-outline')}>
                  {t(
                    'stats.rubricVolumesPct',
                    { pct: row.pct },
                    { defaultValue: 'volumes ({{pct}}%)' },
                  )}
                </span>
                <span
                  className="w-24 h-2 rounded-full bg-surface-container overflow-hidden block"
                  aria-hidden="true"
                >
                  <span
                    className="h-full rounded-full block"
                    style={{ width: `${row.pct}%`, background: 'var(--color-primary-container)' }}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
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
