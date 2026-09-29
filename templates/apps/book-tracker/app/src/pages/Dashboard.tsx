import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChallengeHeroCard, type ChallengeSnapshot } from '../components/ChallengeHeroCard.js'
import { ReadingProgressRow } from '../components/ReadingProgressRow.js'
import { ReadingStatsTriad } from '../components/ReadingStatsTriad.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface CurrentlyReading {
  user_book_id: string
  book_id: string
  title: string
  author: string
  cover_style: string
  page_count: number
  current_page: number
  percent: number
  started_at: string | null
}

interface Today {
  date: string
  currently_reading: CurrentlyReading[]
  minutes_today: number
  pages_today: number
  challenge: ChallengeSnapshot
  motivational_message: string
}

interface Overview {
  finished_this_year: number
  pages_read: number
  avg_rating: number
  by_shelf: Record<string, number>
  weekly_pages: { week: string; pages: number }[]
  recent: {
    user_book_id: string
    book_id: string
    title: string
    author: string
    shelf: string
    rating: number | null
    finished_at: string | null
    updated_at: string
  }[]
}

const SHELF_TONE: Record<string, string> = {
  reading: 'bg-primary-container text-on-primary-container',
  read: 'bg-success-container text-on-success-container',
  want_to_read: 'bg-secondary-container text-on-secondary-container',
  dnf: 'bg-error-container text-on-error-container',
}

const INTENT_SHELF_ROWS = [
  { key: 'autumnRain', icon: 'folder', tone: 'bg-surface-container text-on-surface-variant' },
  { key: 'philosophy', icon: 'folder', tone: 'bg-surface-container text-on-surface-variant' },
  { key: 'lent', icon: 'outbox', tone: 'bg-secondary-container text-on-secondary-fixed' },
  { key: 'someday', icon: 'hourglass_empty', tone: 'bg-surface-container text-on-surface-variant' },
] as const

function seasonKeyOf(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

const SEASON_COLOR: Record<string, string> = {
  spring: 'var(--color-secondary)',
  summer: 'var(--color-achievement)',
  autumn: 'var(--color-primary)',
  winter: 'var(--color-outline-variant)',
}

const SEASON_DEFAULTS = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
} as const

const SEASON_NOW_DEFAULTS = {
  spring: 'Spring flow',
  summer: 'Summer flow',
  autumn: 'Autumn flow',
  winter: 'Winter flow',
} as const

const INTENT_SHELF_LABELS = {
  autumnRain: 'Autumn Rain Reads',
  philosophy: 'Philosophy of Science',
  lent: 'Books Lent to Friends',
  someday: 'Someday / Long Nights',
} as const

const INTENT_SHELF_COUNTS = {
  autumnRain: '6 volumes',
  philosophy: '11 volumes',
  lent: '4 out',
  someday: '19 volumes',
} as const

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [today, setToday] = useState<Today | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/reports/today'), http.get('/reports/overview')])
      .then(([todayData, overviewData]) => {
        if (cancelled) return
        setToday(unwrapSingle<Today>(todayData))
        setOverview(unwrapSingle<Overview>(overviewData))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(load, [http, t])

  const logProgress = async (book: CurrentlyReading, page: number) => {
    if (Number.isNaN(page) || page <= book.current_page) return
    setBusyId(book.book_id)
    try {
      await http.post(`/books/${book.book_id}/progress`, {
        current_page: page,
      })
      track({
        name: 'reading.progress_logged',
        properties: { book_id: book.book_id, page },
      })
      const todayResp = await http.get('/reports/today')
      setToday(unwrapSingle<Today>(todayResp))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusyId(null)
    }
  }

  const currentlyReading = today?.currently_reading ?? []
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const year = new Date().getFullYear()
  const season = seasonKeyOf(new Date())
  const challenge = today?.challenge ?? null
  const goalBooks = challenge?.goal_books ?? 0
  const booksRead = challenge?.books_read ?? 0
  // Ring geometry: r=40 in a 100×100 viewBox → circumference ≈ 251.2.
  const ringFrac = goalBooks > 0 ? Math.min(1, booksRead / goalBooks) : 0
  const ringLen = 251.2

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
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
          {todayStr}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('dashboard.heading', {}, { defaultValue: 'Your reading today' })}
        </h1>
      </header>

      <ChallengeHeroCard
        challenge={today?.challenge}
        motivationalMessage={today?.motivational_message ?? ''}
        weeklyPages={overview?.weekly_pages}
      />

      {overview ? (
        <ReadingStatsTriad
          finishedThisYear={overview.finished_this_year}
          pagesRead={overview.pages_read}
          avgRating={overview.avg_rating}
          currentlyReading={currentlyReading.length}
        />
      ) : null}

      <section className={cm.cn('space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.currentlyReading', {}, { defaultValue: 'Currently reading' })}
            {today && today.pages_today > 0
              ? t(
                  'dashboard.todaySuffix',
                  { pages: today.pages_today, minutes: today.minutes_today },
                  { defaultValue: ' · {{pages}} pp / {{minutes}} min today' },
                )
              : ''}
          </h2>
          <Link
            to="/books/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'inline-flex items-center gap-2 rounded-full text-on-primary shadow-sm hover:shadow-md transition-shadow uppercase tracking-widest',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
            data-mol-id="dashboard-add-book"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
            {t('dashboard.newBookCta', {}, { defaultValue: 'Add book' })}
          </Link>
        </div>
        {currentlyReading.length === 0 ? (
          <p
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.sp('p', 12),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.emptyReading',
              {},
              { defaultValue: 'Nothing in progress. Shelve a book as reading to start it.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {currentlyReading.map((b) => (
              <li key={b.book_id}>
                <ReadingProgressRow
                  id={b.book_id}
                  title={b.title}
                  author={b.author}
                  coverStyle={b.cover_style}
                  pageCount={b.page_count}
                  currentPage={b.current_page}
                  percent={b.percent}
                  busy={busyId === b.book_id}
                  onLog={(page) => void logProgress(b, page)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('dashboard.recentActivity', {}, { defaultValue: 'Recent activity' })}
        </h2>
        {(overview?.recent ?? []).length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}>
            {t('dashboard.recentEmpty', {}, { defaultValue: 'No shelf changes yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2', cm.sp('mt', 3))}>
            {(overview?.recent ?? []).slice(0, 6).map((r) => (
              <li
                key={r.user_book_id}
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
              >
                <Link
                  to={`/books/${r.book_id}`}
                  className={cm.cn(cm.fontWeight('medium'), 'text-on-surface hover:text-primary')}
                >
                  {r.title}
                </Link>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 rounded-full uppercase tracking-widest',
                    SHELF_TONE[r.shelf] ?? 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {t(`shelf.${r.shelf}`, {}, { defaultValue: r.shelf.replace(/_/g, ' ') })}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
                  {new Date(r.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reading journey & seasons — the year's dial with a seasonal key */}
      <section className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <div
          className={cm.cn(
            'md:col-span-8 bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('p', 6),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              'border-b border-outline-variant pb-4',
            )}
          >
            <h2
              className={cm.cn('text-xl md:text-2xl font-medium tracking-tight text-primary')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'dashboard.journeyTitle',
                { year },
                { defaultValue: '{{year}} Reading Journey & Seasons' },
              )}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary-container text-on-secondary-fixed text-[11px] font-semibold rounded-full">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--color-secondary)' }}
                aria-hidden="true"
              />
              {t(
                `dashboard.seasonNow.${season}`,
                {},
                { defaultValue: SEASON_NOW_DEFAULTS[season] },
              )}
            </span>
          </div>
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center', cm.sp('mt', 5))}>
            <div
              className={cm.cn(
                'md:col-span-5 flex flex-col items-center justify-center text-center',
              )}
            >
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                  role="img"
                  aria-label={t(
                    'dashboard.journeyDialAria',
                    { read: booksRead, goal: goalBooks },
                    { defaultValue: '{{read}} of {{goal}} books read this year' },
                  )}
                >
                  <circle
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="40"
                    stroke="var(--color-surface-container-high)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="40"
                    stroke="var(--color-primary)"
                    strokeLinecap="round"
                    strokeWidth="8"
                    strokeDasharray={`${(ringLen * ringFrac).toFixed(1)} ${ringLen}`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-semibold text-primary">{booksRead}</span>
                  <span className="text-[11px] font-semibold text-secondary tracking-widest uppercase">
                    {t(
                      'dashboard.journeyOfIntentional',
                      { goal: goalBooks },
                      { defaultValue: 'of {{goal}} intentional' },
                    )}
                  </span>
                  <span className="text-[10px] text-outline">
                    {t('dashboard.journeyCompanions', {}, { defaultValue: 'companions' })}
                  </span>
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.sp('mt', 3),
                )}
              >
                {(['spring', 'summer', 'autumn', 'winter'] as const).map((s) => (
                  <span key={s} className={cm.cn(cm.flex({ align: 'center', gap: 1.5 }))}>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: SEASON_COLOR[s] }}
                      aria-hidden="true"
                    />
                    {t(`dashboard.season.${s}`, {}, { defaultValue: SEASON_DEFAULTS[s] })}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:col-span-7 space-y-4 md:border-l md:border-outline-variant md:pl-6">
              <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant">
                <p
                  className={cm.cn('text-base text-primary italic leading-snug')}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t(
                    'dashboard.journeyObservation',
                    {},
                    {
                      defaultValue:
                        'Your pace is allowed to swell and ebb — deep months and restful months are both part of a reading life.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('xs'),
                    'text-secondary',
                    cm.sp('mt', 2),
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    psychology
                  </span>
                  <span>
                    {t(
                      'dashboard.journeyObservationLabel',
                      {},
                      { defaultValue: 'Sanctuary cadence observation' },
                    )}
                  </span>
                </div>
              </div>
              <div className={cm.cn(cm.grid({ cols: 3, gap: 'sm' }), 'text-center pt-1')}>
                <div className="p-2.5 bg-surface rounded border border-outline-variant">
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary')}>
                    {(overview?.pages_read ?? 0).toLocaleString()}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant leading-tight',
                      cm.sp('mt', 1),
                    )}
                  >
                    {t(
                      'dashboard.journeyStatPages',
                      {},
                      { defaultValue: 'Pages companionably read' },
                    )}
                  </p>
                </div>
                <div className="p-2.5 bg-surface rounded border border-outline-variant">
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary')}>
                    {overview?.finished_this_year ?? 0}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant leading-tight',
                      cm.sp('mt', 1),
                    )}
                  >
                    {t(
                      'dashboard.journeyStatFinished',
                      {},
                      { defaultValue: 'Volumes seen through' },
                    )}
                  </p>
                </div>
                <div className="p-2.5 bg-surface rounded border border-outline-variant">
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary')}>
                    0
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant leading-tight',
                      cm.sp('mt', 1),
                    )}
                  >
                    {t(
                      'dashboard.journeyStatStreaks',
                      {},
                      { defaultValue: "Broken streaks (we don't count them)" },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shelves of Intent — the custom taxonomies sidebar */}
        <aside
          className={cm.cn(
            'md:col-span-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant',
            cm.sp('p', 6),
          )}
        >
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                'text-primary',
              )}
            >
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">
                collections_bookmark
              </span>
              {t('dashboard.shelvesIntentTitle', {}, { defaultValue: 'Shelves of Intent' })}
            </h3>
          </div>
          <ul className="divide-y divide-outline-variant/60">
            {INTENT_SHELF_ROWS.map((row) => (
              <li
                key={row.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('py', 3),
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                  <span
                    className="material-symbols-outlined text-sm text-secondary"
                    aria-hidden="true"
                  >
                    {row.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate')}>
                    {t(
                      `dashboard.intentShelf.${row.key}`,
                      {},
                      { defaultValue: INTENT_SHELF_LABELS[row.key] },
                    )}
                  </span>
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    row.tone,
                  )}
                >
                  {t(
                    `dashboard.intentShelfCount.${row.key}`,
                    {},
                    { defaultValue: INTENT_SHELF_COUNTS[row.key] },
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.sp('mt', 3),
              'leading-relaxed',
            )}
          >
            {t(
              'dashboard.shelvesIntentNote',
              {},
              {
                defaultValue:
                  'Sample taxonomies — your own shelves grow out of the piles by your reading chair.',
              },
            )}
          </p>
        </aside>
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/books"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            // Inline text links read as ~20px tall to hit-testing — pad to a
            // 40px tap target without changing how they look in the row.
            'inline-flex items-center py-2.5',
          )}
        >
          {t('dashboard.viewAllBooks', {}, { defaultValue: 'Browse shelves →' })}
        </Link>
        <Link
          to="/stats"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'inline-flex items-center py-2.5',
          )}
        >
          {t('dashboard.viewStats', {}, { defaultValue: 'See stats →' })}
        </Link>
      </div>
    </div>
  )
}
